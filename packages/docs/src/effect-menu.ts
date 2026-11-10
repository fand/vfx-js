import type { Effect } from "@vfx-js/core";
import {
    AsciiEffect,
    BadJpegEffect,
    BloomEffect,
    DitherEffect,
    DuotoneEffect,
    GlitchEffect,
    HalftoneEffect,
    LightStreakEffect,
    MatrixEffect,
    PixelSortEffect,
} from "@vfx-js/effects";

import { ColorAdjustEffect } from "./color-adjust-effect";

export type ParamValue = number | string | boolean;

/** Extra effects around the main one: color adjust before it, glow (Bloom) after it. */
type Stage = "adjust" | "glow";

export type Control =
    | {
          type: "range";
          key: string;
          label?: string;
          min: number;
          max: number;
          step: number;
          value: number;
          /** Turn the slider value into the param value. */
          toParam?: (v: number) => unknown;
          /** Set the param on this extra effect, not the main one. */
          stage?: Stage;
          /** Param name on that effect. Defaults to key. */
          param?: string;
      }
    | {
          type: "select";
          key: string;
          label?: string;
          options: string[];
          value: string;
      }
    | { type: "color"; key: string; label?: string; value: string }
    | { type: "checkbox"; key: string; label?: string; value: boolean };

type Tunable = Effect & { setParams?(params: Record<string, unknown>): void };

/** Set params live. Effects without setParams take them as fields. */
function applyParams(effect: Tunable, params: Record<string, unknown>): void {
    if (effect.setParams) {
        effect.setParams(params);
    } else {
        Object.assign(effect, params);
    }
}

export type MenuEffect = {
    label: string;
    className?: string;
    /** `isBG` is true for the page background, false for the hero text. */
    create?: (params: Record<string, unknown>, isBG: boolean) => Tunable;
    /** Add a ColorAdjustEffect (gamma, saturation) before the effect. Not shown in the code snippet. */
    adjust?: Record<string, unknown>;
    /** Add a Bloom after the effect, with these options. */
    glow?: Record<string, unknown>;
    /** Extra options for the code snippet, as source text. */
    code?: Record<string, string>;
    controls?: Control[];
};

export type Values = Record<string, ParamValue>;

function stageOf(control: Control): Stage | undefined {
    return control.type === "range" ? control.stage : undefined;
}

function paramName(control: Control): string {
    return (control.type === "range" && control.param) || control.key;
}

/** Params for the main effect, or for one extra stage. */
function paramsFor(
    item: MenuEffect,
    values: Values,
    stage?: Stage,
): Record<string, unknown> {
    const params = Object.fromEntries(
        (item.controls ?? [])
            .filter((c) => stageOf(c) === stage)
            .map((c) => [paramName(c), toParam(c, values[c.key])]),
    );
    return stage ? { ...item[stage], ...params } : params;
}

export type EffectChain = {
    effects: Effect[];
    set(control: Control, value: ParamValue): void;
};

/** Build the effects for one menu item. Returns an empty chain for Original. */
export function createChain(
    item: MenuEffect,
    values: Values,
    isBG: boolean,
): EffectChain {
    const main = item.create?.(paramsFor(item, values), isBG);
    const adjust =
        main && item.adjust
            ? new ColorAdjustEffect(paramsFor(item, values, "adjust"))
            : undefined;
    const glow =
        main && item.glow
            ? new BloomEffect(paramsFor(item, values, "glow"))
            : undefined;
    const targets = { adjust, glow };
    return {
        effects: [adjust, main, glow].filter(
            (e): e is Tunable => e !== undefined,
        ),
        set(control, value) {
            const stage = stageOf(control);
            const target = stage ? targets[stage] : main;
            if (target) {
                applyParams(target, {
                    [paramName(control)]: toParam(control, value),
                });
            }
        },
    };
}

/** Hex color to a [r, g, b, a] tuple in 0-1. */
function hexToRgba(hex: string): [number, number, number, number] {
    const n = Number.parseInt(hex.slice(1), 16);
    return [
        ((n >> 16) & 255) / 255,
        ((n >> 8) & 255) / 255,
        (n & 255) / 255,
        1,
    ];
}

