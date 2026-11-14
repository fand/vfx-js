# HTML-in-Canvas

`VFX.addHTML()` allows you to apply effects to a raw HTML element.
It's implemented on the new HTML-in-Canvas API, which is still experimental.

**NOTE: It works on Chrome Canary only.** You can also try this feature on Google Chrome by enabling the flag from `chrome://flags/#canvas-draw-element`, but it's not widely available yet.

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

`VFXCanvas` renders `<canvas layoutsubtree content="drawable" ...rest>` directly, preserving user-passed HTML attributes. It calls `setupCapture`/`teardownCapture` internally.

Falls back to a `<div>` with dom-to-canvas when html-in-canvas is not supported.

With SSR it renders the `<div>` on the server and during hydration, then switches to the `<canvas>` when html-in-canvas is supported. The children mount again once at that point.

### Vue (`@vfx-js/vue`) and Svelte (`@vfx-js/svelte`)

Both have a `VFXCanvas` component with the same props and markup as React's.

```vue
<VFXCanvas shader="rainbow">
  <h1>Hello</h1>
</VFXCanvas>
```

They render the `<div>` on the server and on the first client render, then switch to the `<canvas>` after mount when html-in-canvas is supported. The children mount again once at that point. `v-model:element` (Vue) or `bind:element` (Svelte) gives the element the effect is on, and `null` until then.

## Sizing policy

The canvas's content-box must equal the wrapped element's border-box. Since the canvas is a replaced element, width can't be derived from its children, so it comes from one of the supported cases below — anything else is unsupported:

| Element width | Canvas width | Responsive? |
| --- | --- | --- |
| Fills its containing block (`width: auto` block, or `width: 100%`) | `100%` | ✅ tracks parent |
| Explicit length width (`width: 400px`, from the style attribute or any CSS rule; `em`/`vw` too) | the same width as a border box, plus its `min-width`/`max-width` | constant, except a `%` `max-width`/`min-width` tracks the parent |
| Sized by insets (`position: fixed`/`absolute`, `inset: 10px`, `auto` width/height) | `calc(100% - <insets> - <margins>)`, height too | ✅ tracks containing block |
| **Content-sized** (`inline`/`inline-block`, `float`, `fit-content`, or `width: auto` held in by `max-width`) | — | ❌ **unsupported** |

The litmus test: **does the target's border-box equal its parent's content-box width?** If yes, or if it has an explicit length width, it works. Otherwise it's content-sized and must be wrapped.

### ✅ OK

```html
<!-- full-width block (padding is fine) -->
<section style="padding: 64px 40px">…</section>

<!-- explicit fixed width (inline px) -->
<article style="width: 600px; padding: 32px">…</article>

<!-- explicit fixed width from a stylesheet or #id rule -->
<style>.slides { width: 600px; margin: 40px; }</style>
<div class="slides">…</div>

<!-- fixed width with max-width: tracks the parent -->
<div style="width: 1200px; max-width: 100%">…</div>

<!-- fixed width centered by auto margins -->
<div style="width: 600px; margin: 0 auto">…</div>

<!-- fixed width centered by a flex parent -->
<div style="display: flex; justify-content: center">
  <article style="width: 600px">…</article>
</div>
```

Width, margins, position and flex properties are copied from the element's computed style, so they apply whatever selector set them.

Padding/border on the target is fine in both cases — the canvas content-box is sized to the element's border-box.

### ❌ NG → wrap it

Put the width constraint (`max-width` on an `auto` width, `fit-content`, ...) on a **wrapper**, and let the addHTML target fill that wrapper with `width: 100%`. Keep padding/background on the target so the effect still covers them.

```html
<!-- card held in by max-width only -->
<div style="max-width: 600px; margin: 0 auto">              <!-- wrapper: width only -->
  <article style="padding: 32px; background: #fff">…</article>  <!-- addHTML target -->
</div>
```


## How It Works

Under the hood, the element is captured via the browser's `drawElementImage` API and rendered with WebGL shaders — an alternative to the default dom-to-canvas path (SVG foreignObject serialization).

### Wrapping

