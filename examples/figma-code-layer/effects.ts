// Effect registry for the VFX-JS Figma Code Layer sample.
//
// Maps a human label to a factory that builds a fresh @vfx-js/effects
// instance, plus a small schema describing the tweakable parameters so
// the UI can render generic sliders / color pickers.
//
// NOTE: every effect in @vfx-js/effects is stateful. Build ONE instance
// per element and mutate it via `setParams` — never share an instance
// across elements (see VFXProps.effect docs in @vfx-js/core).

import {
    BloomEffect,
    ChromaticEffect,
    DuotoneEffect,
    FluidEffect,
    GlitchEffect,
    HalftoneEffect,
    HueShiftEffect,
    ParticleEffect,
    PixelateEffect,
    RgbShiftEffect,
    ScanlineEffect,
    VignetteEffect,
} from "@vfx-js/effects";

/** A single number parameter rendered as a slider. */
export type SliderControl = {
    kind: "slider";
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
};

/** An RGBA color parameter rendered as a color picker (0..1 floats). */
export type ColorControl = {
    kind: "color";
    key: string;
    label: string;
    default: [number, number, number, number];
};

export type Control = SliderControl | ColorControl;

// biome-ignore lint/suspicious/noExplicitAny: registry holds heterogenous effect types
export type AnyEffect = any;

export type EffectEntry = {
    label: string;
    /** Build a brand-new effect instance from a params bag. */
    create: (params: Record<string, unknown>) => AnyEffect;
    /** Tweakable params. Empty = "showcase" effect with no UI controls. */
    controls: Control[];
};

const slider = (
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    def: number,
): SliderControl => ({
    kind: "slider",
    key,
    label,
    min,
    max,
    step,
    default: def,
});

const color = (
    key: string,
    label: string,
    def: [number, number, number, number],
): ColorControl => ({ kind: "color", key, label, default: def });

export const EFFECTS: Record<string, EffectEntry> = {
    rgbShift: {
        label: "RGB Shift",
        create: (p) => new RgbShiftEffect(p),
        controls: [
            slider("amount", "Amount", 0, 40, 1, 12),
            slider("speed", "Speed", 0, 4, 0.1, 1),
        ],
    },
    glitch: {
        label: "Glitch",
        create: (p) => new GlitchEffect(p),
        controls: [
            slider("intensity", "Intensity", 0, 3, 0.05, 1),
            slider("speed", "Speed", 0, 4, 0.1, 1),
        ],
    },
    pixelate: {
        label: "Pixelate",
        create: (p) => new PixelateEffect(p),
        controls: [slider("size", "Cell size", 1, 64, 1, 10)],
    },
    chromatic: {
        label: "Chromatic Aberration",
        create: (p) => new ChromaticEffect(p),
        controls: [
            slider("intensity", "Intensity", 0, 4, 0.05, 1),
            slider("radius", "Radius", 0, 2, 0.05, 1),
            slider("power", "Power", 0.1, 4, 0.1, 1),
        ],
    },
    hueShift: {
        label: "Hue Shift",
        create: (p) => new HueShiftEffect(p),
        controls: [slider("shift", "Shift", 0, 1, 0.01, 0.5)],
    },
    scanline: {
        label: "Scanline",
        create: (p) => new ScanlineEffect(p),
        controls: [slider("spacing", "Spacing", 1, 16, 1, 4)],
    },
    vignette: {
        label: "Vignette",
        create: (p) => new VignetteEffect(p),
        controls: [
            slider("intensity", "Intensity", 0, 2, 0.05, 1),
            slider("radius", "Radius", 0, 2, 0.05, 1),
            slider("power", "Power", 0.1, 4, 0.1, 1),
        ],
    },
    duotone: {
        label: "Duotone",
        create: (p) => new DuotoneEffect(p),
        controls: [
            color("color1", "Shadows", [1, 0, 0, 1]),
            color("color2", "Highlights", [0, 0, 1, 1]),
            slider("speed", "Speed", 0, 2, 0.05, 0.2),
        ],
    },
    halftone: {
        label: "Halftone",
        create: (p) => new HalftoneEffect(p),
        controls: [
            slider("gridSize", "Grid size", 2, 32, 1, 8),
            slider("dotSize", "Dot size", 0, 2, 0.05, 1),
            slider("angle", "Angle", 0, 3.14, 0.01, 0.4),
        ],
    },

    // ---- Showcase: heavier multi-pass / stateful effects ----
    // These prove that Code Layers run the *real* WebGL2 pipeline, not a
    // single-pass shader. No UI controls — they run with defaults.
    bloom: {
        label: "Bloom (multi-pass)",
        create: () => new BloomEffect(),
        controls: [],
    },
    fluid: {
        label: "Fluid (ping-pong sim)",
        create: () => new FluidEffect(),
        controls: [],
    },
    particle: {
        label: "Particle (instanced)",
        create: () => new ParticleEffect(),
        controls: [],
    },
};

export const EFFECT_NAMES = Object.keys(EFFECTS);

/** Build the default params bag for an effect from its control schema. */
export function defaultParams(name: string): Record<string, unknown> {
    const entry = EFFECTS[name];
    if (!entry) {
        return {};
    }
    const params: Record<string, unknown> = {};
    for (const c of entry.controls) {
        params[c.key] = c.default;
    }
    return params;
}
