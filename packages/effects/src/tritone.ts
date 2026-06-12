// Three-tone gradient map driven by source luminance, with an animated
// cycle. Ported from the `tritone` shader preset.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import type { Rgba } from "./duotone";

const FRAG_TRITONE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float time;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 color3;
uniform float speed;

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main (void) {
    vec4 color = readTex(uvContent);

    float gray = dot(color.rgb, vec3(0.2, 0.7, 0.08));
    float t = mod(gray * 3.0 + time * speed, 3.0);

    if (t < 1.) {
        outColor = mix(color1, color2, fract(t));
    } else if (t < 2.) {
        outColor = mix(color2, color3, fract(t));
    } else {
        outColor = mix(color3, color1, fract(t));
    }

    outColor.a *= color.a;
}
`;

export type TritoneParams = {
    /** First tone. */
    color1: Rgba;
    /** Second tone. */
    color2: Rgba;
    /** Third tone. */
    color3: Rgba;
    /** Gradient cycling speed. `0` keeps the mapping static. */
    speed: number;
};

const DEFAULT_PARAMS: TritoneParams = {
    color1: [1, 0, 0, 1],
    color2: [0, 1, 0, 1],
    color3: [0, 0, 1, 1],
    speed: 0.2,
};

export class TritoneEffect implements Effect {
    params: TritoneParams;

    constructor(initial: Partial<TritoneParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<TritoneParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        ctx.draw({
            frag: FRAG_TRITONE,
            uniforms: {
                src: ctx.src,
                time: ctx.time,
                color1: this.params.color1,
                color2: this.params.color2,
                color3: this.params.color3,
                speed: this.params.speed,
            },
            target: ctx.target,
        });
    }
}
