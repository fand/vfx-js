---
"@vfx-js/core": minor
"@vfx-js/effects": patch
---

Add `ctx.clear(target)` to zero a render target with a fast GPU clear instead
of a full-screen draw. Clears both sides of a ping-pong (`persistent: true`)
RT, and scissors to the stage viewport when clearing the stage output.

Particle, particle-explode, and fluid effects now use it for their per-frame
accumulation / trail / pressure-init clears, cutting GPU bandwidth.
