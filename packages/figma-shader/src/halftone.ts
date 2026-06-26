// Halftone — recreates an image with a rotated grid of ink shapes, like
// newsprint or comics. Ported from Figma's "Halftone" shader effect.
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_LUMA,
    SinglePassEffect,
} from "./_common";

export type HalftoneColorMode = "mono" | "rgb" | "cmyk";
export type HalftoneShape = "dot" | "square" | "line";

const SHAPE_INDEX: Record<HalftoneShape, number> = {
    dot: 0,
    square: 1,
    line: 2,
};
const COLOR_INDEX: Record<HalftoneColorMode, number> = {
    mono: 0,
    rgb: 1,
    cmyk: 2,
};

const FRAG = `${GLSL_HEADER}
${GLSL_LUMA}
uniform vec2 resolution;
uniform float gridSize;
uniform float angle;
uniform float dotScale;
uniform int shape;
uniform int colorMode;
uniform vec3 ink;
uniform vec4 background;
uniform bool invert;

const float DEG = 3.14159265 / 180.0;

// Ink coverage in a single rotated screen. \`amount\` is 0..1 ink density.
float coverage(vec2 uvpx, float ang, float cell, float amount) {
    float s = sin(ang), c = cos(ang);
    mat2 R = mat2(c, -s, s, c);
    vec2 p = R * uvpx;
    vec2 local = (p - (floor(p / cell) + 0.5) * cell) / (cell * 0.5);
    float metric;
    float r;
    if (shape == 2) {        // line
        metric = abs(local.y);
        r = amount;
    } else if (shape == 1) { // square
        metric = max(abs(local.x), abs(local.y));
        r = sqrt(amount) * dotScale;
    } else {                 // dot
        metric = length(local);
        r = sqrt(amount) * dotScale;
    }
    float aa = fwidth(metric) + 0.02;
    return smoothstep(r, r - aa, metric);
}

void main() {
    vec4 col = readTex(uvContent);
    vec2 uvpx = uvContent * resolution;
    float cell = max(gridSize, 1.0);

    if (colorMode == 0) {            // mono
        float lum = luma(col.rgb);
        float amount = invert ? lum : 1.0 - lum;
        float cov = coverage(uvpx, angle, cell, amount) * col.a;
        outColor = mix(background, vec4(ink, 1.0), cov);
    } else if (colorMode == 1) {     // rgb additive on dark background
        float r = coverage(uvpx, angle + 15.0 * DEG, cell, col.r);
        float g = coverage(uvpx, angle + 75.0 * DEG, cell, col.g);
        float b = coverage(uvpx, angle, cell, col.b);
        outColor = vec4(vec3(r, g, b) * col.a, col.a);
    } else {                         // cmyk subtractive on white
        vec3 cmy = 1.0 - col.rgb;
        float k = min(cmy.r, min(cmy.g, cmy.b));
        cmy = (cmy - k) / max(1.0 - k, 1e-4);
        float cC = coverage(uvpx, angle + 15.0 * DEG, cell, cmy.r);
        float cM = coverage(uvpx, angle + 75.0 * DEG, cell, cmy.g);
        float cY = coverage(uvpx, angle, cell, cmy.b);
        float cK = coverage(uvpx, angle + 45.0 * DEG, cell, k);
        vec3 o = vec3(1.0);
        o *= 1.0 - vec3(0.0, 1.0, 1.0) * cC; // cyan absorbs red
        o *= 1.0 - vec3(1.0, 0.0, 1.0) * cM; // magenta absorbs green
        o *= 1.0 - vec3(1.0, 1.0, 0.0) * cY; // yellow absorbs blue
        o *= 1.0 - cK;
        outColor = vec4(mix(background.rgb, o, col.a), 1.0);
    }
}
`;

export type HalftoneParams = {
    /** Cell size in CSS px. */
    gridSize: number;
    /** Screen rotation in degrees. */
    angle: number;
    /** Dot radius multiplier; `>1` lets full-ink dots overlap. */
    dotScale: number;
    /** Ink shape. */
    shape: HalftoneShape;
    /** Color treatment. */
    colorMode: HalftoneColorMode;
    /** Ink color in `mono` mode, each channel `0..1`. */
    ink: [number, number, number];
    /** Paper color (RGBA, each channel `0..1`). */
    background: [number, number, number, number];
    /** Swap ink/paper polarity in `mono` mode. */
    invert: boolean;
};

const DEFAULT_PARAMS: HalftoneParams = {
    gridSize: 8,
    angle: 45,
    dotScale: 1.1,
    shape: "dot",
    colorMode: "mono",
    ink: [0.05, 0.05, 0.05],
    background: [1, 1, 1, 1],
    invert: false,
};

export class HalftoneEffect extends SinglePassEffect<HalftoneParams> {
    protected frag = FRAG;

    constructor(initial: Partial<HalftoneParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            gridSize: p.gridSize * ctx.pixelRatio,
            angle: (p.angle * Math.PI) / 180,
            dotScale: p.dotScale,
            shape: SHAPE_INDEX[p.shape],
            colorMode: COLOR_INDEX[p.colorMode],
            ink: p.ink,
            background: p.background,
            invert: p.invert,
        };
    }
}
