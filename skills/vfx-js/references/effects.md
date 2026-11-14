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
| `createRenderTarget(opts)` | `{ size?, float?, persistent?, wrap?, filter?, mipmap? }`. Call in `init`. |
| `wrapTexture(source, opts)` | Wrap an image, canvas, video or `WebGLTexture`. Call in `init`. With `autoUpdate: false`, call `tex.update()` after the source changes. |
| `draw(opts)` | `{ frag, vert?, geometry?, uniforms?, target?, blend?, swap? }`. |
| `blit(source, target?)` | Copy a texture into a target. |
| `clear(target?)` | Clear a render target. |
| `gl` | Raw `WebGL2RenderingContext`. |

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
        ctx.draw({ frag: MINIMAP, uniforms: { page: texture, pageRect: [rect.x, rect.y, rect.width, rect.height] } });
    }
}
await vfx.add(minimapEl, { effect: new Minimap(page) });

// A reusable effect takes the texture as a uniform and reads ctx.uniforms.page.
await vfx.add(other, { effect: new MyEffect(), uniforms: { page: page.texture } });

await page.update(); // capture again
page.dispose();      // free it and restore the element
```

- Pass the `VFXCapture` to the effect when it needs `rect`. Pass `capture.texture` in `uniforms` for a reusable effect.
- `hide: true` hides the element; it keeps its layout and stays interactive. Default `false` leaves it visible.
- `rect` is in viewport CSS px. `x` / `y` are measured every frame; `width` / `height` are the size when the texture was captured.
- Videos and canvases refresh every frame. html-in-canvas refreshes on every repaint. Images and the DOM snapshot fallback change only on `update()`.
- Effect path only: with `shader`, a texture uniform is ignored with a warning.
- Post effect `uniforms` can't take it (the capture needs the `VFX` first). Set the capture on the post effect instance after `await vfx.capture()`.
- One capture per element. `capture` rejects for an element `addHTML` or a transition wraps, and the other way round.
- The texture belongs to its `VFX`; drawing it in another instance throws.
- To map `rect` in a post effect, use `new VFX({ scrollPadding: false })`. With scroll padding, an effect can't tell where the viewport is in the canvas.

### Rules

- One instance per element. Use a factory: `const make = () => new MyEffect()`.
- `shader` and `effect` are mutually exclusive.
- Free anything you allocate with raw `ctx.gl` in `dispose`, and rebuild it in `ctx.onContextRestored(cb)`.
- Use `ctx.dims` for pixel sizes. Don't read DOM sizes in `render`.
