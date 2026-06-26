# @vfx-js/figma-shader

Figma-style WebGL shader effects ported to [`@vfx-js/core`](https://www.npmjs.com/package/@vfx-js/core).

These recreate the shaders from [shaders.figma.com](https://shaders.figma.com/)
as VFX-JS [`Effect`](https://amagi.dev/vfx-js)s you can attach to any HTML
element or image.

## Install

```bash
npm install @vfx-js/core @vfx-js/figma-shader
```

## Usage

```ts
import { VFX } from "@vfx-js/core";
import { HalftoneEffect } from "@vfx-js/figma-shader";

const vfx = new VFX();
const img = document.querySelector("img");
const effect = new HalftoneEffect({ gridSize: 8, colorMode: "cmyk" });
await vfx.add(img, { effect });
```

Every effect exposes a mutable `params` object and a `setParams(partial)`
method, so you can drive them live (e.g. from Tweakpane):

```ts
effect.setParams({ gridSize: 12, angle: 30 });
```

## Effects

| Effect | What it does |
| --- | --- |
| `HalftoneEffect` | Rotated ink-screen of dots / squares / lines (mono, RGB, CMYK). |
| `DitherEffect` | Ordered (Bayer 4/8) or noise dithering with palette reduction. |
| `BloomEffect` | Cinematic glow blooming the bright regions. |
| `PixelateEffect` | Tiled shapes with color reduction and dissolve. |
| `HatchingEffect` | Pen-and-ink cross-hatching driven by tonal value. |
| `GradientMapEffect` | Remaps luminance through a four-stop color ramp. |
| `ChannelMixerEffect` | 3×3 R/G/B recombination for duotone / false-color. |
| `LiquidMetalEffect` | Flowing chrome from animated fractal noise. |
| `FractalNoiseEffect` | Animated fBm noise overlay with blend modes. |
| `WavesEffect` | Refraction-style waves, zigzags, and lenticular lensing. |
| `HolographicFoilEffect` | Iridescent thin-film sheen. |
| `GlassEffect` | Frosted glass: noise-jittered blur + refraction + tint. |
| `ColorFilterEffect` | Classic presets: grayscale, sepia, vintage, warm, cool, noir. |

## License

MIT
