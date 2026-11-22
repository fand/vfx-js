import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
} from "@vfx-js/core";
import { SNOISE3D } from "./_noise.js";
import { padOutputRect } from "./_pad.js";

// Edge value of the source, zero outside the valid src rect.
const GLSL_MASK = `
uniform sampler2D src;
uniform int edgeMode;
uniform float edgeThreshold;

float maskAt(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    vec4 c = texture(src, clamp(p, 0.0, 1.0));
    float m = edgeMode == 1 ? dot(c.rgb, vec3(0.299, 0.587, 0.114)) : c.a;
    return m * inside.x * inside.y - edgeThreshold;
}
`;

// Marks texels next to a threshold crossing.
// Stores the px offset from the texel centre to the contour point.
const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
${GLSL_MASK}

// Signed offset to the crossing towards each neighbour; 2 when there is none.
float crossing(float m, float a, float b) {
    float toA = (m >= 0.0) != (a >= 0.0) ? -m / (m - a) : 2.0;
    float toB = (m >= 0.0) != (b >= 0.0) ? m / (m - b) : 2.0;
    return abs(toA) < abs(toB) ? toA : toB;
}

void main() {
    vec2 dx = dFdx(uvSrc);
    vec2 dy = dFdy(uvSrc);
    float m = maskAt(uvSrc);
    float ox = crossing(m, maskAt(uvSrc - dx), maskAt(uvSrc + dx));
    float oy = crossing(m, maskAt(uvSrc - dy), maskAt(uvSrc + dy));
    bool hasX = abs(ox) <= 1.0;
    bool hasY = abs(oy) <= 1.0;
    if (!hasX && !hasY) {
        outColor = vec4(0.0);
        return;
    }
    // Nearest point on the straight line through both axis crossings.
    vec2 o = vec2(ox, oy);
    o = sign(o + 1e-9) * max(abs(o), vec2(1e-4));
    vec2 inv = vec2(hasX ? 1.0 / o.x : 0.0, hasY ? 1.0 / o.y : 0.0);
    outColor = vec4(inv / dot(inv, inv), 0.0, 1.0);
}
`;

// One jump flood step: keep the nearest contour point among 9 neighbours.
const FRAG_JFA = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D seed;
uniform int stepSize;

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(seed, 0);
    vec4 best = vec4(0.0);
    float bestLen = 1e20;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            ivec2 delta = ivec2(x, y) * stepSize;
            ivec2 q = p + delta;
            if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, size))) {
                continue;
            }
            vec4 s = texelFetch(seed, q, 0);
            if (s.a == 0.0) {
                continue;
            }
            vec2 candidate = s.rg + vec2(delta);
            float len = dot(candidate, candidate);
            if (len < bestLen) {
                bestLen = len;
                best = vec4(candidate, 0.0, 1.0);
            }
        }
    }
    outColor = best;
}
`;

// Signed distance in px (negative inside), outward normal, valid flag.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D seed;
${GLSL_MASK}

void main() {
    vec2 dx = dFdx(uvSrc);
    vec2 dy = dFdy(uvSrc);
    vec4 s = texelFetch(seed, ivec2(gl_FragCoord.xy), 0);
    if (s.a == 0.0) {
        outColor = vec4(0.0);
        return;
    }
    float side = maskAt(uvSrc) >= 0.0 ? -1.0 : 1.0;
    float d = length(s.rg);
    vec2 n;
    if (d > 1e-3) {
        n = -side * s.rg / d;
    } else {
        // On the contour: use the mask gradient instead.
        vec2 grad = vec2(
            maskAt(uvSrc + dx) - maskAt(uvSrc - dx),
            maskAt(uvSrc + dy) - maskAt(uvSrc - dy)
        );
        float len = length(grad);
        n = len > 0.0 ? -grad / len : vec2(0.0);
    }
    outColor = vec4(side * d, n, 1.0);
}
`;

// Jagged noise along the contour.
// Blends plain fbm with ridged fbm, so sharpness 1 gives sharp V corners.
const GLSL_JAG = `
${SNOISE3D}

uniform float sharpness;