`vfx.addHTML(element, opts)` wraps the element in a `<canvas layoutsubtree content="drawable">` and marks it `drawable`:

```
Before:  <div id="target">...</div>
After:   <canvas layoutsubtree content="drawable"><div id="target" drawable>...</div></canvas>
```

Chrome has used two markups for this:

| Chrome | Wrapper | Child | Paint callback |
| --- | --- | --- | --- |
| ≤ 156 | `layoutsubtree` | — | `onpaint` |
| 159 (Canary) | `content="drawable"` (`layoutsubtree` alone no longer paints) | `drawable` | `onpaint` / `paint` event |

VFX-JS sets all of them and listens to both `onpaint` and the `paint` event (one capture per event), so the same wrapper works in either version. `drawElementImage` returns a `DOMMatrix` in older Chrome and nothing in newer; VFX-JS ignores the return value. Use `isHicCanvas(el)` / `markHicCanvas(canvas, child)` from `@vfx-js/core` if you build the wrapper yourself.

Hit testing: on Chrome 156 clicks reach the wrapper's children only with `chrome://flags/#enable-experimental-web-platform-features`; without it, `elementFromPoint` returns the wrapper canvas. On 159 drawable children are hit-tested without that flag.

The canvas copies the element's CSS identity (class + style attributes) so the cascade resolves its layout box; width follows the [Sizing policy](#sizing-policy). `layoutsubtree` makes children participate in layout (for hit testing, accessibility) but not paint — only the canvas's `onpaint` handler produces visual output.

### Capture Pipeline

