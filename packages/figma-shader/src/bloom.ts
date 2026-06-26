// Bloom — cinematic glow that blooms bright regions of the image.
// Ported from Figma's "Bloom" shader effect (region / intensity /
// softness / color controls). Single full-screen pass: a golden-angle
// spiral of taps approximates a wide blur of the bright-pass.
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_LUMA,
    SinglePassEffect,
} from "./_common";

const FRAG = `${GLSL_HEADER}
${GLSL_LUMA}
uniform vec2 resolution;
uniform float threshold;
uniform float softness;
uniform float intensity;
uniform float radius;
uniform vec3 tint;

vec3 brightPass(vec2 uv) {
    vec4 c = readTex(uv);
    float l = luma(c.rgb);
    float k = smoothstep(threshold, threshold + softness + 1e-3, l);
    return c.rgb * c.a * k;
}

void main() {
    vec4 base = readTex(uvContent);
    vec2 px = radius / resolution;
    const int N = 32;
    const float GOLDEN = 2.399963229728653;
    vec3 glow = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < N; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / float(N));
        float a = fi * GOLDEN;
        vec2 off = vec2(cos(a), sin(a)) * r;
        float w = 1.0 - r;                 // weight centre taps higher
        glow += brightPass(uvContent + off * px) * w;
        wsum += w;
    }
    glow /= max(wsum, 1e-3);
    vec3 col = base.rgb + glow * intensity * tint;
    outColor = vec4(col, base.a);
}
`;

export type BloomParams = {
    /** Luminance above which pixels start to bloom. */
    threshold: number;
    /** Width of the threshold knee. */
    softness: number;
    /** Glow strength added on top of the image. */
    intensity: number;
    /** Glow radius in CSS px. */
    radius: number;
    /** Glow tint, each channel `0..1`. */
    tint: [number, number, number];
};

const DEFAULT_PARAMS: BloomParams = {
    threshold: 0.6,
    softness: 0.2,
    intensity: 1.2,
    radius: 24,
    tint: [1, 1, 1],
};

export class BloomEffect extends SinglePassEffect<BloomParams> {
    protected frag = FRAG;

    constructor(initial: Partial<BloomParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            threshold: p.threshold,
            softness: p.softness,
            intensity: p.intensity,
            radius: p.radius * ctx.pixelRatio,
            tint: p.tint,
        };
    }
}
