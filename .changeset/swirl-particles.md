---
"@vfx-js/effects": minor
---

Add `SwirlParticleEffect`: particles flow over the element's silhouette, extruded into 3D, and peel off in curling wisps, with HDR sparkles and bloom.

- The silhouette is the element's alpha, read back with `ctx.readPixels`. An opaque photo becomes an extruded slab. `sourceChannel: "luminance"` reads where the element is bright instead (e.g. the text of an opaque button), and `"none"` the whole element rect.
- `refresh()` reads the silhouette again after the element's content changes (call it after `vfx.update(img)` for a new `img.src`); the particles keep flowing and move onto the new shape. A change of aspect ratio is recaptured automatically.
- `intro` (seconds, default 1.5): the particles are born over that time when the effect starts, growing in at random moments, so the coat sprouts and the flow builds up instead of popping in whole. Their first lives are shortened at random, so they don't die together. It also applies after a WebGL context restore and to the particles added when `count` grows past what is allocated, but not to `refresh()`. 0 starts with every particle in place; still frames ignore it.
- `palette` takes a preset name or `{ offset, color }` stops, like a CSS `linear-gradient`. Presets are in `SWIRL_PARTICLE_PALETTES`: `nebula` (default), `ember`, `aurora`, `mono`, `sakura` and `ocean`.
- `sourceColor` mixes in the source colour at each particle's spawn point, so the image's colours flow like paint. Videos keep updating.
- Each particle draws a curved, tapering fibre through its recent positions; `streak` sets its length in seconds of travel (0 draws dots).
- Light: `lightDirection` (view space, towards the light, normalised internally), `lightColor`, `lightIntensity`, `ambient`, `occlusion` (crease darkening) and `glint`.
- `shadow: true` casts a soft drop shadow onto the page, a plane parallel to the screen behind the shape, from the same light. Tune it with `shadowOpacity`, `shadowSoftness` (CSS px), `shadowDistance` (world units) and `shadowColor`. Off by default.
- Camera: `yaw`, `pitch`, `orbit` (wobble amplitude) and `fov`, all in degrees, `orbitSpeed` (wobble speed, 0 stops it) and `zoom`. Set `drag: true` to orbit it with pointer drags that start on the element; the window listeners are only there while `drag` is on. `cameraOrigin: "viewport"` puts the camera in front of the viewport's centre instead of the element's: the element still fills its rect, but one away from the centre is seen from the side and changes as the page scrolls.
- New type `OrbitCameraParams`: the camera params, shared with `GlassEffect`.
- `mouse: "repel"` pushes particles away from the cursor (`mouseRadius` in CSS px, `mouseStrength`); `mouse: "tilt"` turns the shape to face it, up to 20° × `mouseStrength`. Off (`"none"`) by default, with no window listeners.
- `count` (default 65536, at most 1,048,576) and `fireflyRatio` are live like every other param: lowering `count` draws fewer particles, raising it past what is allocated reallocates the particle state. Numbers that are not finite fall back to their defaults.
- Output is premultiplied over transparency, in `pad` CSS px around the element (default 200) or `"fullscreen"`.
- `antialias: true` smooths the fibres' edges with 4× MSAA, at about 5× the memory of the particle buffer (10× with its depth). Off by default.
- `new SwirlParticleEffect(params, { still: true })` renders one still frame, drawn again only when params or the element's size change.
- New types: `SwirlParticleParams`, `SwirlParticleColorStop`, `SwirlParticlePaletteName`, `SwirlParticleEffectOptions`.