/** The param value for a control. */
export function toParam(control: Control, value: ParamValue): unknown {
    if (control.type === "color") {
        return hexToRgba(value as string);
    }
    if (control.type === "range" && control.toParam) {
        return control.toParam(value as number);
    }
    return value;
}

// Dots that grow from dark to light, each with its own hue.
function dotTiles(count: number): HTMLCanvasElement[] {
    return Array.from({ length: count }, (_, i) => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const g = canvas.getContext("2d");
        if (g) {
            const t = i / (count - 1);
            g.fillStyle = `hsl(${(i / count) * 360}, 85%, 60%)`;
            g.beginPath();
            g.arc(32, 32, 3 + t * 27, 0, Math.PI * 2);
            g.fill();
        }
        return canvas;
    });
}

// Bloom intensity for items with a glow.
const GLOW_CONTROL: Control = {
    type: "range",
    key: "glow",
    stage: "glow",
    param: "intensity",
    min: 0,
    max: 4,
    step: 0.01,
    value: 20,
};

export const MENU_EFFECTS: MenuEffect[] = [
    { label: "Original" },
    {
        label: "ASCII",
        className: "AsciiEffect",
        create: (p) => new AsciiEffect({ ...p, fontWeight: 900 }),
        adjust: { gamma: 1.5, saturation: 1.5 },
        controls: [
            { type: "range", key: "grid", min: 6, max: 24, step: 1, value: 8 },
            {
                type: "range",
                key: "dither",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.8,
            },
            { type: "checkbox", key: "colorFromSource", value: true },
        ],
    },
    {
        label: "ASCII Tiles",
        className: "AsciiEffect",
        create: (p) => new AsciiEffect({ ...p, tiles: dotTiles(6) }),
        code: { tiles: "[/* images, dark to light */]" },
        controls: [
            { type: "range", key: "grid", min: 6, max: 32, step: 1, value: 14 },
        ],
    },
    {
        label: "Dither",
        className: "DitherEffect",
        create: (p) => new DitherEffect(p),
        controls: [
            {
                type: "select",
                key: "style",
                options: [
                    "bayer2",
                    "bayer4",
                    "bayer8",
                    "bayer16",
                    "blueNoise",
                    "threshold",
                ],
                value: "bayer4",
            },
            { type: "range", key: "size", min: 1, max: 8, step: 1, value: 2 },
            { type: "range", key: "levels", min: 2, max: 8, step: 1, value: 4 },
        ],
    },
    {
        label: "Duotone",
        className: "DuotoneEffect",
        create: (p) => new DuotoneEffect(p),
        controls: [
            { type: "color", key: "color1", value: "#FF5588" },
            { type: "color", key: "color2", value: "#002288" },
            {
                type: "range",
                key: "speed",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.2,
            },
        ],
    },
    {
        label: "Matrix",
        className: "MatrixEffect",
        create: (p, isBG) =>
            new MatrixEffect({
                ...p,
                brightness: 1.0,
                fontWeight: 900,
                // Opaque black on the text would cover the BG behind it.
                background: isBG ? [0, 0, 0, 1] : [0, 0, 0, 0],
            }),
        glow: { threshold: 0.3 },
        controls: [
            {
                type: "range",
                key: "speed",
                min: 1,
                max: 30,
                step: 1,
                value: 10,
            },
            { type: "range", key: "tail", min: 4, max: 40, step: 1, value: 18 },
            {
                type: "range",
                key: "grid",
                min: 4,
                max: 24,
                step: 1,
                value: 6,
                toParam: (v) => [v, Math.round((v * 4) / 3)],
            },
            GLOW_CONTROL,
        ],
    },
    {
        label: "Bloom",
        className: "BloomEffect",
        create: (p) =>
            new BloomEffect({ ...p, pad: 300, softness: 1, scatter: 10 }),
        controls: [
            {
                type: "range",
                key: "threshold",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.02,
            },
            {
                type: "range",
                key: "intensity",
                min: 0,
                max: 10,
                step: 0.01,
                value: 4,
            },
        ],
    },
    {
        label: "Light Streak",
        className: "LightStreakEffect",
        create: (p) => new LightStreakEffect({ ...p, dispersion: -0.5 }),
        controls: [
            {
                type: "range",
                key: "streaks",
                min: 1,
                max: 8,
                step: 1,
                value: 2,
            },
            {
                type: "range",
                key: "length",
                min: 50,
                max: 600,
                step: 1,
                value: 300,
            },
            {
                type: "range",
                key: "threshold",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.9,
            },
            {
                type: "range",
                key: "intensity",
                min: 0,
                max: 2,
                step: 0.01,
                value: 0.5,
            },
            {
                type: "range",
                key: "angle",
                min: 0,
                max: 180,
                step: 1,
                value: 0,
            },
        ],
    },
    {
        label: "Halftone",
        className: "HalftoneEffect",
        create: (p) => new HalftoneEffect(p),
        controls: [
            {
                type: "range",
                key: "gridSize",
                min: 4,
                max: 24,
                step: 0.1,
                value: 7.5,
            },
            {
                type: "range",
                key: "dotSize",
                min: 0.2,
                max: 1.5,
                step: 0.01,
                value: 1,
            },
            { type: "range", key: "angle", min: 0, max: 90, step: 1, value: 0 },
        ],
    },
    {
        label: "Pixel Sort",
        className: "PixelSortEffect",
        create: (p) => new PixelSortEffect(p),
        controls: [
            {
                type: "range",
                key: "range",
                label: "threshold",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.1,
                toParam: (v) => [v, 1],
            },
            {
                type: "select",
                key: "direction",
                options: ["up", "down", "left", "right"],
                value: "down",
            },
            {
                type: "range",
                key: "angle",
                min: -90,
                max: 90,
                step: 1,
                value: 0,
            },
        ],
    },
    {
        label: "Glitch",
        className: "GlitchEffect",
        create: (p) => new GlitchEffect(p),
        controls: [
            {
                type: "range",
                key: "intensity",
                min: 0,
                max: 3,
                step: 0.01,
                value: 1.9,
            },
            {
                type: "range",
                key: "speed",
                min: 0,
                max: 3,
                step: 0.01,
                value: 1,
            },
        ],
    },
    {
        label: "Bad JPEG",
        className: "BadJpegEffect",
        create: (p) => new BadJpegEffect(p),
        controls: [
            {
                type: "range",
                key: "quality",
                min: 1,
                max: 30,
                step: 1,
                value: 10,
            },
            {
                type: "range",
                key: "iterations",
                min: 1,
                max: 8,
                step: 1,
                value: 1,
            },
        ],
    },
];

