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

// Distance to a pointy-top hexagon's edge.
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, 0.866025)), p.x);
}

// Nearest hexagon in a pointy-top honeycomb: local position (xy) and cell
// center (zw), in grid units.
vec4 hexCoords(vec2 g) {
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(g, r) - h;
    vec2 b = mod(g - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, g - gv);
}

void main(void) {
    vec2 px = uvContent * resolution;
    vec2 g = px / cellPx; // grid units (1 = one cell)
    float gapHalf = gap * 0.5;

    // Per shape: the cell center (grid units) and the coverage mask.
    vec2 centerCell;
    float mask;
    if (shape == 0 || shape == 1) {
        // Rectangle / ellipse on a square grid.
        vec2 id = floor(g);
        centerCell = id + 0.5;
        vec2 lc = g - centerCell;
        float th = 0.5 - gapHalf;
        mask = shape == 0
            ? (max(abs(lc.x), abs(lc.y)) < th ? 1.0 : 0.0)
            : (length(lc) < th ? 1.0 : 0.0);
    } else if (shape == 2) {
        // Pointy-top honeycomb; Voronoi boundary sits at 0.5 for this lattice.
        vec4 hc = hexCoords(g);
        centerCell = hc.zw;
        mask = hexDist(hc.xy) < 0.5 * (1.0 - gap) ? 1.0 : 0.0;
    } else {
        // Right triangles: each square cell is split by a diagonal whose
        // direction flips per cell, tiling the plane with 45° triangles.
        vec2 id = floor(g);
        vec2 lc = g - (id + 0.5);
        float diag = mod(id.x + id.y, 2.0);
        float s = diag < 0.5 ? (lc.x + lc.y) : (lc.x - lc.y);
        float tri = step(0.0, s);
        // Centroid of the selected triangle, for a distinct per-cell color.
        vec2 cen = diag < 0.5
            ? (tri > 0.5 ? vec2(1.0) : vec2(-1.0)) / 6.0
            : (tri > 0.5 ? vec2(1.0, -1.0) : vec2(-1.0, 1.0)) / 6.0;
        centerCell = id + 0.5 + cen;
        float dEdge = 0.5 - max(abs(lc.x), abs(lc.y));
        float dDiag = abs(s) / 1.4142136;
        mask = min(dEdge, dDiag) > gapHalf ? 1.0 : 0.0;
    }

    vec2 centerUv = centerCell * cellPx / resolution;
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

    // Dissolve: drop cells by hash, with falloff biasing toward the top.
    float bias = mix(1.0, smoothstep(0.0, 1.0, centerUv.y), falloff);
    if (hash12(centerCell) < dissolve * bias) {
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
