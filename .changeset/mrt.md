---
"@vfx-js/core": minor
---

Let `ctx.draw()` write several render targets in one draw (multiple render targets).

- `ctx.draw({ target: [a, b, c] })`: target `i` gets the output declared with `layout(location = i) out`. An array of one target works like a single target.
- Each target keeps its own options. Persistent targets all swap after the draw; `swap: false` skips all of them.
- One `blend` applies to every target. The default is `"none"`. If several targets have depth, the first one's depth is used, with a warning.
- The draw warns once and is skipped when the targets differ in size or `samples`, when the array is empty or holds `null`, `ctx.target` or the same target twice, when it has more targets than `MAX_DRAW_BUFFERS`, or when the shader is GLSL 100.
- Declare one output per target. A target with no output holds undefined pixels.
