// Refracts the image through a repeating lens pattern, with chromatic
// dispersion and selectable edge sampling. Ported from Figma's
// "Pattern refraction" shader effect (Lenticular / Waves / Circular).
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { GLSL_COMMON } from "./_figma-common";

const FRAG_PATTERN_REFRACTION = `#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform int pattern;
uniform int edgeWrap;
uniform float strength;
uniform float smoothness;
uniform float frost;
uniform float dispersion;
uniform float count;
uniform float angle;
${GLSL_COMMON}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Edge sampling for out-of-range coordinates.
vec4 readTexWrap(vec2 uv) {
    if (edgeWrap == 0) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
            return vec4(0.0);
    } else if (edgeWrap == 1) {
        uv = clamp(uv, 0.0, 1.0);
    } else if (edgeWrap == 2) {
        uv = fract(uv);
    } else {
        vec2 m = mod(uv, 2.0);
        uv = mix(m, 2.0 - m, step(1.0, m));
    }
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

// Sample coordinate after the pattern displacement, for a given strength
// (varied per channel to get dispersion).
vec2 patternSample(vec2 uv, float st) {
    vec2 q = rot2d(-radians(angle)) * (uv - center);

    if (pattern == 2) {
        // Circular: inside each grid circle, pull the sample toward the
        // image center so the cell magnifies the middle of the picture.
        vec2 g = q * count;
        vec2 cl = fract(g) - 0.5;
        float r = length(cl);
        float edge = r * 2.0;
        float taper = smoothness > 0.0
            ? smoothstep(1.0, 1.0 - smoothness, edge)
            : step(edge, 1.0);
        float mask = r < 0.5 ? taper : 0.0;
        return mix(uv, vec2(0.5), st * 0.5 * mask);
    }

    // Lenticular: magnify each vertical strip away from its center line.
    float sx = q.x * count;
    float local = (fract(sx) - 0.5) / count;
    float edge = abs(fract(sx) - 0.5) * 2.0;
    float taper = smoothness > 0.0
        ? smoothstep(1.0, 1.0 - smoothness, edge)
        : 1.0;
    q.x += local * st * 8.0 * taper;
    if (pattern == 1) {
        // Waves: add a vertical ripple on top of the lenticular strips.
        q.y += sin(q.x * count * TAU) * st * 0.05 * taper;
    }
    return rot2d(radians(angle)) * q + center;
}

void main(void) {
    vec2 uvR = patternSample(uvContent, strength * (1.0 + dispersion));
    vec2 uvG = patternSample(uvContent, strength);
    vec2 uvB = patternSample(uvContent, strength * (1.0 - dispersion));

    if (frost > 0.0) {
        // Frost: jitter the sample for a frosted-glass blur.
        vec2 j = vec2(
            hash12(uvContent * 511.0) - 0.5,
            hash12(uvContent * 727.0 + 5.0) - 0.5
        ) * frost * 0.05;
        uvR += j;
        uvG += j;
        uvB += j;
    }

    vec4 cg = readTexWrap(uvG);
    outColor = vec4(
        readTexWrap(uvR).r,
        cg.g,
        readTexWrap(uvB).b,
        cg.a
    );
}
`;

export type RefractionPattern = "lenticular" | "waves" | "circular";

const REFRACTION_PATTERNS: Record<RefractionPattern, number> = {
    lenticular: 0,
    waves: 1,
    circular: 2,
};

export type RefractionEdgeWrap = "zero" | "clamp" | "repeat" | "mirror";

const REFRACTION_EDGE_WRAPS: Record<RefractionEdgeWrap, number> = {
    zero: 0,
    clamp: 1,
    repeat: 2,
    mirror: 3,
};

export type PatternRefractionParams = {
    /** Refraction pattern. */
    pattern: RefractionPattern;
    /** Refraction amount. */
    strength: number;
    /** Smooth the displacement across pattern boundaries, in [0, 1]. */
    smoothness: number;
    /** Frosted-glass jitter, in [0, 1]. */
    frost: number;
    /** Chromatic dispersion (per-channel refraction offset), in [0, 1]. */
    dispersion: number;
    /** Out-of-range edge sampling. */
    edgeWrap: RefractionEdgeWrap;
    /** Pattern center X, in [0, 1]. */
    centerX: number;
    /** Pattern center Y, in [0, 1]. */
    centerY: number;
    /** Pattern repeat count across the element. */
    count: number;
    /** Pattern rotation, in degrees. */
    angle: number;
};

const DEFAULT_PARAMS: PatternRefractionParams = {
    pattern: "lenticular",
    strength: 0.5,
    smoothness: 0,
    frost: 0,
    dispersion: 0.04,
    edgeWrap: "zero",
    centerX: 0.5,
    centerY: 0.5,
    count: 20,
    angle: 0,
};

export class PatternRefractionEffect implements Effect {
    params: PatternRefractionParams;

    constructor(initial: Partial<PatternRefractionParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<PatternRefractionParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        ctx.draw({
            frag: FRAG_PATTERN_REFRACTION,
            uniforms: {
                src: ctx.src,
                center: [p.centerX, p.centerY],
                pattern: REFRACTION_PATTERNS[p.pattern] ?? 0,
                edgeWrap: REFRACTION_EDGE_WRAPS[p.edgeWrap] ?? 0,
                strength: p.strength,
                smoothness: Math.min(1, Math.max(0, p.smoothness)),
                frost: Math.max(0, p.frost),
                dispersion: Math.max(0, p.dispersion),
                count: Math.max(1, p.count),
                angle: p.angle,
            },
            target: ctx.target,
        });
    }
}
