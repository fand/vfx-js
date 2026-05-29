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

**Width**: The target is assumed to **fill its containing block** (full-width). The canvas uses `width: 100%` so it tracks parent resizes. An element with an explicit **px** width is the exception: the canvas is pinned to the measured border-box (`rect.width`), which is a constant and therefore reflow-safe. See [Sizing policy](#sizing-policy) for what this rules out.

**Height**: A child ResizeObserver watches the wrapped element and sets the canvas CSS height to match `borderBoxSize.blockSize`. This triggers the canvas ResizeObserver, which syncs the pixel buffer and calls `requestPaint`.

```
child resizes → child RO → set canvas CSS height
                                    ↓
                           canvas RO → sync pixel buffer → requestPaint → onpaint
```

**Pixel buffer**: Canvas ResizeObserver uses `device-pixel-content-box` to set `canvas.width`/`canvas.height` at device-pixel resolution.

### Sizing policy

The canvas's content-box must equal the wrapped element's border-box. Since the canvas is a replaced element, width can't be derived from its children, so it comes from one of two cases:

| Element width | Canvas width | Responsive? |
| --- | --- | --- |
| Fills its containing block (`width: auto` block, or `width: 100%`) | `100%` | ✅ tracks parent |
| Explicit **px** width (`width: 400px`) | pinned `rect.width` | constant (reflow-safe) |
| **Content-sized** (`inline`/`inline-block`, `float`, `fit-content`, `max-width`, side `margin: auto`) | — | ❌ **unsupported** |

The litmus test: **does the target's border-box equal its parent's content-box width?** If yes, or if it has a fixed px width, it works. Otherwise it's content-sized and must be wrapped.

#### ✅ OK

```html
<!-- full-width block (padding is fine) -->
<section style="padding: 64px 40px">…</section>

<!-- explicit fixed width (inline px) -->
<article style="width: 600px; padding: 32px">…</article>
```

Padding/border on the target is fine in both cases — the canvas content-box is sized to the element's border-box.

#### ❌ NG → wrap it

Put the width constraint (fixed width, `max-width`, centering margins) on a **wrapper**, and let the addHTML target fill that wrapper with `width: 100%`. Keep padding/background on the target so the effect still covers them.

```html
<!-- centered fixed-width card -->
<div style="display: flex; justify-content: center">
  <div style="width: 600px">                                     <!-- wrapper: width only -->
    <article style="width: 100%; padding: 32px; background: #fff">…</article>  <!-- addHTML target -->
  </div>
</div>
```

> Class-declared widths are not detected (only inline `style="width:…px"` is). Declare fixed widths inline, or wrap the element.

## API

### Core (`@vfx-js/core`)

```ts
// Wrap element and apply shader (falls back to dom-to-canvas if unsupported)
await vfx.addHTML(element, { shader: "rainbow" });

// Feature detection
if (supportsHtmlInCanvas()) { ... }
```

### React (`@vfx-js/react`)

```tsx
<VFXCanvas shader="rainbow">
  <h1>Hello</h1>
  <p>This is captured via drawElementImage.</p>
</VFXCanvas>
```

`VFXCanvas` renders `<canvas layoutsubtree ...rest>` directly, preserving user-passed HTML attributes. It calls `setupCapture`/`teardownCapture` internally.

Falls back to a `<div>` with dom-to-canvas when html-in-canvas is not supported.

## Why not `texElementImage2D`?

The WebGL-level `texElementImage2D` API can bind a DOM element directly as a GPU texture with zero intermediate copies. Three.js's `HTMLTexture` uses this approach. However, it requires the element to be a **child of the WebGL canvas itself** (`layoutsubtree` on the WebGL canvas). VFX-JS's architecture places a separate WebGL overlay canvas over the page, with elements remaining in normal document flow. Moving elements into the WebGL canvas would remove them from flow and make all non-VFX content invisible (since `layoutsubtree` suppresses child painting).

The current approach uses per-element wrapper canvases with `drawElementImage` → OffscreenCanvas → `CanvasTexture`. This preserves document flow at the cost of a GPU→CPU→GPU round-trip per capture.

## Limitations

- **Chrome Canary only** — requires `requestPaint`/`onpaint` APIs.
- **Content-sized targets unsupported** — the element must fill its container or have an explicit px width; see [Sizing policy](#sizing-policy).
- **No overlay mode** — `layoutsubtree` hides children visually; `overlay` option is stripped.
- **Element-type selectors** (`div.foo`) won't match the canvas wrapper. Class selectors (`.foo`) work.
- **Structure selectors** (`:nth-child`, `parent > div`) may break since the DOM structure changes.
- **Cross-origin images** are replaced with blob URLs before capture. CORS-blocked images are silently skipped.
