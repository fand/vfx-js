---
"@vfx-js/effects": patch
---

Fuse Saber Glow and Halo warps into final composition on integer raster grids, eliminating their full-resolution intermediate textures. Preserve R16F rounding with a GPU-only probe and retain intermediate interpolation on fractional grids.
