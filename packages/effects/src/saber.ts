import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
} from "@vfx-js/core";
import {
    type BloomPyramid,
    createBloomPyramid,
    disposeBloomPyramid,
    FRAG_BLOOM_DOWNSAMPLE,
    upsampleBloomPyramid,
} from "./_bloom-common.js";
import { parseHexColor } from "./_figma-common.js";
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

// Room for the line on each side of the contour: how far it may move along the normal
// before it meets the line from the other side of a stroke or gap.
// Marches from the contour point; past the middle the field reports a nearer contour.
const FRAG_ROOM = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D field;
uniform float maxRoom;

float march(vec2 q, vec2 dir, float side, vec2 size) {
    float best = maxRoom;
    for (int k = 1; k <= 12; k++) {
        float s = maxRoom * float(k) / 12.0;
        vec2 x = q + dir * s;
        if (any(lessThan(x, vec2(0.0))) || any(greaterThan(x, size))) {
            break;
        }
        vec4 f = texture(field, x / size);
        float overshoot = s - side * f.r;
        if (f.a > 0.5 && overshoot > 0.0) {
            best = min(best, s - overshoot * 0.5);
        }
    }
    return max(best, 0.0);
}

void main() {
    vec2 size = vec2(textureSize(field, 0));
    vec4 f = texelFetch(field, ivec2(gl_FragCoord.xy), 0);
    if (f.a < 0.5) {
        outColor = vec4(maxRoom, maxRoom, 0.0, 1.0);
        return;
    }
    vec2 q = gl_FragCoord.xy - f.r * f.gb;
    outColor = vec4(march(q, f.gb, 1.0, size), march(q, -f.gb, -1.0, size), 0.0, 1.0);
}
`;

// Box blur along one axis, to smooth the room along the contour.
const FRAG_ROOM_BLUR = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D src;
uniform ivec2 dir;

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(src, 0);
    vec4 sum = vec4(0.0);
    for (int i = -4; i <= 4; i++) {
        sum += texelFetch(src, clamp(p + dir * i, ivec2(0), size - 1), 0);
    }
    outColor = sum / 9.0;
}
`;

// Noise for the lines.
// `jag` is value noise on a lattice; sharpness 1 interpolates linearly,
// so a line runs straight inside a cell and kinks at cell edges.
const GLSL_JAG = `
${SNOISE3D}

uniform float sharpness;

float hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z) * 2.0 - 1.0;
}

float lattice(vec3 p) {
    vec3 i = floor(p);
    vec3 f = p - i;
    vec2 smoothF = f.xy * f.xy * (3.0 - 2.0 * f.xy);
    vec2 w = mix(smoothF, f.xy, sharpness);
    float wt = f.z * f.z * (3.0 - 2.0 * f.z);
    vec2 e = vec2(1.0, 0.0);
    float a0 = mix(hash(i), hash(i + e.xyy), w.x);
    float b0 = mix(hash(i + e.yxy), hash(i + e.xxy), w.x);
    float a1 = mix(hash(i + e.yyx), hash(i + e.xyx), w.x);
    float b1 = mix(hash(i + e.yxx), hash(i + e.xxx), w.x);
    return mix(mix(a0, b0, w.y), mix(a1, b1, w.y), wt);
}

// Three octaves, each rotated so their kinks do not line up.
float jag(vec2 x, float t) {
    const mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
    float sum = 0.0;
    float amp = 1.0;
    for (int i = 0; i < 3; i++) {
        sum += lattice(vec3(x, t)) * amp;
        x = turn * x * 2.2 + 17.1;
        t = t * 1.6 + 3.7;
        amp *= 0.55;
    }
    // Soft limit to -1..1, so the line never leaves the band the early out keeps.
    return tanh(sum * 1.1);
}
`;

// Core lines: the contour pushed along its normal by noise.
// Line 0 is a calm main line; the others are arcs that come and go.
// Writes one HDR intensity channel.
const FRAG_CORE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D field;
uniform sampler2D roomTex;
uniform float amplitude;
uniform float scale;
uniform float thickness;
uniform float time;
uniform float burst;
uniform float flicker;
uniform int lines;
${GLSL_JAG}

const float MAIN_SHARE = 0.3;
const float ARC_LEAN = 0.1;
const float ARC_SCALE = 0.7;
const float SNAPS_PER_SECOND = 16.0;

