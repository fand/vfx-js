# react-vfx

## 1.6.0

### Minor Changes

- e8f816d: Add `autoReverse` to `addTransition` and every `<VFXTransition>`.
  On back it plays the spec that entered the page, reversed. Forward plays it again.
  It needs the Navigation API.
- f86bc71: Add `EffectTexture.update()` to re-upload a texture wrapped with `autoUpdate: false`.
- df914c6: Rework enter/leave transitions as "scroll reveal".
  
  - Add `intersection.leaveThreshold` and `intersection.duration` options.
  - Add `enterProgress` / `leaveProgress` shader uniforms and `EffectContext` fields.
    They play backward when the element turns back mid-way.
  - Rename `warpTransition`, `slitScanTransition`, `pixelateTransition` and `focusTransition` to `warpReveal`, `slitScanReveal`, `pixelateReveal` and `focusReveal`.
    The old names still work.
  - Fix `warpReveal`, `slitScanReveal` and `pixelateReveal`: no jump on reversal, and no divide by zero in `pixelateReveal`.
  - The visible ratio now divides by the smaller of the element size and the viewport size (after `rootMargin`), on each axis.
    An element larger than the viewport can now reach 1.
    With a negative `rootMargin`, smaller elements can also reach 1 sooner.
    This changes `intersection` values and `threshold` results.
  - `enterTime` / `leaveTime` uniforms are now always finite.
- 01cec71: Render nothing when the user prefers reduced motion.
  Elements stay plain HTML, and transitions cut to the new content.

### Patch Changes

- 7397ab1: Shrink bundles.
  Build to ES2022 so private fields stay native.
  Mark effects and transitions as side-effect free so bundlers drop unused presets.
- 13ba938: Keep scroll positions in the dom-to-canvas fallback capture.
- 0361fb7: html-in-canvas: size the wrap canvas from insets for `position: fixed` / `absolute` targets with `auto` width or height, like `inset: 10px`.
  Replaced elements like `<img>` keep their own size when wrapped.
- 7e72991: Effect path: `ctx.src` is now premultiplied alpha in every stage. The first stage used to get straight alpha, so semi-transparent pixels were too bright.
- 95fef40: Show `<img>` in the dom-to-canvas fallback capture on Safari.
- 9abce97: Cut the run when the browser already animated the navigation, like a swipe back on a phone.

## 1.5.0

### Minor Changes

- 6e91576: Add `slideSpec` to `addTransition` to set how each slide enters with `show()`.

### Patch Changes

- 6e91576: Fix an error thrown when a wrapped element is hidden with `display: none`.

## 1.4.0

### Minor Changes

- 3b9589a: **Experimental.** The transition API may change in minor releases.

  `addTransition`: animate an element from its old content to its new content with a shader. It returns a `TransitionHandle`.

  Also: `update()` on html-in-canvas elements now resolves when the capture lands.

  A `TransitionDef` is `{ name, ease?, create() }`. `create()` returns `TransitionEffect`s: effects that also see the old snapshot, the progress and the run in `ctx`.
  `shaderTransition({ name, frag, uniforms?, ease?, overflow? })` builds a def from one shader.

  The spec takes `transition`, `uniforms`, `reverse`, `duration`, `overflow` and `ease` (`"smoothstep"`, `"linear"` or a function). The run's values win over the container's, then the def's.

  `run(cb, opts)` takes a function for `opts`, called once after `cb` resolves. Use it when the spec depends on the new content.

  `show(slide, opts?)` switches between slides already in the DOM: the container's direct children.
  `slide` is an element, an index or a selector. A detached element is appended first.
  The other slides get `hidden`, or are removed with `remove: true`.

### Patch Changes

- 3b9589a: `ctx.blit` writes transparent outside the source. A target larger than the source used to repeat the source's edge pixels. This showed as one frame of stretched content at the start and end of transitions with `overflow`.

## 1.3.0

### Minor Changes

- b82efab: Multipass: intermediate passes now get element-space uniforms with `overflow` or fullscreen, same as the final pass.

  - `resolution` is the element size, `offset` is the element origin inside the buffer, and `mouse` is in buffer pixels.
  - Buffers VFX-JS renders (`src` after the first pass, `<target>`, `backbuffer`) cover the whole buffer. Under overflow, later passes must read them with `toBuffer(uv)`. See [docs/MULTIPASS.md "Overflow"](https://github.com/fand/vfx-js/blob/main/docs/MULTIPASS.md#overflow).

  To migrate, pick one:

  - Keep the old output: in intermediate passes, replace `offset` with `viewport.xy` and `resolution` with `viewport.zw`.
  - Use the new rule: leave intermediate passes as they are, and read buffers in later passes with `toBuffer(uv)`.

### Patch Changes

- f25d02a: html-in-canvas: support Chrome 159+ (`content="drawable"` + `drawable` child, `paint` event) alongside `layoutsubtree`, and redraw nested canvases at their layout size and position where Chrome draws them at buffer size (156) or clips them to a box at the element's origin (156, 159).

## 1.2.0

### Minor Changes

- 948860f: Add `ctx.clear(target)` to zero a render target with a fast GPU clear instead
  of a full-screen draw. Clears both sides of a ping-pong (`persistent: true`)
  RT, and scissors to the stage viewport when clearing the stage output.

  Particle, particle-explode, and fluid effects now use it for their per-frame
  accumulation / trail / pressure-init clears, cutting GPU bandwidth.

- Add ctx.clear() / Add Datamosh heal params

## 1.1.0

### Minor Changes

- Effect API improvements

## 1.0.0

### Major Changes

- VFX-JS v1: new Effect API

## 0.13.0

### Minor Changes

- Remove Three.js dependency

## 0.12.0

### Minor Changes

- Improve WebGL error handling

## 0.11.1

### Patch Changes

- Fix dom-to-canvas bugs

## 0.11.0

### Minor Changes

- HTML-in-Canvas experimental support

## 0.10.1

### Patch Changes

- Fix scroll overflow in Quirks mode

## 0.10.0

### Minor Changes

- Improve iOS support

## 0.9.2

### Patch Changes

- Fix multipass options in element shaders

## 0.9.1

### Patch Changes

- fix cyclic texture reference in multipas shader

## 0.9.0

### Minor Changes

- Multipass shader support

## 0.8.0

### Minor Changes

- Posteffect shader etc

## 0.7.0

### Minor Changes

- Backbuffer support / Scroll sync improvement
- Backbuffer support / Scroll sync improvement

## 0.6.0

### Minor Changes

- Support WebGL2 shaders

## 0.5.2

### Patch Changes

- Fix pixelRatio not working

## 0.5.1

### Patch Changes

- Fix intersection calculation on VFX.add()

## 0.5.0

### Minor Changes

- Add intersection options

## 0.4.1

### Patch Changes

- Fix texture update bug on canvas resize

## 0.4.0

### Minor Changes

- Add canvas support etc

## 0.3.0

### Minor Changes

- Migrate to ESM

## 0.2.0

### Minor Changes

- Add shaders and fixed minor bugs

## 0.6.2

### Patch Changes

- Fix initial loading bug