float jag(vec2 x, float t) {
    float plain = 0.0;
    float ridged = 0.0;
    float amp = 1.0;
    float norm = 0.0;
    for (int i = 0; i < 4; i++) {
        float n = snoise(vec3(x, t * (1.0 + float(i) * 0.5) + float(i) * 7.31));
        plain += n * amp;
        // Recentred ridges, flipped every other octave so kinks point both ways.
        ridged += (0.9 - 2.0 * abs(n)) * (i % 2 == 0 ? amp : -amp);
        norm += amp;
        x = x * 2.0 + vec2(13.7, -5.3);
        amp *= 0.55;
    }
    return mix(plain, ridged, sharpness) / norm;
}
`;

// Core line: the contour pushed along its normal by the jag noise.
// Writes one HDR intensity channel.
const FRAG_CORE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D field;
uniform float amplitude;
uniform float scale;
uniform float thickness;
uniform float time;
${GLSL_JAG}

void main() {
    // Decide per 2x2 quad, so derivatives stay valid in drawn quads.
    vec4 quad = texelFetch(field, ivec2(gl_FragCoord.xy) & ~1, 0);
    if (quad.a < 0.5 || abs(quad.r) > amplitude * 1.2 + thickness + 4.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    vec4 f = texelFetch(field, ivec2(gl_FragCoord.xy), 0);
    float d = f.r;
    vec2 q = gl_FragCoord.xy - d * f.gb;
    float jagHere = jag(q / scale, time);
    float g = d - amplitude * jagHere;
    // Slope of the line along the contour, from one step along the tangent.
    vec2 tangent = vec2(-f.b, f.g);
    float slope = amplitude * (jag((q + tangent) / scale, time) - jagHere);
    float slopeGrad = sqrt(1.0 + slope * slope);
    // Screen derivatives jump where q flips sides across the medial axis.
    // Take the smaller estimate so the jump does not draw a false line.
    float screenGrad = length(vec2(dFdx(g), dFdy(g)));
    float dist = abs(g) / max(min(screenGrad, slopeGrad), 1e-3);
    float halfWidth = thickness * 0.5;
    float line = 1.0 - smoothstep(halfWidth - 0.75, halfWidth + 0.75, dist);
    outColor = vec4(vec3(line), 1.0);
}
`;

// Temporary view: the core line over the dimmed source.
const FRAG_VIEW = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D core;

