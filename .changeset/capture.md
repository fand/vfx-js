---
"@vfx-js/core": minor
---

Add `vfx.capture()`, to capture an element as a texture without drawing it, so any effect can read it.

- `vfx.capture(el, { hide })` returns a `VFXCapture` with `texture`, `rect`, `update()` and `dispose()`. It takes `<img>`, `<video>`, `<canvas>` or any HTML (html-in-canvas, or a DOM snapshot as fallback).
- New types: `VFXCapture`, `VFXCaptureOpts`, `VFXCaptureRect`.
- `uniforms` accepts an `EffectTexture` (e.g. `capture.texture`) on the effect path. With `shader`, it is ignored with a warning.
- Drawing a texture from another `VFX` instance now throws.
