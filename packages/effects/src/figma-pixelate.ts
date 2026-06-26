// Shaped-cell mosaic with color trim and dissolve. Ported from Figma's
// "Pixelate" shader effect. Named FigmaPixelate to avoid colliding with
// the existing square PixelateEffect.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_FIGMA_PIXELATE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int shape;
uniform vec2 cellPx;
uniform float gap;
uniform float colorTrim;
uniform float averageColor;
uniform float dissolve;
uniform float falloff;
uniform float knockout;

vec4 sampleSrc(vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Per-cell coverage for the chosen shape. lc is the local position in
// [-0.5, 0.5]; th is the half-extent after the gap is subtracted.
float shapeMask(vec2 lc, float th) {
    if (shape == 0) {
        return max(abs(lc.x), abs(lc.y)) < th ? 1.0 : 0.0; // rectangle
    } else if (shape == 1) {
        return length(lc) < th ? 1.0 : 0.0; // ellipse
    } else if (shape == 2) {
        vec2 a = abs(lc); // hexagon
        return max(a.x * 0.866025 + a.y * 0.5, a.y) < th ? 1.0 : 0.0;
    }
    // triangle pointing up
    float w = (th - lc.y) * 0.5;
    return (lc.y > -th && abs(lc.x) < w) ? 1.0 : 0.0;
}

void main(void) {
    vec2 px = uvContent * resolution;
    vec2 cellId = floor(px / cellPx);
    vec2 cellCenter = (cellId + 0.5) * cellPx;
    vec2 lc = (px - cellCenter) / cellPx; // [-0.5, 0.5]

    vec2 centerUv = cellCenter / resolution;
    vec4 centerCol = sampleSrc(centerUv);

    // Average color: blend the center tap with a 3x3 in-cell average.
    vec4 avg = vec4(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(x, y) * cellPx * 0.3 / resolution;
            avg += sampleSrc(centerUv + o);
        }
    }
    avg /= 9.0;
    vec4 col = mix(centerCol, avg, averageColor);

    // Color trim: posterize to fewer levels (more trim = fewer colors).
    float steps = max(1.0, 256.0 / exp2(colorTrim));
    col.rgb = floor(col.rgb * steps) / steps;

    float th = max(0.0, 0.5 - gap * 0.5);
    float mask = shapeMask(lc, th);

    // Dissolve: drop cells by hash, with falloff biasing toward the top.
    float bias = mix(1.0, smoothstep(0.0, 1.0, centerUv.y), falloff);
    if (hash12(cellId) < dissolve * bias) {
        mask = 0.0;
    }

    if (mask > 0.5) {
        outColor = col;
    } else {
        // Outside the shape / dropped: punch transparency, or fall back
        // to the untouched source when knockout is off.
        outColor = knockout > 0.5 ? vec4(0.0) : sampleSrc(uvContent);
    }
}
`;

export type FigmaPixelateShape =
    | "rectangle"
    | "ellipse"
    | "hexagon"
    | "triangle";

const PIXELATE_SHAPES: Record<FigmaPixelateShape, number> = {
    rectangle: 0,
    ellipse: 1,
    hexagon: 2,
    triangle: 3,
};

export type FigmaPixelateParams = {
    /** Cell shape. */
    shape: FigmaPixelateShape;
    /** Cell size, in px. */
    size: number;
    /** Cell width factor (1 = square; >1 wider). */
    stretch: number;
    /** Gap between cells, as a fraction of the cell (0 = touching). */
    gap: number;
    /** Color posterization amount (0 = none; higher = fewer colors). */
    colorTrim: number;
    /** Blend toward the in-cell average color, in [0, 1]. */
    averageColor: number;
    /** Fraction of cells dropped at random, in [0, 1]. */
    dissolve: number;
    /** Spatial bias of the dissolve, in [0, 1]. */
    falloff: number;
    /** Punch transparency in gaps/dropped cells instead of showing source. */
    knockout: boolean;
};

const DEFAULT_PARAMS: FigmaPixelateParams = {
    shape: "rectangle",
    size: 10,
    stretch: 1,
    gap: 0,
    colorTrim: 2,
    averageColor: 0.8,
    dissolve: 0,
    falloff: 0,
    knockout: true,
};

export class FigmaPixelateEffect implements Effect {
    params: FigmaPixelateParams;

    constructor(initial: Partial<FigmaPixelateParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<FigmaPixelateParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        const [w, h] = ctx.dims.elementPixel;
        const size = Math.max(1, p.size);
        ctx.draw({
            frag: FRAG_FIGMA_PIXELATE,
            uniforms: {
                src: ctx.src,
                resolution: [Math.max(1, w), Math.max(1, h)],
                shape: PIXELATE_SHAPES[p.shape] ?? 0,
                cellPx: [size * Math.max(0.1, p.stretch), size],
                gap: Math.min(1, Math.max(0, p.gap)),
                colorTrim: Math.max(0, p.colorTrim),
                averageColor: Math.min(1, Math.max(0, p.averageColor)),
                dissolve: Math.min(1, Math.max(0, p.dissolve)),
                falloff: Math.min(1, Math.max(0, p.falloff)),
                knockout: p.knockout ? 1 : 0,
            },
            target: ctx.target,
        });
    }
}
