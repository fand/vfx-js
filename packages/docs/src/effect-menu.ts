import type { Effect } from "@vfx-js/core";
import {
    AsciiEffect,
    BloomEffect,
    DitherEffect,
    DuotoneEffect,
    GlitchEffect,
    HalftoneEffect,
    MatrixEffect,
    PixelSortEffect,
} from "@vfx-js/effects";

export type ParamValue = number | string;

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
      }
    | {
          type: "select";
          key: string;
          label?: string;
          options: string[];
          value: string;
      }
    | { type: "color"; key: string; label?: string; value: string };

type Tunable = Effect & { setParams(params: Record<string, unknown>): void };

export type MenuEffect = {
    label: string;
    className?: string;
    create?: (params: Record<string, unknown>) => Tunable;
    /** Fixed options, passed to every instance. */
    base?: Record<string, unknown>;
    /** Extra option lines for the code snippet. */
    code?: string[];
    controls?: Control[];
};

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

export const MENU_EFFECTS: MenuEffect[] = [
    { label: "Original" },
    {
        label: "ASCII",
        className: "AsciiEffect",
        create: (p) => new AsciiEffect(p),
        controls: [
            { type: "range", key: "grid", min: 6, max: 24, step: 1, value: 12 },
            {
                type: "range",
                key: "dither",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0,
            },
        ],
    },
    {
        label: "ASCII Tiles",
        className: "AsciiEffect",
        create: (p) => new AsciiEffect({ ...p, tiles: dotTiles(6) }),
        code: ["tiles: [/* images, dark to light */]"],
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
            { type: "range", key: "size", min: 1, max: 8, step: 1, value: 3 },
            { type: "range", key: "levels", min: 2, max: 8, step: 1, value: 3 },
        ],
    },
    {
        label: "Duotone",
        className: "DuotoneEffect",
        create: (p) => new DuotoneEffect(p),
        controls: [
            { type: "color", key: "color1", value: "#ff3366" },
            { type: "color", key: "color2", value: "#2233ff" },
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
        create: (p) => new MatrixEffect(p),
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
                min: 6,
                max: 24,
                step: 1,
                value: 12,
                toParam: (v) => [v, Math.round((v * 4) / 3)],
            },
        ],
    },
    {
        label: "Bloom",
        className: "BloomEffect",
        create: (p) => new BloomEffect(p),
        controls: [
            {
                type: "range",
                key: "threshold",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.2,
            },
            {
                type: "range",
                key: "intensity",
                min: 0,
                max: 4,
                step: 0.01,
                value: 2.6,
            },
            {
                type: "range",
                key: "scatter",
                min: 0,
                max: 1,
                step: 0.01,
                value: 0.7,
            },
        ],
    },
    {
        label: "Halftone",
        className: "HalftoneEffect",
        create: (p) => new HalftoneEffect(p),
        controls: [
            {
                type: "select",
                key: "mode",
                options: ["rgb", "cmyk"],
                value: "rgb",
            },
            {
                type: "range",
                key: "gridSize",
                min: 4,
                max: 24,
                step: 0.1,
                value: 12,
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
                value: 0.4,
                toParam: (v) => [v, 1],
            },
            {
                type: "select",
                key: "direction",
                options: ["up", "down", "left", "right"],
                value: "up",
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

export function snippet(
    item: MenuEffect,
    params: Record<string, unknown>,
): string {
    if (!item.className) {
        return `import { VFX } from "@vfx-js/core";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), { shader: "none" });
`;
    }
    const lines = [
        ...Object.entries(params).map(([k, v]) => `${k}: ${format(v)}`),
        ...(item.code ?? []),
    ];
    const options = lines.length
        ? `{\n${lines.map((l) => `        ${l},`).join("\n")}\n    }`
        : "";
    return `import { VFX } from "@vfx-js/core";
import { ${item.className} } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), {
    effect: new ${item.className}(${options}),
});
`;
}
