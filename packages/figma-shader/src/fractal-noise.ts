// Fractal Noise — overlays animated fractal-Brownian-motion noise onto
// the image with a choice of blend modes. Ported from Figma's "Fractal
// Noise" shader fill/effect.
import type { EffectContext } from "@vfx-js/core";
import {
    contentResolution,
    GLSL_HEADER,
    GLSL_NOISE,
    SinglePassEffect,
} from "./_common";

export type FractalNoiseMode = "replace" | "multiply" | "screen" | "add";

const MODE_INDEX: Record<FractalNoiseMode, number> = {
    replace: 0,
    multiply: 1,
    screen: 2,
    add: 3,
};

const FRAG = `${GLSL_HEADER}
${GLSL_NOISE}
uniform vec2 resolution;
uniform float time;
uniform float scale;
uniform float speed;
uniform float amount;
uniform float contrast;
uniform int mode;
uniform bool colored;

void main() {
    vec4 col = readTex(uvContent);
    float aspect = resolution.x / resolution.y;
    vec2 p = vec2(uvContent.x * aspect, uvContent.y) * scale;
    float t = time * speed;

    vec3 n;
    if (colored) {
        n = vec3(
            fbm(p + vec2(t, 0.0)),
            fbm(p + vec2(5.2, 1.3) + t),
            fbm(p + vec2(-3.1, 7.7) - t)
        );
    } else {
        n = vec3(fbm(p + vec2(0.0, t)));
    }
    n = clamp((n - 0.5) * contrast + 0.5, 0.0, 1.0);

    vec3 o;
    if (mode == 1) {
        o = col.rgb * n;
    } else if (mode == 2) {
        o = 1.0 - (1.0 - col.rgb) * (1.0 - n);
    } else if (mode == 3) {
        o = col.rgb + n - 0.5;
    } else {
        o = n;
    }

    outColor = vec4(mix(col.rgb, o, amount), col.a);
}
`;

export type FractalNoiseParams = {
    /** Noise scale (number of octaves' base frequency across the image). */
    scale: number;
    /** Animation speed. */
    speed: number;
    /** Blend amount with the source `0..1`. */
    amount: number;
    /** Noise contrast. */
    contrast: number;
    /** Blend mode with the source image. */
    mode: FractalNoiseMode;
    /** Generate independent RGB noise instead of grayscale. */
    colored: boolean;
};

const DEFAULT_PARAMS: FractalNoiseParams = {
    scale: 4,
    speed: 0.2,
    amount: 0.5,
    contrast: 1.4,
    mode: "screen",
    colored: false,
};

export class FractalNoiseEffect extends SinglePassEffect<FractalNoiseParams> {
    protected frag = FRAG;

    constructor(initial: Partial<FractalNoiseParams> = {}) {
        super(DEFAULT_PARAMS, initial);
    }

    protected uniforms(ctx: EffectContext) {
        const [w, h] = contentResolution(ctx);
        const p = this.params;
        return {
            resolution: [w, h],
            time: ctx.time,
            scale: p.scale,
            speed: p.speed,
            amount: p.amount,
            contrast: p.contrast,
            mode: MODE_INDEX[p.mode],
            colored: p.colored,
        };
    }
}
