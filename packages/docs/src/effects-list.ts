import type { Effect, ShaderPreset, VFXProps } from "@vfx-js/core";
import {
    AsciiEffect,
    BadJpegEffect,
    BloomEffect,
    BubbleEffect,
    ChromaticEffect,
    ColoredEdgesEffect,
    DatamoshEffect,
    DitherEffect,
    DuotoneEffect,
    FluidEffect,
    GlassEffect,
    GlitchEffect,
    GradientMapEffect,
    HalftoneEffect,
    HoloEffect,
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
    SwirlParticleEffect,
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

// These animate in when the element enters the viewport, and out when it leaves.
export const revealPresetDemos: PresetDemo[] = [
    "slitScanReveal",
    "warpReveal",
    "pixelateReveal",
    "focusReveal",
].map((name) => ({
    name: name as ShaderPreset,
    media: "logo",
    props: { intersection: { threshold: 1 } },
}));

/** Pane options for one param, or false to leave it out. */
export type ControlOptions =
    | { min?: number; max?: number; step?: number }
    | false;

export type EffectDemo = {
    name: string;
    /** One line for the gallery. */
    text: string;
    /** A few sentences for the effect page. */
    about: string;
    media: DemoMedia;
    /** Make the effect with the demo params, then `values` on top. */
    create: (values?: Record<string, unknown>) => Effect;
    /** Make the effect with no params, to read its defaults. */
    createDefault: () => Effect;
    /** Params the demo passes to the constructor. */
    params: Record<string, unknown>;
    /** Defaults for effects that do not expose their params. */
    defaults?: Record<string, unknown>;
    /** Folders in the param pane, in order. Params in no group come first. */
    groups?: Record<string, string[]>;
    /** Params the effect reads only when it starts. Found from the docs if omitted. */
    rebuild?: string[];
    /** Overrides for the param pane. */
    controls?: Record<string, ControlOptions>;
    /** Named values for a param the pane shows as a list. */
    choices?: Record<
        string,
        { values: Record<string, unknown>; code: (key: string) => string }
    >;
    /** Extra lines at the end of the usage code. */
    usage?: string;
    /** Shown under the demo when it needs input. */
    hint?: string;
    /** Runs on click on the demo. */
    onClick?: (effect: Effect) => void;
    /** Draw order in the shared canvas. */
    zIndex?: number;
};

type DemoInput<P> = Omit<EffectDemo, "create" | "createDefault" | "params"> & {
    effect: new (params?: P) => Effect;
    params?: P;
};

function demo<P extends object>(input: DemoInput<P>): EffectDemo {
    const { effect: EffectClass, params, ...rest } = input;
    return {
        ...rest,
        params: { ...params },
        create: (values) => new EffectClass({ ...params, ...values } as P),
        createDefault: () => new EffectClass(),
    };
}

// Camera and output params of the 3D silhouette effects.
const viewGroup = [
    "yaw",
    "pitch",
    "orbitAnimation",
    "orbitSpeed",
    "fov",
    "zoom",
    "drag",
    "cameraOrigin",
    "pointer",
    "pointerStrength",
];
const outputGroup = ["resolution", "antialias", "pad", "debug"];
const backdropGroup = [
    "backdrop",
    "backdropColors",
    "backdropVisible",
    "backdropAround",
    "backdropScale",
    "backdropDistance",
    "backdropSpeed",
    "backdropRatio",
    "backdropSoftness",
];

const moshing = new WeakSet<Effect>();

export const effectDemos: EffectDemo[] = [
    demo({
        name: "AsciiEffect",
        groups: {
            Glyphs: ["grid", "preset", "font", "fontWeight"],
            Color: [
                "color",
                "background",
                "colorFromSource",
                "invert",
                "dither",
            ],
        },
        text: "ASCII mosaic from a dark-to-light character ramp.",
        about: "Splits the element into a grid and draws one character per cell. Brighter cells get denser characters. Pick the characters with `preset` or `chars`.",
        media: "pigeon",
        effect: AsciiEffect,
    }),
    demo({
        name: "BadJpegEffect",
        text: "JPEG damage: chroma subsampling and blocky DCT.",
        about: "Makes the element look like a low-quality JPEG. It blurs the colors, breaks the image into 8×8 blocks, and encodes it again `iterations` times to pile up the damage.",
        media: "pigeon",
        effect: BadJpegEffect,
        params: { quality: 4 },
    }),
    demo({
        name: "BloomEffect",
        groups: {
            Glow: ["threshold", "softness", "intensity", "scatter"],
            Output: ["pad", "dither", "edgeFade"],
        },
        text: "Bloom with a soft threshold. Draws outside the element.",
        about: "Makes bright areas glow. Pixels brighter than `threshold` spread light around them. The glow can reach past the element, and `pad` sets how far.",
        media: "jellyfish",
        effect: BloomEffect,
        params: { threshold: 0.2, intensity: 4 },
    }),
    demo({
        name: "BubbleEffect",
        groups: {
            Bubbles: [
                "sourceChannel",
                "depth",
                "bevel",
                "cellSize",
                "cellSizeRandomness",
                "seed",
                "roundness",
                "minSize",
                "containment",
                "wobble",
                "speed",
                "maxLayers",
            ],
            Film: [
                "iridescence",
                "thickness",
                "thicknessVariation",
                "drain",
                "swirlScale",
                "swirlSpeed",
                "reflection",
                "rim",
                "tint",
                "tintStrength",
                "opacity",
                "color",
            ],
            Borders: ["borderWidth", "borderHighlight"],
            Backdrop: backdropGroup,
            Lights: ["lightIntensity", "lightSoftness"],
            View: viewGroup,
            Output: outputGroup,
        },
        text: "A foam of soap bubbles filling the silhouette.",
        about: "Fills the shape of the element with soap bubbles in thin-film colors. The shape comes from the alpha, so use it on logos or text with a transparent background.",
        media: "logo",
        effect: BubbleEffect,
        // A small pad keeps the demo cheap.
        params: { pad: 40, zoom: 0.9 },
    }),
    demo({
        name: "ChromaticEffect",
        text: "Chromatic aberration.",
        about: "Splits the red, green and blue channels toward the edges, like a cheap lens.",
        media: "pigeon",
        effect: ChromaticEffect,
    }),
    demo({
        name: "ColoredEdgesEffect",
        groups: {
            Edges: ["threshold", "thickness", "intensity"],
            Color: ["color1", "color2", "background", "opacity"],
        },
        text: "Edge detection with two edge colors.",
        about: "Finds the edges in the element and draws them in two colors over a solid background.",
        media: "pigeon",
        effect: ColoredEdgesEffect,
    }),
    demo({
        name: "DatamoshEffect",
        groups: {
            Motion: ["blockSize", "searchRange", "searchStep", "useResidual"],
            Mosh: ["dup", "colorSpace", "chromaGain"],
            Heal: ["healRate", "healThreshold"],
            Debug: ["view"],
        },
        text: "Fake datamosh.",
        about: "Fakes the smear of a broken video stream. The element shows as is until you call `enable()`. Then old pixels get dragged along with the motion. Works best on video.",
        media: "jellyfish",
        effect: DatamoshEffect,
        hint: "Click to start or stop.",
        usage: `
let moshing = false;
img.addEventListener("click", () => {
    moshing = !moshing;
    moshing ? effect.enable() : effect.disable();
});`,
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
    }),
    demo({
        name: "DitherEffect",
        groups: {
            Pattern: ["style", "size", "levels"],
            Tone: ["brightness", "contrast"],
            Mono: ["mono", "monoColor"],
        },
        text: "Bayer or blue-noise dither with few colors.",
        about: "Cuts the element down to a few colors and fills the steps with a dither pattern. Pick a Bayer pattern or blue noise with `style`.",
        media: "pigeon",
        effect: DitherEffect,
    }),
    demo({
        name: "DuotoneEffect",
        text: "Two-color map.",
        about: "Maps dark areas to `color1` and bright areas to `color2`. Set `speed` above 0 to cycle the colors.",
        media: "pigeon",
        effect: DuotoneEffect,
    }),
    demo({
        name: "FluidEffect",
        groups: {
            Simulation: [
                "simSize",
                "pressureIterations",
                "curlStrength",
                "velocityDissipation",
                "densityDissipation",
            ],
            Splat: [
                "splatForce",
                "splatRadius",
                "dyeSplatRadius",
                "dyeSplatIntensity",
            ],
            Debug: ["showDye"],
        },
        text: "Fluid simulation driven by the pointer.",
        about: "Runs a fluid simulation on top of the element. The pointer stirs the fluid, and the fluid pushes the image around.",
        media: "pigeon",
        effect: FluidEffect,
        hint: "Move the pointer over it.",
    }),
    demo({
        name: "GlassEffect",
        groups: {
            Shape: [
                "sourceChannel",
                "depth",
                "bevel",
                "bevelShape",
                "bulge",
                "bulgeWidth",
                "relief",
                "reliefBlur",
            ],
            Glass: [
                "ior",
                "dispersion",
                "paths",
                "samples",
                "bounces",
                "jitter",
                "tint",
                "absorption",
                "reflection",
                "bump",
                "bumpScale",
                "frost",
            ],
            Backdrop: backdropGroup,
            Lights: ["lightIntensity", "lightSoftness"],
            View: viewGroup,
            Output: outputGroup,
        },
        text: "Dispersive glass in the shape of the silhouette.",
        about: "Turns the shape of the element into a block of glass. Light bends through it and splits into rainbow colors. A pattern or an image shows through from behind.",
        media: "logo",
        effect: GlassEffect,
        // A small pad keeps the demo cheap.
        params: { pad: 40, zoom: 0.9 },
    }),
    demo({
        name: "GlitchEffect",
        text: "Block shift and aberration glitch.",
        about: "Shifts blocks of the image and splits the colors at random moments.",
        media: "pigeon",
        effect: GlitchEffect,
    }),
    demo({
        name: "GradientMapEffect",
        groups: {
            Gradient: ["colors", "mixSpace", "repeat"],
            Mapping: ["scatter", "offset", "frequency", "speed"],
        },
        text: "Map brightness to a color gradient.",
        about: "Maps the brightness of each pixel to a color gradient. Pass the gradient stops in `colors`, dark to light.",
        media: "pigeon",
        effect: GradientMapEffect,
    }),
    demo({
        name: "HalftoneEffect",
        groups: {
            Grid: ["gridSize", "dotSize", "smoothing", "angle", "trimEdge"],
            Ink: ["mode", "blackAmount", "background", "inkPalette"],
        },
        text: "RGB or CMYK halftone screen.",
        about: "Draws the element with dots, like print. Use RGB or CMYK screens, and set the dot size and angle.",
        media: "pigeon",
        effect: HalftoneEffect,
    }),
    demo({
        name: "HoloEffect",
        text: "Holographic foil from holo.spot. Move the pointer over it to tilt.",
        about: "Turns the element into a holographic foil card. The card tilts toward the pointer and catches the light in rainbow colors. Looks copied from holo.spot work as is.",
        media: "logo",
        effect: HoloEffect,
        params: { holo: HoloEffect.looks.card },
        choices: {
            holo: {
                values: HoloEffect.looks,
                code: (key) => `HoloEffect.looks.${key}`,
            },
        },
        hint: "Move the pointer over it.",
    }),
    demo({
        name: "HueShiftEffect",
        text: "Rotate the hue.",
        about: "Rotates the hue of every pixel. A `shift` of 1 is a full turn.",
        media: "pigeon",
        effect: HueShiftEffect,
    }),
    demo({
        name: "JPEGGlitchEffect",
        groups: {
            Glitch: [
                "quality",
                "seed",
                "iterations",
                "resolutionScale",
                "randomFlip",
                "vertical",
            ],
            Playback: ["speed", "bypass"],
        },
        text: "Real JPEG glitch: breaks the encoded bytes.",
        about: "Encodes the element as a real JPEG, breaks random bytes, and shows what the browser decodes. With `speed` above 0 it keeps glitching.",
        media: "pigeon",
        effect: JPEGGlitchEffect,
    }),
    demo({
        name: "LightStreakEffect",
        groups: {
            Streaks: [
                "streaks",
                "angle",
                "length",
                "width",
                "falloff",
                "density",
            ],
            Source: ["threshold", "highlightClamp"],
            Color: ["intensity", "tint", "dispersion", "fringe", "fringeCount"],
            Output: ["resolution", "pad"],
        },
        text: "Anamorphic flare and starburst streaks.",
        about: "Adds light streaks to bright spots, like an anamorphic lens flare or a starburst.",
        media: "jellyfish",
        effect: LightStreakEffect,
    }),
    demo({
        name: "MatrixEffect",
        groups: {
            Grid: ["grid", "font", "fontWeight", "seed"],
            Rain: ["speed", "tail", "tailFade", "birthRate", "glyphSpeed"],
            Color: [
                "color",
                "headColor",
                "background",
                "brightness",
                "contrast",
                "invert",
            ],
        },
        text: "Digital rain of glyphs over the image.",
        about: "Draws falling streams of glyphs, like digital rain. The brightness of the element shows through the rain.",
        media: "pigeon",
        effect: MatrixEffect,
        rebuild: ["font", "fontWeight", "charAspect", "glyphs"],
        // MatrixEffect keeps its params private.
        defaults: {
            grid: [12, 16],
            font: "monospace",
            fontWeight: "normal",
            color: [0.18, 1, 0.36, 1],
            headColor: [0.85, 1, 0.9, 1],
            background: [0, 0, 0, 1],
            speed: 10,
            tail: 18,
            tailFade: 1,
            birthRate: 0.6,
            glyphSpeed: 8,
            brightness: 1,
            contrast: 1,
            invert: false,
            seed: 0,
        },
    }),
    demo({
        name: "ParticleEffect",
        groups: {
            Emitter: [
                "count",
                "birthRate",
                "screenBirthRate",
                "radius",
                "alphaThreshold",
                "spawnOnIdle",
            ],
            Lifetime: ["life", "alphaDecay", "fadeIn", "speedDecay"],
            Motion: [
                "emitSpeed",
                "noiseDelay",
                "noiseSpeed",
                "noiseScale",
                "noiseAnimation",
            ],
            Appearance: ["pointSize", "alpha", "fog", "color", "colorMix"],
            Composite: ["blend", "trailFade", "srcOpacity"],
        },
        text: "GPU particles from the pointer.",
        about: "Emits particles around the pointer. They take the colors of the element and drift away on a swirling flow.",
        media: "pigeon",
        effect: ParticleEffect,
        // The effect caps the count at 2^20.
        controls: { count: { max: 1048576 } },
        hint: "Move the pointer over it.",
    }),
    demo({
        name: "ParticleExplodeEffect",
        groups: {
            Explode: [
                "count",
                "duration",
                "noiseSpeed",
                "noiseScale",
                "noiseAnimation",
                "outwardBias",
                "speedDecay",
            ],
            Appearance: [
                "pointSize",
                "alpha",
                "alphaDecay",
                "fog",
                "color",
                "colorMix",
            ],
            Composite: ["blend", "trailFade"],
        },
        text: "One burst that shatters the element.",
        about: "Breaks the element into particles in one burst. Call `trigger()` to start it.",
        media: "pigeon",
        effect: ParticleExplodeEffect,
        hint: "Click to burst.",
        usage: `
img.addEventListener("click", () => effect.trigger());`,
        // The burst covers the whole canvas and wipes what was drawn before it.
        zIndex: -1,
        onClick: (effect) => (effect as ParticleExplodeEffect).trigger(),
    }),
    demo({
        name: "PatternRefractionEffect",
        groups: {
            Pattern: [
                "pattern",
                "stripWidth",
                "angle",
                "centerX",
                "centerY",
                "edgeWrap",
            ],
            Glass: ["strength", "smoothness", "frost", "dispersion"],
        },
        text: "Refraction through ribbed glass.",
        about: "Shows the element through ribbed or patterned glass. Pick the glass with `pattern`.",
        media: "pigeon",
        effect: PatternRefractionEffect,
    }),
    demo({
        name: "PixelateEffect",
        text: "Pixelation. size is in CSS px.",
        about: "Draws the element with big square pixels. `size` is in CSS px.",
        media: "pigeon",
        effect: PixelateEffect,
        params: { size: 8 },
    }),
    demo({
        name: "PixelSortEffect",
        text: "Threshold pixel sort at any angle.",
        about: "Sorts runs of pixels by brightness, for a glitch-art look. Only pixels inside `range` get sorted. `angle` sets the direction.",
        media: "pigeon",
        effect: PixelSortEffect,
    }),
    demo({
        name: "PixelStretchEffect",
        text: "Smear one line across a band of the image.",
        about: "Takes one line of pixels and stretches it across a band of the image.",
        media: "pigeon",
        effect: PixelStretchEffect,
    }),
    demo({
        name: "RainbowEffect",
        text: "Moving rainbow gradient.",
        about: "Moves a rainbow gradient across the element.",
        media: "pigeon",
        effect: RainbowEffect,
    }),
    demo({
        name: "RgbGlitchEffect",
        text: "Block glitch with RGB split.",
        about: "Shifts random blocks of the image and splits the color channels.",
        media: "pigeon",
        effect: RgbGlitchEffect,
    }),
    demo({
        name: "RgbShiftEffect",
        text: "RGB channel shift.",
        about: "Moves the red, green and blue channels apart.",
        media: "pigeon",
        effect: RgbShiftEffect,
    }),
    demo({
        name: "ScanlineEffect",
        text: "CRT scanlines.",
        about: "Adds dark horizontal lines, like an old CRT screen.",
        media: "pigeon",
        effect: ScanlineEffect,
    }),
    demo({
        name: "SinewaveEffect",
        text: "Sine wave distortion.",
        about: "Bends the element with a moving sine wave.",
        media: "pigeon",
        effect: SinewaveEffect,
    }),
    demo({
        name: "SliceShiftEffect",
        text: "Split into strips and shift each one.",
        about: "Cuts the element into strips and moves each strip sideways.",
        media: "pigeon",
        effect: SliceShiftEffect,
    }),
    demo({
        name: "SwirlParticleEffect",
        groups: {
            Particles: ["count", "life", "intro", "pointSize", "streak"],
            Shape: ["sourceChannel", "depth"],
            Flow: ["speed", "swirl", "curl", "curlScale", "attract", "peel"],
            Color: ["palette", "sourceColor"],
            "Fireflies & Bloom": [
                "fireflyRatio",
                "fireflyIntensity",
                "fireflyColor",
                "bloom",
            ],
            Light: [
                "lightDirection",
                "lightColor",
                "lightIntensity",
                "ambient",
                "occlusion",
                "glint",
            ],
            Shadow: [
                "shadow",
                "shadowOpacity",
                "shadowSoftness",
                "shadowDistance",
                "shadowColor",
            ],
            Camera: [
                "yaw",
                "pitch",
                "orbitAnimation",
                "orbitSpeed",
                "fov",
                "zoom",
                "drag",
                "cameraOrigin",
            ],
            Pointer: ["pointer", "pointerRadius", "pointerStrength"],
            Output: ["pad", "antialias"],
        },
        text: "Particles curling over the extruded silhouette.",
        about: "Particles flow over the shape of the element and peel off in curling wisps. The shape comes from the alpha, so use it on logos or text with a transparent background.",
        media: "logo",
        effect: SwirlParticleEffect,
        // A small pad keeps the demo cheap; wisps that drift further are clipped.
        params: { pad: 40, yaw: 11.5 },
    }),
    demo({
        name: "TilePixelateEffect",
        groups: {
            Tiles: ["shape", "size", "stretch", "gap"],
            Color: ["colorTrim", "averageColor", "knockout"],
            Dissolve: ["dissolve", "falloff"],
        },
        text: "Pixelate into shaped tiles.",
        about: "Pixelates the element into tiles of a shape, like ellipses or hexagons.",
        media: "pigeon",
        effect: TilePixelateEffect,
    }),
    demo({
        name: "TritoneEffect",
        text: "Three-color map.",
        about: "Maps shadows, midtones and highlights to three colors.",
        media: "pigeon",
        effect: TritoneEffect,
    }),
    demo({
        name: "VignetteEffect",
        text: "Vignette.",
        about: "Darkens the edges of the element.",
        media: "pigeon",
        effect: VignetteEffect,
    }),
    demo({
        name: "VoronoiEffect",
        groups: {
            Cells: ["cellSize", "flatCells", "seed", "speed", "bgColor"],
            Pointer: ["pressRadius", "press"],
            Breathe: ["breathe", "breatheSpeed", "breatheScale"],
        },
        text: "Voronoi cells around the pointer.",
        about: "Splits the element into Voronoi cells. Cells near the pointer shrink and open gaps.",
        media: "pigeon",
        effect: VoronoiEffect,
        hint: "Move the pointer over it.",
    }),
    demo({
        name: "WarpEffect",
        text: "Sine wave, twist or ripple warp.",
        about: "Warps the element with a sine wave, a twist or a ripple around a center point.",
        media: "pigeon",
        effect: WarpEffect,
    }),
];

/** URL segment of an effect page, e.g. "JPEGGlitchEffect" → "jpeg-glitch". */
export function effectSlug(name: string): string {
    return name
        .replace(/Effect$/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
}
