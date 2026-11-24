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
| `SaberEffect` | Electric lines and glow along the outline: a bright main line on the outline, a faint companion line, and thin wisps that lift off in wandering spots (`lines`, 1 to 4, each extra line fainter and thinner). `burst` sets how sparse the spots are (0 = active everywhere). `amplitude` (reach of the furthest wisps) / `mainAmplitude` (how far the main line moves; 0 = straight) / `scale` / `thickness` in CSS px, `sharpness` (straight runs with kinks), `burst`, `flicker`, `speed`, `color`, `glow`, `glowFalloff`. Outline from alpha, or `edge: "luminance"` with `edgeThreshold` for photos. Draws outside the element (`pad` in CSS px, default 80, or `"fullscreen"`); `source: false` draws the light only. `start` / `end` (0..1 along each outline loop) draw the outline on (animate `end` 0→1) or wipe it out (animate `start` 0→1); `segments` (default 3) splits each loop so several heads grow at once; `fade` (CSS px, default 100) is the fading tail behind `start`, so a wipe-out trails off (0 = crisp cut). `variation` (0..1, default 0.7) adds brighter knots, flaring wisps and changing reach; 0 looks even. The outline is cached: call `effect.invalidate()` after `await vfx.update(el)` changes the content but not the size, or set `dynamic: true` for video. |
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

`SABER_PRESETS` contains nineteen appearance recipes, keyed by
`SaberPresetName`: `arc-reactor`, `burning`, `electric`, `energy`, `fog`,
`kryptonite`, `fire`, `torch`, `tractor-beam`, `windy`, `wormhole`, plus
`neon`, `plasma`, `ice`, `toxic`, `spectral`, `embers`, `laser`, `unstable`.
The first eleven reference the same-named AE Saber presets; `embers` is an alias
of `burning`. The others are original recipes. Use
`new SaberEffect({ preset: "fire", source: false })` or
`effect.setParams({ preset: "fire", coreIntensity: 0.5 })`. A preset resets
appearance; explicit options override it, including partial distortion groups.
Source/edge detection, dynamic input, padding and reveal settings are retained.
Nested values are copied per instance; the shared recipes are frozen.
These approximate AE's appearance and motion, not its proprietary shaders or
numeric parameter units. Fire uses Fluid core + Energy/multiply glow; Burning
uses Fluid core + Fluid/multiply glow and retains the original outline.
Fire/Torch rise, Tractor Beam stretches vertically, and Windy's core and glow
travel in opposite directions. None of the eleven uses global brightness
flicker or emits independent particles.
Fire defaults to four footprint-filtered octaves for both Core and Glow. Its
Energy/multiply Glow uses a signed fractal density field with diminishing
fine detail, preserving broad flame pockets instead of emphasizing thin ridges.
Multiply evaluates one noise field instead of the two needed for displacement.
Set `coreDistortion.noiseComplexity` and `glowDistortion.noiseComplexity`
independently (integers 1..8), including through `setParams`. The demo exposes
both as **Noise octaves** under Core Distortion / Glow Distortion.
`laser` is a static white core with a tight red glow, with distortion and flicker
disabled. It supplies the beam's appearance, not a moving beam simulation;
animate `start`/`end` separately to reveal it.

`coreIntensity` (default 1) scales visible core brightness independently of
glow. `coreWhiteness` (0..1, default 0.15) mixes its tint toward white.
`coreSoftness` (CSS px Gaussian sigma, default 0) softens only the visible core
after core distortion; glow continues to use the sharp distorted core. Zero
bypasses the blur. Nonzero softness adds cached blur work and render targets;
an animated core must update that blur each frame.
`coreBlendOnTop` (default false) takes the maximum of the original and displayed
core, retaining a clean outline; both respect `coreSoftness`. The original
outline's blur is cached separately from animated distortion. Overlay does not
alter the light feeding glow/halo.
`glowWhiteness` (0..1, default 0.15) controls glow tint independently of core and
halo. `toneMapping` selects `"exponential"` highlight rolloff (default) or
`"linear"` light clipped to the display range. Both only affect composition,
preserving cached shapes. AE-inspired recipes use either curve as appropriate.
`haloIntensity` (default 0) and `haloSize` (CSS px Gaussian radius, default 8)
add a separately controlled halo tinted with `color`, without the glow's white
mix. It uses the distorted core before display softness, independently of glow
size, bias and distortion. Zero intensity or size bypasses its blur. Static
halos are cached; animated cores add blur work. Halo also follows overall
`intensity` and brightness flicker.

`flickerIntensity` (0..1, default 0) modulates core, halo and glow brightness without
affecting source pixels. Gain stays between `1 - flickerIntensity` and 1.
`flickerSpeed` (default 12) sets smooth random keyframes per second; 0 freezes
the brightness noise. `flickerSeed` (integer, default 0) selects its pattern.
This clock follows VFX time, independently of line `speed` and distortion
clocks. The existing `flicker` still controls shape snapping. Brightness flicker
only changes final composition and does not invalidate the core/glow cache.

