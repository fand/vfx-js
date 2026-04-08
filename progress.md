# Mobile bug fixes — investigation log

Branch: `fix/mobile-bugs`. Test page: `packages/docs/test.html`.

## ✅ Done (committed)

8 commits already on `fix/mobile-bugs`, in order:

1. **`deb6d17` chore(docs): expose dev server on LAN for mobile testing**
   `vite.config.ts`: `host: true` + `allowedHosts: [".ts.net"]` for iOS device testing.

2. **`33c1b1c` fix: disable blending for passes that render to a buffer target**
   Element passes & post-effect passes that render to an intermediate `target` now use `THREE.NoBlending` + `transparent: false`. iOS Safari doesn't support `EXT_float_blend`, and compute-style passes (fluid sim) want their output written verbatim.

3. **`38ef328` fix: clamp dom-to-canvas texture size to GL MAX_TEXTURE_SIZE**
   `dom-to-canvas` accepts a `maxSize`, downscales the OffscreenCanvas uniformly when DPR-scaled rect exceeds it. `VFXPlayer` queries `gl.MAX_TEXTURE_SIZE` once and threads it through. Prevents GL texture-upload errors on iOS Safari for tall pages.

4. **`d8a12c6` feat: dispatch synthetic mousemove from touchmove for touch devices**
   `VFXPlayer` listens for `touchmove` (passive) and re-dispatches the first touch as a synthetic `mousemove` on `window`. iOS Safari does not synthesize this normally.

5. **`76fae15` fix: clip element viewport to render target bounds in #render**
   `#render` clips the viewport rect to the current render target's bounds before `setViewport`. Mobile GPUs (Adreno, some Mali) use limited-precision fixed-point arithmetic in the rasterizer; geometry whose transformed vertices exceed ~16384 device pixels causes visible clipping/wraparound on the framebuffer. Symptom on Android: scrolling past ~scrollY 5310 made the upper portion of the visible area render transparent. Threshold matched `(glRect.y + glRect.h) * pixelRatio ≈ 16384 = 2^14`.

6. **`d49064c` chore(docs): leave alt-init lines commented in test.html**
   Two commented `// const vfx = new VFX(); …` scaffolding lines for switching between post-effect and per-element pass modes during debugging.

7. **`a77ff28` fix: render <img> via SVG <image> overlay on WebKit (iOS/macOS Safari)**
   WebKit's SVG-as-image rasterizer refuses to render `<img>` elements (and `background-image`) inside `<foreignObject>`, even with data URL `src`. Detect support at module load by rendering a 1×1 SVG with a foreignObject `<img>` and sampling alpha; cache the result. WebKit fallback: hide cloned imgs with `visibility: hidden` and overlay each as a native SVG `<image>` element. SVG `<image>` with a data URL is allowed in WebKit's SVG-as-image context. Uniform border-radius is preserved via `<clipPath><rect rx ry></clipPath>`. Non-uniform corners, object-fit, CSS filters on the img element are lost in this fallback (acceptable trade-off for getting images at all).

8. **`d605b63` fix: honor object-fit/object-position in WebKit <image> overlay path**
   Translate the cloned img's computed `object-fit` / `object-position` into SVG `preserveAspectRatio`:
   - `fill` → `none`
   - `contain` → `x{Min,Mid,Max}Y{Min,Mid,Max} meet`
   - `cover` → `x{Min,Mid,Max}Y{Min,Mid,Max} slice`
   - `none` / `scale-down` → fall back to `fill`

## 🟡 Active investigation: iOS touch events during momentum scroll

### Symptom
- Initial touch from a still page → fluid sim reacts ✓
- Touching the screen *during native momentum scroll* → fluid sim does **not** react

### Root cause confirmed
**iOS Safari does not deliver any touch event to JS during a native momentum scroll.** Verified by adding logging to `#touchstart`, `#touchmove` (window), `#touchmove` (document), `pointermove`, and `scroll` listeners. During the symptom, **none** of `[ts]` / `[tm]` / `[tmd]` / `[pm]` fire — only `[scroll]` and `[render]` fire (rAF keeps running). Tested with both `passive: true` and `passive: false`. This is a fundamental WebKit behavior, no programmatic workaround exists for native scroll.

### Workaround being tried: Lenis with `syncTouch: true`
Replace native momentum scroll with JS-driven smooth scroll so touchmove keeps firing throughout the entire interaction.

```js
import Lenis from "https://esm.sh/lenis@1.1.20";
const lenis = new Lenis({ autoRaf: true, syncTouch: true });
```

`syncTouch: true` is required — Lenis 1.x defaults to letting native handle touch.

**Result so far: touch capture works.** Touchmove events fire continuously even mid-swipe-during-momentum. The fluid sim now responds.

### 🔴 New problem introduced by Lenis: layout becomes wider on iPad

After adding Lenis, the rendered texture is wider than the visible canvas, and the right edge of the rendered output is cropped (~10%). Sometimes image placement in the rendering also goes "メチャメチャ" (intermittent).

