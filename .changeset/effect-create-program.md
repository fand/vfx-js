---
"@vfx-js/core": minor
---

Add `ctx.createProgram({ frag, vert? })` to compile a shader in the background, so a large shader does not freeze the page.

- It returns an `EffectProgram` to draw with: `ctx.draw({ program })`. `program.ready` resolves when it can draw without a wait and rejects on a compile error, and `program.isReady` tells it now.
- Valid in `init()`, `update()` and `render()`. The same sources give the same program, shared with `ctx.draw({ frag })`.
- Drawing with a program that is not ready waits for its compile, so no draw is skipped.
- Uses `KHR_parallel_shader_compile`. Without it, the program compiles at once, as before.
- `ctx.draw({ frag })` is unchanged.
