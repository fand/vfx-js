// Maps the source luminance onto a color gradient (tone-mapping /
// color grading). Ported from Figma's "Gradient map" shader effect.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { parseHexColor } from "./_figma-common";

const MAX_STOPS = 8;

const FRAG_GRADIENT_MAP = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec3 colors[${MAX_STOPS}];
uniform int colorCount;
uniform float scatter;
uniform float offset;
uniform int repeatType;
uniform float frequency;
uniform int mixSpace;
uniform float time;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 lin2srgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

vec3 lin2oklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
    return vec3(
        0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
        1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
        0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
    );
}
vec3 oklab2lin(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    vec3 lms = vec3(l_, m_, s_);
    lms = lms * lms * lms;
    return vec3(
        4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
    );
}

// Interpolate two sRGB colors in the selected space, returning sRGB.
vec3 mixColor(vec3 a, vec3 b, float t) {
    if (mixSpace == 1) {
        return lin2srgb(mix(srgb2lin(a), srgb2lin(b), t));
    } else if (mixSpace == 2) {
        vec3 oa = lin2oklab(srgb2lin(a));
        vec3 ob = lin2oklab(srgb2lin(b));
        return lin2srgb(oklab2lin(mix(oa, ob, t)));
    }
    return mix(a, b, t);
}

// Fold t into [0, 1] per the repeat mode (none = clamp).
float applyRepeat(float t) {
    if (repeatType == 1) return fract(t);
    if (repeatType == 2) return 1.0 - abs(1.0 - fract(t * 0.5) * 2.0);
    return clamp(t, 0.0, 1.0);
}

vec3 sampleGradient(float t) {
    float f = t * float(colorCount - 1);
    int i = int(floor(f));
    i = clamp(i, 0, colorCount - 2);
    float frac = clamp(f - float(i), 0.0, 1.0);
    return mixColor(colors[i], colors[i + 1], frac);
}

void main(void) {
    vec4 tex = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    float l = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    // Hash in pixel space (gl_FragCoord); hash12 degenerates on tiny
    // [0,1] uv inputs.
    l += scatter * (hash12(gl_FragCoord.xy) - 0.5);

    // offset (and time drift) advance one full cycle per unit, so a 0->1
    // offset sweep runs (frequency) cycles.
    float t = applyRepeat((l + offset + time) * frequency);
    outColor = vec4(sampleGradient(t), tex.a);
}
`;

export type GradientMapRepeat = "none" | "repeat" | "mirror";
export type GradientMapMixSpace = "srgb" | "linear" | "oklab";

const REPEAT_TYPES: Record<GradientMapRepeat, number> = {
    none: 0,
    repeat: 1,
    mirror: 2,
};
const MIX_SPACES: Record<GradientMapMixSpace, number> = {
    srgb: 0,
    linear: 1,
    oklab: 2,
};

export type GradientMapParams = {
    /** Gradient color stops (2–8), evenly spaced over the luminance range. */
    colors: string[];
    /** Random luminance jitter before the lookup, in [0, 1]. */
    scatter: number;
    /** Shift the lookup position along the gradient, in [0, 1]. */
    offset: number;
    /** How the lookup folds back when out of range (none = clamp). */
    repeat: GradientMapRepeat;
    /** How many times the gradient repeats across the luminance range. */
    frequency: number;
    /** Color space used to interpolate the gradient. */
    mixSpace: GradientMapMixSpace;
    /** Animate the offset over time, in [-1, 1] (0 = static). */
    speed: number;
};

const DEFAULT_PARAMS: GradientMapParams = {
    colors: ["#ffffff", "#3aa0ff", "#000000"],
    scatter: 0,
    offset: 0,
    repeat: "none",
    frequency: 1,
    mixSpace: "srgb",
    speed: 0,
};

export class GradientMapEffect implements Effect {
    params: GradientMapParams;

    constructor(initial: Partial<GradientMapParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<GradientMapParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        const stops = p.colors.length >= 2 ? p.colors : DEFAULT_PARAMS.colors;
        const count = Math.min(MAX_STOPS, stops.length);

        // Flatten the stops to a vec3[MAX_STOPS] array, padding with the last.
        const flat = new Float32Array(MAX_STOPS * 3);
        for (let i = 0; i < MAX_STOPS; i++) {
            const [r, g, b] = parseHexColor(stops[Math.min(i, count - 1)]);
            flat[i * 3] = r;
            flat[i * 3 + 1] = g;
            flat[i * 3 + 2] = b;
        }

        ctx.draw({
            frag: FRAG_GRADIENT_MAP,
            uniforms: {
                src: ctx.src,
                colors: flat,
                colorCount: count,
                scatter: Math.max(0, p.scatter),
                offset: p.offset,
                repeatType: REPEAT_TYPES[p.repeat] ?? 0,
                frequency: p.frequency,
                mixSpace: MIX_SPACES[p.mixSpace] ?? 0,
                time: ctx.time * p.speed,
            },
            target: ctx.target,
        });
    }
}
