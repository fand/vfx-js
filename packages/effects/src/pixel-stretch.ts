// Smears the pixels along a line across the image, like a stretched
// scan line. Ported from Figma's "Pixel stretch" shader effect.
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
uniform float smoothness;
uniform float falloff;
uniform float reach;
${GLSL_COMMON}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main(void) {
    vec2 p = uvContent - center;
    vec2 pr = rot2d(-radians(angle)) * p;

    // Stretch line position along the rotated y axis.
    float boundary = offset * 0.5;

    // Above the line, clamp the sample y to the line so its pixels smear
    // outward. smoothness softens the boundary into a band.
    float t = smoothness > 0.0
        ? smoothstep(boundary, boundary + smoothness, pr.y)
        : step(boundary, pr.y);
    float sampleY = mix(pr.y, boundary, t);

    vec2 uv = rot2d(radians(angle)) * vec2(pr.x, sampleY) + center;
    vec4 col = readTex(uv);

    // Distance into the smear region drives reach (hard cutoff) and
    // falloff (gradual fade to transparent).
    float d = max(0.0, pr.y - boundary);
    if (d > reach) {
        col = vec4(0.0);
    } else if (falloff > 0.0) {
        col *= clamp(1.0 - d / falloff, 0.0, 1.0);
    }

    outColor = col;
}
`;

export type PixelStretchParams = {
    /** Stretch line position along the axis, in [-1, 1] (0 = center). */
    offset: number;
    /** Soft boundary band width, in [0, 1]. */
    smoothness: number;
    /** Distance over which the smear fades to transparent (0 = no fade). */
    falloff: number;
    /** Hard cutoff distance for the smear, as a fraction of the element. */
    reach: number;
    /** Effect center X, in [0, 1]. */
    centerX: number;
    /** Effect center Y, in [0, 1]. */
    centerY: number;
    /** Stretch direction, in degrees. */
    angle: number;
};

const DEFAULT_PARAMS: PixelStretchParams = {
    offset: -1,
    smoothness: 0,
    falloff: 0,
    reach: 1,
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
                smoothness: Math.max(0, p.smoothness),
                falloff: Math.max(0, p.falloff),
                reach: Math.max(0, p.reach),
            },
            target: ctx.target,
        });
    }
}