#### Device & data
- iPad Pro (`screen.width=820`, `screen.height=1180` → likely iPad 10.9" / 10th gen, screen reports portrait dims)
- Reproduces in both portrait and landscape but with different cropped axis:
  - **Portrait** → right edge cropped
  - **Landscape** → bottom edge cropped

#### Diagnostic snapshots

**Portrait (earlier test, iPad with possibly Safari sidebar visible):**
```
innerWidth: 745
html  cw/sw: 820 / 820
body  cw/sw: 820 / 820
body rect : 0,0 → 820×1052
#app rect : 0,0 → 820×3977
html class: "lenis"
body class: ""
body style: null
html style: null
scrollBarSize: 0
```
→ visual viewport (745) **smaller than** layout viewport (820). 75 px difference ≈ ~10%.

**Landscape (latest test):**
```
inner       : 1180 × 692
html  cw/ch : 1180 × 692
html  sw/sh : 1180 × 3243
body  cw/ch : 1180 × 692
body  sw/sh : 1180 × 3818
screen      : 820 × 1180
visualViewport: 1180 × 692 (scale 1)
#app rect   : x=0 y=-3057 width=1180 height=3242 (scrolled to bottom)
```
→ All dimensions **consistent at 1180**. No visual/layout mismatch in landscape. Yet user reports "page bottom is cropped" in landscape — possibly a different bug.

#### What we've ruled out
- **Lenis modifying CSS**: confirmed via console — `html.cssText`, `body.cssText` are empty; `touch-action: auto`; `overflow: visible`; `position: static`; `overscroll-behavior: auto`. Lenis is not changing any styles we can see.
- **Pinch zoom**: tried `<meta name="viewport" content="… maximum-scale=1, user-scalable=no">`. Did not fix the issue. Reverted to plain `width=device-width, initial-scale=1`.
- **`100vw` on canvas style widening body**: VFX-JS canvas was created with `width: 100vw; height: 100vh;` initial style (later overridden by `setSize()`). Tried changing to `width: 0px; height: 0px;` in `packages/vfx-js/src/vfx.ts`. Did not fix the issue.

#### Hypotheses still open
1. **iPad Safari sidebar behavior** — the portrait 745/820 split matches "iPad with side panel showing". The visual viewport shrinks for the sidebar but the layout viewport stays at full screen. Lenis somehow triggers or exposes this. Not confirmed.
2. **Lenis preventing native scroll changes iOS viewport calculation mode** — when `preventDefault` is called on touch, iPad Safari may use a different layout-viewport calculation than for natively-scrollable pages.
3. **Landscape "bottom crop"** — the data shows everything matching (1180=1180), so this is likely a *different* bug, not the same layout/visual mismatch. Possibly canvas-position or texture-clamp related. Needs more specific data: what exactly is visually cropped?

#### Files currently dirty (uncommitted)
- `packages/docs/test.html`: Lenis import + init (`syncTouch: true`); recently the user has been editing the displayShader (added a "dispersion" loop).
- `packages/vfx-js/src/vfx.ts`: canvas initial style `100vw/100vh` → `0px/0px` (experimental, did not fix the bug).

## Next steps

1. **Get fresh diagnostic in portrait** with the current code (Lenis enabled, canvas style `0px/0px`, plain `width=device-width` meta). Need full snapshot:
   ```js
   console.log("inner:", innerWidth, innerHeight);
   console.log("html cw/ch/sw/sh:", documentElement.clientWidth, documentElement.clientHeight, documentElement.scrollWidth, documentElement.scrollHeight);
   console.log("body cw/ch/sw/sh:", body.clientWidth, body.clientHeight, body.scrollWidth, body.scrollHeight);
   console.log("screen:", screen.width, screen.height);
   console.log("visualViewport:", visualViewport.width, visualViewport.height, "scale:", visualViewport.scale);
   console.log("#app rect:", JSON.stringify(document.getElementById("app").getBoundingClientRect()));
   ```
   To know whether portrait still shows 745 vs 820 split.

2. **Get screenshot or precise description of what is cropped in landscape.** "Bottom edge cropped" could mean: (a) WebGL canvas not covering bottom of viewport, (b) the rendered texture missing the bottom rows, (c) the last section's rendered content cut off. Need to disambiguate.

3. **Test without Lenis but in the same iPad orientation/sidebar state**, confirming layout values match (`innerWidth === documentElement.clientWidth`). This locks in that Lenis is the trigger of the portrait split.

4. **If the portrait split is reproducible without Lenis (just by opening Safari sidebar)**, the bug is iPad-Safari-sidebar-specific and we need to make VFX-JS use `documentElement.clientWidth` (or equivalent) consistently with `getBoundingClientRect` of children, instead of `innerWidth`, to keep canvas dimensions consistent with element rects.

5. **Alternative fallback if Lenis cannot be made to work cleanly**: drop Lenis and accept the iOS-momentum-scroll touch suppression as a known limitation (revert commits / fail gracefully). The other 8 fixes are independent and stand on their own.

## Files of interest

- `packages/vfx-js/src/vfx-player.ts` — `#updateCanvasSize`, `#touchmove`, `#render`. This file holds the core scroll/touch/canvas logic.
- `packages/vfx-js/src/vfx.ts` — `getCanvasStyle`. Currently has the experimental `0px/0px` change.
- `packages/vfx-js/src/dom-to-canvas.ts` — texture rendering with `maxSize` clamp + WebKit overlay path.
- `packages/docs/test.html` — fluid sim sandbox; dirty with Lenis import + recent shader edits.
