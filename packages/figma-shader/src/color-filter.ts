// Color Filter — classic color treatments (grayscale, sepia, vintage,
// warm, cool, noir). Ported from Figma's built-in color-filter presets.
import type { EffectContext } from "@vfx-js/core";
import { GLSL_HEADER, SinglePassEffect } from "./_common";

export type ColorFilterPreset =
    | "grayscale"
    | "sepia"
    | "vintage"
    | "warm"
    | "cool"
    | "noir";

const PRESET_INDEX: Record<ColorFilterPreset, number> = {
    grayscale: 0,
    sepia: 1,
    vintage: 2,
    warm: 3,
    cool: 4,
    noir: 5,
};

const FRAG = `${GLSL_HEADER}
uniform int preset;
uniform float amount;

vec3 applyPreset(vec3 c) {
    float g = dot(c, vec3(0.299, 0.587, 0.114));
    if (preset == 0) {
        return vec3(g);
    } else if (preset == 1) {
        return vec3(
            dot(c, vec3(0.393, 0.769, 0.189)),
            dot(c, vec3(0.349, 0.686, 0.168)),
            dot(c, vec3(0.272, 0.534, 0.131))
        );
    } else if (preset == 2) {
        vec3 v = mix(c, vec3(g), 0.3);
        return v * vec3(1.05, 1.0, 0.85) + vec3(0.05, 0.02, 0.0);
    } else if (preset == 3) {
        return c * vec3(1.1, 1.02, 0.9);
    } else if (preset == 4) {
        return c * vec3(0.9, 1.0, 1.12);
    }
    float n = (g - 0.5) * 1.5 + 0.5;
    return vec3(n);
}

void main() {
    vec4 col = readTex(uvContent);
    vec3 c = clamp(applyPreset(col.rgb), 0.0, 1.0);
    outColor = vec4(mix(col.rgb, c, amount), col.a);
}
`;

export type ColorFilterParams = {
    /** Color treatment preset. */
    preset: ColorFilterPreset;
    /** Blend between the original and the filtered color `0..1`. */
    amount: number;
};

const DEFAULT_PARAMS: ColorFilterParams = {
    preset: "vintage",
    amount: 1,
};

export class ColorFilterEffect extends SinglePassEffect<ColorFilterParams> {
    protected frag = FRAG;

    constructor(initial: Partial<ColorFilterParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(_ctx: EffectContext) {
        const p = this.params;
        return { preset: PRESET_INDEX[p.preset], amount: p.amount };
    }
}
