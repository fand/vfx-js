# @vfx-js/effects

## 1.5.0

### Minor Changes

- 2e95bdb: Add `BubbleEffect`: the element's silhouette, extruded into 3D, filled with a foam of transparent soap bubbles in thin-film colours.

  - The silhouette is read back as for `GlassEffect`: `sourceChannel`, `refresh()`, and a recapture when the element's aspect ratio changes.
  - Big bubbles are spread through the shape by Poisson disk sampling (no lattice shows); smaller ones fill the gaps between them and along the outline, placed on the CPU into the largest gap first. Where spheres overlap, they are cut by one flat wall they share (a power diagram); where they are exposed, they keep their round outside. Along each ray the films are found exactly, with no marching inside the foam: the shader walks a uniform grid over the spheres.
  - Bubbles: `cellSize` (the big bubbles), `minSize` (the smallest, as a share of `cellSize`; 1 turns the fill off), `containment` (0 lets bubbles poke out of the silhouette; above 0 what pokes out is squashed towards the shape, keeping its roundness, and at 1 the bubbles are pressed flat against it), `cellSizeRandomness`, `roundness` (at the same bubble size, from a flat-walled foam to whole spheres that touch), `seed`, `wobble` / `speed` (a slow drift: the walls breathe), `depth`, `bevel` (rounded edges of the shape), `maxLayers`. Changing a placement param places the bubbles again, in a worker: about 30 ms at the defaults, up to seconds for a deep shape or a small `minSize`. `wobble` and `containment` only rebuild the grid over them.
  - Film: the colour is thin-film interference, from a table baked once from the CIE colour matching functions. `iridescence`, `thickness` in nm, `thicknessVariation` / `swirlScale` / `swirlSpeed` for swirls, `drain` (thinner at the top), `reflection`, `rim` (0 keeps the interference colours to the edge in place of the bright white rim), `tint` / `tintStrength` (the colour films scatter, stronger at grazing angles and in deep stacks), `opacity` / `color` (matte, opaque bubbles).
  - Borders: on the foam's outside, where two bubbles meet, the water gathered there: over `borderWidth` (a share of `cellSize`) the film thickens towards it, more for a wider border, and a pale line (`borderHighlight`) runs along it. Walls inside the foam get none.
  - Films do not bend light, so the page shows through the foam. `backdrop`, `backdropColors` and the other backdrop and light params are those of `GlassEffect`; with `backdropVisible: true` the backdrop is drawn behind the foam, and with `backdropAround: true` the films reflect it in front too, in place of the even sky.
  - Camera and output as in `GlassEffect` (`OrbitCameraParams`, `pointer: "tilt"`, `antialias`, `resolution`, `pad`). `debug: "cost"`, `"layers"` or `"cells"` shows a debug view.
  - The shader is built for the kind of backdrop in use (none, a pattern, or an image), as in `GlassEffect`, and for whether `containment` is 0, between, or 1. A change across these compiles a new shader on its first frame.
  - The silhouette's distance field is built in a worker, shared by `GlassEffect`, `BubbleEffect` and `SwirlParticleEffect`, so reading the shape back does not stall the page. Without workers (e.g. a CSP that blocks `blob:` URLs) it runs on the page.