`SaberOptions` accepts partial `coreDistortion` and `glowDistortion` groups;
`SaberParams` holds their fully populated, live values. Both use
`SaberDistortionParams`: `amount` (CSS px, 0 bypasses), `type` (`"fluid"`,
`"smoke"`, `"energy"`), `composite` (`"distort"` warps; `"multiply"` modulates
brightness, reaching full modulation at amount 32), and `invert`. Each group has
independent `windSpeed` (CSS px/s), `windDirection` (degrees, 0 right / 90 up),
`noiseSpeed` (cycles/s), `noiseScale` (CSS px), `noiseBias` (positive contrast
control), `noiseComplexity` (1..8), `noiseDetail` (0..1, default 0), `noiseAspectRatio` (horizontal stretch),
`directionality` (0..1, default 0; constrain displacement to the wind axis),
and deterministic `seed`. Noise is anchored to the element. These clocks use VFX
time, independently of legacy line `speed`; set wind and noise speeds to zero
to freeze them. Core distortion changes the lines and their glow source; glow
distortion changes only the generated glow. With nonzero detail,
a steady single core uses distance-field coverage after warping
to keep steep thin streaks continuous; reveals and multi-line cores retain the
raster path.
Fluid/smoke glow uses broad wind-aligned flow at `noiseDetail: 0`; nonzero
detail uses a Fluid fBm / billowing Smoke fractal displacement field. Fluid core
retains domain warping; above `noiseBias: 1`, its detailed turbulence concentrates
in moving pockets, leaving calm regions between them.
`noiseDetail` raises octave frequency spacing from 2.03 to 2.7, fine-band gain
from 0.5 to 0.58, and multiply contrast. Density glow keeps gain 0.5. For Energy/multiply
Glow it blends ridges toward signed fBm density, with fine octaves kept weaker
than the coarse envelope. Energy displacement retains wind-stretched strands.
Zero retains the previous appearance. Unresolved noise bands are attenuated at
the current resolution.
Each distortion group accepts `motionBlur` (approximate shutter seconds,
0..0.25, default 0). It evaluates two noise fields and integrates five light
samples along their interpolated displacement, without framebuffer history.
This smooths fast streaks while keeping seeking deterministic. It adds shader
work, so use it selectively; zero bypasses it. Freezing both noise and wind
also bypasses the shutter.

In layers mode, distortion normally acts on narrow blur layers; wide halos stay smooth.
The deformable share fades from full at radius `noiseScale / 4` to zero at
radius `noiseScale`, using effective radii rather than layer order.
`glowDistortAllLayers: true` includes every layer, used by the AE-inspired recipes
so broad glow also moves. It leaves the independent `haloIntensity` halo unchanged.
Default is false; Tractor Beam also keeps its broad background smooth. Pyramid
mode still distorts the combined glow. These are procedural approximations,
not a reproduction of VideoCopilot's noise algorithm.

`glowFlow` (CSS px, default 0) extends the deformable glow envelope along
`glowDistortion.windDirection`, reversing for negative wind speed. It uses three
weighted samples in the existing distortion pass; zero retains the original
path. Reach is spatial, not a speed or temporal feedback: noise transport still
comes from `windSpeed`, evolution from `noiseSpeed`. It also works with
`glowDistortion.amount: 0`; wide protected halos remain symmetric.

`glowMode: "pyramid"` is the original/default glow (`glowFalloff` applies here).
`glowMode: "layers"` enables exactly four `SaberGlowLayer` objects in `glowLayers`,
each with `size` (approximate Gaussian sigma in CSS px) and `intensity` (brightness
normalized for thin lines). Either value at zero disables that layer. Defaults
are sizes `[3, 12, 36, 96]` and intensities `[1, 0.5, 0.25, 0.125]`.

In layers mode, effective radius is `size * glowSpread * glowSizeMultiplier`;
both multipliers default to 1, and zero disables glow. `pad` only bounds the
output: allow roughly 3 times the largest effective radius plus distortion
reach, or use `"fullscreen"`. Large radii use lower-resolution blurs.
Their Gaussian kernels account for downsampling and use smooth cubic
reconstruction; changing radius across resolution levels avoids abrupt bright
rings. Subpixel radii fade continuously to zero. Thin core lines use pixel
coverage filtering, and distortion detail finer than a pixel fades out.
Minified alpha sources receive an area prefilter; degenerate contour normals
cannot turn a fractional-width line into a fully lit pixel.
Energy-noise ridges also integrate their sharp cusp over the pixel footprint.
The original `pyramid` mode uses a separable downsample to suppress diagonal
aliasing on odd-sized buffers; its smallest one-level glow keeps the same
brightness normalization across DPR.

Noise coordinates follow the element, so changing padding does not reseed the
pattern. Static core/glow passes are cached independently: a steady core with
animated glow distortion reuses its blurred source. Live parameter edits,
`invalidate()`, dynamic sources, layout changes and context restoration refresh
the relevant caches. Reveals trace the source bounds and reuse their contours
when only output padding or fullscreen position changes.
Large padding restricts field/core work to a conservative source region while
keeping full-size glow/distortion outputs.

Both modes support `glowPreGamma` (positive, `pow(core, 1/gamma)` before blur),
`glowBias` (`pow(glow, 2^bias)` after glow distortion, -4..4), and
`glowIntensityMultiplier` (additional glow gain). Defaults are 1, 0, and 1.
These affect glow only; the existing `intensity` still scales core and glow,
and `glow` still scales glow. Nested defaults/options are copied per instance;
`setParams({ glowDistortion: { amount: 20 } })` preserves other group values.
These are procedural WebGL approximations, not AE-compatible parameter units
or a reproduction of Video Copilot's proprietary renderer.

```ts
const saber = new SaberEffect({
    source: false,
    lines: 1,
    mainAmplitude: 0,
    variation: 0,
    glowMode: "layers",
    pad: 320,
    glowDistortion: {
        amount: 32,
        type: "fluid",
        windDirection: 90,
        windSpeed: 35,
    },
});
```

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
