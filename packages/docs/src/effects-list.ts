import type { Effect, ShaderPreset, VFXProps } from "@vfx-js/core";
import {
    AsciiEffect,
    BadJpegEffect,
    BloomEffect,
    ChromaticEffect,
    ColoredEdgesEffect,
    DatamoshEffect,
    DitherEffect,
    DuotoneEffect,
    FluidEffect,
    GlitchEffect,
    GradientMapEffect,
    HalftoneEffect,
    HueShiftEffect,
    JPEGGlitchEffect,
    LightStreakEffect,
    MatrixEffect,
    ParticleEffect,
    ParticleExplodeEffect,
    PatternRefractionEffect,
    PixelateEffect,
    PixelSortEffect,
    PixelStretchEffect,
    RainbowEffect,
    RgbGlitchEffect,
    RgbShiftEffect,
    ScanlineEffect,
    SinewaveEffect,
    SliceShiftEffect,
    TilePixelateEffect,
    TritoneEffect,
    VignetteEffect,
    VoronoiEffect,
    WarpEffect,
} from "@vfx-js/effects";

/** Images in public/ that the demos use. */
export type DemoMedia = "logo" | "pigeon" | "jellyfish";

export type PresetDemo = {
    name: ShaderPreset;
    media: DemoMedia;
    props?: Omit<VFXProps, "shader">;
};

export const presetDemos: PresetDemo[] = [
    { name: "uvGradient", media: "logo" },
    { name: "rainbow", media: "logo" },
    { name: "glitch", media: "logo", props: { overflow: 60 } },
    { name: "rgbGlitch", media: "logo" },
    { name: "rgbShift", media: "logo" },
    { name: "shine", media: "logo" },
    { name: "blink", media: "logo" },
    { name: "spring", media: "logo" },
    { name: "sinewave", media: "logo" },
    { name: "pixelate", media: "logo" },
    { name: "halftone", media: "jellyfish" },
    { name: "invert", media: "pigeon" },
    { name: "grayscale", media: "pigeon" },
    {
        name: "duotone",
        media: "jellyfish",
        props: {
            uniforms: {
                color1: [1, 0, 0, 1],
                color2: [0, 0, 1, 1],
                speed: 0.2,
            },
        },
    },
    {
        name: "tritone",
        media: "jellyfish",
        props: {
            uniforms: {
                color1: [1, 0, 0, 1],
                color2: [0, 1, 0, 1],
                color3: [0, 0, 1, 1],
                speed: 0.2,
            },
        },
    },
    {
        name: "hueShift",
        media: "jellyfish",
        props: { uniforms: { shift: 0.5 } },
    },
    {
        name: "vignette",
        media: "pigeon",
        props: { uniforms: { intensity: 0.5, radius: 0.5, power: 2 } },
    },
    {
        name: "chromatic",
        media: "pigeon",
        props: { uniforms: { intensity: 0.3, radius: 0, power: 2 } },
    },
];

// These play when the element enters the viewport, and reverse when it leaves.
export const transitionPresetDemos: PresetDemo[] = [
    "slitScanTransition",
    "warpTransition",
    "pixelateTransition",
    "focusTransition",
].map((name) => ({
    name: name as ShaderPreset,
    media: "logo",
    props: { intersection: { threshold: 1 } },
}));

export type EffectDemo = {
    name: string;
    text: string;
    media: DemoMedia;
    create: () => Effect;
    /** Shown under the demo when it needs input. */
    hint?: string;
    /** Runs on click on the demo. */
    onClick?: (effect: Effect) => void;
    /** Draw order in the shared canvas. */
    zIndex?: number;
};

const moshing = new WeakSet<Effect>();