- 2049065: Add `GlassEffect`: the element's silhouette, extruded into 3D, as a block of ray-traced glass with dispersion.

  - The silhouette is the element's alpha, read back with `ctx.readPixels`. An opaque photo becomes a slab. `sourceChannel: "luminance"` reads where the element is bright instead (e.g. the text of an opaque button), and `"none"` the whole element rect.
  - `refresh()` reads the silhouette again after the element's content changes (call it after `vfx.update(img)` for a new `img.src`); the glass keeps the current shape until the new one is read. A change of aspect ratio is recaptured automatically.
  - Shape: `depth` and `bevel`. Most of the rainbow shows on the bevel. `bevelShape: "chamfer"` cuts it flat instead of round, and `bulge` / `bulgeWidth` raise the caps in the middle, for lenses and gems. `relief` raises the front cap by the element's luminance, so a button's label or a photo's content shows as shape; `reliefBlur` smooths it.
  - Surface: `bump` / `bumpScale` ripple the normals like hammered glass; `frost` makes it rough, blurring the backdrop (images too, through a mipmapped copy) and the lights.
  - Glass: `ior`, `dispersion`, `bounces` (internal reflections), `tint`, `absorption`, `reflection`.
  - The shader is built for the kind of backdrop in use (none, a pattern, or an image), so it compiles faster. A change of `backdrop` to another kind compiles a new shader on its first frame.
  - Quality: `paths` rays are traced through the glass per pixel, and `samples` wavelengths are interpolated between them. With `samples` equal to `paths` the channels split into separate bands.
  - `backdrop` is what shows through the glass: a procedural pattern (`"stripes"`, `"grid"`, `"marble"`, `"flow"`, `"none"`) or an image. Patterns are coloured through a palette, `backdropColors`: a preset (`"mono"`, `"pastel"`, `"redblue"`, see `BACKDROP_PALETTES`) or your own list of colours, each covering an equal share of the area. `backdropSoftness` goes from hard bands to a gradient through the colours; `backdropRatio` sets the balance of a two-colour palette. `backdropVisible: true` draws it around the glass too. The page behind is not refracted. New types `BackdropPatternName`, `BackdropPaletteName` and `BackdropImageSource`, shared with `BubbleEffect`.
  - Camera: the same params as `SwirlParticleEffect` (the `OrbitCameraParams` type), angles in degrees: `yaw`, `pitch`, `orbitAnimation` (amplitude of a slow camera swing), `orbitSpeed` (its speed), `fov` (across the element's long side), `zoom`, `drag` (pointer drags that start on the element) and `cameraOrigin` (`"element"`, or `"viewport"` to look from the viewport's centre).
  - `pointer: "tilt"` turns the glass to face the pointer, up to 20° × `pointerStrength` (default 1, capped at 90°) when the pointer is half a viewport from the element's centre, as in `SwirlParticleEffect`. Off (`"none"`) by default, with no window listeners. New type `GlassPointer`.
  - `antialias` (on by default) smooths the edges with FXAA on the final image; `resolution` (0.25 to 2) sets the render scale, and 2 supersamples.
  - New type `SourceChannel` (`"alpha" | "luminance" | "none"`), shared with `SwirlParticleEffect`; `HoloSourceChannel` is the same type.
  - The silhouette's distance field is built in a worker, shared by `GlassEffect`, `BubbleEffect` and `SwirlParticleEffect`, so reading the shape back does not stall the page. Without workers (e.g. a CSP that blocks `blob:` URLs) it runs on the page.

- 88509bc: Add `HoloEffect`, the holographic foils of [holo.spot](https://www.holo.spot), ported from [holospot](https://github.com/dmitrykurash/holospot) (MIT).

  - Materials: `prism` (rainbow foil), `shatter` (gold cracked ice), `nebula` (glitter), `sparkle` (sparkle film), `vortex` (gold spiral) and `emboss` (a foil logo pressed into cotton paper, with the element printed on the paper; the logo's artwork is the `emboss.logo` setting, an image or a URL, or `"element"` to press the element itself in foil over `emboss.print`, a paper colour or a transparent ground), with holo.spot's spectral studio lights, environment, glare, grain and tone curve.
  - `settings` takes holo.spot's setting ids (typed, checked against holo.spot's ranges), and `holo` a holo.spot "Copy settings" blob as copied. `HoloEffect.looks` holds the looks holo.spot ships (its card, 3D object and paper card), and `HoloEffect.startingPoints` holo.spot's material starting points (`HoloEffect.startingPoints.prism.compactDisc`, …). The holo.spot side is the `holo` param: a Copy settings blob, settings with the kit's options, or a list of them applied in order, later values winning. The other params say how the element becomes the card (`sourceChannel`, `ink`, `flat`, `sizeMm`, `antialias`); `setParams` assigns params as in other effects.
  - The element is lit as a card and tilts toward the pointer: turning in 3D through holo.spot's camera lens by default (`lens`; 4× MSAA by default as holospot, `antialias`), or in place with `flat: true` (the light rig turns instead). `structureScale` (holo.spot's `object.structureScale`) scales shards, flakes and dots. Scene shorthands write holo.spot settings: `exposure`, `tone`, `glare`, `grain`, `studio`, `background`, `bow`, `pose`, `lens`, `pointer`, `tiltRange`, `wobble`, `wobbleAmp`, with holo.spot's units and ranges. `quality` takes holospot's tiers, including `"auto"`. `sourceChannel` decides which channel of the element is the foil's shape (its alpha, its luminance, or none: the whole rect), and `ink` tints the foil with the element's colours.
  - Each material's code loads when the material is first used (a chunk per material); `HoloEffect.preload` loads ahead, and `@vfx-js/effects/holo/static` has every material built in.
  - `effect.ready` resolves once the emboss logo and paper have loaded and drawn; `effect.errors` lists loading errors.
  - `HoloEffect.settingSpecs(material)` and `effect.resolvedSettings()` help build a settings UI.
  - New types: `HoloParams`, `HoloSettingsInput`, `HoloSceneParams`, `HoloMaterial`, `HoloLogo`, `HoloTone`, `HoloStudio`, `HoloPointer`, `HoloStartingPoint`, `HoloStartingPoints`, `HoloStartingPointNames`, `HoloSettingSpec`, `HoloQuality`, `HoloSourceChannel`, `HoloSettings`, `HoloSettingId`, `HoloSettingValue`, `HoloCopyBlob`, `HoloVec2`.

