---
"@vfx-js/effects": minor
---

Add `SwirlParticlesEffect`: particles flow over the element's silhouette, extruded into 3D, and peel off in curling wisps, with HDR sparkles and bloom.

- The silhouette is the element's alpha, read once with `ctx.readPixels`. An opaque photo becomes an extruded slab.
- `palette` takes a preset name or `{ offset, color }` stops, like a CSS `linear-gradient`. Presets are in `SWIRL_PARTICLES_PALETTES`: `nebula` (default), `ember`, `aurora`, `mono`, `sakura` and `ocean`.
- `sourceColor` mixes in the source colour at each particle's spawn point, so the image's colours flow like paint. Videos keep updating.
- Camera: `yaw`, `pitch`, `orbit` (wobble amplitude), `fov` and `zoom`. Set `drag: true` to orbit it with pointer drags.
- Output is premultiplied over transparency, in `pad` CSS px around the element or `"fullscreen"` (default).
- `new SwirlParticlesEffect(params, { still: true })` renders one still frame.
- New types: `SwirlParticlesParams`, `SwirlParticlesColorStop`, `SwirlParticlesPaletteName`, `SwirlParticlesEffectOptions`.
