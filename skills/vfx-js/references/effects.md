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
| `ChromaticEffect` | Chromatic aberration. |
| `ColoredEdgesEffect` | Edge detection with two edge colors. |
| `DatamoshEffect` | Fake datamosh. Call `enable()` / `disable()`. |
| `DitherEffect` | Bayer / blue-noise dither with few color levels. |
| `DuotoneEffect` | Two-color map. |
| `FluidEffect` | Fluid simulation driven by the pointer. |
| `GlitchEffect` | Block shift and aberration glitch. |
| `GradientMapEffect` | Map luminance to a color gradient. |
| `HalftoneEffect` | RGB / CMYK halftone screen. |
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
| `SwirlParticleEffect` | Particles flow over the element's silhouette, extruded to 3D, and peel off in wisps. Gradient `palette` (preset name from `SWIRL_PARTICLE_PALETTES` or `{ offset, color }` stops), `sourceColor` to use the image's colors, `count` (default 65536, max 2^20, live), `intro` (seconds the particles take to be born at start, default 1.5; 0 = all at once), camera `yaw` / `pitch` / `orbit` / `fov` (all in degrees), `drag: true` to orbit by dragging the element, pointer interaction `mouse: "repel" | "tilt"` (`mouseRadius` in CSS px, `mouseStrength`; default `"none"`), light `lightDirection` / `lightColor` / `lightIntensity` / `ambient` / `occlusion` / `glint`, and an optional drop shadow on the page behind (`shadow: true`, `shadowOpacity` / `shadowSoftness` / `shadowDistance` / `shadowColor`). `antialias: true` turns on 4× MSAA for the fibres (memory-heavy fullscreen at high DPR). Draws outside the element (`pad` in CSS px, default 200, or `"fullscreen"`) over transparency. The silhouette is read back at start and when the element's aspect ratio changes; after changing its content (e.g. `img.src`, then `await vfx.update(img)`), call `effect.refresh()`. |
| `TilePixelateEffect` | Pixelate into shaped tiles. |
| `TritoneEffect` | Three-color map. |
| `VignetteEffect` | Vignette. |
| `VoronoiEffect` | Voronoi cells around the cursor. |
| `WarpEffect` | Sine wave, twist or ripple warp. |

Live demos: https://amagi.dev/vfx-js/storybook

### Saber distortion and layered glow

`SABER_PRESETS` contains twelve names for eleven AE-inspired recipes, keyed by
`SaberPresetName`: `arc-reactor`, `burning`, `electric`, `energy`, `fog`,
`kryptonite`, `fire`, `torch`, `tractor-beam`, `windy`, `wormhole`, and `embers`.
The first eleven reference the same-named AE Saber presets; `embers` is an alias
of `burning`. Original presets `neon`, `plasma`, `ice`, `toxic`, `spectral`,
`laser`, and `unstable` were removed; passing those names throws. Use
`new SaberEffect({ preset: "fire", source: false })` or
`effect.setParams({ preset: "fire", coreIntensity: 0.5 })`. A preset resets
appearance; explicit options override it, including partial distortion groups.
Source/edge detection, dynamic input, padding and reveal settings are retained.
Without a preset, construction starts from Electric, then applies explicit options.
Use `coreDistortion: { amount: 0 }`, `glowDistortion: { amount: 0 }` and
`glowFlow: 0` for a steady outline without glow flow. There is no separate multi-line generator.
Unknown top-level constructor or `setParams` options throw before changing state.
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
with detail, turbulence, directionality and synthetic flow at zero. The procedural
fields match isolated distributions and spatial correlations approximately;
they do not reproduce native random patterns or all temporal behavior.
Matching numeric values alone does not yet give matching animations.
There is no independent particle generator or global preset flicker.
Set `coreDistortion.noiseComplexity` and `glowDistortion.noiseComplexity`
independently (integers 1..8), including through `setParams`. The demo exposes
both as **Noise octaves** under Core Distortion / Glow Distortion.

