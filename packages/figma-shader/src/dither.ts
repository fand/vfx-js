// Dither — quantizes the image to a small palette using an ordered or
// noise threshold map. Ported from Figma's "Dither" shader effect
// (Bayer / blue-noise style stylized dithering).
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_NOISE,
    SinglePassEffect,
} from "./_common";

export type DitherMode = "bayer4" | "bayer8" | "noise";

const MODE_INDEX: Record<DitherMode, number> = {
    bayer4: 0,
    bayer8: 1,
    noise: 2,
};

const FRAG = `${GLSL_HEADER}
${GLSL_NOISE}
uniform vec2 resolution;
uniform float pixelSize;
uniform float levels;
uniform int mode;
uniform bool mono;
uniform vec3 tint;

// Bayer 4x4 ordered threshold, returns 0..1.
float bayer4(vec2 c) {
    int x = int(mod(c.x, 4.0));
    int y = int(mod(c.y, 4.0));
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return float(m[y * 4 + x]) / 16.0;
}
// Bayer 8x8 derived from the 4x4 recurrence.
float bayer8(vec2 c) {
    float b4 = bayer4(floor(c / 2.0));
    int x = int(mod(c.x, 2.0));
    int y = int(mod(c.y, 2.0));
    int m[4] = int[4](0, 2, 3, 1);
    return (float(m[y * 2 + x]) + b4 * 4.0) / 4.0 / 4.0;
}

void main() {
    vec2 uvpx = uvContent * resolution;
    vec2 cell = floor(uvpx / pixelSize);
    vec2 sampleUv = (cell + 0.5) * pixelSize / resolution;
    vec4 col = readTex(sampleUv);

    float t;
    if (mode == 0) {
        t = bayer4(cell);
    } else if (mode == 1) {
        t = bayer8(cell);
    } else {
        t = hash21(cell);
    }

    float steps = max(levels, 2.0) - 1.0;
    vec3 c = col.rgb;
    if (mono) {
        float g = dot(c, vec3(0.299, 0.587, 0.114));
        g = floor(g * steps + t) / steps;
        c = clamp(vec3(g), 0.0, 1.0) * tint;
    } else {
        c = floor(c * steps + t) / steps;
        c = clamp(c, 0.0, 1.0);
    }
    outColor = vec4(c * col.a, col.a);
}
`;

export type DitherParams = {
    /** Threshold map. */
    mode: DitherMode;
    /** Pixel block size in CSS px (chunkiness of the dither). */
    pixelSize: number;
    /** Quantization steps per channel (2 = pure black/white per channel). */
    levels: number;
    /** Collapse to a single tinted channel. */
    mono: boolean;
    /** Tint applied in `mono` mode, each channel `0..1`. */
    tint: [number, number, number];
};

const DEFAULT_PARAMS: DitherParams = {
    mode: "bayer8",
    pixelSize: 3,
    levels: 2,
    mono: false,
    tint: [1, 1, 1],
};

export class DitherEffect extends SinglePassEffect<DitherParams> {
    protected frag = FRAG;

    constructor(initial: Partial<DitherParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            pixelSize: Math.max(p.pixelSize * ctx.pixelRatio, 1),
            levels: p.levels,
            mode: MODE_INDEX[p.mode],
            mono: p.mono,
            tint: p.tint,
        };
    }
}
