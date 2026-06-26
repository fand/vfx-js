// Holographic Foil — iridescent thin-film sheen that shifts hue across
// the image as it animates. Ported from Figma's "Holographic Foil"
// shader effect.
import type { EffectContext } from "@vfx-js/core";
import {
    GLSL_HEADER,
    GLSL_LUMA,
    GLSL_NOISE,
    SinglePassEffect,
} from "./_common";

const FRAG = `${GLSL_HEADER}
${GLSL_LUMA}
${GLSL_NOISE}
uniform float time;
uniform float scale;
uniform float speed;
uniform float shift;
uniform float intensity;
uniform float mixAmount;

void main() {
    vec4 col = readTex(uvContent);
    float l = luma(col.rgb);
    vec2 p = uvContent * scale;
    float t = time * speed;
    float n = fbm(p + vec2(t, t * 0.5));

    float band = l * 2.0 + n * 1.5 + shift + t * 0.2;
    vec3 iri = 0.5 + 0.5 * cos(6.2831853 * (band + vec3(0.0, 0.33, 0.67)));
    iri = pow(iri, vec3(1.2));

    vec3 foil = iri * intensity * mix(1.0, l + 0.3, 0.5);
    outColor = vec4(mix(col.rgb, foil, mixAmount), col.a);
}
`;

export type HolographicFoilParams = {
    /** Iridescence scale. */
    scale: number;
    /** Animation speed. */
    speed: number;
    /** Hue offset of the spectrum `0..1`. */
    shift: number;
    /** Sheen brightness. */
    intensity: number;
    /** Blend between the image and the foil `0..1`. */
    mixAmount: number;
};

const DEFAULT_PARAMS: HolographicFoilParams = {
    scale: 3,
    speed: 0.3,
    shift: 0,
    intensity: 1,
    mixAmount: 0.75,
};

export class HolographicFoilEffect extends SinglePassEffect<HolographicFoilParams> {
    protected frag = FRAG;

    constructor(initial: Partial<HolographicFoilParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const p = this.params;
        return {
            time: ctx.time,
            scale: p.scale,
            speed: p.speed,
            shift: p.shift,
            intensity: p.intensity,
            mixAmount: p.mixAmount,
        };
    }
}