`coreIntensity` (Electric default 1) scales visible core brightness independently of
glow. `coreWhiteness` (0..1, Electric default 0) mixes its tint toward white.
`coreSoftness` (Electric default 25; two centered box filters of width `softness + 1` CSS px) softens only the visible core
after core distortion; Glow layers 1–3 use the original sharp core, while Halo follows the sharp distorted core. Zero
bypasses the blur. Nonzero softness adds cached blur work and render targets;
an animated core must update that blur each frame.
`coreBlendOnTop` (Electric default true) Screens the original core light into the scalar result before colorization
and output grading when both Glow and nonzero Core Distortion are active.
Both outlines respect `coreSoftness`. The original outline's blur is cached
separately from animated distortion. Overlay does not alter either Glow input.
`glowWhiteness` (0..1, named recipes use 0) controls glow tint independently of core and
halo. Output grading uses `gamma` (0.1..10), `brightness` (0..5), and
`saturation` (0..2). Each is neutral at 1; named recipes may override them.
The order is brightness multiplication, scalar Screen combination, measured hue/radiance colorization,
saturation about the RGB mean, then `pow(rgb, gamma)` and display clipping.
The colorizer uses 36 measured hue curves with 33 luminance knots, interpolated
on color changes without another texture or render pass. Gamma below 1 lifts midtones; above 1
darkens them. Saturation 0 makes grayscale; brightness 0 hides the effect.
These directions, ranges and ordering were checked against installed AE Saber.
The three glow layers, core/Halo and original-core overlay combine as scalar
light, then share colorization and grading. Whiteness controls use input-light
weights for the Core and Glow contributions. Source composition comes last. Grading leaves cached shapes
and source pixels unchanged; it adds no render pass.
When Glow Distortion or flow is active, each scalar Glow layer is multiplied by
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
hides Layer 4. Halo is tinted with `color`, without the glow's white mix.
It follows the core that feeds the glow, but not Glow Distortion or `glowFlow`.
There is no separate Halo blur or independent fifth light source.
AE's white-line sweeps show an extra Brightness factor on Halo: it is bounded
and screened under the core before their shared output grading. Outside the
core, with white light, output is `pow(B * min(B * layer4, 1), gamma)`.
Changing positive Halo intensity reuses the blur pyramid; changing Halo size
rebuilds Layer 4's blur. Halo also follows overall `intensity` and flicker.
The previous independent-Halo units have changed; custom settings require
reauthoring. Named recipes use their native exported percentages.

`flickerIntensity` (0..1, default 0) modulates core, halo and glow brightness without
affecting source pixels. Gain stays between `1 - flickerIntensity` and 1.
`flickerSpeed` (default 12) sets smooth random keyframes per second; 0 freezes
the brightness noise. `flickerSeed` (integer, default 0) selects its pattern.
This clock follows VFX time independently of both distortion clocks.
Brightness flicker only changes final composition and does not invalidate the core/glow cache.

`SaberOptions` accepts partial `coreDistortion` and `glowDistortion` groups;
`SaberParams` holds their fully populated, live values. Both use
`SaberDistortionParams`: `amount` (CSS px, 0 bypasses), `type` (`"fluid"`,
`"smoke"`, `"energy"`), `composite` (`"distort"` warps; `"multiply"` modulates
brightness, reaching full modulation at amount 100), and `invert`. Each group has
independent `windSpeed` (CSS px/s), `windDirection` (degrees, 0 right / 90 up),
`noiseSpeed` (AE-calibrated evolution rate), `noiseScale` (CSS px), `noiseBias` (positive contrast
control), `noiseComplexity` (1..8), `noiseDetail` (0..1, default 0),
`noiseTurbulence` (0..1, default 0; scale-dependent transport),
`noiseAspectRatio` (horizontal stretch),
`directionality` (0..1, default 0; constrain displacement to the wind axis),
and deterministic `seed`. Noise is anchored to the element. These clocks use VFX
time independently for core and glow; set wind and noise speeds to zero in each
group to freeze it. Core distortion changes the displayed contour and Halo input; glow
distortion changes only the generated glow. A fully revealed core uses distance-field
coverage after warping to keep steep thin streaks continuous; animated reveals
retain the raster path. Smoke accumulates bounded density; Energy accumulates
ridges conditioned by coarser ridges; Fluid warps that ridge field with another
fractal. Octave sums are not normalized. Bias applies signed power to each of
the two displacement components. Multiply averages the two resulting density
components, then interpolates from no modulation using Amount / 100.

