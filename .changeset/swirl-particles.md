---
"@vfx-js/effects": minor
---

Add `SwirlParticlesEffect`: particles flow over the element's silhouette, extruded into 3D, and peel off in curling wisps, with HDR sparkles and bloom.

- The silhouette is the element's alpha, read once with `ctx.readPixels`. An opaque photo becomes an extruded slab.
- `palette` takes a preset name or `{ offset, color }` stops, like a CSS `linear-gradient`. Presets are in `SWIRL_PARTICLES_PALETTES`: `nebula` (default), `ember`, `aurora`, `mono`, `sakura` and `ocean`.
- `sourceColor` mixes in the source colour at each particle's spawn point, so the image's colours flow like paint. Videos keep updating.
- Each particle draws a curved, tapering fibre through its recent positions; `streak` sets its length in seconds of travel (0 draws dots).
- Light: `lightDirection` (view space, towards the light, normalised internally), `lightColor`, `lightIntensity`, `ambient`, `occlusion` (crease darkening) and `glint`.
- `shadow: true` casts a soft drop shadow onto the page, a plane parallel to the screen behind the shape, from the same light. Tune it with `shadowOpacity`, `shadowSoftness` (CSS px), `shadowDistance` (world units) and `shadowColor`. Off by default.
- Camera: `yaw`, `pitch`, `orbit` (wobble amplitude), `fov` and `zoom`. Set `drag: true` to orbit it with pointer drags.
- `mouse: "repel"` pushes particles away from the cursor (`mouseRadius` in CSS px, `mouseStrength`); `mouse: "tilt"` turns the shape to face it. Off (`"none"`) by default.
- Output is premultiplied over transparency, in `pad` CSS px around the element or `"fullscreen"` (default).
- `antialias: true` smooths the fibres' edges with 4× MSAA, at about 5× the memory of the particle buffer (10× with its depth). Off by default.
- `new SwirlParticlesEffect(params, { still: true })` renders one still frame.
- New types: `SwirlParticlesParams`, `SwirlParticlesColorStop`, `SwirlParticlesPaletteName`, `SwirlParticlesEffectOptions`.
