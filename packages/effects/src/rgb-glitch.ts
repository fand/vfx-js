// Random block-based per-channel RGB displacement glitch.
// Ported from the `rgbGlitch` shader preset.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_RGB_GLITCH = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amount;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

float random(vec2 st) {
    return fract(sin(dot(st, vec2(948.,824.))) * 30284.);
}

void main (void) {
    vec2 uv = uvContent;
    vec2 uvr = uv, uvg = uv, uvb = uv;

    float tt = mod(time, 17.);

    if (fract(tt * 0.73) > .8 || fract(tt * 0.91) > .8) {
        float t = floor(tt * 11.);

        float n = random(vec2(t, floor(uv.y * 17.7)));
        if (n > .7) {
            uvr.x += random(vec2(t, 1.)) * (amount * 2.0) - amount;
            uvg.x += random(vec2(t, 2.)) * (amount * 2.0) - amount;
            uvb.x += random(vec2(t, 3.)) * (amount * 2.0) - amount;
        }

        float ny = random(vec2(t * 17. + floor(uv * 19.7)));
        if (ny > .7) {
            uvr.x += random(vec2(t, 4.)) * (amount * 2.0) - amount;
            uvg.x += random(vec2(t, 5.)) * (amount * 2.0) - amount;
            uvb.x += random(vec2(t, 6.)) * (amount * 2.0) - amount;
        }
    }

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        step(.1, cr.a + cg.a + cb.a)
    );
}
`;

export type RgbGlitchParams = {
    /** Time scale applied to the animation. */
    speed: number;
    /** Block shift magnitude, as a fraction of the element width (0..1). */
    amount: number;
};

const DEFAULT_PARAMS: RgbGlitchParams = { speed: 1, amount: 0.05 };

export class RgbGlitchEffect implements Effect {
    params: RgbGlitchParams;

    constructor(initial: Partial<RgbGlitchParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<RgbGlitchParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        ctx.draw({
            frag: FRAG_RGB_GLITCH,
            uniforms: {
                src: ctx.src,
                time: ctx.time * this.params.speed,
                amount: this.params.amount,
            },
            target: ctx.target,
        });
    }
}
