---
"@vfx-js/effects": patch
---

Fuse Saber Core distortion into final composition on integer raster grids, removing its full-resolution intermediate texture. Preserve fractional-grid interpolation and Core/Halo noise sharing. Some first preset switches now compile a combined shader variant.
