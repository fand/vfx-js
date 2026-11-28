---
"@vfx-js/core": minor
"@vfx-js/effects": patch
---

Add explicit `rg32f` render targets, retaining 32-bit vector precision with half the storage of RGBA32F. Unsupported linear filtering or float blending throws rather than silently reducing precision.

Compress Saber distance fields and jump-flood scratch to RG32F for full contours on compatible GPUs. Keep the existing RGBA path during Reveal and on GPUs without the required extensions. Preset settings and noise remain unchanged.
