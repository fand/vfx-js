// Domain-warp distortion with eight selectable shapes. Ported from
// Figma's "Warp" shader effect, with an added speed param so the
// wave-based types animate.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { GLSL_COMMON } from "./_figma-common";

const FRAG_WARP = `#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform int mode;
uniform float amp;
uniform float freq;
uniform float time;
${GLSL_COMMON}

vec4 readTex(vec2 c) {
    c = clamp(c, 0.0, 1.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main(void) {
    vec2 uv = uvContent;
    vec2 p = uv - center;
    float r = length(p);

    if (mode == 0) {
        // Sine wave: ripples per axis, centered so both diagonals stay straight.
        uv.x -= sin(p.y * freq * TAU + time) * amp * 0.05;
        uv.y -= sin(p.x * freq * TAU + time) * amp * 0.05;
    } else if (mode == 1) {
        // Twist: swirl that rotates most at the center and unwinds to the edge.
        // aspect scale keeps the field circular and contained in the element.
        vec2 s = resolution / max(resolution.x, resolution.y);
        vec2 tp = (uv - center) * 2.0 * s;
        float t = length(tp) / 1.41421356;
        tp = rot2d(amp * freq * (1.0 - t)) * tp;
        uv = tp / s * 0.5 + center;
    } else if (mode == 2) {
        // Ripple: scale the radius by a cosine of the distance from center.
        p *= 1.0 - cos((r-.5) * freq * 10.0 + time) * amp * 0.2;
        uv = p + center;
    }

    outColor = readTex(uv);
}
`;

export type WarpType = "sine wave" | "twist" | "ripple";

const WARP_MODES: Record<WarpType, number> = {
    "sine wave": 0,
    twist: 1,
    ripple: 2,
};

export type WarpParams = {
    /** Distortion shape. */
    type: WarpType;
    /** Distortion strength. */
    amplitude: number;
    /** Spatial frequency (affects the wave-based types). */
    frequency: number;
    /** Effect center X, in [0, 1]. */
    centerX: number;
    /** Effect center Y, in [0, 1]. */
    centerY: number;
    /** Animation speed for the wave-based types (0 = static). */
    speed: number;
};

const DEFAULT_PARAMS: WarpParams = {
    type: "twist",
    amplitude: 3,
    frequency: 1,
    centerX: 0.5,
    centerY: 0.5,
    speed: 0,
};

export class WarpEffect implements Effect {
    params: WarpParams;

    constructor(initial: Partial<WarpParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<WarpParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        ctx.draw({
            frag: FRAG_WARP,
            uniforms: {
                src: ctx.src,
                center: [p.centerX, p.centerY],
                resolution: [
                    ctx.dims.element[0] || 1,
                    ctx.dims.element[1] || 1,
                ],
                mode: WARP_MODES[p.type] ?? 0,
                amp: p.amplitude,
                freq: p.frequency,
                time: ctx.time * p.speed,
            },
            target: ctx.target,
        });
    }
}
