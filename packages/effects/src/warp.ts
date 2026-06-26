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
uniform int mode;
uniform float amp;
uniform float freq;
uniform float time;
${GLSL_COMMON}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main(void) {
    vec2 uv = uvContent;
    vec2 p = uv - center;
    float r = length(p);
    vec2 dir = r > 1e-5 ? p / r : vec2(0.0);

    if (mode == 0) {
        // Sine wave: independent ripples on each axis.
        uv.x += sin(uv.y * freq * TAU + time) * amp * 0.05;
        uv.y += sin(uv.x * freq * TAU + time) * amp * 0.05;
    } else if (mode == 1) {
        // Twist: rotation growing linearly with radius.
        uv = rot2d(amp * 0.5 * r) * p + center;
    } else if (mode == 2) {
        // Bulge: magnify the center.
        uv = center + dir * pow(r, 1.0 - amp * 0.2);
    } else if (mode == 3) {
        // Pinch: pull toward the center.
        uv = center + dir * pow(r, 1.0 + amp * 0.2);
    } else if (mode == 4) {
        // Ripple: radial sine pushing along the radius.
        uv += dir * sin(r * freq * TAU - time) * amp * 0.03;
    } else if (mode == 5) {
        // Flag: horizontal wave whose amplitude grows toward the right.
        uv.y += sin(uv.x * freq * TAU + time) * amp * 0.05 * uv.x;
    } else if (mode == 6) {
        // Squeeze: anisotropic horizontal compression around the center.
        p.x *= 1.0 + amp * 0.2 * (1.0 - abs(p.y) * 2.0);
        uv = p + center;
    } else if (mode == 7) {
        // Swirl: rotation that decays away from the center (a whirlpool).
        uv = rot2d(amp * 0.6 * exp(-r * 4.0)) * p + center;
    }

    outColor = readTex(uv);
}
`;

export type WarpType =
    | "sine"
    | "twist"
    | "bulge"
    | "pinch"
    | "ripple"
    | "flag"
    | "squeeze"
    | "swirl";

const WARP_MODES: Record<WarpType, number> = {
    sine: 0,
    twist: 1,
    bulge: 2,
    pinch: 3,
    ripple: 4,
    flag: 5,
    squeeze: 6,
    swirl: 7,
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
    type: "swirl",
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
                mode: WARP_MODES[p.type] ?? 0,
                amp: p.amplitude,
                freq: p.frequency,
                time: ctx.time * p.speed,
            },
            target: ctx.target,
        });
    }
}
