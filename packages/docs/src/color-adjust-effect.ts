import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float gamma;
uniform float saturation;

void main(void) {
    vec4 color = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    // Colors are premultiplied. Adjust the straight color.
    vec3 rgb = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
    rgb = pow(rgb, vec3(1.0 / gamma));
    float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb = clamp(mix(vec3(luma), rgb, saturation), 0.0, 1.0);
    outColor = vec4(rgb * color.a, color.a);
}
`;

export type ColorAdjustOptions = {
    /** Above 1 brightens the dark and mid tones. Default 1. */
    gamma?: number;
    /** 0 is gray, 1 keeps the color, above 1 makes it more vivid. Default 1. */
    saturation?: number;
};

/** Gamma and saturation. */
export class ColorAdjustEffect implements Effect {
    gamma: number;
    saturation: number;

    constructor({ gamma = 1, saturation = 1 }: ColorAdjustOptions = {}) {
        this.gamma = gamma;
        this.saturation = saturation;
    }

    render(ctx: EffectContext): void {
        ctx.draw({
            frag: FRAG,
            uniforms: {
                src: ctx.src,
                gamma: Math.max(0.01, this.gamma),
                saturation: Math.max(0, this.saturation),
            },
            target: ctx.target,
        });
    }
}
