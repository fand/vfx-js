// Horizontal sine-wave distortion with per-channel RGB split and a small
// 3-tap horizontal blur. Ported from the `sinewave` shader preset.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_SINEWAVE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amp;
uniform float frequency;
uniform float blurDx;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

vec4 draw(vec2 uv) {
    vec2 uvr = uv, uvg = uv, uvb = uv;

    uvr.x += sin(uv.y * frequency + time * 3.) * amp;
    uvg.x += sin(uv.y * frequency + time * 3. + .4) * amp;
    uvb.x += sin(uv.y * frequency + time * 3. + .8) * amp;

    vec4 cr = readTex(uvr);
    vec4 cg = readTex(uvg);
    vec4 cb = readTex(uvb);

    return vec4(
        cr.r,
        cg.g,
        cb.b,
        cr.a + cg.a + cb.a
    );
}

void main (void) {
    vec2 uv = uvContent;

    // x blur (blurDx == 0 collapses the 3 taps back to a single sample)
    vec2 dx = vec2(blurDx, 0.0);
    outColor = (draw(uv) * 2. + draw(uv + dx) + draw(uv - dx)) / 4.;
}
`;

export type SinewaveParams = {
    /** Time scale applied to the wave animation. */
    speed: number;
    /** Wave amplitude, in CSS px. */
    amount: number;
    /** Vertical spatial frequency of the wave. */
    frequency: number;
    /** Horizontal blur radius, in CSS px (`0` disables the blur). */
    blur: number;
};

const DEFAULT_PARAMS: SinewaveParams = {
    speed: 1,
    amount: 20,
    frequency: 7,
    blur: 2,
};

export class SinewaveEffect implements Effect {
    params: SinewaveParams;

    constructor(initial: Partial<SinewaveParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<SinewaveParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const width = ctx.dims.element[0] || 1;
        ctx.draw({
            frag: FRAG_SINEWAVE,
            uniforms: {
                src: ctx.src,
                time: ctx.time * this.params.speed,
                amp: this.params.amount / width,
                frequency: this.params.frequency,
                blurDx: this.params.blur / width,
            },
            target: ctx.target,
        });
    }
}
