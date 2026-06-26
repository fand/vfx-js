// Glass — frosted glass: a noise-jittered blur with low-frequency
// refraction and a tint. Ported from Figma's "Glass / Frosted Glass"
// shader effect.
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_NOISE,
    SinglePassEffect,
} from "./_common";

const FRAG = `${GLSL_HEADER}
${GLSL_NOISE}
uniform vec2 resolution;
uniform float time;
uniform float blur;
uniform float frost;
uniform float refraction;
uniform vec3 tint;
uniform float tintAmount;

void main() {
    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);

    // Low-frequency refraction: warp by the gradient of a noise height.
    vec2 q = uvContent * aspect * frost;
    float h = fbm(q + time * 0.1);
    float hx = fbm(q + vec2(0.04, 0.0) + time * 0.1);
    float hy = fbm(q + vec2(0.0, 0.04) + time * 0.1);
    vec2 grad = vec2(hx - h, hy - h);
    vec2 baseUv = uvContent + grad * refraction;

    // Frosted blur: golden-angle taps, per-pixel random rotation.
    vec2 pxr = blur / resolution;
    float rnd = hash21(uvContent * resolution) * 6.2831853;
    const int N = 12;
    const float GOLDEN = 2.399963229728653;
    vec3 acc = vec3(0.0);
    float aacc = 0.0;
    for (int i = 0; i < N; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / float(N));
        float a = fi * GOLDEN + rnd;
        vec4 s = readTex(baseUv + vec2(cos(a), sin(a)) * r * pxr);
        acc += s.rgb * s.a;
        aacc += s.a;
    }

    vec3 c = acc / max(aacc, 1e-3);
    c = mix(c, tint, tintAmount);
    outColor = vec4(c, aacc / float(N));
}
`;

export type GlassParams = {
    /** Frosted blur radius in CSS px. */
    blur: number;
    /** Refraction noise scale (size of the glass ripples). */
    frost: number;
    /** Refraction strength `0..0.2`. */
    refraction: number;
    /** Glass tint, each channel `0..1`. */
    tint: [number, number, number];
    /** How much tint to mix in `0..1`. */
    tintAmount: number;
};

const DEFAULT_PARAMS: GlassParams = {
    blur: 6,
    frost: 4,
    refraction: 0.03,
    tint: [0.8, 0.85, 0.95],
    tintAmount: 0.12,
};

export class GlassEffect extends SinglePassEffect<GlassParams> {
    protected frag = FRAG;

    constructor(initial: Partial<GlassParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            time: ctx.time,
            blur: p.blur * ctx.pixelRatio,
            frost: p.frost,
            refraction: p.refraction,
            tint: p.tint,
            tintAmount: p.tintAmount,
        };
    }
}