// Soft clamp of the displacement to the room on each side of the contour.
float fit(float disp, vec2 room) {
    float limit = min(disp > 0.0 ? room.x : room.y, amplitude) * 0.9 + 1e-3;
    return limit * tanh(disp / limit);
}

void main() {
    // Decide per 2x2 quad, so derivatives stay valid in drawn quads.
    vec4 quad = texelFetch(field, ivec2(gl_FragCoord.xy) & ~1, 0);
    if (quad.a < 0.5 || abs(quad.r) > amplitude + thickness + 4.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    vec2 size = vec2(textureSize(field, 0));
    vec4 f = texelFetch(field, ivec2(gl_FragCoord.xy), 0);
    float d = f.r;
    vec2 n = f.gb;
    vec2 q = gl_FragCoord.xy - d * n;
    vec2 tangent = vec2(-n.y, n.x);
    vec2 room = texture(roomTex, q / size).rg;
    vec2 roomNext = texture(roomTex, (q + tangent) / size).rg;

    // Mix smooth time with time that snaps to new shapes.
    float snap = floor(time * SNAPS_PER_SECOND);
    float snapped = snap / SNAPS_PER_SECOND + hash(vec3(snap, 1.7, 9.1)) * 0.5;
    float t = mix(time, snapped, flicker);

    float light = 0.0;
    for (int i = 0; i < 4; i++) {
        if (i >= lines) {
            break;
        }
        float fi = float(i);
        float lineScale = i > 0 ? scale * ARC_SCALE : scale;
        vec2 x = q / lineScale + fi * vec2(31.7, 17.3);
        float lineAmp = amplitude * MAIN_SHARE;
        float width = thickness;
        float weight = 1.0;
        if (i > 0) {
            // Arcs fade in and out along the contour; burst makes them rarer.
            float env = snoise(vec3(q / (scale * 4.0) + fi * 7.3, t * 0.25)) * 0.5 + 0.5;
            float low = burst * 0.7;
            lineAmp = amplitude * smoothstep(low, low + 0.25, env);
            width = thickness * 0.75;
            weight = 0.85 * (1.0 - 0.6 * flicker * (hash(vec3(snap, fi, 4.2)) * 0.5 + 0.5));
        }
        float tLine = t * (1.0 + fi * 0.15);
        // Arcs lean outwards, away from the element.
        float lean = i > 0 ? ARC_LEAN : 0.0;
        float jagHere = jag(x, tLine);
        float disp = fit(lineAmp * mix(jagHere, 1.0, lean), room);
        float g = d - disp;
        // Slope of the line along the contour, from one step along the tangent.
        float jagNext = jag(x + tangent / lineScale, tLine);
        float dispNext = fit(lineAmp * mix(jagNext, 1.0, lean), roomNext);
        float slope = dispNext - disp;
        float slopeGrad = sqrt(1.0 + slope * slope);
        // Screen derivatives jump where q flips sides across the medial axis.
        // Take the smaller estimate so the jump does not draw a false line.
        float screenGrad = length(vec2(dFdx(g), dFdy(g)));
        float dist = abs(g) / max(min(screenGrad, slopeGrad), 1e-3);
        float halfWidth = width * 0.5;
        light += weight * (1.0 - smoothstep(halfWidth - 0.75, halfWidth + 0.75, dist));
    }
    outColor = vec4(vec3(light), 1.0);
}
`;

// Light = crisp core + blurred glow, burnt to white where it is bright.
// Output is premultiplied; the light adds on top of the source.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D core;
uniform sampler2D glowTex;
uniform vec2 glowTexel;
uniform vec3 color;
uniform float coreGain;
uniform float glowGain;
uniform int source;
uniform float edgeFade;
uniform float whiteMix;

float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
    // 5x5 binomial gaussian from 9 bilinear taps, as in bloom.ts.
    vec2 t = glowTexel;
    float glow = 0.0;
    glow += texture(glowTex, uv + vec2(-t.x, -t.y)).r * 25.0;
    glow += texture(glowTex, uv + vec2( 0.0, -t.y)).r * 30.0;
    glow += texture(glowTex, uv + vec2( t.x, -t.y)).r * 25.0;
    glow += texture(glowTex, uv + vec2(-t.x,  0.0)).r * 30.0;
    glow += texture(glowTex, uv                  ).r * 36.0;
    glow += texture(glowTex, uv + vec2( t.x,  0.0)).r * 30.0;
    glow += texture(glowTex, uv + vec2(-t.x,  t.y)).r * 25.0;
    glow += texture(glowTex, uv + vec2( 0.0,  t.y)).r * 30.0;
    glow += texture(glowTex, uv + vec2( t.x,  t.y)).r * 25.0;
    glow *= 1.0 / 256.0;

    // Fade the glow out towards the buffer edge.
    vec2 edgeDist = min(uv, 1.0 - uv) * vec2(textureSize(core, 0));
    if (edgeFade > 0.0) {
        glow *= smoothstep(0.0, edgeFade, min(edgeDist.x, edgeDist.y));
    }

    float light = texture(core, uv).r * coreGain + max(glow, 0.0) * glowGain;
    vec3 rgb = 1.0 - exp(-light * mix(color, vec3(1.0), whiteMix));
    // Cut the last 8-bit step of the tail, so it ends along the glow, not at the pad edge.
    rgb = max(rgb - 1.0 / 255.0, 0.0) * (255.0 / 254.0);

    // TPDF dither, faded out where there is no light.
    vec2 p = gl_FragCoord.xy;
    vec3 noise = vec3(ign(p), ign(p + 17.0), ign(p + 41.0))
        + vec3(ign(p + 113.0), ign(p + 131.0), ign(p + 149.0)) - 1.0;
    float lightAlpha = max(max(rgb.r, rgb.g), rgb.b);
    rgb = max(rgb + noise / 255.0 * clamp(lightAlpha * 64.0, 0.0, 1.0), 0.0);

    vec4 base = vec4(0.0);
    if (source == 1) {
        vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
        base = texture(src, clamp(uvSrc, 0.0, 1.0)) * inside.x * inside.y;
    }
    float a = clamp(max(base.a, lightAlpha), 0.0, 1.0);
    outColor = vec4(base.rgb + rgb, a);
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

// Largest room for the line that the field build measures, in CSS px.
const MAX_ROOM = 96;

// Light gain of the core line and the glow, before `intensity`.
const CORE_GAIN = 10;
const GLOW_GAIN = 2;
// Share of white in the light tint; higher burns the core whiter.
const WHITE_MIX = 0.15;

const DEFAULT_PARAMS: SaberParams = {
    color: "#3399ff",
    intensity: 1,
    thickness: 2,
    amplitude: 24,
    scale: 60,
    sharpness: 0.8,
    burst: 0.6,
    speed: 1,
    flicker: 0.3,
    lines: 3,
    glow: 1,
    glowFalloff: 0.6,
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
    #room: EffectRenderTarget | null = null;
    #pyramid: BloomPyramid | null = null;
    #pyramidLevels = 0;
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
        this.#room = ctx.createRenderTarget({ float: true });
        this.#dirty = true;
    }

    render(ctx: EffectContext): void {
        const field = this.#field;
        const core = this.#core;
        const room = this.#room;
        if (!field || !core || !room) {
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
        const {
            amplitude,
            scale,
            sharpness,
            speed,
            thickness,
            burst,
            flicker,
            lines,
        } = this.params;
        ctx.draw({
            frag: FRAG_CORE,
            uniforms: {
                field,
                roomTex: room,
                amplitude: amplitude * pixelRatio,
                scale: Math.max(scale, 1e-3) * pixelRatio,
                thickness: thickness * pixelRatio,
                sharpness,
                burst,
                flicker,
                lines: Math.round(Math.min(Math.max(lines, 1), 4)),
                time: ctx.time * speed,
            },
            target: core,
        });
        const glowTex = this.#renderGlow(ctx, core);
        const { color, intensity, glow, source } = this.params;
        const [r, g, b] = parseHexColor(color);
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                src: ctx.src,
                core,
                glowTex,
                glowTexel: [1.2 / glowTex.width, 1.2 / glowTex.height],
                color: [r, g, b],
                coreGain: CORE_GAIN * intensity,
                glowGain: GLOW_GAIN * glow * intensity,
                source: source ? 1 : 0,
                whiteMix: WHITE_MIX,
                edgeFade:
                    this.params.pad === "fullscreen"
                        ? 0
                        : this.params.pad * ctx.dims.pixelRatio * 0.5,
            },
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
        this.#room = null;
        if (this.#pyramid) {
            disposeBloomPyramid(this.#pyramid);
        }
        this.#pyramid = null;
        this.#dirty = true;
        this.#builtW = 0;
        this.#builtH = 0;
        this.#builtEdge = null;
        this.#builtThreshold = Number.NaN;
    }

    // Blur the core with a bloom pyramid.
    // Returns the result at half the buffer size.
    #renderGlow(
        ctx: EffectContext,
        core: EffectRenderTarget,
    ): EffectRenderTarget {
        const baseW = core.width;
        const baseH = core.height;
        const pixelRatio = ctx.dims.pixelRatio;
        // Levels are counted in CSS px, so the glow looks the same at any pixel ratio.
        // Level i blurs over about 2^(i+1) buffer px; `shift` turns that into CSS px.
        // Keep the widest blur inside the pad, so the glow does not hit its edge.
        const shift = Math.log2(Math.max(pixelRatio, 1e-3));
        const { pad } = this.params;
        const cssLevels =
            pad === "fullscreen"
                ? 8
                : Math.max(1, Math.round(Math.log2(Math.max(pad, 4))) - 2);
        const levels = Math.min(10, Math.max(1, cssLevels + Math.ceil(shift)));
        let pyramid = this.#pyramid;
        if (
            !pyramid ||
            this.#pyramidLevels !== levels ||
            pyramid.down[0].width !== Math.max(1, Math.floor(baseW / 2)) ||
            pyramid.down[0].height !== Math.max(1, Math.floor(baseH / 2))
        ) {
            if (pyramid) {
                disposeBloomPyramid(pyramid);
            }
            pyramid = createBloomPyramid(ctx, baseW, baseH, levels);
            this.#pyramid = pyramid;
            this.#pyramidLevels = levels;
        }
        const down = pyramid.down;
        let prev = core;
        for (let i = 0; i < down.length; i++) {
            ctx.draw({
                frag: FRAG_BLOOM_DOWNSAMPLE,
                uniforms: {
                    src: prev,
                    texelSize: [1 / prev.width, 1 / prev.height],
                    karis: i === 0 ? 1 : 0,
                },
                target: down[i],
            });
            prev = down[i];
        }

        // CSS level c = i - shift has weight glowFalloff^c; the weights sum to 1.
        // Levels finer than 2 CSS px fade out.
        // Each level also gets 2^(c+1), so a thin line keeps its brightness as it blurs.
        const falloff = Math.min(Math.max(this.params.glowFalloff, 0), 1);
        const n = down.length;
        let total = 0;
        for (let c = 0; c < cssLevels; c++) {
            total += falloff ** c;
        }
        const weightFor = (i: number) => {
            const c = i - shift;
            const weight = c >= 0 ? falloff ** c : Math.max(0, 1 + c);
            return (weight / total) * 2 ** (c + 1);
        };
        return upsampleBloomPyramid(ctx, pyramid, (i) => {
            const levelScale = 2 ** (i + 2);
            return {
                texelSize: [
                    (0.5 * levelScale) / baseW,
                    (0.5 * levelScale) / baseH,
                ],
                weightLarge: weightFor(i),
                weightSmall: i === n - 2 ? weightFor(n - 1) : 1,
            };
        });
    }

    #buildField(ctx: EffectContext): void {
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        const field = this.#field;
        const room = this.#room;
        if (!seedA || !seedB || !field || !room) {
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

        ctx.draw({
            frag: FRAG_ROOM,
            uniforms: { field, maxRoom: MAX_ROOM * ctx.dims.pixelRatio },
            target: seedA,
        });
        ctx.draw({
            frag: FRAG_ROOM_BLUR,
            uniforms: { src: seedA, dir: [1, 0] },
            target: seedB,
        });
        ctx.draw({
            frag: FRAG_ROOM_BLUR,
            uniforms: { src: seedB, dir: [0, 1] },
            target: room,
        });

        this.#dirty = false;
        this.#builtW = field.width;
        this.#builtH = field.height;
        this.#builtEdge = edge;
        this.#builtThreshold = edgeThreshold;
    }
}
