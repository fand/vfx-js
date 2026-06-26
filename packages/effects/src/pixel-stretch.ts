// Stretches a single scan line across a band of the image. Below the
// offset line the image is untouched; across `reach` above it the line's
// pixels are smeared; past that the rest of the image is shifted up by
// `reach`. Ported (and reshaped) from Figma's "Pixel stretch" effect.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { GLSL_COMMON } from "./_figma-common";

const FRAG_PIXEL_STRETCH = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform float angle;
uniform float offset;
uniform float reach;
uniform float smoothness;
${GLSL_COMMON}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

// Quadratic smooth min/max (Inigo Quilez) to round the band corners.
float smin(float a, float b, float k) {
    k = max(k, 1e-4);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

void main(void) {
    vec2 pr = rot2d(-radians(angle)) * (uvContent - center);

    // Line position along the rotated y axis (offset 0 = center).
    float line = offset * 0.5;
    float k = min(smoothness, max(reach, 0.0) * 0.49);

    // Source displacement: 0 below the line, ramps to reach across the
    // band, then holds at reach (shifting the rest of the image up).
    float disp = smin(smax(pr.y - line, 0.0, k), reach, k);

    vec2 uv = rot2d(radians(angle)) * vec2(pr.x, pr.y - disp) + center;
    outColor = readTex(uv);
}
`;

export type PixelStretchParams = {
    /** Stretch line position along the axis, in [-1, 1] (0 = center). */
    offset: number;
    /** Height of the stretch band, as a fraction of the element. */
    reach: number;
    /** Soften the band's edges, in [0, 1]. */
    smoothness: number;
    /** Effect center X, in [0, 1]. */
    centerX: number;
    /** Effect center Y, in [0, 1]. */
    centerY: number;
    /** Stretch direction, in degrees. */
    angle: number;
};

const DEFAULT_PARAMS: PixelStretchParams = {
    offset: 0,
    reach: 0.2,
    smoothness: 0,
    centerX: 0.5,
    centerY: 0.5,
    angle: 0,
};

export class PixelStretchEffect implements Effect {
    params: PixelStretchParams;

    constructor(initial: Partial<PixelStretchParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<PixelStretchParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        ctx.draw({
            frag: FRAG_PIXEL_STRETCH,
            uniforms: {
                src: ctx.src,
                center: [p.centerX, p.centerY],
                angle: p.angle,
                offset: p.offset,
                reach: Math.max(0, p.reach),
                smoothness: Math.max(0, p.smoothness),
            },
            target: ctx.target,
        });
    }
}
