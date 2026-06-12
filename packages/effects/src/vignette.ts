// Radial edge darkening. Ported from the `vignette` shader preset.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_VIGNETTE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float aspect;
uniform float intensity;
uniform float radius;
uniform float power;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main() {
    vec2 uv = uvContent;
    outColor = readTex(uv);

    vec2 p = uv * 2.0 - 1.0;
    p.x *= aspect;

    float l = max(length(p) - radius, 0.);
    outColor *= 1. - pow(l, power) * intensity;
}
`;

export type VignetteParams = {
    /** Strength of the edge darkening. */
    intensity: number;
    /** Radius (in normalised units) where the darkening begins. */
    radius: number;
    /** Falloff exponent of the darkening curve. */
    power: number;
};

const DEFAULT_PARAMS: VignetteParams = {
    intensity: 0.5,
    radius: 1.0,
    power: 2.0,
};

export class VignetteEffect implements Effect {
    params: VignetteParams;

    constructor(initial: Partial<VignetteParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<VignetteParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.element;
        ctx.draw({
            frag: FRAG_VIGNETTE,
            uniforms: {
                src: ctx.src,
                aspect: (w || 1) / (h || 1),
                intensity: this.params.intensity,
                radius: this.params.radius,
                power: this.params.power,
            },
            target: ctx.target,
        });
    }
}
