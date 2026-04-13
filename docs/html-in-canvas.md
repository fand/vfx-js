# HTML-in-Canvas

Captures live HTML elements via the browser's `drawElementImage` API and renders them with WebGL shaders. Alternative to the default dom-to-canvas path (SVG foreignObject serialization).

## Browser Support

**Chrome Canary only.** Requires both `drawElementImage` and `requestPaint`/`onpaint`, which are currently behind `chrome://flags/#enable-experimental-web-platform-features` in Canary.

Regular Chrome (stable/beta) with the same flag provides `drawElementImage` but not `requestPaint`/`onpaint`. A double-rAF fallback (calling `drawElementImage` outside `onpaint`, using the previous frame's snapshot) was considered but rejected — it adds complexity and relies on unspecified behavior. Instead, `supportsHtmlInCanvas()` requires both APIs and falls back to dom-to-canvas when either is missing.

## How It Works

### Wrapping

`vfx.addHTML(element, opts)` wraps the element in a `<canvas layoutsubtree>`:

```
Before:  <div id="target">...</div>
After:   <canvas layoutsubtree><div id="target">...</div></canvas>
```

The canvas copies the element's CSS identity (class + style attributes) so the browser cascade resolves width naturally. `layoutsubtree` makes children participate in layout (for hit testing, accessibility) but not paint — only the canvas's `onpaint` handler produces visual output.

### Capture Pipeline

Per the [WICG spec](https://github.com/WICG/html-in-canvas), `drawElementImage` must be called inside `onpaint` to get the "current frame" snapshot:

```
canvas.onpaint → drawElementImage(child) → copy to OffscreenCanvas → clearRect
                                                        ↓
                                            VFXPlayer uses as WebGL texture
```

The final `clearRect` empties the canvas so it appears invisible — no `opacity:0` needed.

Re-capture is triggered by `canvas.requestPaint()`, called from a ResizeObserver on the canvas whenever its dimensions change.

### Canvas Sizing

Canvas is a **replaced element**. It does NOT auto-fit height to children, even with `layoutsubtree`. Without explicit CSS height, it derives height from the pixel-buffer aspect ratio — which is wrong.

#### What doesn't work

- `width: 100%` with no explicit height: canvas computes height from pixel-buffer aspect ratio, cropping the child.
- A single ResizeObserver on the canvas alone: it can sync the pixel buffer but has no way to know the child's height changed.

#### Current approach

**Width**: CSS cascade from the copied class/style attributes. Falls back to `width: 100%` for elements without explicit width.

**Height**: A child ResizeObserver watches the wrapped element and sets the canvas CSS height to match `borderBoxSize.blockSize`. This triggers the canvas ResizeObserver, which syncs the pixel buffer and calls `requestPaint`.

```
child resizes → child RO → set canvas CSS height
                                    ↓
                           canvas RO → sync pixel buffer → requestPaint → onpaint
```

**Pixel buffer**: Canvas ResizeObserver uses `device-pixel-content-box` to set `canvas.width`/`canvas.height` at device-pixel resolution.

## API

### Core (`@vfx-js/core`)

```ts
// Wrap element and apply shader (falls back to dom-to-canvas if unsupported)
await vfx.addHTML(element, { shader: "rainbow" });

// Feature detection
if (supportsHtmlInCanvas()) { ... }
```

### React (`react-vfx`)

```tsx
<VFXCanvas shader="rainbow">
  <h1>Hello</h1>
  <p>This is captured via drawElementImage.</p>
</VFXCanvas>
```

`VFXCanvas` renders `<canvas layoutsubtree ...rest>` directly, preserving user-passed HTML attributes. It calls `setupCapture`/`teardownCapture` internally.

Falls back to a `<div>` with dom-to-canvas when html-in-canvas is not supported.

## Limitations

- **Chrome Canary only** — requires `requestPaint`/`onpaint` APIs.
- **No overlay mode** — `layoutsubtree` hides children visually; `overlay` option is stripped.
- **Element-type selectors** (`div.foo`) won't match the canvas wrapper. Class selectors (`.foo`) work.
- **Structure selectors** (`:nth-child`, `parent > div`) may break since the DOM structure changes.
- **Cross-origin images** are replaced with blob URLs before capture. CORS-blocked images are silently skipped.
