// Liquid Metal — turns the image into flowing chrome by warping it with
// animated fractal noise and re-shading with a metallic ramp. Ported
// from Figma's "Liquid Metal" shader effect.
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
uniform float distortion;
uniform float bands;
uniform vec3 tintA;
uniform vec3 tintB;

void main() {
    vec2 p = uvContent * scale;
    float t = time * speed;
    float n = fbm(p + vec2(t, t * 0.6));
    float n2 = fbm(p * 1.7 + vec2(-t * 0.7, 11.0));

    vec2 warp = (vec2(n, n2) - 0.5) * distortion;
    vec4 col = readTex(uvContent + warp);
    float l = luma(col.rgb);

    float h = l + (n - 0.5) * 0.6;
    float m = 0.5 + 0.5 * cos((h * bands + n2 * 2.0) * 6.2831853);
    m = pow(m, 1.5);

    vec3 chrome = mix(tintA, tintB, m);
    chrome += pow(m, 6.0) * 0.6;           // specular glint

    outColor = vec4(chrome * col.a, col.a);
}
`;

export type LiquidMetalParams = {
    /** Noise scale (higher = finer ripples). */
    scale: number;
    /** Flow speed. */
    speed: number;
    /** How far the noise warps the underlying image `0..0.2`. */
    distortion: number;
    /** Number of metallic bands across the tonal range. */
    bands: number;
    /** Dark metal tone, each channel `0..1`. */
    tintA: [number, number, number];
    /** Bright metal tone, each channel `0..1`. */
    tintB: [number, number, number];
};

const DEFAULT_PARAMS: LiquidMetalParams = {
    scale: 3,
    speed: 0.3,
    distortion: 0.03,
    bands: 4,
    tintA: [0.08, 0.1, 0.16],
    tintB: [0.85, 0.9, 1.0],
};

export class LiquidMetalEffect extends SinglePassEffect<LiquidMetalParams> {
    protected frag = FRAG;

    constructor(initial: Partial<LiquidMetalParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const p = this.params;
        return {
            time: ctx.time,
            scale: p.scale,
            speed: p.speed,
            distortion: p.distortion,
            bands: p.bands,
            tintA: p.tintA,
            tintB: p.tintB,
        };
    }
}