function format(value: unknown): string {
    if (typeof value === "number") {
        return String(Math.round(value * 100) / 100);
    }
    if (typeof value === "string") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(format).join(", ")}]`;
    }
    return String(value);
}

function options(
    params: Record<string, unknown>,
    indent: string,
    code: Record<string, string> = {},
): string {
    const lines = [
        ...Object.entries(params).map(([k, v]) => `${k}: ${format(v)}`),
        ...Object.entries(code).map(([k, v]) => `${k}: ${v}`),
    ];
    return lines.length
        ? `{\n${lines.map((l) => `${indent}    ${l},`).join("\n")}\n${indent}}`
        : "";
}

export function snippet(item: MenuEffect, values: Values): string {
    if (!item.className) {
        return `import { VFX } from "@vfx-js/core";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), { shader: "none" });
`;
    }
    const main = options(
        paramsFor(item, values),
        item.glow ? "        " : "    ",
        item.code,
    );
    if (!item.glow) {
        return `import { VFX } from "@vfx-js/core";
import { ${item.className} } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), {
    effect: new ${item.className}(${main}),
});
`;
    }
    const glow = paramsFor(item, values, "glow");
    return `import { VFX } from "@vfx-js/core";
import { BloomEffect, ${item.className} } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), {
    effect: [
        new ${item.className}(${main}),
        new BloomEffect(${options(glow, "        ")}),
    ],
});
`;
}