`noiseDetail` raises octave frequency spacing from 2 to about 4.49; octave gain
halves at every level. Spatial frequency increases per octave; evolution speed
does not. The shared time conversion is 1 for Smoke and 0.75 for Fluid/Energy,
fitted to isolated temporal correlations rather than individual preset motion.
Unresolved bands retain their approximate mean density.
`noiseTurbulence` separates octave wind speeds: at 1 the first four move at
0.6/0.9/1.2/1.5 times `windSpeed` (later ones cap at 1.8). Smoke/Energy also gain
a small domain warp. This optional extension is independent of the four blurred
`glowLayers`; named presets use zero. `glowFlow` controls envelope reach, not
noise octave speeds, and named presets use zero.

Each group accepts `motionBlur` (wind transport interval in seconds, 0..0.25).
Six equally weighted samples span the interval while evolution stays at the
current time. Source pixels do not translate. Native Motion Blur maps to
`motionBlur = native * 0.15`; zero wind bypasses the samples, even with evolving
noise. A transient noise texture avoids six procedural evaluations. There is no
framebuffer history, so seeking remains deterministic. Broad, well-resolved Glow
noise may use a half-resolution field; light sampling, Core and Halo remain at
full resolution. Fluid Distort retains full-resolution noise to preserve folds.

With `glowDistortAllLayers: false`, distortion acts on narrow blur layers;
wide layers stay smooth.
The deformable share fades from full at radius `noiseScale / 4` to zero at
radius `noiseScale`, using effective radii rather than layer order.
`glowDistortAllLayers: true` includes all three glow layers, used by the
AE-inspired recipes so broad glow also moves. Layer 4 (Halo) is always protected.
Electric and Tractor Beam default to true; Tractor Beam also transports its broad haze.
These are procedural approximations, not a reproduction of VideoCopilot's noise algorithm.

`glowFlow` (CSS px, Electric default 5.1) extends the deformable glow envelope along
`glowDistortion.windDirection`, reversing for negative wind speed. It uses three
weighted samples in the existing distortion pass; zero retains the original
path. Reach is spatial, not a speed or temporal feedback: noise transport still
comes from `windSpeed`, evolution from `noiseSpeed`. It also works with
`glowDistortion.amount: 0`; wide protected halos remain symmetric.

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
coverage filtering, and distortion detail finer than a pixel fades out.
Minified alpha sources receive an area prefilter; degenerate contour normals
cannot turn a fractional-width line into a fully lit pixel.
Energy-noise ridges also integrate their sharp cusp over the pixel footprint.

Noise coordinates follow the element, so changing padding does not reseed the
pattern. Static core/glow passes are cached independently: a steady core with
animated glow distortion reuses its blurred source. Live parameter edits,
`invalidate()`, dynamic sources, layout changes and context restoration refresh
the relevant caches. Reveals trace the source bounds and reuse their contours
when only output padding or fullscreen position changes.
Large padding restricts field/core work to a conservative source region while
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
`intensity` scales core, halo and glow together (Electric default 1).
Nested defaults/options are copied per instance;
`setParams({ glowDistortion: { amount: 20 } })` preserves other group values.
AE blur kernels, Bias outside the measured range, colored-light behavior,
noise and very dim quantized output still differ. These are procedural WebGL
approximations, not interchangeable AE parameters or proprietary source.

```ts
const saber = new SaberEffect({
    source: false,
    coreDistortion: { amount: 0 },
    glowFlow: 0,
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

| Removed option | Replacement |
| --- | --- |
| `amplitude`, `mainAmplitude` | Tune `coreDistortion.amount`; no exact numeric conversion. |
| `scale` | Tune `coreDistortion.noiseScale`; the spatial basis differs. |
| `sharpness`, `burst` | Tune distortion `type`, `noiseBias`, `noiseDetail` and `noiseComplexity`. |
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
| `createRenderTarget(opts)` | `{ size?, float?, persistent?, wrap?, filter?, mipmap?, depth?, samples? }`. Call in `init`. |
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
