---
"@vfx-js/core": minor
---

`addTransition`: animate an element from its old content to its new content with a shader.

Also: `update()` on html-in-canvas elements now resolves when the capture lands.

`TransitionDef` takes default `uniforms` and `ease` (`"smoothstep"` or `"linear"`).

`run(cb, opts)` takes a function for `opts`, called once after `cb` resolves. Use it when the spec depends on the new content. With a function, driver effects and `prepare` run after `cb`, while the old snapshot is still on screen.
