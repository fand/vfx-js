import type { Effect, EffectContext } from "@vfx-js/core";

const frag = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform float amount;

void main() {
    vec2 uv = uvContent;
    uv.x += sin(uv.y * 12.0 + time * 3.0) * 0.04 * amount;
    if (uv.x < 0.0 || uv.x > 1.0) {
        outColor = vec4(0);
        return;
    }
    // Map element uv to src uv.
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`;

export type WaveParams = {
    amount: number;
};

export class WaveEffect implements Effect {
    params: WaveParams;
    #amount = 0;

    constructor(params: Partial<WaveParams> = {}) {
        this.params = { amount: 1, ...params };
    }

    update(ctx: EffectContext) {
        // Ease toward params.amount, so changes look smooth.
        const k = 1 - Math.exp(-ctx.deltaTime * 8);
        this.#amount += (this.params.amount - this.#amount) * k;
    }

    render(ctx: EffectContext) {
        ctx.draw({
            frag,
            uniforms: { src: ctx.src, time: ctx.time, amount: this.#amount },
            target: ctx.target,
        });
    }
}
