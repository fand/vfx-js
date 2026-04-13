# Plan: onpaint callback refactor

## Problem

`captureElement` calls `drawElementImage` outside `onpaint`.
Per the WICG spec, calls outside `onpaint` use "the previous frame's snapshot",
meaning a snapshot taken while opacity:0 could be used. Currently works only
due to Chromium implementation leniency.

All WICG official examples follow this pattern:
```js
canvas.onpaint = () => {
    ctx.drawElementImage(child, x, y);  // always inside onpaint
};
canvas.requestPaint();
```

## Target

Call `drawElementImage` inside `onpaint` for spec compliance.
Side effects: removes `waitForPaint` (double-rAF hack) and the opacity dance.

## Design

### New wrapElement signature

```ts
interface WrapResult {
    canvas: HTMLCanvasElement;
    initialCapture: OffscreenCanvas;
}

export async function wrapElement(
    element: HTMLElement,
    opts: {
        onCapture: (offscreen: OffscreenCanvas) => void;
        maxSize?: number;
    },
): Promise<WrapResult>
```

- `onCapture`: called on every `onpaint` fire with the captured OffscreenCanvas.
- `initialCapture`: OffscreenCanvas from the first `onpaint`. Used by addElement for initial texture.
- `maxSize`: texture size cap (renderer.capabilities.maxTextureSize).

### onpaint handler (inside wrapElement)

```ts
let offscreen: OffscreenCanvas | null = null;

canvas.onpaint = () => {
    const child = canvas.firstElementChild;
    if (!child || canvas.width === 0 || canvas.height === 0) return;

    // 1. drawElementImage inside onpaint → "current frame" snapshot
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawElementImage(child, 0, 0);

    // 2. Copy to OffscreenCanvas (with maxSize clamp)
    let w = canvas.width, h = canvas.height;
    if (maxSize && (w > maxSize || h > maxSize)) {
        const s = Math.min(maxSize / w, maxSize / h);
        w = Math.floor(w * s);
        h = Math.floor(h * s);
    }
    if (!offscreen || offscreen.width !== w || offscreen.height !== h) {
        offscreen = new OffscreenCanvas(w, h);
    }
    const offCtx = offscreen.getContext("2d")!;
    offCtx.clearRect(0, 0, w, h);
    offCtx.drawImage(canvas, 0, 0, w, h);

    // 3. Clear canvas so wrapper appears empty
    //    (VFXPlayer's WebGL canvas renders the shader version)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    onCapture(offscreen);
};
```

**Key**: final `clearRect` empties the canvas visually → opacity:0 no longer needed.

### Waiting for initial capture

```ts
const firstCapture = new Promise<OffscreenCanvas>(resolve => {
    // resolved inside onpaint (via onCapture above)
});

// After DOM swap, requestPaint → onpaint fires → resolve
canvas.requestPaint();
const initialCapture = await firstCapture;
return { canvas, initialCapture };
```

### ResizeObserver change

Current: RO updates canvas.width/height → `onReflow` callback → `updateHICElement` → `captureElement`

New: RO updates canvas.width/height → `canvas.requestPaint()` → onpaint fires → onCapture
```ts
const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
        // update canvas.width/height (existing logic)
        ...
    }
    canvas.requestPaint();  // replaces onReflow
});
```

## File changes

### 1. `html-in-canvas.ts`

- **Remove**: `waitForPaint()`, `captureElement()`
- **Change**: `wrapElement` signature
  - `onReflow` → `opts: { onCapture, maxSize }`
  - Set up `onpaint` handler internally (design above)
  - Await first onpaint and return `{ canvas, initialCapture }`
  - RO: `onReflow?.(canvas)` → `canvas.requestPaint()`
  - Remove step 9 (onpaint fallback) — now handled by the main onpaint handler
