// Splits the image into fixed-size strips around the center and shifts each
// strip's sample toward the center. Ported from Figma's "Slice shift" effect.
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
uniform vec2 resolution;
uniform float angle;
uniform float size;
uniform float shift;
uniform float random;
${GLSL_COMMON}

vec4 readTex(vec2 c) {
    return texture(src, srcRectUv.xy + fract(c) * srcRectUv.zw);
}

// Per-strip sample offset, in strip-size units, along the division axis.
// Strip n samples toward the center strip by n * shift, so shift = 1 makes
// every strip show the center strip. random adds a per-strip jitter.
float stripShift(float n) {
    float jitter = (hash11(n) * 2.0 - 1.0) * random;
    return n * shift + jitter;
}

void main(void) {
    // Division axis in element-pixel space; strips stack along it.
    vec2 dir = vec2(cos(radians(angle)), sin(radians(angle)));
    float t = dot((uvContent - center) * resolution, dir);
    float n = floor(t / size + 0.5);

    vec2 uv = uvContent - stripShift(n) * size * dir / resolution;
    outColor = readTex(uv);
}
`;

export type SliceShiftParams = {
    /** Per-strip shift toward the center, in strip-size units. 1 = every strip shows the center strip. */
    shift: number;
    /** Per-strip random shift, in [0, 1]. */
    random: number;
    /** Effect center X, in [0, 1]. */
    centerX: number;
    /** Effect center Y, in [0, 1]. */
    centerY: number;
    /** Strip size in pixels. */
    size: number;
    /** Strip orientation, in degrees. 0 = strips stack horizontally. */
    angle: number;
};

const DEFAULT_PARAMS: SliceShiftParams = {
    shift: 0.5,
    random: 0,
    centerX: 0.5,
    centerY: 0.5,
    size: 100,
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
        const [w, h] = ctx.dims.element;
        ctx.draw({
            frag: FRAG_SLICE_SHIFT,
            uniforms: {
                src: ctx.src,
                center: [p.centerX, p.centerY],
                resolution: [w || 1, h || 1],
                angle: p.angle,
                size: Math.max(1, p.size),
                shift: p.shift,
                random: Math.min(1, Math.max(0, p.random)),
            },
            target: ctx.target,
        });
    }
}