export const effectDemos: EffectDemo[] = [
    {
        name: "AsciiEffect",
        text: "ASCII mosaic from a dark-to-light character ramp.",
        media: "pigeon",
        create: () => new AsciiEffect(),
    },
    {
        name: "BadJpegEffect",
        text: "JPEG damage: chroma subsampling and blocky DCT.",
        media: "pigeon",
        create: () => new BadJpegEffect({ quality: 4 }),
    },
    {
        name: "BloomEffect",
        text: "Bloom with a soft threshold. Draws outside the element.",
        media: "jellyfish",
        create: () => new BloomEffect({ threshold: 0.2, intensity: 4 }),
    },
    {
        name: "ChromaticEffect",
        text: "Chromatic aberration.",
        media: "pigeon",
        create: () => new ChromaticEffect(),
    },
    {
        name: "ColoredEdgesEffect",
        text: "Edge detection with two edge colors.",
        media: "pigeon",
        create: () => new ColoredEdgesEffect(),
    },
    {
        name: "DatamoshEffect",
        text: "Fake datamosh.",
        media: "jellyfish",
        create: () => new DatamoshEffect(),
        hint: "Click to start or stop.",
        onClick: (effect) => {
            const mosh = effect as DatamoshEffect;
            if (moshing.has(mosh)) {
                moshing.delete(mosh);
                mosh.disable();
            } else {
                moshing.add(mosh);
                mosh.enable();
            }
        },
    },
    {
        name: "DitherEffect",
        text: "Bayer or blue-noise dither with few colors.",
        media: "pigeon",
        create: () => new DitherEffect(),
    },
    {
        name: "DuotoneEffect",
        text: "Two-color map.",
        media: "pigeon",
        create: () => new DuotoneEffect(),
    },
    {
        name: "FluidEffect",
        text: "Fluid simulation driven by the pointer.",
        media: "pigeon",
        create: () => new FluidEffect(),
        hint: "Move the pointer over it.",
    },
    {
        name: "GlitchEffect",
        text: "Block shift and aberration glitch.",
        media: "pigeon",
        create: () => new GlitchEffect(),
    },
    {
        name: "GradientMapEffect",
        text: "Map brightness to a color gradient.",
        media: "pigeon",
        create: () => new GradientMapEffect(),
    },
    {
        name: "HalftoneEffect",
        text: "RGB or CMYK halftone screen.",
        media: "pigeon",
        create: () => new HalftoneEffect(),
    },
    {
        name: "HueShiftEffect",
        text: "Rotate the hue.",
        media: "pigeon",
        create: () => new HueShiftEffect(),
    },
    {
        name: "JPEGGlitchEffect",
        text: "Real JPEG glitch: breaks the encoded bytes.",
        media: "pigeon",
        create: () => new JPEGGlitchEffect(),
    },
    {
        name: "LightStreakEffect",
        text: "Anamorphic flare and starburst streaks.",
        media: "jellyfish",
        create: () => new LightStreakEffect(),
    },
    {
        name: "MatrixEffect",
        text: "Digital rain of glyphs over the image.",
        media: "pigeon",
        create: () => new MatrixEffect(),
    },
    {
        name: "ParticleEffect",
        text: "GPU particles from the pointer.",
        media: "pigeon",
        create: () => new ParticleEffect(),
        hint: "Move the pointer over it.",
    },
    {
        name: "ParticleExplodeEffect",
        text: "One burst that shatters the element.",
        media: "pigeon",
        create: () => new ParticleExplodeEffect(),
        hint: "Click to burst.",
        // The burst covers the whole canvas and wipes what was drawn before it.
        zIndex: -1,
        onClick: (effect) => (effect as ParticleExplodeEffect).trigger(),
    },
    {
        name: "PatternRefractionEffect",
        text: "Refraction through ribbed glass.",
        media: "pigeon",
        create: () => new PatternRefractionEffect(),
    },
    {
        name: "PixelateEffect",
        text: "Pixelation. size is in CSS px.",
        media: "pigeon",
        create: () => new PixelateEffect({ size: 8 }),
    },
    {
        name: "PixelSortEffect",
        text: "Threshold pixel sort at any angle.",
        media: "pigeon",
        create: () => new PixelSortEffect(),
    },
    {
        name: "PixelStretchEffect",
        text: "Smear one line across a band of the image.",
        media: "pigeon",
        create: () => new PixelStretchEffect(),
    },
    {
        name: "RainbowEffect",
        text: "Moving rainbow gradient.",
        media: "pigeon",
        create: () => new RainbowEffect(),
    },
    {
        name: "RgbGlitchEffect",
        text: "Block glitch with RGB split.",
        media: "pigeon",
        create: () => new RgbGlitchEffect(),
    },
    {
        name: "RgbShiftEffect",
        text: "RGB channel shift.",
        media: "pigeon",
        create: () => new RgbShiftEffect(),
    },
    {
        name: "ScanlineEffect",
        text: "CRT scanlines.",
        media: "pigeon",
        create: () => new ScanlineEffect(),
    },
    {
        name: "SinewaveEffect",
        text: "Sine wave distortion.",
        media: "pigeon",
        create: () => new SinewaveEffect(),
    },
    {
        name: "SliceShiftEffect",
        text: "Split into strips and shift each one.",
        media: "pigeon",
        create: () => new SliceShiftEffect(),
    },
    {
        name: "TilePixelateEffect",
        text: "Pixelate into shaped tiles.",
        media: "pigeon",
        create: () => new TilePixelateEffect(),
    },
    {
        name: "TritoneEffect",
        text: "Three-color map.",
        media: "pigeon",
        create: () => new TritoneEffect(),
    },
    {
        name: "VignetteEffect",
        text: "Vignette.",
        media: "pigeon",
        create: () => new VignetteEffect(),
    },
    {
        name: "VoronoiEffect",
        text: "Voronoi cells around the pointer.",
        media: "pigeon",
        create: () => new VoronoiEffect(),
        hint: "Move the pointer over it.",
    },
    {
        name: "WarpEffect",
        text: "Sine wave, twist or ripple warp.",
        media: "pigeon",
        create: () => new WarpEffect(),
    },
];