- **Remove**: all opacity-related logic (onpaint's final clearRect makes it unnecessary)
- `unwrapElement` unchanged

### 2. `html-in-canvas.d.ts`

- Add `onpaint` event handler type:
```ts
interface HTMLCanvasElement {
    requestPaint(): void;
    onpaint: (() => void) | null;
}
```

### 3. `vfx-player.ts`

- **Remove**: `updateHICElement()`
- **Add**: `updateHICTexture(canvas, offscreen)` — synchronous texture swap
  ```ts
  updateHICTexture(canvas: HTMLCanvasElement, offscreen: OffscreenCanvas): void {
      const e = this.#elements.find(e => e.element === canvas);
      if (!e || e.type !== "hic") return;
      const srcUniform = e.passes[0].uniforms["src"];
      const oldTexture: THREE.CanvasTexture = srcUniform.value;
      if (oldTexture.image === offscreen) {
          oldTexture.needsUpdate = true;
      } else {
          const texture = new THREE.CanvasTexture(offscreen);
          texture.wrapS = oldTexture.wrapS;
          texture.wrapT = oldTexture.wrapT;
          srcUniform.value = texture;
          e.srcTexture = texture;
          oldTexture.dispose();
      }
  }
  ```
- **Change**: `addElement` hic branch — use `initialCapture` from wrapElement instead of calling `captureElement`
  - addElement can't access wrapElement's return (called from VFX.addHTML)
  - → Add optional `initialTexture` parameter to addElement. Use it for hic.
- **Remove**: hic block in window resize handler (L238-246) — RO + onpaint handles this

### 4. `vfx.ts`

- **Change**: `addHTML`
  ```ts
  const { canvas, initialCapture } = await wrapElement(element, {
      onCapture: (offscreen) => {
          this.#player.updateHICTexture(canvas, offscreen);
      },
      maxSize: this.#player.maxTextureSize,
  });
  // pass initialCapture to addElement
  await this.#player.addElement(canvas, hicOpts, initialCapture);
  ```
- **Change**: `update()` hic branch — `updateHICElement` → `canvas.requestPaint()`
  ```ts
  if (wrapper) {
      wrapper.requestPaint();
      return;
  }
  ```
- Expose `maxTextureSize` getter on VFXPlayer (currently `#renderer` is private)

### 5. `canvas.tsx` (VFXCanvas)

VFXCanvas renders `<canvas layoutsubtree>` directly without using `wrapElement`.
Two options:

**A. Unify on addHTML** (recommended):
- Render `<div ref={contentRef}>{children}</div>`
- Call `vfx.addHTML(contentRef.current, opts)` in useEffect
- Remove all custom RO/MO logic (wrapElement handles it)

**B. Set up onpaint independently**:
- Keep current structure, add own onpaint handler
- Duplicates wrapElement logic

→ **Adopt A**. VFXCanvas simplifies significantly.

## Opacity handling

### Current
VFXPlayer's addElement (L367-375) sets `element.style.opacity = "0"`.
For hic, element = wrapper canvas, so the entire canvas is hidden.
captureElement temporarily flips opacity to 1 for drawElementImage.

### New
onpaint handler: drawElementImage → copy to OffscreenCanvas → `ctx.clearRect` empties canvas.
Canvas content is empty, so opacity:0 is unnecessary.

→ Skip "Hide original element" for hic type in addElement:
```ts
if (type === "hic") {
    /* onpaint clears the canvas — no need to hide */
} else if (opts.overlay === true) { ... }
```

## Verification

1. **Does onpaint fire without opacity:0?** — Spec says yes, but verify in Chromium
2. **Does clearRect inside onpaint make canvas visually empty?** — No blank flash
3. **Is the RO → canvas.width/height → requestPaint → onpaint chain stable?**
   — Must not infinite-loop (canvas.width change should not re-trigger RO)
4. **VFXCanvas (React) addHTML migration** — ref forwarding works correctly

## Implementation order

1. Add `onpaint` type to `html-in-canvas.d.ts`
2. Refactor `html-in-canvas.ts` (remove waitForPaint/captureElement, add onpaint)
3. Update `vfx-player.ts` (updateHICElement → updateHICTexture, resize handler cleanup)
4. Update `vfx.ts` (rewrite addHTML/update)
5. Verify in storybook
6. Rewrite `canvas.tsx` to use addHTML
7. Verify storybook + react-vfx