Per the [WICG spec](https://github.com/WICG/html-in-canvas), `drawElementImage` must be called inside `onpaint` to get the "current frame" snapshot:

```
canvas.onpaint → drawElementImage(child) → copy to OffscreenCanvas → clearRect
                                                        ↓
                                            VFXPlayer uses as WebGL texture
```

The final `clearRect` empties the canvas so it appears invisible — no `opacity:0` needed.

Re-capture is triggered by `canvas.requestPaint()`, called from a ResizeObserver on the canvas whenever its dimensions change.

### Nested canvases

`drawElementImage` draws a `<canvas>` inside the wrapper wrongly. This hits 2D and WebGL canvases alike (p5.js, three.js, ...):

- **Chrome 156** draws it at its **buffer** size, 1 buffer px = 1 device px, ignoring its CSS size: a buffer of CSS size × devicePixelRatio looks right, a smaller buffer is drawn too small, a bigger one is cropped.
- **Chrome 156 and 159** clip it to a buffer-sized box at the **captured element's origin**, not at the canvas's own position. A 640×360 canvas at (320, 212) inside the element keeps only its top-left 320×148 px.

Every capture redraws each visible nested canvas on top, at its layout size and position. (A one-time probe for the bug said "no bug" on a real Chrome 156 page load, so VFX-JS always redraws.)

```
drawElementImage(child) → for each <canvas> in child: drawImage(canvas, content box × buffer scale)
```

Limits of the workaround:

- It draws over everything, so elements stacked **above** a canvas (overlays, positioned labels) are hidden by it.
- A canvas with transparent pixels shows the wrongly sized copy through them.
- It uses the canvas's bounding box: rotated or skewed canvases, `object-fit`, and ancestors' `overflow` clipping are not respected.
- Cost: one `drawImage` per visible canvas per capture.

### Canvas Sizing

Canvas is a **replaced element**. It does NOT auto-fit height to children, even with `layoutsubtree`. Without explicit CSS height, it derives height from the pixel-buffer aspect ratio — which is wrong.

#### What doesn't work

- `width: 100%` with no explicit height: canvas computes height from pixel-buffer aspect ratio, cropping the child.
- A single ResizeObserver on the canvas alone: it can sync the pixel buffer but has no way to know the child's height changed.

#### Current approach

**Width**: Set per the [Sizing policy](#sizing-policy) — `width: 100%` for full-width targets (tracks parent resizes), or the element's own width for elements with an explicit length width. The width is read from the computed style, so a width set by a class or `#id` rule counts too.

- The canvas has no padding or border, so for a `content-box` element the padding and border widths are added: `calc(600px + 20px + 20px)`. For a `border-box` element they are a floor, since a border box can't be narrower than them: `max(100px, 160px)`. `min-width` and `max-width` get the same treatment.
- A `display: table` element, or one whose `min-width`/`max-width` is a keyword such as `min-content`, keeps its used width at wrap time instead. A table grows to fit its content, and the keywords can't go in `calc()` and mean something else on a canvas.
- `max-width: 100%` stays a percentage. The canvas sits in the element's containing block, so `width: 1200px; max-width: 100%` keeps tracking the parent.
- Computed values are used instead of `getBoundingClientRect()`, which a transformed ancestor scales.
- A length in `em` or `vw` computes to px, so it is fixed at wrap time and does not follow later resizes.
- Margins and insets (`top`/`right`/`bottom`/`left`) are copied as computed values too, so `auto` and `%` stay as they are. `margin: 0 auto`, `left: 50%` and `right: 0` keep tracking the containing block after a resize. `getComputedStyle` would resolve them to px at wrap time, and a px `top` on a `bottom: 0` element would also make the canvas grow downward when the content gets taller. Two exceptions keep the px from wrap time:
  - Left and right margins when the canvas width is `100%`. Auto margins against `100%` resolve to 0, which would stretch a flex item placed with `margin-left: auto` or `margin: auto`.
  - Both insets on an axis where they are `auto` on an absolute/fixed element. It sits at its static position, and the canvas, being a block, can have a different one (an inline-level element sits after the text before it).
- `lockCanvasSize` pins the width and height to the used size during a transition, and also sets `flex-grow`/`flex-shrink` to 0 and `min-width`/`max-width` to that width. Otherwise the locked width would become the flex base, and a flex item shrunk from it would shrink again.
- Border widths come from `getComputedStyle`: the computed style map gives `medium` (3px) for a border whose style is `none`.

**Height**: A child ResizeObserver watches the wrapped element and sets the canvas CSS height to match `borderBoxSize.blockSize`. This triggers the canvas ResizeObserver, which syncs the pixel buffer and calls `requestPaint`.

```
child resizes → child RO → set canvas CSS height
                                    ↓
                           canvas RO → sync pixel buffer → requestPaint → onpaint
```

**Pixel buffer**: Canvas ResizeObserver uses `device-pixel-content-box` to set `canvas.width`/`canvas.height` at device-pixel resolution.

## Why not `texElementImage2D`?

The WebGL-level `texElementImage2D` API can bind a DOM element directly as a GPU texture with zero intermediate copies. Three.js's `HTMLTexture` uses this approach. However, it requires the element to be a **child of the WebGL canvas itself** (`layoutsubtree` on the WebGL canvas). VFX-JS's architecture places a separate WebGL overlay canvas over the page, with elements remaining in normal document flow. Moving elements into the WebGL canvas would remove them from flow and make all non-VFX content invisible (since `layoutsubtree` suppresses child painting).

The current approach uses per-element wrapper canvases with `drawElementImage` → OffscreenCanvas → `CanvasTexture`. This preserves document flow at the cost of a GPU→CPU→GPU round-trip per capture.

## Limitations

- **Chrome only, behind a flag** — requires `drawElementImage` and `requestPaint` (Chrome 156 with `chrome://flags/#canvas-draw-element`, or Canary).
- **Nested canvases** — redrawn by a workaround with the limits above; see [Nested canvases](#nested-canvases).
- **Content-sized targets unsupported** — the element must fill its container or have an explicit length width; see [Sizing policy](#sizing-policy).
- **No overlay mode** — `layoutsubtree` hides children visually; `overlay` option is stripped.
- **Element-type selectors** (`div.foo`) won't match the canvas wrapper. Class selectors (`.foo`) work. This doesn't affect width, margins, position or flex properties, which are copied from the computed style, but it does affect other properties on the canvas, such as `transform`, `z-index` or `border-radius`.
- **Structure selectors** (`:nth-child`, `parent > div`) may break since the DOM structure changes.
- **Cross-origin images** are replaced with blob URLs before capture. CORS-blocked images are silently skipped.
