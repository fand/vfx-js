---
"@vfx-js/core": patch
---

`ctx.blit` writes transparent outside the source. A target larger than the source used to repeat the source's edge pixels. This showed as one frame of stretched content at the start and end of transitions with `overflow`.
