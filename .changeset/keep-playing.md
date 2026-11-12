---
"@vfx-js/core": minor
---

Add `keepPlaying` to transitions, so the old content keeps playing during a run.

- `show()` hands the old slide over by itself.
- `run(cb)` passes a `ctx` to `cb`. Call `ctx.keepPlaying(nodes)` before you drop the old nodes.
