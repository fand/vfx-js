---
"@vfx-js/effects": patch
---

`DatamoshEffect`, `PixelSortEffect` and `JPEGGlitchEffect` capture only the content rect when the input stage is padded. They used to squeeze the pad into the element and stretch the edges.
