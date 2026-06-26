// Slices the image into parallel bands and shifts each band along its
// length. Ported from Figma's "Slice shift" shader effect.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { GLSL_COMMON } from "./_figma-common";

const FRAG_SLICE_SHIFT = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform float angle;
uniform float sliceCount;
uniform float shift;
uniform float softness;
uniform float random;
${GLSL_COMMON}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

// Per-slice horizontal offset. random = 0 alternates the sign by slice
// (a clean interlaced tear); random = 1 picks a per-slice random offset.
float sliceOffset(float idx) {
    float alt = mod(idx, 2.0) < 1.0 ? 1.0 : -1.0;
    float rnd = hash11(idx) * 2.0 - 1.0;
    return shift * mix(alt, rnd, random);
}

void main(void) {
    vec2 p = uvContent - center;
    vec2 pr = rot2d(-radians(angle)) * p;

    float s = pr.y * sliceCount;
    float idx = floor(s);
    float f = fract(s);

    float off = sliceOffset(idx);
    if (softness > 0.0) {
        // Blend toward the neighbouring slice across the band boundary.
        float wNext = smoothstep(1.0 - softness, 1.0, f);
        float wPrev = smoothstep(softness, 0.0, f);
        off = mix(off, sliceOffset(idx + 1.0), wNext);
        off = mix(off, sliceOffset(idx - 1.0), wPrev);
    }

    pr.x += off;
    vec2 uv = rot2d(radians(angle)) * pr + center;
    outColor = readTex(uv);
}
`;

export type SliceShiftParams = {
    /** Band shift amount, as a fraction of the element (0.5 = half width). */
    shift: number;
    /** Soft blend across band boundaries, in [0, 1]. */
    softness: number;
    /** Randomize per-band offset, in [0, 1]. 0 = alternating, 1 = random. */
    random: number;
    /** Effect center X, in [0, 1]. */
    centerX: number;
    /** Effect center Y, in [0, 1]. */
    centerY: number;
    /** Number of bands. */
    sliceCount: number;
    /** Band orientation, in degrees. 0 = horizontal bands. */
    angle: number;
};

const DEFAULT_PARAMS: SliceShiftParams = {
    shift: 0.5,
    softness: 0,
    random: 0,
    centerX: 0.5,
    centerY: 0.5,
    sliceCount: 100,
    angle: 0,
};

export class SliceShiftEffect implements Effect {
    params: SliceShiftParams;

    constructor(initial: Partial<SliceShiftParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<SliceShiftParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        ctx.draw({
            frag: FRAG_SLICE_SHIFT,
            uniforms: {
                src: ctx.src,
                center: [p.centerX, p.centerY],
                angle: p.angle,
                sliceCount: Math.max(1, p.sliceCount),
                shift: p.shift,
                softness: Math.min(1, Math.max(0, p.softness)),
                random: Math.min(1, Math.max(0, p.random)),
            },
            target: ctx.target,
        });
    }
}
