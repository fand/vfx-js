---
"@vfx-js/effects": minor
---

Add `GlassEffect`: the element's silhouette, extruded into 3D, as a block of ray-traced glass with dispersion.

- The silhouette is the element's alpha, read back with `ctx.readPixels`. An opaque photo becomes a slab. `sourceChannel: "luminance"` reads where the element is bright instead (e.g. the text of an opaque button), and `"none"` the whole element rect.
- `refresh()` reads the silhouette again after the element's content changes (call it after `vfx.update(img)` for a new `img.src`); the glass keeps the current shape until the new one is read. A change of aspect ratio is recaptured automatically.
- Shape: `depth` and `bevel`. Most of the rainbow shows on the bevel. `bevelShape: "chamfer"` cuts it flat instead of round, and `bulge` / `bulgeWidth` raise the caps in the middle, for lenses and gems. `relief` raises the front cap by the element's luminance, so a button's label or a photo's content shows as shape; `reliefBlur` smooths it.
- Surface: `bump` / `bumpScale` ripple the normals like hammered glass; `frost` makes it rough, blurring the backdrop (images too, through a mipmapped copy) and the lights.
- Glass: `ior`, `dispersion`, `bounces` (internal reflections), `tint`, `absorption`, `reflection`.
- Quality: `paths` rays are traced through the glass per pixel, and `samples` wavelengths are interpolated between them. With `samples` equal to `paths` the channels split into separate bands.
- `backdrop` is what shows through the glass: a procedural pattern (`"stripes"`, `"grid"`, `"marble"`, `"flow"`, `"none"`) or an image. Patterns are coloured through a palette, `backdropColors`: a preset (`"mono"`, `"pastel"`, `"redblue"`, see `GLASS_PALETTES`) or your own list of colours, each covering an equal share of the area. `backdropSoftness` goes from hard bands to a gradient through the colours; `backdropRatio` sets the balance of a two-colour palette. `backdropVisible: true` draws it around the glass too. The page behind is not refracted.
- Camera: the same params as `SwirlParticleEffect` (the `OrbitCameraParams` type), angles in degrees: `yaw`, `pitch`, `orbit` (wobble amplitude), `orbitSpeed` (wobble speed), `fov` (across the element's long side), `zoom`, `drag` (pointer drags that start on the element) and `cameraOrigin` (`"element"`, or `"viewport"` to look from the viewport's centre).
- New type `SourceChannel` (`"alpha" | "luminance" | "none"`), shared with `SwirlParticleEffect`; `HoloSourceChannel` is the same type.
