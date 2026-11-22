import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
} from "@vfx-js/core";
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

// Temporary debug view of the signed distance.
// Orange inside, blue outside, a line every 6 CSS px, white contour.
const FRAG_DEBUG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D field;
uniform float pixelRatio;

void main() {
    vec4 f = texture(field, uv);
    if (f.a < 0.5) {
        outColor = vec4(0.0);
        return;
    }
    float d = f.r / pixelRatio;
    float pxPerUnit = max(fwidth(d), 1e-4);
    vec3 col = d < 0.0 ? vec3(1.0, 0.55, 0.2) : vec3(0.25, 0.55, 1.0);
    col *= 0.25 + 0.55 * exp(-abs(d) / 80.0);
    col *= mod(floor(d / 6.0), 2.0) == 0.0 ? 1.0 : 0.85;
    float band = abs(fract(d / 6.0 + 0.5) - 0.5) * 6.0;
    float iso = 1.0 - smoothstep(0.5, 1.5, band / pxPerUnit);
    col = mix(col, col * 2.0 + 0.1, iso * 0.6);
    float zero = 1.0 - smoothstep(0.75, 1.75, abs(d) / pxPerUnit);
    col = mix(col, vec3(1.0), zero);
    outColor = vec4(col, 1.0);
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
        this.#dirty = true;
    }

    render(ctx: EffectContext): void {
        const field = this.#field;
        if (!field) {
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

        ctx.draw({
            frag: FRAG_DEBUG,
            uniforms: { field, pixelRatio: ctx.dims.pixelRatio },
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
