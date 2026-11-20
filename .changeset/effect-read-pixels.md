---
"@vfx-js/core": minor
"@vfx-js/effects": patch
---

Add `ctx.readPixels(target, opts?)` to read a render target back to the CPU without stalling the GPU.

- Resolves with a `Uint8Array` for 8-bit targets and a `Float32Array` for float targets. MSAA targets are resolved first, and `persistent: true` targets give the side last written.
- `opts: EffectReadPixelsOpts` is `{ flipY? }`, to get rows top-down.
- The promise rejects when the effect is disposed or the WebGL context is lost.
- `JPEGGlitchEffect` reads with it, instead of relying on the framebuffer that `ctx.draw` left bound.
