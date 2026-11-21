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
| `ScanlineEffect` | CRT scanlines. |
| `SinewaveEffect` | Sine wave distortion. |
| `SliceShiftEffect` | Split into strips and shift each toward the center. |
| `SwirlParticlesEffect` | Particles flow over the element's silhouette, extruded to 3D, and peel off in wisps. Gradient `palette` (preset name from `SWIRL_PARTICLES_PALETTES` or `{ offset, color }` stops), `sourceColor` to use the image's colors, `count` (default 65536, max 2^20, live), camera `yaw` / `pitch` / `orbit` / `fov`, `drag: true` to orbit by dragging the element, pointer interaction `mouse: "repel" | "tilt"` (`mouseRadius` in CSS px, `mouseStrength`; default `"none"`), light `lightDirection` / `lightColor` / `lightIntensity` / `ambient` / `occlusion` / `glint`, and an optional drop shadow on the page behind (`shadow: true`, `shadowOpacity` / `shadowSoftness` / `shadowDistance` / `shadowColor`). `antialias: true` turns on 4× MSAA for the fibres (memory-heavy fullscreen at high DPR). Draws outside the element (`pad` in CSS px, default 200, or `"fullscreen"`) over transparency. |
| `TilePixelateEffect` | Pixelate into shaped tiles. |
| `TritoneEffect` | Three-color map. |
| `VignetteEffect` | Vignette. |
| `VoronoiEffect` | Voronoi cells around the cursor. |
| `WarpEffect` | Sine wave, twist or ripple warp. |

Live demos: https://amagi.dev/vfx-js/storybook

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
