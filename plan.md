# Plan: html-in-canvas support for VFX-JS

## Context

VFX-JS captures DOM elements as WebGL textures via an expensive pipeline (`dom-to-canvas.ts`):
clone → syncStylesOfTree → HTML→XML → SVG foreignObject → data URL → Image → OffscreenCanvas → THREE.CanvasTexture

The [html-in-canvas](https://github.com/WICG/html-in-canvas) API (`drawElementImage`) lets the browser natively render a DOM child to canvas, eliminating the entire pipeline. Snapshot per call (not live), but no cloning needed if the element is already a child of the canvas.

**Key spec facts:**
- `ctx.drawElementImage(element, x, y)` — renders child element snapshot to 2D canvas
- `layoutsubtree` attribute on canvas — children are laid out but NOT visually rendered
- Element **must be a child** of the canvas
- Chromium only, behind `chrome://flags/#canvas-draw-element`

## Two-Tier Design

### vfx-js (core): `vfx.addHTML(element, opts)`

New dedicated API, separate from existing `vfx.add()`. Creates a `<canvas layoutsubtree>` wrapper, moves the element inside, captures via `drawElementImage`.

```typescript
// Existing — unchanged, always uses dom-to-canvas for text
vfx.add(element, { shader: "rainbow" });

// New — uses html-in-canvas, wraps element in <canvas layoutsubtree>
vfx.addHTML(element, { shader: "rainbow" });
```

`vfx.add()` is mostly unchanged. One addition: detect `HTMLCanvasElement` with `layoutsubtree` attribute → route to hic path (for react-vfx's `<VFXCanvas>`).

### react-vfx: `<VFXCanvas>` component

Explicit component. Users wrap children in `<VFXCanvas>`, making the canvas hierarchy visible in JSX.

```jsx
<VFXProvider>
  <VFXCanvas shader="rainbow">
    <p>Hello world</p>
    <div>More content</div>
  </VFXCanvas>
</VFXProvider>
```

## Architecture

### Shared rendering layer (VFXPlayer)

New element type `"hic"`. VFXPlayer always receives a `<canvas layoutsubtree>` for hic entries. Doesn't care who created it.

```
VFXElementType = "img" | "video" | "text" | "canvas" | "hic"
```

For `"hic"` type:
- **Initial capture**: `drawElementImage(targetChild, 0, 0)` → OffscreenCanvas → `THREE.CanvasTexture`
- **Re-render**: re-call `drawElementImage` (very cheap)
- **Tracked element**: the `<canvas layoutsubtree>` (position/dimensions for WebGL placement)

### VFX class — `addHTML()` / `remove()` / `update()` / `destroy()`

```typescript
class VFX {
    #wrapperCanvases = new Map<HTMLElement, HTMLCanvasElement>();

    async addHTML(element: HTMLElement, opts: VFXProps): Promise<void> {
        if (!supportsHtmlInCanvas()) {
            console.warn("html-in-canvas not supported, falling back to dom-to-canvas");
            return this.add(element, opts);
        }

        // Reuse existing wrapper if element was already added via addHTML
        let wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            // Already wrapped — remove old player entry, re-add with new opts
            this.#player.removeElement(wrapper);
        } else {
            wrapper = wrapElement(element);
            this.#wrapperCanvases.set(element, wrapper);
        }

        await this.#player.addElement(wrapper, opts); // VFXPlayer handles as "hic"
    }

    remove(element: HTMLElement): void {
        const wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            unwrapElement(wrapper, element);
            this.#wrapperCanvases.delete(element);
            this.#player.removeElement(wrapper);
        } else {
            this.#player.removeElement(element);
        }
    }

    async update(element: HTMLElement): Promise<void> {
        const wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            return this.#player.updateHICElement(wrapper);
        }
        // ... existing logic
    }

    destroy(): void {
        // Unwrap all html-in-canvas elements
        for (const [element, wrapper] of this.#wrapperCanvases) {
            unwrapElement(wrapper, element);
        }
        this.#wrapperCanvases.clear();

        this.#player.destroy();
        this.#canvas.remove();
    }
}
```

User always calls `remove(element)` / `update(element)` with the **original element**. VFX resolves the wrapper internally.

### VFX.add() — detect layoutsubtree canvas

`<VFXCanvas>` calls `vfx.add(canvas)`. The `add()` routing needs one addition:

```typescript
async add(element: HTMLElement, opts: VFXProps): Promise<void> {
    if (element instanceof HTMLImageElement) {
        await this.#addImage(element, opts);
    } else if (element instanceof HTMLVideoElement) {
        await this.#addVideo(element, opts);
    } else if (element instanceof HTMLCanvasElement) {
        if (element.hasAttribute("layoutsubtree")) {
            await this.#player.addElement(element, opts); // → "hic" type
        } else {
            await this.#addCanvas(element, opts);
        }
    } else {
        await this.#addText(element, opts);
    }
}
```

### Canvas sizing

**addHTML**: No inner div. Element itself is the `drawElementImage` target.
1. Before wrapping, measure element via `getBoundingClientRect()`
2. Set canvas CSS to measured fixed px values (`width`, `height`)
3. Copy layout-flow styles from element to canvas (`display`, `margin`, `position`, `flex`, `grid-*`)
4. Move element inside canvas, reset element's `margin` to `0`
5. Pixel buffer: `canvas.width = measuredWidth * dpr`
6. ResizeObserver on element → update canvas CSS size + pixel buffer on change

**VFXCanvas**: Inner `<div>` wraps children as single `drawElementImage` target.
1. ResizeObserver on inner div → update canvas pixel buffer
2. Canvas CSS size controlled by user (className, style props)
3. Pixel buffer: `canvas.width = innerDiv.offsetWidth * dpr`

### overlay mode

`addHTML()` does **not** support `overlay` mode. `layoutsubtree` makes children inherently invisible — no way to show the original element. If `opts.overlay` is set, ignore it (or warn).

### `<VFXCanvas>` (react-vfx)

```tsx
<VFXCanvas shader="rainbow" uniforms={...}>
  <p>Content to effect</p>
</VFXCanvas>
```

- Renders `<canvas layoutsubtree ref={canvasRef}><div ref={contentRef}>{children}</div></canvas>`
  - Inner `<div>` wraps children so `drawElementImage` captures everything in one call
- On mount: `vfx.add(canvasRef.current, { shader, ... })` — core detects `layoutsubtree` → hic path
- MutationObserver on canvas: `vfx.update(canvasRef.current)` on changes
- ResizeObserver on inner div → update canvas pixel buffer
- On unmount: `vfx.remove(canvasRef.current)`
- **Fallback**: if html-in-canvas unsupported, render as `<div>` and behave like `<VFXDiv>` (dom-to-canvas)

## Design Concerns

1. **CSS selector breakage** (`addHTML` only) — `>`, `:nth-child` may break due to canvas wrapper. Explicit opt-in via `addHTML()` makes this the user's choice.
2. **Flex/Grid items** — wrapper canvas copies layout-flow styles from element.
3. **Canvas visibility** — `opacity: 0` on wrapper canvas (same as current hiding). `layoutsubtree` additionally prevents children from painting.
4. **`<VFXCanvas>` inner div** — needed to wrap multiple children into one `drawElementImage` target. Default block layout; users control the canvas's own CSS.
5. **Fallback** — `addHTML()` warns and delegates to `add()` if unsupported. `<VFXCanvas>` degrades to `<div>`.
6. **Feature detection** — synchronous cached check for `drawElementImage` on CanvasRenderingContext2D.
7. **Cross-origin content** — `drawElementImage` blocks cross-origin. Out of scope for this PR.

## Implementation Steps

### Step 1: Feature detection — `packages/vfx-js/src/html-in-canvas-support.ts` (new)

Cached synchronous check: `typeof ctx.drawElementImage === "function"`.

### Step 2: TS declarations — `packages/vfx-js/src/html-in-canvas.d.ts` (new)

Extend `CanvasRenderingContext2D` with `drawElementImage`. Extend `HTMLCanvasElement` with `requestPaint`.

### Step 3: HIC module — `packages/vfx-js/src/html-in-canvas.ts` (new)

- `wrapElement(element)` → measure element, create `<canvas layoutsubtree>`, copy layout-flow styles, set fixed CSS size, move element inside, reset element margin, attach ResizeObserver
- `unwrapElement(canvas, element)` → disconnect ResizeObserver, move element out, restore element margin, remove canvas
- `captureElement(canvas, targetChild, oldOffscreen?, maxSize?)` → `drawElementImage` → OffscreenCanvas

### Step 4: VFXPlayer — `packages/vfx-js/src/vfx-player.ts` (modify)

- In `addElement()`: detect `HTMLCanvasElement` + `layoutsubtree` → type `"hic"`, capture via `captureElement()`
- New `updateHICElement(canvas)` — re-capture via `drawElementImage`

### Step 5: VFX class — `packages/vfx-js/src/vfx.ts` (modify)

- New `addHTML(element, opts)` — wrap + delegate to player. Reuse wrapper if already wrapped (re-add with new opts).
- Update `remove()` — unwrap if wrapper exists
- Update `update()` — delegate to `updateHICElement` if wrapper exists
- Update `add()` — detect `layoutsubtree` canvas → hic path (for react-vfx)
- Update `destroy()` — unwrap all remaining wrapper canvases

### Step 6: Types — `packages/vfx-js/src/types.ts` (modify)

- Add `"hic"` to `VFXElementType`

### Step 7: `<VFXCanvas>` — `packages/react-vfx/src/canvas.tsx` (new)

- Renders `<canvas layoutsubtree>` with inner div wrapping children
- VFX registration, MutationObserver, ResizeObserver
- Fallback to `<div>` + dom-to-canvas when unsupported

### Step 8: Exports — `packages/react-vfx/src/react-vfx.ts` (modify)

- Export `VFXCanvas` from react-vfx

## Files Summary

| File | Action |
|------|--------|
| `packages/vfx-js/src/html-in-canvas-support.ts` | **Create** — feature detection |
| `packages/vfx-js/src/html-in-canvas.ts` | **Create** — wrap/unwrap/capture + ResizeObserver |
| `packages/vfx-js/src/html-in-canvas.d.ts` | **Create** — TS declarations |
| `packages/vfx-js/src/types.ts` | **Modify** — add `"hic"` type |
| `packages/vfx-js/src/vfx.ts` | **Modify** — `addHTML()`, update `remove()`/`update()`/`add()`/`destroy()` |
| `packages/vfx-js/src/vfx-player.ts` | **Modify** — hic type handling, `updateHICElement()` |
| `packages/react-vfx/src/canvas.tsx` | **Create** — `VFXCanvas` component |
| `packages/react-vfx/src/react-vfx.ts` | **Modify** — export `VFXCanvas` |

## Verification

1. `npm run build` — type-check
2. `npm run lint`
3. `npm test` — existing tests pass
4. Manual in Chromium with `chrome://flags/#canvas-draw-element`:
   - vfx-js: `vfx.addHTML(element, opts)` renders correctly
   - react-vfx: `<VFXCanvas>` renders correctly
   - `vfx.remove()` unwraps cleanly
   - `addHTML` twice on same element → reuses canvas, applies new shader
   - Layout not disrupted (flex, grid)
5. Fallback: disable flag → `addHTML` warns + uses dom-to-canvas, `<VFXCanvas>` degrades to div
