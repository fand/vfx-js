// Quantizes the image with an ordered/threshold dither for a retro,
// reduced-color look. Ported from Figma's "Dither" shader effect.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { parseHexColor } from "./_figma-common";

const FRAG_DITHER = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int style;
uniform float size;
uniform float levels;
uniform float brightness;
uniform float contrast;
uniform float mono;
uniform vec4 monoColor;

// Recursive Bayer ordered-dither thresholds, in [0, 1).
float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float bayer16(vec2 a) { return bayer8(0.5 * a) * 0.25 + bayer2(a); }

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float threshold(vec2 cell) {
    if (style == 0) return bayer2(cell);
    if (style == 1) return bayer4(cell);
    if (style == 2) return bayer8(cell);
    if (style == 3) return bayer16(cell);
    // Blue noise: approximated by a per-cell hash (not a true blue spectrum).
    if (style == 4) return hash12(cell);
    return 0.5; // Threshold: no pattern, hard quantization.
}

void main(void) {
    vec4 tex = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    vec3 c = tex.rgb;
    c = (c - 0.5) * contrast + 0.5;
    c *= brightness;

    vec2 cell = floor(uvContent * resolution / max(1.0, size));
    float th = threshold(cell);
    float steps = max(1.0, levels - 1.0);

    if (mono > 0.5) {
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        float q = clamp(floor(l * steps + th) / steps, 0.0, 1.0);
        outColor = vec4(monoColor.rgb * q, tex.a * monoColor.a);
    } else {
        vec3 q = clamp(floor(c * steps + th) / steps, 0.0, 1.0);
        outColor = vec4(q, tex.a);
    }
}
`;

export type DitherStyle =
    | "bayer2"
    | "bayer4"
    | "bayer8"
    | "bayer16"
    | "blueNoise"
    | "threshold";

const DITHER_STYLES: Record<DitherStyle, number> = {
    bayer2: 0,
    bayer4: 1,
    bayer8: 2,
    bayer16: 3,
    blueNoise: 4,
    threshold: 5,
};

export type DitherParams = {
    /** Dither pattern. */
    style: DitherStyle;
    /** Pattern scale, in px per dither cell. */
    size: number;
    /** Quantization steps per channel. */
    levels: number;
    /** Brightness applied before quantization (1 = unchanged). */
    brightness: number;
    /** Contrast applied before quantization (1 = unchanged). */
    contrast: number;
    /** Output a single tinted channel instead of RGB. */
    mono: boolean;
    /** Foreground tint for mono mode. Accepts a hex string. */
    monoColor: string;
};

const DEFAULT_PARAMS: DitherParams = {
    style: "threshold",
    size: 2,
    levels: 3,
    brightness: 1,
    contrast: 1,
    mono: false,
    monoColor: "#ffffff",
};

export class DitherEffect implements Effect {
    params: DitherParams;

    constructor(initial: Partial<DitherParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<DitherParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        const [w, h] = ctx.dims.elementPixel;
        ctx.draw({
            frag: FRAG_DITHER,
            uniforms: {
                src: ctx.src,
                resolution: [Math.max(1, w), Math.max(1, h)],
                style: DITHER_STYLES[p.style] ?? 5,
                size: Math.max(1, p.size),
                levels: Math.max(2, p.levels),
                brightness: p.brightness,
                contrast: p.contrast,
                mono: p.mono ? 1 : 0,
                monoColor: parseHexColor(p.monoColor),
            },
            target: ctx.target,
        });
    }
}
