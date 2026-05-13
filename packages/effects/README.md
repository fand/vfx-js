# @vfx-js/effects

Ready-made WebGL effects for [`@vfx-js/core`](https://www.npmjs.com/package/@vfx-js/core).

## Install

```bash
npm install @vfx-js/core @vfx-js/effects
```

## Usage

```ts
import { VFX } from "@vfx-js/core";
import { BloomEffect } from "@vfx-js/effects";

const vfx = new VFX();
const img = document.querySelector("img");
const effect = new BloomEffect({ threshold: 0.2, intensity: 5 });
await vfx.add(img, { effect });
```

Chain multiple effects:

```ts
import {
    BloomEffect,
    PixelateEffect,
    ScanlineEffect,
} from "@vfx-js/effects";

await vfx.add(img, {
    effect: [
        new PixelateEffect({ size: 10 }),
        new ScanlineEffect({ spacing: 5 }),
        new BloomEffect({ intensity: 10 }),
    ],
});
```

## Effects

| Effect                   | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `BloomEffect`            | COD:AW-style bloom pyramid with soft-knee threshold             |
| `FluidEffect`            | Stable-Fluids advection driven by pointer events                |
| `HalftoneEffect`         | RGB / CMYK halftone screen with configurable ink presets        |
| `ParticleEffect`         | Mouse-emitter GPU particles, skips transparent source regions   |
| `ParticleExplodeEffect`  | One-shot curl-noise burst that shatters the source element      |
| `VoronoiEffect`          | Voronoi cells shrunken in a halo around the cursor              |
| `PixelateEffect`         | Nearest-neighbour pixelation                                    |
| `ScanlineEffect`         | CRT scanline overlay                                            |

See the [Storybook demos](https://amagi.dev/vfx-js/storybook) for live examples.

## License

MIT