void main() {
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0)) * inside.x * inside.y;
    vec3 light = texture(core, uv).rgb;
    outColor = vec4(min(base.rgb * 0.3 + light, vec3(1.0)), 1.0);
}
`;

export type SaberParams = {
    /** Glow color, CSS hex. */
    color: string;
    /** Overall brightness. */
    intensity: number;
    /** Core line width in CSS px. */
    thickness: number;
    /** How far the line jumps off the contour, in CSS px. */
    amplitude: number;
    /** Size of the largest jags, in CSS px. */
    scale: number;
    /** 0 = smooth wobble, 1 = sharp spikes. */
    sharpness: number;
    /** 0 = even along the contour, 1 = bursts in places. */
    burst: number;
    /** Animation rate. 0 = frozen. */
    speed: number;
    /** 0 = smooth flow, 1 = bolts snap between shapes. */
    flicker: number;
    /** Number of lines, 1..4. */
    lines: number;
    /** Glow brightness against the core. */
    glow: number;
    /** Glow reach, 0..1. */
    glowFalloff: number;
    /** What the contour is taken from. */
    edge: "alpha" | "luminance";
    /** Cutoff on the edge value, 0..1. */
    edgeThreshold: number;
    /** Draw the element under the light. */
    source: boolean;
    /** Rebuild the contour every frame, for video. */
    dynamic: boolean;
    /**
     * Room for the glow around the element, in CSS px.
     * `"fullscreen"` fills the canvas.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: SaberParams = {
    color: "#3399ff",
    intensity: 1,
    thickness: 2,
    amplitude: 12,
    scale: 60,
    sharpness: 0.8,
    burst: 0.5,
    speed: 1,
    flicker: 0.5,
    lines: 3,
    glow: 1,
    glowFalloff: 0.7,
    edge: "alpha",
    edgeThreshold: 0.5,
    source: true,
    dynamic: false,
    pad: 80,
};

/**
 * Electric lines along the outline of an element.
 *
 * The outline is cached.
 * Call {@link SaberEffect.invalidate} after the element content changes.
 * Set `dynamic` for video.
 */
export class SaberEffect implements Effect {
    params: SaberParams;

    #seedA: EffectRenderTarget | null = null;
    #seedB: EffectRenderTarget | null = null;
    #field: EffectRenderTarget | null = null;
    #core: EffectRenderTarget | null = null;
    #dirty = true;
    #builtW = 0;
    #builtH = 0;
    #builtEdge: SaberParams["edge"] | null = null;
    #builtThreshold = Number.NaN;

    constructor(initial: Partial<SaberParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(partial: Partial<SaberParams>): void {
        Object.assign(this.params, partial);
    }

    /** Rebuild the outline on the next frame. */
    invalidate(): void {
        this.#dirty = true;
    }

    init(ctx: EffectContext): void {
        const seedOpts = { float: true, filter: "nearest" } as const;
        this.#seedA = ctx.createRenderTarget(seedOpts);
        this.#seedB = ctx.createRenderTarget(seedOpts);
        // The host only clears the stage output.
        // So this keeps the field between frames without `persistent`.
        this.#field = ctx.createRenderTarget({ float: true });
        this.#core = ctx.createRenderTarget({ float: true });
        this.#dirty = true;
    }

    render(ctx: EffectContext): void {
        const field = this.#field;
        const core = this.#core;
        if (!field || !core) {
            return;
        }
        const { edge, edgeThreshold, dynamic } = this.params;
        if (
            this.#dirty ||
            dynamic ||
            field.width !== this.#builtW ||
            field.height !== this.#builtH ||
            edge !== this.#builtEdge ||
            edgeThreshold !== this.#builtThreshold
        ) {
            this.#buildField(ctx);
        }

        const { pixelRatio } = ctx.dims;
        const { amplitude, scale, sharpness, speed, thickness } = this.params;
        ctx.draw({
            frag: FRAG_CORE,
            uniforms: {
                field,
                amplitude: amplitude * pixelRatio,
                scale: Math.max(scale, 1e-3) * pixelRatio,
                thickness: thickness * pixelRatio,
                sharpness,
                time: ctx.time * speed,
            },
            target: core,
        });
        ctx.draw({
            frag: FRAG_VIEW,
            uniforms: { src: ctx.src, core },
            target: ctx.target,
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
    }

    dispose(): void {
        this.#seedA = null;
        this.#seedB = null;
        this.#field = null;
        this.#core = null;
        this.#dirty = true;
        this.#builtW = 0;
        this.#builtH = 0;
        this.#builtEdge = null;
        this.#builtThreshold = Number.NaN;
    }

    #buildField(ctx: EffectContext): void {
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        const field = this.#field;
        if (!seedA || !seedB || !field) {
            return;
        }
        const { edge, edgeThreshold } = this.params;
        const maskUniforms = {
            src: ctx.src,
            edgeMode: edge === "luminance" ? 1 : 0,
            edgeThreshold,
        };

        ctx.draw({ frag: FRAG_SEED, uniforms: maskUniforms, target: seedA });

        let read = seedA;
        let write = seedB;
        const flood = (stepSize: number) => {
            ctx.draw({
                frag: FRAG_JFA,
                uniforms: { seed: read, stepSize },
                target: write,
            });
            [read, write] = [write, read];
        };
        const maxSide = Math.max(field.width, field.height);
        for (
            let stepSize = 2 ** Math.ceil(Math.log2(maxSide)) / 2;
            stepSize >= 1;
            stepSize /= 2
        ) {
            flood(stepSize);
        }
        // One more step-1 pass fixes most leftover errors.
        flood(1);

        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { ...maskUniforms, seed: read },
            target: field,
        });

        this.#dirty = false;
        this.#builtW = field.width;
        this.#builtH = field.height;
        this.#builtEdge = edge;
        this.#builtThreshold = edgeThreshold;
    }
}
