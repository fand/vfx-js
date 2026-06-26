// Gradient Map — remaps image luminance through a four-stop color ramp.
// Ported from Figma's "Gradient Map" shader effect.
import type { EffectContext } from "@vfx-js/core";
import { GLSL_HEADER, GLSL_LUMA, SinglePassEffect } from "./_common";

const FRAG = `${GLSL_HEADER}
${GLSL_LUMA}
uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform float mixAmount;
uniform float contrast;

void main() {
    vec4 col = readTex(uvContent);
    float l = luma(col.rgb);
    l = clamp((l - 0.5) * contrast + 0.5, 0.0, 1.0);

    vec3 g;
    if (l < 0.3333) {
        g = mix(c0, c1, l / 0.3333);
    } else if (l < 0.6666) {
        g = mix(c1, c2, (l - 0.3333) / 0.3333);
    } else {
        g = mix(c2, c3, (l - 0.6666) / 0.3334);
    }

    outColor = vec4(mix(col.rgb, g, mixAmount), col.a);
}
`;

export type GradientMapParams = {
    /** Shadow color (luminance 0), each channel `0..1`. */
    c0: [number, number, number];
    /** Low-mid color (luminance ~0.33). */
    c1: [number, number, number];
    /** High-mid color (luminance ~0.66). */
    c2: [number, number, number];
    /** Highlight color (luminance 1). */
    c3: [number, number, number];
    /** Blend between original and mapped color `0..1`. */
    mixAmount: number;
    /** Luminance contrast applied before mapping. */
    contrast: number;
};

const DEFAULT_PARAMS: GradientMapParams = {
    c0: [0.05, 0.02, 0.2],
    c1: [0.6, 0.1, 0.4],
    c2: [1.0, 0.45, 0.3],
    c3: [1.0, 0.95, 0.7],
    mixAmount: 1,
    contrast: 1,
};

export class GradientMapEffect extends SinglePassEffect<GradientMapParams> {
    protected frag = FRAG;

    constructor(initial: Partial<GradientMapParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(_ctx: EffectContext) {
        const p = this.params;
        return {
            c0: p.c0,
            c1: p.c1,
            c2: p.c2,
            c3: p.c3,
            mixAmount: p.mixAmount,
            contrast: p.contrast,
        };
    }
}
