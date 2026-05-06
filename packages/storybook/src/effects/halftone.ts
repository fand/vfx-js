// CMYK-style halftone: three rotated dot grids (one per RGB channel)
// where each dot's radius is driven by the source channel intensity at
// the dot's center. Per-fragment 9-cell neighbour search keeps overlap
// correct as dots grow toward the cell pitch.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_HALFTONE = `#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 elementPx;
uniform float gridSize;
uniform float dotSize;
uniform float smoothing;

const vec3 gridRot = vec3(15.0, 45.0, 75.0);

const vec2 cellOffsets[9] = vec2[9](
    vec2(0.0),
    vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(0.0, -1.0), vec2(0.0, 1.0),
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0)
);

vec4 sampleSrc(vec2 px) {
    vec2 uv = clamp(px / elementPx, 0.0, 1.0);
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

void main() {
    vec2 fragCoord = uvContent * elementPx;
    vec3 rgbAmounts = vec3(0.0);

    // Axis neighbors only reach when dotSize >= 0.5; diagonals only
    // when dotSize >= 1/sqrt(2) ~= 0.7071.
    int cellCount = dotSize < 0.5 ? 1 : (dotSize < 0.7071068 ? 5 : 9);

    for (int i = 0; i < 3; ++i) {
        float rotRad = radians(gridRot[i]);
        float c = cos(rotRad);
        float s = sin(rotRad);

        // cTrans rotates screen -> grid space; ccTrans is its inverse.
        mat2 ccTrans = mat2(c, s, -s, c);
        mat2 cTrans = mat2(c, -s, s, c);

        vec2 gridFragLoc = cTrans * fragCoord;
        vec2 gridOriginLoc = floor(gridFragLoc / gridSize);

        float maxDotRadius = gridSize * dotSize;
        for (int j = 0; j < 9; ++j) {
            if (j >= cellCount) { break; }

            vec2 cell = gridOriginLoc + cellOffsets[j];
            vec2 gridDotLoc = cell * gridSize + vec2(gridSize * 0.5);
            vec2 renderDotLoc = ccTrans * gridDotLoc;

            float fragDist = distance(fragCoord, renderDotLoc);
            if (fragDist > maxDotRadius) { continue; }

            float chan = sampleSrc(renderDotLoc)[i];
            float dotRadius = chan * maxDotRadius;
            if (fragDist < dotRadius) {
                rgbAmounts[i] += smoothstep(
                    dotRadius,
                    dotRadius - dotRadius * smoothing,
                    fragDist
                );
            }
        }
    }

    vec4 original = sampleSrc(fragCoord);
    float alpha = clamp(
        rgbAmounts.r + rgbAmounts.g + rgbAmounts.b + original.a,
        0.0,
        1.0
    );

    outColor = vec4(rgbAmounts, alpha);
}
`;

export type HalftoneParams = {
    /** Grid pitch in physical px. */
    gridSize: number;
    /** Max dot radius as a fraction of `gridSize`, in [0, 1]. */
    dotSize: number;
    /** Soft-edge fraction of the dot radius, in [0, 1]. */
    smoothing: number;
};

const DEFAULT_PARAMS: HalftoneParams = {
    gridSize: 10,
    dotSize: 0.7,
    smoothing: 0.15,
};

export class HalftoneEffect implements Effect {
    params: HalftoneParams;

    constructor(initial: Partial<HalftoneParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<HalftoneParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const ew = Math.max(1, w);
        const eh = Math.max(1, h);
        const p = this.params;

        ctx.draw({
            frag: FRAG_HALFTONE,
            uniforms: {
                src: ctx.src,
                elementPx: [ew, eh],
                gridSize: Math.max(1, p.gridSize),
                dotSize: Math.max(0, p.dotSize),
                smoothing: Math.max(0, Math.min(1, p.smoothing)),
            },
            target: ctx.target,
        });
    }
}
