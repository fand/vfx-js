---
"@vfx-js/effects": patch
---

Fuse Saber Core distortion into final composition with uniform-selected raster and analytic modes, allowing presets to reuse the combined shader. Remove the full-resolution Core warp intermediate on integer raster grids while preserving fractional-grid interpolation and Core/Halo noise sharing.
