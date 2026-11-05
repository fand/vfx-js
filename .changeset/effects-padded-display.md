---
"@vfx-js/effects": patch
---

`DatamoshEffect` and `PixelSortEffect` (with `angle`) draw transparent outside the content rect when the input stage is padded. They used to stretch the edge pixels.
