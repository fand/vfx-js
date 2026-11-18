---
"@vfx-js/core": minor
---

Add depth buffers and MSAA to effect render targets, and depth and cull options to `ctx.draw()`, so effects can draw 3D meshes.

- `ctx.createRenderTarget({ depth, samples })`: `depth: true` adds a depth buffer. `samples: 4` turns on MSAA. A multisampled target still samples and blits like a normal one. With `float: true` it uses 16-bit float. If the GPU can't take 4 samples for the format, it uses 1 and warns.
- `rt.depthTexture` reads the depth as a texture: raw non-linear values in [0, 1], nearest sampling. A persistent target gives the read side's depth.
- `ctx.draw({ depthTest, depthFunc, depthWrite, cull })`: the state applies to that draw only. Depth options on a target without depth (the canvas, `ctx.target`, or a target made without `depth`) are ignored with a warning.
- `ctx.clear(target, { color, depth })` picks what to clear. Both default to `true`.
- New types: `EffectDepthFunc`, `EffectCullMode`, `EffectClearOpts`.
