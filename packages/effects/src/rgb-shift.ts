// Per-channel horizontal RGB shift driven by a layered noise band.
// Ported from the `rgbShift` shader preset.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_RGB_SHIFT = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amp;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

float nn(float y, float t) {
    float n = (
        sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
        sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
        sin(y * 1.1 + t * 2.8) * .4
    );

    n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

    return n;
}

void main (void) {
    vec2 uv = uvContent;
    vec2 uvr = uv, uvg = uv, uvb = uv;

    float t = mod(time, 30.);

    if (abs(nn(uv.y, t)) > 1.) {
        uvr.x += nn(uv.y, t) * amp;
        uvg.x += nn(uv.y, t + 10.) * amp;
        uvb.x += nn(uv.y, t + 20.) * amp;
    }

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    outColor = vec4(
        cr.r,
        cg.g,
        cb.b,
        smoothstep(.0, 1., cr.a + cg.a + cb.a)
    );
}
`;

export type RgbShiftParams = {
    /** Time scale applied to the animation. */
    speed: number;
    /** Maximum horizontal channel shift, in CSS px. */
    amount: number;
};

const DEFAULT_PARAMS: RgbShiftParams = { speed: 1, amount: 10 };

export class RgbShiftEffect implements Effect {
    params: RgbShiftParams;

    constructor(initial: Partial<RgbShiftParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<RgbShiftParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const width = ctx.dims.element[0] || 1;
        ctx.draw({
            frag: FRAG_RGB_SHIFT,
            uniforms: {
                src: ctx.src,
                time: ctx.time * this.params.speed,
                amp: this.params.amount / width,
            },
            target: ctx.target,
        });
    }
}
