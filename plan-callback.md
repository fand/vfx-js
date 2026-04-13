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

### setupCapture — shared onpaint + RO logic

Extracted from wrapElement so both `wrapElement` (for `addHTML`) and `VFXCanvas`
(direct `<canvas layoutsubtree>`) can share the same capture path.

```ts
interface CaptureOpts {
    onCapture: (offscreen: OffscreenCanvas) => void;
    maxSize?: number;
}

/**
 * Set up onpaint handler + ResizeObserver on an existing layoutsubtree canvas.
 * Returns the initial OffscreenCanvas (awaits first onpaint).
 */
export async function setupCapture(
    canvas: HTMLCanvasElement,
    opts: CaptureOpts,
): Promise<OffscreenCanvas>
```

- `onCapture`: called on every `onpaint` fire with the captured OffscreenCanvas.
- `maxSize`: texture size cap (renderer.capabilities.maxTextureSize).
- Returns: OffscreenCanvas from the first `onpaint`. Used by addElement for initial texture.

### wrapElement — uses setupCapture internally

```ts
interface WrapResult {
    canvas: HTMLCanvasElement;
    initialCapture: OffscreenCanvas;
}

export async function wrapElement(
    element: HTMLElement,
    opts: CaptureOpts,
): Promise<WrapResult>
```

wrapElement handles CSS identity copy, DOM swap, cross-origin images, then
delegates onpaint + RO to `setupCapture`.

### onpaint handler (inside setupCapture)

```ts
let offscreen: OffscreenCanvas | null = null;
const ctx = canvas.getContext("2d")!;

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

### ResizeObserver (inside setupCapture)

Handles both pixel buffer sync and re-capture trigger.

Current: RO updates canvas.width/height → `onReflow` callback → `updateHICElement` → `captureElement`

New: RO updates canvas.width/height → `canvas.requestPaint()` → onpaint fires → onCapture
```ts
const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const dpSize = entry.devicePixelContentBoxSize?.[0];
        if (dpSize) {
            canvas.width = dpSize.inlineSize;
            canvas.height = dpSize.blockSize;
        } else {
            const box = entry.borderBoxSize?.[0];
            if (box) {
                const dpr = window.devicePixelRatio;
                canvas.width = Math.round(box.inlineSize * dpr);
                canvas.height = Math.round(box.blockSize * dpr);
            }
        }
    }
    canvas.requestPaint();
});
ro.observe(canvas, { box: "device-pixel-content-box" });
```

### Waiting for initial capture

```ts
const firstCapture = new Promise<OffscreenCanvas>(resolve => {
    // resolved inside onpaint (via onCapture above)
});

// requestPaint → onpaint fires → resolve
canvas.requestPaint();
return await firstCapture;
```

## File changes

### 1. `html-in-canvas.ts`

- **Add**: `setupCapture(canvas, opts)` — onpaint handler + RO + initial capture await
- **Add**: `teardownCapture(canvas)` — clears onpaint + disconnects RO
- **Remove**: `waitForPaint()`, `captureElement()`
- **Change**: `wrapElement` signature
  - `onReflow` → `opts: CaptureOpts`
  - Delegates onpaint + RO to `setupCapture` internally
  - Await first onpaint and return `{ canvas, initialCapture }`
  - Remove step 9 (onpaint fallback) — now handled by the main onpaint handler
- **Remove**: all opacity-related logic (onpaint's final clearRect makes it unnecessary)
- **Change**: `unwrapElement` — call `teardownCapture(canvas)` to clear onpaint + RO:
  ```ts
  teardownCapture(canvas);
  ```

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
- ~~**Remove**: hic block in window resize handler~~ — already removed in d94ed8b

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
- **Change**: `update()` — two hic branches both need rewriting:
  ```ts
  // Branch 1: addHTML wrapper path
  if (wrapper) {
      wrapper.requestPaint();
      return;
  }
  // Branch 2: direct layoutsubtree canvas (VFXCanvas)
  // After step 6 (VFXCanvas → addHTML), this becomes dead code and should be removed.
  // During the transition (steps 4-5), keep it working via requestPaint:
  if (element.hasAttribute("layoutsubtree")) {
      (element as HTMLCanvasElement).requestPaint();
      return;
  }
  ```
- Expose `maxTextureSize` getter on VFXPlayer (currently `#renderer` is private)

### 5. `canvas.tsx` (VFXCanvas)

VFXCanvas renders `<canvas layoutsubtree ...rest>` directly. Users pass arbitrary
HTML attributes (id, data-*, aria-*) via `...rest`, so the canvas element must
remain under React's control.

Using `addHTML` would replace the user's canvas with a wrapElement-generated one,
losing `...rest` attributes. Instead, use `setupCapture` directly:

- **Keep**: `<canvas layoutsubtree ...rest>` rendering (preserves user attributes)
- **Remove**: custom RO and MO (setupCapture's RO + onpaint cover both)
- **Change**: useEffect calls `setupCapture(canvas, { onCapture, maxSize })` for
  onpaint + RO setup, and `teardownCapture(canvas)` on cleanup
- **Change**: `vfx.add(canvas)` for initial registration (addElement detects
  layoutsubtree, uses initialCapture passed via optional param)
  
```tsx
// Render (unchanged — ...rest stays on canvas)
React.createElement("canvas", {
    ...rest, ref: canvasRef, layoutsubtree: "", className, style,
}, React.createElement("div", { ref: contentRef }, children));

// useEffect
useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vfx) return;
    setupCapture(canvas, {
        onCapture: (offscreen) => vfx.updateHICTexture(canvas, offscreen),
        maxSize: ...,
    }).then((initialCapture) => {
        vfx.add(canvas, vfxOpts, initialCapture);
    });
    return () => {
        teardownCapture(canvas);
        vfx.remove(canvas);
    };
}, [...]);
```

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
2. Refactor `html-in-canvas.ts` — add `setupCapture`/`teardownCapture`, remove `waitForPaint`/`captureElement`, update `wrapElement`/`unwrapElement`
3. Update `vfx-player.ts` (updateHICElement → updateHICTexture, addElement initialCapture param)
4. Update `vfx.ts` (rewrite addHTML/update)
5. Verify in storybook
6. Rewrite `canvas.tsx` — use `setupCapture`/`teardownCapture`, remove custom RO/MO
7. Remove `update()` branch 2 (direct layoutsubtree path — now dead code)
8. Verify storybook + react-vfx