- 258a088: Add `SwirlParticleEffect`: particles flow over the element's silhouette, extruded into 3D, and peel off in curling wisps, with HDR sparkles and bloom.

  - The silhouette is the element's alpha, read back with `ctx.readPixels`. An opaque photo becomes an extruded slab. `sourceChannel: "luminance"` reads where the element is bright instead (e.g. the text of an opaque button), and `"none"` the whole element rect.
  - `refresh()` reads the silhouette again after the element's content changes (call it after `vfx.update(img)` for a new `img.src`); the particles keep flowing and move onto the new shape. A change of aspect ratio is recaptured automatically.
  - `intro` (seconds, default 1.5): the particles are born over that time when the effect starts, growing in at random moments, so the coat sprouts and the flow builds up instead of popping in whole. Their first lives are shortened at random, so they don't die together. It also applies after a WebGL context restore and to the particles added when `count` grows past what is allocated, but not to `refresh()`. 0 starts with every particle in place; still frames ignore it.
  - `palette` takes a preset name or `{ offset, color }` stops, like a CSS `linear-gradient`. Presets are in `SWIRL_PARTICLE_PALETTES`: `nebula` (default), `ember`, `aurora`, `mono`, `sakura` and `ocean`.
  - `sourceColor` mixes in the source colour at each particle's spawn point, so the image's colours flow like paint. Videos keep updating.
  - Each particle draws a curved, tapering fibre through its recent positions; `streak` sets its length in seconds of travel (0 draws dots).
  - Light: `lightDirection` (view space, towards the light, normalised internally), `lightColor`, `lightIntensity`, `ambient`, `occlusion` (crease darkening) and `glint`.
  - `shadow: true` casts a soft drop shadow onto the page, a plane parallel to the screen behind the shape, from the same light. Tune it with `shadowOpacity`, `shadowSoftness` (CSS px), `shadowDistance` (world units, from the shape's front face: 0 puts the page against it) and `shadowColor`. Off by default.
  - Camera: `yaw`, `pitch`, `orbitAnimation` (amplitude of a slow camera swing) and `fov`, all in degrees, `orbitSpeed` (speed of `orbitAnimation`, 0 stops it) and `zoom`. Set `drag: true` to orbit it with pointer drags that start on the element; the window listeners are only there while `drag` is on. `cameraOrigin: "viewport"` puts the camera in front of the viewport's centre instead of the element's: the element still fills its rect, but one away from the centre is seen from the side and changes as the page scrolls.
  - New type `OrbitCameraParams`: the camera params, shared with `GlassEffect`.
  - `pointer: "repel"` pushes particles away from the pointer, opening a hole the flow goes around (`pointerRadius` in CSS px, default 120); `pointer: "tilt"` turns the shape to face it, up to 20° × `pointerStrength` (capped at 90°) when the pointer is half a viewport from the element's centre, as in `GlassEffect`. `pointerStrength` (default 1) scales the push or the tilt. Off (`"none"`) by default, with no window listeners.
  - `count` (default 65536, at most 1,048,576, or 262,144 on a GPU with 2048 px textures) and `fireflyRatio` are live like every other param: lowering `count` draws fewer particles, raising it past what is allocated reallocates the particle state. Numbers that are not finite fall back to their defaults.
  - Output is premultiplied over transparency, in `pad` CSS px around the element (default 200) or `"fullscreen"`.
  - `antialias: true` smooths the fibres' edges with 4× MSAA, at about 5× the memory of the particle buffer (10× with its depth). Off by default.
  - `new SwirlParticleEffect(params, { still: true })` renders one still frame, drawn again only when params or the element's size change (or, with `cameraOrigin: "viewport"`, its position in the viewport).
  - New types: `SwirlParticleParams`, `SwirlParticleColorStop`, `SwirlParticlePaletteName`, `SwirlParticleEffectOptions`, `SwirlParticlePointer`.
  - The silhouette's distance field is built in a worker, shared by `GlassEffect`, `BubbleEffect` and `SwirlParticleEffect`, so reading the shape back does not stall the page. Without workers (e.g. a CSP that blocks `blob:` URLs) it runs on the page.

### Patch Changes

- 2a81073: Add `ctx.readPixels(target, opts?)` to read a render target back to the CPU without stalling the GPU.

  - Resolves with a `Uint8Array` for 8-bit targets and a `Float32Array` for float targets. MSAA targets are resolved first, and `persistent: true` targets give the side last written.
  - `opts: EffectReadPixelsOpts` is `{ flipY? }`, to get rows top-down.
  - The promise rejects when the effect is disposed or the WebGL context is lost.
  - `JPEGGlitchEffect` reads with it, instead of relying on the framebuffer that `ctx.draw` left bound.

- 83b6e1a: Export types that public APIs already use, so they can be imported and appear in the API reference.

  - `@vfx-js/core`: `EffectBlendMode`, `MarginOpts`, `VFXUniforms`, `VFXUniformValue`, `VFXWrap`
  - `@vfx-js/effects`: `BloomParams`, `FluidParams`, `HalftoneParams`, `HalftoneMode`, `HalftoneInk`, `HalftoneInkPalette`, `MatrixTrailColor`, `ParticleParams`, `ParticleExplodeParams`, `PixelateParams`, `ScanlineParams`, `VoronoiParams`

- 70c5b2a: Require the `@vfx-js/core` version they are released with (`^<version>`, as the framework bindings do) instead of `>=1.6.0`. `@vfx-js/effects` uses `ctx.readPixels`, which `@vfx-js/core` 1.6.0 does not have.

## 1.4.4

### Patch Changes

- Require `@vfx-js/core` >=1.6.0, which passes premultiplied `ctx.src`.
- 7397ab1: Shrink bundles.
  Build to ES2022 so private fields stay native.
  Mark effects and transitions as side-effect free so bundlers drop unused presets.
- 7e72991: Effect path: `ctx.src` is now premultiplied alpha in every stage. The first stage used to get straight alpha, so semi-transparent pixels were too bright.

## 1.4.3

### Patch Changes

- 713dac9: Add `.js` to relative imports so Node can load the ESM build without a bundler.

## 1.4.2

### Patch Changes

- 3b9589a: `DatamoshEffect`, `PixelSortEffect` and `JPEGGlitchEffect` capture only the content rect when the input stage is padded. They used to squeeze the pad into the element and stretch the edges.

## 1.4.1

### Patch Changes

- Require `@vfx-js/core` 1.3.0 or later. Fluid and particle effects use `ctx.clear()`, which older core versions do not have.

## 1.4.0

### Minor Changes

- 3acbda6: Add heal params to `DatamoshEffect` so the mosh can heal block by
  block like a real codec: `healRate` (random refresh chance per block per
  frame) and `healThreshold` (refresh blocks with bad motion matches).
- Add ctx.clear() / Add Datamosh heal params

### Patch Changes

- 948860f: Add `ctx.clear(target)` to zero a render target with a fast GPU clear instead
  of a full-screen draw. Clears both sides of a ping-pong (`persistent: true`)
  RT, and scissors to the stage viewport when clearing the stage output.

  Particle, particle-explode, and fluid effects now use it for their per-frame
  accumulation / trail / pressure-init clears, cutting GPU bandwidth.

## 1.3.0

### Minor Changes

- Add new effect: SliceShiftEffect, PixelStretchEffect, WarpEffect, DitherEffect, TilePixelateEffect, PatternRefractionEffect, ColoredEdgesEffects

## 1.2.0

### Minor Changes

- Add effect: BadJpegEffect

## 1.1.0

### Minor Changes

- Add effects: Datamosh, Pixelsort, JPEGGlitch
- Add effects: Datamosh, Pixelsort, JPEGGlitch

## 1.0.0

### Major Changes

- VFX-JS v1: new Effect API

### Patch Changes

- Updated dependencies
  - @vfx-js/core@1.0.0
