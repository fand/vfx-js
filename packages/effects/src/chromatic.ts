// Radial chromatic aberration with mirror-wrapped sampling.
// Ported from the `chromatic` shader preset.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_CHROMATIC = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float aspect;
uniform float intensity;
uniform float radius;
uniform float power;

// Sample at a content-space UV mirror-wrapped into [0, 1], remapped into
// the padded src buffer via srcRectUv.
vec4 mirrorTex(vec2 uv) {
    vec2 uv2 = 1. - abs(1. - mod(uv, 2.0));
    return texture(src, srcRectUv.xy + uv2 * srcRectUv.zw);
}

void main() {
    vec2 uv = uvContent;

    vec2 p = uv * 2.0 - 1.0;
    p.x *= aspect;

    float l = max(length(p) - radius, 0.);
    float d = pow(l, power) * (intensity * 0.1);

    vec2 uvR = (uv - .5) / (1.0 + d * 1.) + 0.5;
    vec2 uvG = (uv - .5) / (1.0 + d * 2.) + 0.5;
    vec2 uvB = (uv - .5) / (1.0 + d * 3.) + 0.5;

    vec4 cr = mirrorTex(uvR);
    vec4 cg = mirrorTex(uvG);
    vec4 cb = mirrorTex(uvB);

    outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 3.0);
}
`;

export type ChromaticParams = {
    /** Strength of the colour separation. */
    intensity: number;
    /** Radius (in normalised units) where the aberration begins. */
    radius: number;
    /** Falloff exponent of the aberration curve. */
    power: number;
};

const DEFAULT_PARAMS: ChromaticParams = {
    intensity: 0.3,
    radius: 0.0,
    power: 2.0,
};

export class ChromaticEffect implements Effect {
    params: ChromaticParams;

    constructor(initial: Partial<ChromaticParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<ChromaticParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.element;
        ctx.draw({
            frag: FRAG_CHROMATIC,
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
