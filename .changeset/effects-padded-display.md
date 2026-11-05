---
"@vfx-js/effects": patch
---

`DatamoshEffect` and `PixelSortEffect` capture only the content rect when the input stage is padded. They used to squeeze the pad into the element and stretch the edges.
