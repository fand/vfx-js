---
"@vfx-js/core": minor
---

Add `ctx.resetState()` to `EffectContext`, so effects can use raw `ctx.gl` safely. `resetState()` writes back the GL state the pipeline assumes (framebuffer, viewport, capabilities such as `DEPTH_TEST` / `CULL_FACE`, masks, program / VAO / buffer / sampler bindings, pixel store) without querying it. The `ctx.gl` doc comment now lists the state VFX-JS relies on.
