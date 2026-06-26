/**
 * @vfx-js/figma-shader — Figma-style WebGL shader effects for
 * {@link https://github.com/fand/vfx-js | @vfx-js/core}.
 *
 * Each export is an {@link Effect} you can pass to `vfx.add(el, { effect })`.
 * They recreate the shaders from https://shaders.figma.com/ — halftone,
 * dither, bloom, pixelate, hatching, gradient map, channel mixer, liquid
 * metal, fractal noise, waves, holographic foil, glass, and color filters.
 *
 * @module
 */

export { BloomEffect, type BloomParams } from "./bloom";
export {
    ChannelMixerEffect,
    type ChannelMixerParams,
} from "./channel-mixer";
export {
    ColorFilterEffect,
    type ColorFilterParams,
    type ColorFilterPreset,
} from "./color-filter";
export { DitherEffect, type DitherMode, type DitherParams } from "./dither";
export {
    FractalNoiseEffect,
    type FractalNoiseMode,
    type FractalNoiseParams,
} from "./fractal-noise";
export { GlassEffect, type GlassParams } from "./glass";
export {
    GradientMapEffect,
    type GradientMapParams,
} from "./gradient-map";
export {
    type HalftoneColorMode,
    HalftoneEffect,
    type HalftoneParams,
    type HalftoneShape,
} from "./halftone";
export { HatchingEffect, type HatchingParams } from "./hatching";
export {
    HolographicFoilEffect,
    type HolographicFoilParams,
} from "./holographic-foil";
export {
    LiquidMetalEffect,
    type LiquidMetalParams,
} from "./liquid-metal";
export {
    PixelateEffect,
    type PixelateParams,
    type PixelateShape,
} from "./pixelate";
export {
    WavesEffect,
    type WavesParams,
    type WavesType,
} from "./waves";
