# Effects (`effect` option)

An `Effect` is a class with lifecycle hooks.
Use it for prebuilt effects, chains of effects, or your own reusable effect with several passes, persistent buffers, custom geometry, or output larger than the element.

## Prebuilt effects (`@vfx-js/effects`)

```bash
npm i @vfx-js/core @vfx-js/effects
```

```ts
import { VFX } from "@vfx-js/core";
import { BloomEffect, PixelateEffect, ScanlineEffect } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(img, {
    effect: [
        new PixelateEffect({ size: 10 }),
        new ScanlineEffect({ spacing: 5 }),
        new BloomEffect({ intensity: 10 }),
    ],
});

// Swap the chain in place. Unchanged instances keep their state.
await vfx.updateEffects(img, [new BloomEffect({ intensity: 8 })]);
```

Each constructor takes a partial params object.
Most effects read `effect.params` every frame, so you can change it live (e.g. from a slider): `bloom.params.intensity = 3`.
For the exact params, read the `.d.ts` files in `node_modules/@vfx-js/effects/lib/esm/`.

| Effect | What it does |
| --- | --- |
| `AsciiEffect` | ASCII / glyph mosaic from a dark-to-light character ramp. |
| `BadJpegEffect` | JPEG degradation: chroma subsampling, blocky DCT, re-encode loss. |
| `BloomEffect` | Bloom with soft-knee threshold. Draws outside the element. |
| `BubbleEffect` | A foam of transparent soap bubbles with thin-film (structural) colour, filling the element's silhouette extruded to 3D. Big bubbles are spread through the shape by Poisson disk sampling (no lattice shows); smaller ones fill the gaps between them and along the outline (placed on the CPU, greedily into the largest gap). Where spheres overlap they are cut by one flat shared wall (a power diagram), where they are exposed they keep their round outside. The films are found exactly along each ray. Bubbles: `depth` (default 0.1), `bevel` (radius of the rounded edges, up to `depth` / 2, default 0.02; the bubbles fill the rounded shape and a container rounds them off along its edges), `cellSize` (size of the big bubbles: their radius is 0.86 of it, long side of the element = 2; default 0.1), `minSize` (smallest bubbles, share of `cellSize`, 0.05 to 1, default 0.25; 1 turns the fill off), `containment` (0 to 1, default 0: how much the shape acts as a container; the part of a bubble that pokes out of the shape is squashed towards it, keeping its roundness, down to flat at 1, like foam blown up in a mould), `cellSizeRandomness` (0 to 1, how much the big radii vary), `roundness` (0 to 1, at the same bubble size: 0 packs them overlapping into a flat-walled foam, 1 spaces them a diameter apart into whole spheres that touch, with small ones in the gaps; default 0.3), `seed`, `wobble` (drift per bubble radius, 0 to 0.15) / `speed` (slow drift; walls breathe), `maxLayers` (films composited per pixel, 1 to 16). Changing a placement param (`depth`, `bevel`, `cellSize`, `minSize`, `cellSizeRandomness`, `roundness`, `seed`) places the bubbles again on the CPU, in a worker (about 30 ms at the defaults; up to seconds for a deep shape, `depth` 1 or more, or a small `minSize`); `wobble` and `containment` rebuild the grid over them, which is quicker. The last foam is drawn until the new one is ready. Film: `iridescence` (0 colourless to 1 full interference colour), `thickness` (nm), `thicknessVariation` / `swirlScale` / `swirlSpeed` (swirls), `drain` (thinner at the top), `reflection`, `rim` (0 to 1, default 1: the bright white rim a film shows at a grazing angle; 0 keeps the interference colours to the edge), `tint` / `tintStrength` (colour the films scatter, more at grazing angles and in deep stacks), `opacity` / `color` (0 to 1: the bubbles turn into matte, opaque balls). Borders, on the foam's outside where two bubbles meet (walls inside get none): `borderWidth` (the water gathered there, share of `cellSize`, 0 off to 0.5, default 0.06: the film thickens over this width, by 100 nm per 0.01 at the border, so wider borders show more bands of colour), `borderHighlight` (white line the water scatters, 0 off to 2, default 0.35). With `borderWidth` at 0 the work is skipped. The page shows through the foam unless `backdropVisible: true` draws the `backdrop` (same patterns, palettes and images as `GlassEffect`). `backdropAround: true` reflects the backdrop all around, in front too, in place of the even sky (the films only reflect it behind otherwise). Lights `lightIntensity` / `lightSoftness` as in `GlassEffect`; `resolution`; `pad` (default 100); `sourceChannel`, the camera, `pointer: "tilt"` and `antialias` as in the shared section below. Call `refresh()` after the element's content changes. `debug` (`BubbleDebugView`): `"cost"` (texture lookups), `"layers"` (films per pixel) or `"cells"` (bubbles in flat colours). |
| `ChromaticEffect` | Chromatic aberration. |
| `ColoredEdgesEffect` | Edge detection with two edge colors. |
| `DatamoshEffect` | Fake datamosh. Call `enable()` / `disable()`. |
| `DitherEffect` | Bayer / blue-noise dither with few color levels. |
| `DuotoneEffect` | Two-color map. |
| `FluidEffect` | Fluid simulation driven by the pointer. |
| `GlassEffect` | Ray-traced glass with a rainbow split, in the shape of the element's silhouette extruded to 3D. Shape `depth` / `bevel` / `bevelShape` (`"round"` or `"chamfer"`, `GlassBevelShape`) / `bulge` (caps rise in the middle, over `bulgeWidth` from the edge) / `relief` (the front cap rises with the element's luminance, so a button's label or a photo shows as shape; negative raises the dark parts; `reliefBlur` smooths it, more for busy photos; read back with the silhouette, so a video gives a still relief); glass `ior` / `dispersion` / `bounces` (reflections inside before the ray is forced out, 0 to 5, default 2) / `tint` / `absorption`; surface `bump` / `bumpScale` (rippled normals, 0 = off) and `frost` (0 to 1, blurs what is seen through and reflected on the glass); quality `paths` (rays traced, 1 to 4) and `samples` (wavelengths, 1 to 16; equal to `paths` gives separate RGB bands). `backdrop` is what shows through the glass: a pattern (`BackdropPatternName`: `"stripes"`, `"grid"`, `"marble"` (contour bands of a noise field), `"flow"` (a diagonal run through the palette bent by noise into wavering ribbons), `"none"`) coloured through `backdropColors`, a palette: a `BackdropPaletteName` (`"mono"`, the default black and white, `"pastel"`, `"redblue"`; colours in `BACKDROP_PALETTES`) or 2+ `#rrggbb` colours, each with an equal share of the area (stripes, marble and flow go round them, the last running into the first; the grid nests them as squares); `backdropSoftness` 0 is hard bands, 1 a gradient through the colours; `backdropRatio` is the second colour's share with a two-colour palette or an image (`BackdropImageSource`: element, `ImageBitmap` or URL), with `backdropVisible: true` to draw it around the glass too. It does not refract the page. Shares the silhouette, camera, pointer, `antialias` and `pad` params with `SwirlParticleEffect` (see below); its defaults: `yaw` 29, `pitch` 14, `orbitAnimation` 20, `orbitSpeed` 3.3, `fov` 30, `zoom` 0.7, `pointer: "none"` (`GlassPointer`: `"none"` or `"tilt"`), `antialias: true`, `pad` 100 (`"fullscreen"` with `cameraOrigin: "viewport"`). Heavy per pixel: lower `resolution` (render scale, 0.25 to 2; 2 supersamples) or `bounces` on slow GPUs; `debug: "outer"` / `"inner"` / `"total"` (`GlassDebugView`) shows the SDF lookups per pixel as a heat map. |
| `GlitchEffect` | Block shift and aberration glitch. |
| `GradientMapEffect` | Map luminance to a color gradient. |
| `HalftoneEffect` | RGB / CMYK halftone screen. |
| `HoloEffect` | Holographic foil (holo.spot materials): rainbow foil, gold shatter, glitter, sparkle, spiral, foil-embossed paper. Tilts with the pointer. |
| `HueShiftEffect` | Rotate hue. |
| `JPEGGlitchEffect` | Real JPEG glitch: corrupts the encoded bytes. |
| `LightStreakEffect` | Anamorphic flare / starburst streaks. |
| `MatrixEffect` | Digital rain of glyphs over the source. |
| `ParticleEffect` | GPU particles emitted from the mouse. |
| `ParticleExplodeEffect` | One-shot burst that shatters the element. Call `trigger()`. |
| `PatternRefractionEffect` | Refraction through ribbed glass: lenticular, waves or circular. |
| `PixelateEffect` | Pixelation. `size` in CSS px. |
| `PixelSortEffect` | Threshold pixel sort, any angle. |
| `PixelStretchEffect` | Smear one scan line across a band of the image. |
| `RainbowEffect` | Moving rainbow gradient. |
| `RgbGlitchEffect` | Block glitch with RGB split. |
| `RgbShiftEffect` | RGB channel shift. |
| `SaberEffect` | A distorted core and four glow layers along the outline, with independent `coreDistortion` / `glowDistortion`, optional halo, brightness flicker and twelve preset names. Defaults to Electric. `thickness` and `pad` use CSS px (`pad`: 80 or `"fullscreen"`); `source: false` draws light only. Outline from alpha, or `edge: "luminance"` with `edgeThreshold` for photos. `start` / `end` (0..1 along each outline loop) reveal or erase the contour; `segments` (default 3) creates several reveal heads; `fade` (CSS px, default 100) adds a fading tail behind `start` (0 = crisp cut). Outline caching: call `effect.invalidate()` after `await vfx.update(el)` changes content without resizing, or use `dynamic: true` for video. |
| `ScanlineEffect` | CRT scanlines. |
| `SinewaveEffect` | Sine wave distortion. |
| `SliceShiftEffect` | Split into strips and shift each toward the center. |
| `SwirlParticleEffect` | Particles flow over the element's silhouette, extruded to 3D, and peel off in wisps. Gradient `palette` (preset name from `SWIRL_PARTICLE_PALETTES` or `{ offset, color }` stops), `sourceColor` to use the image's colors, `count` (default 65536, max 2^20, or 2^18 on GPUs with 2048 px textures; about 180 bytes of GPU memory each; live), `intro` (seconds the particles take to be born at start, default 1.5; 0 = all at once), `depth`, light `lightDirection` / `lightColor` / `lightIntensity` / `ambient` / `occlusion` / `glint`, and an optional drop shadow on the page behind (`shadow: true`, `shadowOpacity` / `shadowSoftness` (CSS px) / `shadowDistance` (from the shape's front face; 0 puts the page against it) / `shadowColor`). Shares the silhouette, camera, pointer, `antialias` and `pad` params with `GlassEffect` (see below); its defaults: `yaw` 0, `pitch` 0, `orbitAnimation` 23, `orbitSpeed` 1, `fov` 35, `zoom` 1, `pointer: "none"`, `antialias: false`, `pad: 200`. `pointer` (`SwirlParticlePointer`) also takes `"repel"`: particles near the pointer are pushed away from it, opening a hole the flow goes around (`pointerRadius` in CSS px, default 120; `pointerStrength` scales the push). The output is premultiplied over transparency. |
| `TilePixelateEffect` | Pixelate into shaped tiles. |
| `TritoneEffect` | Three-color map. |
| `VignetteEffect` | Vignette. |
| `VoronoiEffect` | Voronoi cells around the cursor. |
| `WarpEffect` | Sine wave, twist or ripple warp. |

### `GlassEffect`, `SwirlParticleEffect` and `BubbleEffect`

All three extrude the element's silhouette to a 3D shape and share these params; the camera ones are the `OrbitCameraParams` type.
Angles are in degrees. Lengths in the 3D scene (`depth`, `bevel`, `shadowDistance`, …) are relative to the element's long side, which is 2; `pad`, `pointerRadius` and `shadowSoftness` are CSS px.

```ts
import { GlassEffect, SwirlParticleEffect } from "@vfx-js/effects";

await vfx.add(button, {
    effect: new GlassEffect({ sourceChannel: "luminance", drag: true, pointer: "tilt" }),
});
await vfx.add(logo, {
    effect: new SwirlParticleEffect({ palette: "ember", pointer: "repel" }),
});
```

- `sourceChannel` (`SourceChannel`): what the silhouette is: `"alpha"` (where the element is opaque; default), `"luminance"` (where it is bright, e.g. the text of an opaque button) or `"none"` (the whole element rect). An opaque photo with `"alpha"` becomes a slab.
- Camera: `yaw` / `pitch` (the rest pose; positive turns the front to the right / down), `orbitAnimation` (amplitude of a slow back-and-forth camera swing; 0 = still), `orbitSpeed` (speed multiplier of `orbitAnimation`; 0 stops it), `fov` (across the element's long side; only changes the strength of the perspective), `zoom` (1 = the shape's mid-plane matches the element's size), `drag: true` to orbit by dragging (a drag starts on the element and can then leave it), `cameraOrigin: "viewport"` to put the camera in front of the viewport's centre instead of the element's (off-centre elements are seen from the side and change as the page scrolls; may need a bigger `pad`).
- `pointer: "tilt"`: hover parallax. The shape turns to face the pointer, up to 20° × `pointerStrength` (capped at 90°) when the pointer is half a viewport from the element's centre, and back when it leaves the page. `HoloEffect`'s `tiltRange` differs: it is reached at the element's edge, and only while the pointer is over the element. Default `pointer: "none"`.
- `pointerStrength` (0 to 100, default 1): strength of the pointer interaction, one param for every `pointer` mode: the tilt angle with `"tilt"`, the push with `SwirlParticleEffect`'s `"repel"`. 0 turns it off.
- `antialias`: smooth the edges. `GlassEffect` and `BubbleEffect`: FXAA on the final image, on by default (the glass is ray-marched, so multisampling would not help; `resolution: 2` is the thorough fix). `SwirlParticleEffect`: 4× MSAA of the fibres, off by default (memory-heavy with a large `pad` at high DPR).
- `pad`: room to draw around the element, in CSS px, or `"fullscreen"`.
- `{ still: true }` (constructor's second argument) renders a still frame, for visual tests and `prefers-reduced-motion`; it ignores `pointer` and `drag`.
- The silhouette is read back at start and when the element's aspect ratio changes, or when `sourceChannel` changes. After changing the element's content (e.g. `img.src`, then `await vfx.update(img)`), call `effect.refresh()`.
- All params are read every frame, so `effect.params.pointer = "tilt"` works live.

### `HoloEffect`

Physically based holographic foil, ported from [holospot](https://github.com/dmitrykurash/holospot) (the renderer of holo.spot).
The element is a flat card lit by holo.spot's spectral studio lights; the pointer tilts it.

```ts
import { HoloEffect } from "@vfx-js/effects";

await vfx.add(el, {
    effect: new HoloEffect({
        // the holo.spot side: what holo.spot's "Copy settings" copies, or settings with the kit's options, or a list
        holo: {
            material: "prism", // "prism" | "shatter" | "nebula" | "sparkle" | "vortex" | "emboss"
            settings: { "prism.pitch": 1200, "prism.pattern": "radial", "display.ev": 0.8 },
        },
        sourceChannel: "alpha", // foil where the element is opaque; "luminance" or "none"
    }),
});
```

- `settings` takes holo.spot's setting ids (`<material>.*`, `studio.*` lights, `display.*`, `grain.*`, `card.*`, `motion.*`, `scene.*`, `dof.lens`; typed as `HoloSettingId`), and `holo` itself takes the blob holo.spot's "Copy settings" button (`</>` in the Object tab) copies: `new HoloEffect({ holo: copiedJson })` reproduces the scene, its material, pose and structure scale included. The ids, ranges and meanings are in holospot's `docs/materials/<material>.md` and `docs/scene-settings.md`. Values are checked: out of range is clamped, bad values and unknown ids are dropped, with a console warning. holo.spot ids the port does not render (depth-of-field blur `dof.*` but `dof.lens`, bump maps `bump.*`, card borders `card.corner` etc., `display.wideGamut`) warn when set away from holospot's default.
- Params: `holo` (the holo.spot side, `HoloSettingsInput` or a list of them) and how the element becomes the card: `sourceChannel`, `ink`, `flat`, `sizeMm`, `antialias`. `setParams(updates)` assigns params as other effects do, and so does writing `effect.params` (`effect.params.flat = true`). A new `holo` replaces the whole holo.spot side and applies on the next frame; set a new value, not one changed in place.
- `holo` takes a Copy settings blob, or `{ material, settings, quality, structureScale, …shorthands }`, or a list of them applied in order over holo.spot's parameter defaults: later values win, `settings` merge by id, `null` removes an id, a blob starts the settings over. `effect.material` is the material in effect.
- The effect starts from holo.spot's parameter defaults. `HoloEffect.looks.card`, `.object` and `.image` (emboss) are the looks holo.spot ships (their scene in `settings`, plus the `quality` holospot ships them with); `HoloEffect.startingPoints.<material>.<name>` (holo.spot's starting points, e.g. `.prism.compactDisc`, `.shatter.squareTiles`, `.nebula.starfield`) set the material: `new HoloEffect({ holo: [HoloEffect.looks.card, HoloEffect.startingPoints.prism.compactDisc, { exposure: 1 }] })`. Put a look in the list as its own element, not spread into an object with its own `settings`.
- Scene shorthands write holo.spot ids where they are given (`null` removes them): `exposure` (`display.ev`, ±3), `tone` (`display.tone`: `"neutral"`, `"agx"`, `"clamp"`), `glare` (`display.glare`, 0–0.1), `grain` (`grain.amount`, 0–0.6, default 0.07; 0 = off), `studio` (`studio.preset`: `"studio"`, `"spot"`, `"softbox"`, `"strip"`, `"dark"`, `"desk"`, `"office"`, `"raking"`; the rig goes over earlier lights, single `studio.*` lights given later win), `background` (`scene.background`: `"black"`, `"white"`, `#rgb` or `#rrggbb`: the page the lighting adapts to), `bow` (`card.bow`, mm, 0–2), `pose` (`motion.pose`, `{ x, y }` degrees, ±35), `lens` (`dof.lens`, focal length in mm, 24–200: the 3D view's field of view, no blur), `pointer` (`motion.pointer`: `"tilt"`, `"light"` moves a flashlight, `"flash"` lights from the camera, `"none"`), `tiltRange` (`motion.tiltRange`, 5–35°), `wobble` (`motion.wobble`), `wobbleAmp` (`motion.wobbleAmp`, 0–25°).
- `sizeMm` is the real size of the element's largest side (the foil has a physical grain). Default: CSS size at 96 dpi.
- `quality` (in `holo`): `"low"` for phones, `"medium"` (default), `"high"`, or `"auto"` (picked from the device as holospot does).
- `sourceChannel`: which channel of the element is the foil's shape: `"alpha"` (where it is opaque; default), `"luminance"` (where it is bright; the element shows elsewhere) or `"none"` (the whole rect). Its type `HoloSourceChannel` is the same as `SourceChannel`, which `GlassEffect` and `SwirlParticleEffect` take.
- `ink` (0–1) tints the foil with the element's colours, like a translucent ink.
- `flat: true` keeps the card facing the viewer where the element is, and the tilt turns the light rig the other way instead. By default the card turns in 3D as holo.spot draws it (the output grows by about 21 % on each side).
- `structureScale` (in `holo`; 0.25–4, default 1; holo.spot's `object.structureScale`) scales shards, flakes, dots and the paper: above 1 is finer, below 1 coarser. The colours stay the same.
- `material: "emboss"` is a paper card with a foil logo pressed into it; the whole element rect is the paper (`sourceChannel` does not cut it; for emboss it picks how the logo image is read, see below). The element is the picture printed on the paper, not the logo; `settings["emboss.logo"]` takes the logo's artwork (an `<img>`, a canvas, an `ImageBitmap`, or the URL of an SVG or PNG; transparent areas get no foil): `new HoloEffect({ holo: { material: "emboss", settings: { "emboss.logo": img } } })`. Without one there is no logo, only the paper. `"emboss.logo": "element"` makes the element itself the logo (a still element: it is read back once, and again on a resize or when `holo` is set again, e.g. `effect.setParams({ holo: [...] })` after the element changed); the ground is then `emboss.print` or `emboss.paperColour`, and transparent without both, so CSS can show what is behind. `emboss.print` (an image, a canvas, an `ImageBitmap` or a URL, fitted like `background-size: cover`) is printed on the paper instead of the element in either mode; while it loads, and if it fails, the paper is plain. The logo is cut into foil / no foil: `sourceChannel` (`"alpha"`, `"luminance"`) picks how the image is read and `emboss.threshold` (0.01–0.99, default 0.5) where it is cut, so a photo becomes a one-tone stamp; prepare it (posterise, line art) for finer results. A URL or `<img>` from another origin needs CORS (`crossOrigin` on the `<img>`). The logo and the paper load in the background: `await effect.ready` waits for a frame with them, and `effect.errors` lists what failed. Place and shape it with `emboss.*` settings (placement in CSS px of the element, unlike holo.spot's mm: `emboss.x` / `emboss.y` the logo's centre from the element's top left, `emboss.width` its width; unset, it is centred at 36/63 of the element's width, or fills the element when the element is the logo; `structureScale` scales its relief and the paper, not its size; `emboss.rotation` in degrees, counter-clockwise as on holo.spot; a holo.spot Copy settings' mm placement is ignored; `emboss.foil`: `"rainbow"`, `"concentric"`, `"sparkle"`, `"silver"`, `"gold"`, `emboss.profile`, `emboss.stock`, …). Hologram stickers and multi-element cards of holo.spot are not supported. A Copy settings blob of holo.spot's cloth, stickers or flag is drawn as the flat card, with a warning.
- `antialias` (default `true`, as holospot renders) is 4× multisampling of the card; it smooths the card's outline when it turns. Set `false` to save memory (it costs about 5× the card target's).
- Each material's code (its shaders; for `emboss` also the logo and paper builders) loads when the material is first used, as a separate chunk: `init` waits for it, and after a new `holo` changes the material the effect keeps drawing the previous material until the new one has loaded (`ready` waits for it). `HoloEffect.preload("shatter", "emboss")` loads materials ahead. `import { HoloEffect } from "@vfx-js/effects/holo/static"` is the same class with every material built in (one bundle, nothing loaded later): use it for one file, or when a material change must not wait for code.
- For a settings UI: `HoloEffect.settingSpecs(material)` lists every supported holo.spot id with its kind, range and options, and `effect.resolvedSettings()` returns the values in effect.

Live demos: https://amagi.dev/vfx-js/storybook

### Saber distortion and layered glow

`SABER_PRESETS` contains twelve names for eleven AE-inspired recipes, keyed by
`SaberPresetName`: `arc-reactor`, `burning`, `electric`, `energy`, `fog`,
`kryptonite`, `fire`, `torch`, `tractor-beam`, `windy`, `wormhole`, and `embers`.
The first eleven reference the same-named AE Saber presets; `embers` is an alias
of `burning`. Original presets `neon`, `plasma`, `ice`, `toxic`, `spectral`,
`laser`, and `unstable` were removed; passing those names throws. Use
`new SaberEffect({ preset: "fire", source: false })` or
`effect.setParams({ preset: "fire", brightness: 0.5 })`. A preset resets
appearance; explicit options override it, including partial distortion groups.
Source/edge detection, dynamic input, padding and reveal settings are retained.
Without a preset, construction starts from Electric, then applies explicit options.
Use `coreDistortion: { amount: 0 }` and `glowDistortion: { amount: 0 }`
for a steady outline. There is no separate multi-line generator.
Unknown top-level or distortion-group constructor or `setParams` options throw before changing state.
Nested values are copied per instance; the shared recipes are frozen.
The eleven recipes now import native AE color, output grades, Core Size/Softness,
Halo controls and four Glow layers through measured unit conversions. They target
the original AE exports, including Fire; the previously approved dimmer Fire and
hand-selected Wormhole/Fog settings are historical snapshots, not these defaults.
Glow sigma is `2 * AE Spread * AE Size Multiplier * AE layer Size`.
Full core width is `2 * AE Core Size`; input Glow gain is
`AE Glow Intensity * AE Intensity Multiplier / 200`.
The renderer limits Glow source mass for contours wider than 6.8px, following
isolated AE large-Core-Size probes; the wide-source footprint is approximate.
Native distortion amounts, wind, and core shape settings are imported too.
Wind converts at 100 CSS px/second per AE unit. Native noise type, scale,
Bias, aspect, evolution speed and seed are imported. Presets retain four octaves,
with fixed octave spacing and no synthetic transport extensions. The procedural
fields match isolated distributions and spatial correlations approximately;
they do not reproduce native random patterns or all temporal behavior.
Matching numeric values alone does not yet give matching animations.
There is no independent particle generator or global preset flicker.
Set `coreDistortion.noiseComplexity` and `glowDistortion.noiseComplexity`
independently (integers 1..8), including through `setParams`. The demo exposes
both as **Noise octaves** under Core Distortion / Glow Distortion.

`coreSoftness` (Electric default 25; two centered box filters of width `softness + 1` CSS px) filters the original core
before Core Distortion; Glow layers 1–3 use the original sharp core. Halo is also
blurred/amplified from the original core, then warped with Core Distortion. Zero
bypasses the blur. Nonzero softness adds cached blur work and render targets;
Core animation reuses the cached soft source, updating only deformation.
`coreBlendOnTop` (Electric default true) Screens the original core light into the scalar result before colorization
and output grading when both Glow and nonzero Core Distortion are active.
Both outlines respect `coreSoftness`. The original outline's blur is cached
separately from animated distortion. Overlay does not alter either Glow input.
Output grading uses `gamma` (0.1..10), `brightness` (0..5), and
`saturation` (0..2). Each is neutral at 1; named recipes may override them.
The order is brightness multiplication, scalar Screen combination, measured hue/radiance colorization,
saturation about the RGB mean, then `pow(rgb, gamma)` and display clipping.
The colorizer uses 36 measured hue curves with 33 luminance knots, interpolated
on color changes without another texture or render pass. Gamma below 1 lifts midtones; above 1
darkens them. Saturation 0 makes grayscale; brightness 0 hides the effect.
These directions, ranges and ordering were checked against installed AE Saber.
The three glow layers, core/Halo and original-core overlay combine as scalar
light, then share colorization and grading. Source composition comes last. Grading leaves cached shapes
and source pixels unchanged; it adds no render pass.
When Glow Distortion is active, each scalar Glow layer is multiplied by
Brightness and clipped to 0..1 **before** scalar Screen and distortion/masking, then colorized and
graded without a second Brightness multiplication. This preserves dark noise
inside otherwise saturated light. Brightness changes rerun layer composition
and distortion, reusing the blur pyramid; Gamma/Saturation only affect output.
The old `toneMapping` option is removed (passing it throws). Output recipes now
use the exported AE Gamma/Brightness/Saturation, not fitted replacements for
the old exponential curve. The empirical colorizer is approximate near curve
knees; colored overlap and intense highlights still differ from AE.
`haloIntensity` and `haloSize` are Layer 4 multipliers in percent, 0..1000,
neutral 100. Layer 4 radius is `size * glowSizeMultiplier * haloSize / 100`;
its input gain includes `haloIntensity / 100`. Either multiplier at zero
hides Layer 4. Halo shares the measured colorizer and `color`.
It follows the core that feeds the glow, but not Glow Distortion.
There is no separate Halo blur or independent fifth light source.
AE's white-line sweeps show an extra Brightness factor on Halo: it is bounded
and screened under the core before their shared output grading. Outside the
core, with white light, output is `pow(B * min(B * layer4, 1), gamma)`.
Changing positive Halo intensity reuses the blur pyramid; changing Halo size
rebuilds Layer 4's blur. Halo also follows flicker.
The previous independent-Halo units have changed; custom settings require
reauthoring. Named recipes use their native exported percentages.

`flickerIntensity` (0..1, default 0) modulates core, halo and glow brightness without
affecting source pixels. Gain stays between `1 - flickerIntensity` and 1.
`flickerSpeed` (default 12) sets smooth random keyframes per second; 0 freezes
the brightness noise. `flickerSeed` (integer, default 0) selects its pattern.
This clock follows VFX time independently of both distortion clocks.
Brightness flicker only changes final composition and does not invalidate the core/glow cache.

`SaberOptions` accepts partial `coreDistortion` and `glowDistortion` groups;
`SaberParams` holds their fully populated, live values. Glow uses
`SaberDistortionParams`; Core omits `composite` and always distorts. Shared controls are `amount` (CSS px, 0 bypasses), `type` (`"fluid"`,
`"smoke"`, `"energy"`) and `invert`. Only Glow accepts `composite`
(`"distort"` warps; `"multiply"` modulates brightness, reaching full modulation
at amount 100). Each group has
independent `windSpeed` (CSS px/s), `windDirection` (degrees, 0 right / 90 up),
`noiseSpeed` (AE-calibrated evolution rate), `noiseScale` (CSS px), `noiseBias` (positive contrast
control), `noiseComplexity` (1..8),
`noiseAspectRatio` (horizontal frequency multiplier; above1 compresses X,
matching AE rather than stretching X),
and deterministic `seed`. Noise is anchored to the element. These clocks use VFX
time independently for core and glow; set wind and noise speeds to zero in each
group to freeze it. Core distortion changes the displayed contour and Halo input; glow
distortion changes only the generated glow. A fully revealed core uses distance-field
coverage after warping to keep steep thin streaks continuous; animated reveals
retain the raster path. Smoke accumulates bounded density; Energy accumulates
ridges with recoverable octave feedback (fine ridges can regain strength after
a weak coarse sample); Fluid warps that ridge field with another
fractal. Octave sums are not normalized. Bias applies signed power to each of
the two displacement components. Multiply averages the two resulting density
components, then interpolates from no modulation using Amount / 100.

Octave frequency doubles and gain halves at every level. Spatial frequency increases per octave; evolution speed
does not. The shared time conversion is 1 for Smoke, 0.5 for Fluid and 0.75 for Energy,
fitted to isolated temporal correlations rather than individual preset motion.
Noise is evaluated on a two-CSS-pixel content-aligned grid, then bilinearly
interpolated after signed Bias. Octaves are not dropped as pixel ratio changes.
Each group accepts `motionBlur` (wind transport interval in seconds, 0..0.25).
Six equally weighted samples span the interval while evolution stays at the
current time. Source pixels do not translate. Native Motion Blur maps to
`motionBlur = native * 0.15`; zero wind bypasses the samples, even with evolving
noise. A transient noise texture avoids six procedural evaluations. There is no
framebuffer history, so seeking remains deterministic. Core, Glow and Halo use
the same two-pixel noise grid; light sampling and coverage remain full resolution.
The grid includes wind-blur margins and stays aligned when padding changes.

Glow Distortion affects all three Glow layers, independent of their radii.
Layer 4 (Halo) follows Core Distortion instead.

Glow always uses exactly four `SaberGlowLayer` objects in `glowLayers`,
each with `size` (approximate Gaussian sigma in CSS px) and `intensity` (input
energy gain). The blur conserves energy before nonlinear amplification;
final displayed energy is not conserved as radius changes. Either value at
zero disables that layer. Layer 4 is the Halo, with additional percent multipliers.
Earlier radius-weighted gains first converted as
`newIntensity = oldIntensity * size * glowSizeMultiplier`.

Effective radius is `size * glowSizeMultiplier`; the multiplier defaults to 1,
and zero disables glow. `pad` only bounds the
output: allow roughly 3 times the largest effective radius plus distortion
reach, or use `"fullscreen"`. Large radii use lower-resolution blurs.
Their Gaussian kernels account for downsampling and use smooth cubic
reconstruction; changing radius across resolution levels avoids abrupt bright
rings. Subpixel radii approach an unblurred source; zero explicitly disables
the layer. Thin core lines use pixel
coverage filtering with centered gradients after deformation.
Minified alpha sources receive an area prefilter; degenerate contour normals
cannot turn a fractional-width line into a fully lit pixel.
The native-style noise lattice interpolates sampled ridges; very small Noise
Scale can alias instead of automatically discarding high octaves.

Noise coordinates follow the element, so changing padding does not reseed the
pattern. Static core/glow passes are cached independently: a steady core with
animated glow distortion reuses its blurred source. Live parameter edits,
`invalidate()`, dynamic sources, layout changes and context restoration refresh
the relevant caches. Reveals trace the source bounds and reuse their contours
when only output padding or fullscreen position changes.
Large padding restricts distance-field/core work to a conservative source region while
keeping full-size glow/distortion outputs.

`glow` is input gain before per-layer Pre Gamma and amplification.
`glowPreGamma` (0.1..5) raises each weighted, blurred layer to a power.
Below 1 broadens dim tails; above 1 narrows them. Isolated AE gain sweeps are
approximated by `f(x) = x * (0.34 + x * (0.18 + 0.48*x))`; Layer 1 uses
`(x + f(x))/2`, Layers 2–4 use `f(x)`. This is an empirical fit, not AE source.
The shader Screens Glow layers1–3 together before noise; the same Multiply
mask or warped/shutter sample acts on their combined light. Halo bypasses Glow
distortion. Protected Glow layers split transmission into moving and stationary
groups so zero deformation preserves their scalar Screen result. Scalar Screen combination precedes colorization and output grading.

`glowBias` (0..5, neutral 1) approximates AE's layer balance with relative
input gains `[b, (1+2b)/3, (3+2b)/5, (4+b)/5]` before Pre Gamma.
It is not a contrast exponent. Glow gain, positive layer gains, Bias and Pre
Gamma reuse the blur pyramid and leave core extraction unchanged. They also
apply to Layer 4. Turning a layer on/off can rebuild the blur pyramid.

Recipes use native AE layer order and gains. Earlier weak-signal migration
compensation is removed. Multiply blends linearly toward a noise-density mask
at Amount 100, replacing the former up-to-8x hotspot amplification.
Nested defaults/options are copied per instance;
`setParams({ glowDistortion: { amount: 20 } })` preserves other group values.
AE blur kernels, Bias outside the measured range, colored-light behavior,
noise and very dim quantized output still differ. These are procedural WebGL
approximations, not interchangeable AE parameters or proprietary source.

```ts
const saber = new SaberEffect({
    source: false,
    coreDistortion: { amount: 0 },
    pad: 320,
    glowDistortion: {
        amount: 32,
        type: "fluid",
        windDirection: 90,
        windSpeed: 35,
    },
});
```

### Migrating older Saber options

The legacy line generator, pyramid glow and redundant multipliers were removed.
Removed options are rejected; there are no compatibility aliases.

Saber now exposes 58 leaf parameters (excluding preset selection). Thirteen
non-AE controls were removed, preserving current named presets and the default
Electric look: `intensity`, `coreIntensity`, `coreWhiteness`, `glowWhiteness`,
`glowFlow`, `glowDistortAllLayers`, Core `composite`, and Core/Glow
`noiseDetail`, `noiseTurbulence`, `directionality`. Their former preset values
are now fixed: gains 1, white mixes/transport extensions 0, octave spacing 2,
Core Distort, all three Glow layers affected. Non-neutral custom uses require
reauthoring; `brightness` is not an exact replacement for removed gain stages.


| Removed option | Replacement |
| --- | --- |
| `amplitude`, `mainAmplitude` | Tune `coreDistortion.amount`; no exact numeric conversion. |
| `scale` | Tune `coreDistortion.noiseScale`; the spatial basis differs. |
| `sharpness`, `burst` | Tune distortion `type`, `noiseBias` and `noiseComplexity`. |
| `speed` | Set `windSpeed` and `noiseSpeed` independently in each distortion group. |
| `flicker` | Shape motion uses distortion clocks; brightness flicker uses `flickerIntensity`, `flickerSpeed` and `flickerSeed`. |
| `lines`, `variation` | No line-count equivalent. Use a distorted contour and optional `coreBlendOnTop`. |
| `glowMode`, `glowFalloff` | Glow always uses four layers. Reauthor pyramid looks with `glowLayers` sizes/intensities. |
| `glowSpread` | Set `glowSizeMultiplier` to the old `glowSpread * glowSizeMultiplier`. |
| `glowIntensityMultiplier` | Set `glow` to the old `glow * glowIntensityMultiplier`. |

Default construction uses Electric. The seven original presets were removed;
there are no replacement aliases. AE-inspired recipes remain approximate;
Glow calibration changes their brightness and overlap.

## Writing an effect

```ts
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform float strength;
void main() {
    vec4 c = texture(src, uvSrc);
    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    outColor = vec4(mix(c.rgb, vec3(gray), strength), c.a);
}
`;

export class DesaturateEffect implements Effect {
    constructor(public strength = 1) {}

    render(ctx: EffectContext) {
        ctx.draw({
            frag: FRAG,
            uniforms: { src: ctx.src, strength: this.strength },
            target: ctx.target,
        });
    }
}

vfx.add(img, { effect: new DesaturateEffect(0.8) });
```

### Lifecycle

```ts
interface Effect {
    enabled?: boolean;                        // false skips render (input passes through)
    init?(ctx): void | Promise<void>;         // once: allocate render targets, wrap textures
    update?(ctx): void;                       // every frame: state only, ctx.draw is ignored
    render?(ctx): void;                       // every frame: ctx.draw / ctx.blit
    dispose?(): void;                         // once on removal
    outputRect?(dims): [x, y, w, h] | undefined; // rect this stage draws into
}
```

### Default varyings

The default vertex shader gives three varyings, all 0..1:

- `uvSrc` — over the source texture. Use it to read `ctx.src`.
- `uvContent` — over the element. Outside 0..1 is the padding from `outputRect`.
- `uv` — over the whole destination buffer.

Always declare `#version 300 es` in `ctx.draw` shaders.

### Context

| Field | Notes |
| --- | --- |
| `time`, `deltaTime` | Seconds since start / since last frame. |
| `resolution` | Canvas size, physical px. |
| `mouse`, `mouseViewport` | Element-local / canvas-local px, bottom-left origin. |
| `intersection` | 0..1 viewport overlap. |
| `enterProgress`, `leaveProgress` | 0..1 enter / leave transition. Timing comes from the `intersection` option ([shader.md](shader.md#built-in-uniforms)). |
| `src`, `target` | Input texture / output for this stage. `target: null` is the canvas. Both are premultiplied alpha. |
| `uniforms` | User `uniforms` from `vfx.add`, evaluated each frame. |
| `dims` | Sizes: `elementPixel`, `canvasPixel`, `pixelRatio`, `contentRect`, `srcRect`, `canvasRect`. |
| `createRenderTarget(opts)` | `{ size?, float?, format?, persistent?, wrap?, filter?, mipmap?, depth?, samples? }`. Call in `init`. `format` overrides `float`: `rgba8`, `r16f`, `rg16f`, `rgba16f`, `rg32f`. RG32F keeps 32-bit vector precision; requires `EXT_float_blend` and, with linear filtering, `OES_texture_float_linear` (throws if unavailable). Use R/RG half-float for scalar/vector HDR intermediates; omitted retains automatic RGBA storage. |
| `wrapTexture(source, opts)` | Wrap an image, canvas, video or `WebGLTexture`. Call in `init`. With `autoUpdate: false`, call `tex.update()` after the source changes. |
| `draw(opts)` | `{ frag, vert?, geometry?, uniforms?, target?, blend?, swap?, depthTest?, depthFunc?, depthWrite?, cull? }`. `target` can be an array to write several targets in one draw. |
| `blit(source, target?)` | Copy a texture into a target. |
| `clear(target?, opts?)` | Clear a render target. `opts: EffectClearOpts` is `{ color?, depth? }`, both default `true`. |
| `readPixels(target, opts?)` | Read a render target back to the CPU, async (no GPU stall). Resolves with a `Uint8Array` (8-bit) or `Float32Array` (`float: true`), RGBA, premultiplied, rows bottom-up. `opts: EffectReadPixelsOpts` is `{ flipY? }`. Resolves MSAA targets and reads the side last written of a `persistent` one. |
| `gl` | Raw `WebGL2RenderingContext`. |
| `resetState()` | Restore the GL state VFX-JS assumes after raw `ctx.gl` calls. Write-only, no queries. |

### Two passes

```ts
class BlurEffect implements Effect {
    #tmp: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        this.#tmp = ctx.createRenderTarget(); // follows the element size
    }

    render(ctx: EffectContext) {
        if (!this.#tmp) return;
        const [w, h] = ctx.dims.elementPixel;
        ctx.draw({ frag: BLUR, uniforms: { src: ctx.src, dir: [1 / w, 0] }, target: this.#tmp });
        ctx.draw({ frag: BLUR, uniforms: { src: this.#tmp, dir: [0, 1 / h] }, target: ctx.target });
    }
}
```

### Feedback (persistent render target)

A `persistent: true` target is ping-pong buffered.
Bound as a uniform, it reads last frame; drawn to, it writes the new frame.

```ts
init(ctx) { this.#buf = ctx.createRenderTarget({ persistent: true }); }
render(ctx) {
    ctx.draw({ frag: TRAIL, uniforms: { src: ctx.src, prev: this.#buf, decay: 0.92 }, target: this.#buf });
    ctx.blit(this.#buf, ctx.target);
}
```

### 3D geometry (depth and MSAA)

Draw meshes into a target with `depth: true`.
`samples: 4` smooths the edges (MSAA).

```ts
init(ctx) { this.#rt = ctx.createRenderTarget({ depth: true, samples: 4 }); }
render(ctx) {
    ctx.clear(this.#rt); // color and depth
    ctx.draw({ vert, frag, geometry: this.#mesh, target: this.#rt, depthTest: true, cull: "back" });
    ctx.blit(this.#rt);
}
```

- `depthTest` (default `false`) compares with `depthFunc: EffectDepthFunc` (default `"lequal"`). `depthWrite` defaults to `depthTest`; `depthWrite: true` alone writes depth and lets every fragment pass.
- `cull: EffectCullMode` is `"none"` (default), `"back"` or `"front"`. Front faces wind counter-clockwise. Cull works on any target.
- Depth options need a target made with `depth: true`. On other targets they are ignored with a warning. The canvas and `ctx.target` have no depth.
- `rt.depthTexture` reads the depth as a texture: raw non-linear values in [0, 1], nearest sampling. Linearize it in your shader if you need distance. A persistent target gives the read side's depth.
- Don't sample a target, or its `depthTexture`, while drawing into it. To read the previous frame, use `persistent: true`.
- A multisampled target samples and blits like any other. If the GPU can't take 4 samples for the format, it falls back to 1 with a warning. With `float: true`, asking for 4 samples always gives 16-bit float, even after the fallback.
- `samples` must be 1 or 4; other values use 1 with a warning.
- `samples: 4` uses about 5 times the memory of a plain target, or 10 times with `depth: true`.
- With `persistent: true`, depth does not carry over between frames: the side you draw into holds depth from two frames ago. Clear it every frame with `ctx.clear(rt, { color: false })` before drawing.
- Depth and cull state only lasts for that draw. Other draws stay depth-off.

### Multiple render targets

Pass an array as `target` to write several targets in one draw.
Target `i` gets the output declared with `layout(location = i) out`.
Use it when state needs more than one vec4 per texel and the outputs share work, so it runs once.

```ts
const SIMULATE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D pos; // xyz + age
uniform sampler2D vel; // xyz
layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;
const float DT = 1.0 / 60.0;
vec3 force(vec3 p) { return -p; } // your force field
void main() {
    vec4 p = texture(pos, uv);
    vec3 v = texture(vel, uv).xyz + force(p.xyz) * DT; // shared by both outputs
    outPos = vec4(p.xyz + v * DT, p.w + DT);
    outVel = vec4(v, 0.0);
}`;

init(ctx) {
    this.#pos = ctx.createRenderTarget({ size: [256, 256], float: true, persistent: true });
    this.#vel = ctx.createRenderTarget({ size: [256, 256], float: true, persistent: true });
}
render(ctx) {
    ctx.draw({ frag: SIMULATE, uniforms: { pos: this.#pos, vel: this.#vel }, target: [this.#pos, this.#vel] });
}
```

- Each target keeps its own options (`float`, `wrap`, `filter`, `mipmap`).
- Persistent targets all swap after the draw. `swap: false` skips all of them.
- Declare one output per target. A target with no output holds undefined pixels.
- To write fewer targets, draw with a shorter array. A draw can't skip a target in the middle.
- One `blend` applies to every target. The default is `"none"`.
- If several targets have `depth: true`, the first one's depth is used. A draw that uses depth warns about it.
- These rules apply. If one breaks, the draw warns once and is skipped:
  - All targets have the same size and the same `samples`.
  - No `null`, no `ctx.target`, and no target twice.
  - At most `MAX_DRAW_BUFFERS` targets. Every WebGL2 GPU takes at least 4.
  - The shader is GLSL 300 es.

### Drawing outside the element

`overflow` does not apply to effects. Return a bigger rect from `outputRect`:

```ts
outputRect(dims: EffectDims) {
    const px = 40 * dims.pixelRatio;
    const [w, h] = dims.elementPixel;
    return [-px, -px, w + 2 * px, h + 2 * px];
}
```

Return `dims.canvasRect` to cover the whole canvas.

### Sharing a texture between elements

`vfx.capture(el)` turns an element into a texture that any effect of the same `VFX` can read.
It works with `<img>`, `<video>`, `<canvas>` and any HTML (html-in-canvas, or one DOM snapshot as fallback).

```ts
const page = await vfx.capture(article, { hide: false });

class Minimap implements Effect {
    constructor(private page: VFXCapture) {}
    render(ctx: EffectContext) {
        const { texture, rect } = this.page;
        if (!rect) return; // the article has no layout right now
        ctx.draw({ frag: MINIMAP, uniforms: { page: texture, pageRect: [rect.x, rect.y, rect.width, rect.height] } });
    }
}
await vfx.add(minimapEl, { effect: new Minimap(page) });

// A reusable effect takes the texture as a uniform and reads ctx.uniforms.page.
await vfx.add(other, { effect: new MyEffect(), uniforms: { page: page.texture } });

const ok = await page.update(); // capture again; false if no new pixels came (1s wait with html-in-canvas)
page.dispose();      // free it and restore the element
```

- Pass the `VFXCapture` to the effect when it needs `rect`. Pass `capture.texture` in `uniforms` for a reusable effect.
- `hide: true` hides the element; it keeps its layout and stays interactive. Default `false` leaves it visible.
- `rect` is in viewport CSS px. `x` / `y` are measured every frame. `width` / `height` are too for `<img>` / `<video>` / `<canvas>`; for other elements they are the size when the texture was captured.
- `rect` is `null` while the element has no layout (not in the document, `display: none`, or removed from its html-in-canvas wrapper). Check it before you use it. The texture works either way.
- No URL loading. Make the element yourself; it does not have to be in the document (`rect` is then `null`):

    ```ts
    const img = new Image();
    img.crossOrigin = "anonymous"; // for another origin, before src
    img.src = url;
    const pic = await vfx.capture(img); // waits for decode()
    ```
- A WebGL `<canvas>` source needs `preserveDrawingBuffer: true`, or it may capture an empty buffer.
- An SVG `<img>` needs a `width` and `height` in the SVG, or it may capture as black.
- `capture` waits for an `<img>` to decode and a `<video>` to have a frame. A `loading="lazy"` image waits until it scrolls into view. A video with no source, one that failed, or one with `preload="none"` that is not playing rejects.
- Capturing inside another html-in-canvas capture: the outer capture does not repaint when the inner one starts, hides or ends. Call `update()` on the outer capture.
- With html-in-canvas, capture moves the element into a wrapper canvas like `addHTML`, so the same layout rules apply (CSS that depends on the parent may change, inline elements become blocks).
- While wrapped, the element's parent is the wrapper canvas, so a framework's `parent.removeChild(el)` throws. Dispose the capture before the element unmounts.
- Videos and canvases refresh every frame. html-in-canvas refreshes on every repaint. Images and the DOM snapshot fallback change only on `update()`.
- Effect path only: with `shader`, a texture uniform is ignored with a warning.
- Post effect `uniforms` can't take it (the capture needs the `VFX` first). Set the capture on the post effect instance after `await vfx.capture()`.
- One capture per element, across all `VFX` instances. `capture` rejects for an element `addHTML` or a transition wraps, and the other way round. It also excludes `add` on the same element (both ways, even before `add` resolves), except for an `<img>` / `<video>` / `<canvas>` captured without `hide`.
- An HTML element needs a width and height when captured; an empty one rejects. So does a source with no pixels, one larger than `vfx.maxTextureSize`, or one WebGL can't read (a cross-origin image without CORS).
- `capture` rejects `<html>`, `<body>` and any element that contains a VFX canvas.
- The texture belongs to its `VFX`; drawing it in another instance throws.
- For a `position: fixed` target (e.g. a minimap), draw it with its own `new VFX({ scrollPadding: false })`. With scroll padding the canvas moves with the page and a fixed drawing lags on scroll. Capture the source in that instance too: capture draws nothing, and the texture only works in its own instance.
- To map `rect` in a post effect, add the scroll padding: the canvas is the viewport plus the same padding on each side, so `pad = (ctx.dims.canvas - [clientWidth, clientHeight]) / 2` with the size of `document.documentElement`, and the canvas position is `rect.xy + pad` (CSS px, top-left origin).

### Rules

- One instance per element. Use a factory: `const make = () => new MyEffect()`.
- `shader` and `effect` are mutually exclusive.
- Free anything you allocate with raw `ctx.gl` in `dispose`, and rebuild it in `ctx.onContextRestored(cb)`.
- After drawing with raw `ctx.gl` (depth test, culling, own framebuffers, pixel store), call `ctx.resetState()` before the next `ctx.draw` / `ctx.blit` / `ctx.clear`, and before `render` returns. End transform feedback first.
- Use `ctx.dims` for pixel sizes. Don't read DOM sizes in `render`.
- Read pixels with `ctx.readPixels`, not raw `gl.readPixels`. It copies the target as it is when you call it, so call it in `render` after the draw you want to read. The promise rejects when the effect is disposed or the context is lost: always handle the rejection.


### Preparing shaders without blocking a draw

`ctx.createProgram({ frag, vert? })` returns a VFX-owned `EffectProgram`.
In `async init(ctx)`, await `program.ready`, then use `ctx.draw({ program, uniforms })`.
For live changes, check `program.isReady` and defer drawing until ready.
Sources are cached; a later `ctx.draw({ frag, vert })` reuses the prepared program too.
`EffectProgramOpts` specifies its sources; `EffectDrawShader` accepts either sources
or a program. Handles must belong to the same VFX context. No effect-owned disposal.
Compilation uses `KHR_parallel_shader_compile` when available. Without it,
creation falls back to synchronous compilation. Drawing before readiness also
waits synchronously. `ready` rejects on compilation failure or disposal while pending.
After context restoration, check readiness again (the program compiles again).
Saber prepares its current shader configuration automatically, including live
preset/layout changes. While a new configuration compiles, its rendering is deferred.
