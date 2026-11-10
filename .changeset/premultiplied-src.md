---
"@vfx-js/core": patch
"@vfx-js/effects": patch
---

Effect path: `ctx.src` is now premultiplied alpha in every stage. The first stage used to get straight alpha, so semi-transparent pixels were too bright.
