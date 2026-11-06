---
"@vfx-js/core": minor
---

`addTransition`: animate an element from its old content to its new content with a shader. It returns a `TransitionHandle`.

Also: `update()` on html-in-canvas elements now resolves when the capture lands.

A `TransitionDef` is `{ name, ease?, create() }`. `create()` returns `TransitionEffect`s: effects that also see the old snapshot, the progress and the run in `ctx`.
`shaderTransition({ name, frag, uniforms?, ease?, overflow? })` builds a def from one shader.

The spec takes `transition`, `uniforms`, `reverse`, `duration`, `overflow` and `ease` (`"smoothstep"`, `"linear"` or a function). The run's values win over the container's, then the def's.

`run(cb, opts)` takes a function for `opts`, called once after `cb` resolves. Use it when the spec depends on the new content.

`show(slide, opts?)` switches between slides already in the DOM: the container's direct children.
`slide` is an element, an index or a selector. A detached element is appended first.
The other slides get `hidden`, or are removed with `remove: true`.
