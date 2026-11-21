---
"@vfx-js/effects": minor
---

Add `GlassEffect`: the element's silhouette, extruded into 3D, as a block of ray-traced glass with dispersion.

- The silhouette is the element's alpha, read once with `ctx.readPixels`. An opaque photo becomes a slab.
- Shape: `depth` and `bevel`. Most of the rainbow shows on the bevel.
- Glass: `ior`, `dispersion`, `bounces` (internal reflections), `tint`, `absorption`, `reflection`.
- Quality: `paths` rays are traced through the glass per pixel, and `samples` wavelengths are interpolated between them. With `samples` equal to `paths` the channels split into separate bands.
- `backdrop` is what shows through the glass: a procedural pattern (`"stripes"`, `"grid"`, `"checker"`, `"dots"`, `"noise"`, `"none"`) or an image. `backdropVisible: true` draws it around the glass too. The page behind is not refracted.
- Camera: `yaw`, `pitch`, `orbit`, `fov`, `zoom`, `drag`.
