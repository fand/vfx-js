---
"@vfx-js/core": minor
---

`addTransition`: animate an element from its old content to its new content with a shader.

Also: `update()` on html-in-canvas elements now resolves when the capture lands.

A `TransitionDef` is `{ name, ease?, create() }`. `create()` returns `TransitionEffect`s: effects that also see the old snapshot, the progress and the run in `ctx`.
`shaderTransition({ name, frag, uniforms?, ease?, overflow? })` builds a def from one shader.

The spec takes `transition`, `uniforms`, `reverse`, `duration`, `overflow` and `ease` (`"smoothstep"`, `"linear"` or a function). The run's values win over the container's, then the def's.

`run(cb, opts)` takes a function for `opts`, called once after `cb` resolves. Use it when the spec depends on the new content.
