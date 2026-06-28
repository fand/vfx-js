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
uniform float stripWidth;
uniform float angle;
uniform float aspect;
${GLSL_COMMON}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Smooth value noise: bilinear-interpolated lattice hash.
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
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

// Sample coordinate after the pattern displacement. stGrid fixes the pattern
// geometry (same for every channel); stDisp scales the displacement and is
// varied per channel to get dispersion, so RGB shifts within a strip while the
// strip boundaries stay aligned.
vec2 patternSample(vec2 uv, float stGrid, float stDisp) {
    vec2 q = rot2d(-radians(angle)) * (uv - center);
    float count = 1.0 / stripWidth;

    if (pattern == 2) {
        // Circular: shrink the content inside each grid circle toward the
        // circle's own center. aspect keeps the cells square so circles stay
        // round on any element shape.
        vec2 qa = vec2(q.x * aspect, q.y);
        vec2 g = qa * count;
        vec2 cl = fract(g) - 0.5;
        float r = length(cl);
        float edge = r * 2.0;
        float taper = smoothness > 0.0
            ? smoothstep(1.0, 1.0 - smoothness, edge)
            : step(edge, 1.0);
        float mask = r < 0.5 ? taper : 0.0;
        // Push the sample out from the circle center so a wider area maps in.
        vec2 offset = vec2(cl.x / aspect, cl.y) / count;
        q += offset * stDisp * mask;
        return rot2d(radians(angle)) * q + center;
    }

    // Lenticular: displace each strip's sample by its position within the
    // strip. n runs -1..1 across the strip. smoothness=0 keeps the interior
    // flat and spikes at the boundary (a jump, drawn as a tail); smoothness=1
    // is a sine: zero at the boundary, smooth wave that folds at the edges.
    float gx = q.x;
    float bendPhase = (q.y + 0.5) * TAU / (5.0 * stripWidth);
    if (pattern == 1) {
        // Waves: bend the lens grid along y. Frequency scales with 1/stripWidth.
        gx += sin(bendPhase) * stGrid * 0.5 * stripWidth;
    }
    float n = fract(gx * count) * 2.0 - 1.0;
    float sharp = sign(n) * pow(abs(n), 8.0);
    float soft = sin(n * TAU * 0.5);
    // Waves: keep the bend near the strip boundary so the interior stays flat
    // and adjacent strips join up; raising smoothness widens the connection.
    if (pattern == 1) soft *= n * n;
    float shape = mix(sharp, soft, smoothness);
    float disp = 0.3 * stripWidth * stDisp * shape;
    q.x += disp;
    if (pattern == 1) {
        // Refraction follows the bent grid: y shift = x shift times the grid's
        // slope along y, so where the bend rises the sample tilts up-right.
        q.y += disp * cos(bendPhase) * stGrid * 0.5 * TAU / 5.0;
    }
    return rot2d(radians(angle)) * q + center;
}

void main(void) {
    vec2 uvR = patternSample(uvContent, strength, strength * (1.0 + dispersion));
    vec2 uvG = patternSample(uvContent, strength, strength);
    vec2 uvB = patternSample(uvContent, strength, strength * (1.0 - dispersion));

    if (frost > 0.0) {
        // Frost: jitter the sample with value noise for a frosted-glass blur.
        vec2 j = (vec2(
            valueNoise(uvContent * 1024.0),
            valueNoise(uvContent * 1024.0 + 19.0)
        ) - 0.5) * frost * 0.05;
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
    /** Width of one strip/cell, as a fraction of the element, in (0, 1]. */
    stripWidth: number;
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
    stripWidth: 0.05,
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
        const [w, h] = ctx.dims.element;
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
                stripWidth: Math.min(1, Math.max(0.001, p.stripWidth)),
                angle: p.angle,
                aspect: (w || 1) / (h || 1),
            },
            target: ctx.target,
        });
    }
}
