// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// Saber: an "electric energy" effect inspired by Video Copilot's After
// Effects Saber plug-in (https://www.videocopilot.net/tutorials/saber_plug-in).
//
// Pipeline:
//   1. Build a signed-distance-ish field from the element's silhouette with
//      the Jump Flooding Algorithm (JFA). This is the expensive part, so it
//      runs ONCE — on the first frame and whenever the buffer is resized —
//      and the resulting distance texture is cached (see `#buildField`).
//   2. Every frame, warp the lookup into that distance field with animated
//      3D simplex noise (z = time) so the glowing outline wobbles and
//      crackles like electricity.
//   3. Turn distance into light with the classic `color = k / distance`
//      falloff, giving a bright core that bleeds into a soft glow.
import type {
    Effect,
    EffectContext,
    EffectRenderTarget,
    EffectUniforms,
} from "@vfx-js/core";
import { SNOISE3D } from "./_noise";

/** Max number of overlaid lines (caps the per-frame render loop). */
const MAX_LINES = 5;

// (1a) Seed pass. Detect the silhouette edge from the element's grayscale
// luminance and write each edge texel's own buffer-uv as a JFA seed.
// Non-edge texels get an invalid seed (b = 0) sitting far away so they
// contribute no distance.
const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcTexel;
uniform float edgeThreshold;

// Grayscale luminance at a src-uv, gated to the valid [0,1] src region.
float mask(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    vec4 c = texture(src, clamp(p, 0.0, 1.0));
    return dot(c.rgb, vec3(0.299, 0.587, 0.114)) * inside.x * inside.y;
}

void main() {
    float c = step(edgeThreshold, mask(uvSrc));
    float l = step(edgeThreshold, mask(uvSrc - vec2(srcTexel.x, 0.0)));
    float r = step(edgeThreshold, mask(uvSrc + vec2(srcTexel.x, 0.0)));
    float d = step(edgeThreshold, mask(uvSrc - vec2(0.0, srcTexel.y)));
    float u = step(edgeThreshold, mask(uvSrc + vec2(0.0, srcTexel.y)));

    // Boundary texel: differs from at least one 4-neighbour.
    bool edge = c != l || c != r || c != d || c != u;

    outColor = edge ? vec4(uv, 1.0, 1.0) : vec4(-10.0, -10.0, 0.0, 0.0);
}
`;

// (1b) One JFA step. Look at the 8 neighbours (plus self) at the current
// step distance and keep whichever carries the nearest valid seed.
const FRAG_JFA = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D seed;
uniform vec2 res;
uniform float stepSize;

void main() {
    vec2 texel = 1.0 / res;
    vec2 here = uv * res;

    vec4 best = vec4(-10.0, -10.0, 0.0, 0.0);
    float bestD = 1e20;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(float(x), float(y)) * stepSize * texel;
            vec4 s = texture(seed, uv + o);
            if (s.b > 0.5) {
                float dd = distance(s.rg * res, here);
                if (dd < bestD) {
                    bestD = dd;
                    best = s;
                }
            }
        }
    }

    outColor = best;
}
`;

// (1c) Resolve pass. Convert "nearest seed coord" into an aspect-correct
// distance, normalised so 1.0 ≈ one buffer-height away.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D seed;
uniform vec2 res;

void main() {
    vec4 s = texture(seed, uv);
    float dist = 1.0;
    if (s.b > 0.5) {
        vec2 d = (uv - s.rg) * vec2(res.x / res.y, 1.0);
        dist = length(d);
    }
    outColor = vec4(dist, 0.0, 0.0, 1.0);
}
`;

// Shared warp code for both render modes. Declares the warp uniforms plus
// `warpedDist(freq, seed, t)`, which samples the cached distance field at a
// noise-displaced lookup. Each shader below declares `in vec2 uv;` before
// including this, so the warp reads the current fragment's uv.
const SABER_WARP = `
uniform sampler2D distField;
uniform vec2 res;
uniform float time;
uniform vec3 color;
uniform float intensity;
uniform float amplitude;
uniform float frequency;
uniform float speed;
uniform float core;
uniform float thickness;
uniform int lineCount;
uniform float noiseScaleStep;
uniform float sharpness;
uniform float jitterSpeed;
uniform float jitterPower;

// Each overlaid line contributes this much less than the previous one.
const float WEIGHT_FALLOFF = 0.6;

${SNOISE3D}

// Signed-power sharpening of the displacement noise. sharpness = 1 is a
// no-op; higher values suppress small wiggles while keeping the big jolts
// at full amplitude, for a spikier / zappier warp. The exponent is held
// >= 1 so the noise is never amplified into blocky saturation.
float shapeNoise(vec3 p) {
    float n = snoise(p);
    return sign(n) * pow(abs(n), max(sharpness, 1.0));
}

// Distance-field value at a noise-warped lookup for one line. freq scales
// the noise, seed decorrelates lines.
float warpedDist(float t, float freq, float seed) {
    // Sample noise in an aspect-corrected (square) space so cells stay
    // round on non-square buffers instead of stretching horizontally.
    vec2 ar = vec2(res.x / res.y, 1.0);
    vec2 sp = uv * ar;

    // Temporal amplitude jitter: modulate the warp strength with a slow
    // noise so the arcs intermittently crackle (electric flicker). Each
    // line (seed) jitters on its own clock. jitterPower = 0 disables it.
    float jn = smoothstep(
        -0.5, 0.5, snoise(vec3(seed * 3.1, 0.0, time * jitterSpeed)));
    float amp = amplitude * (jitterPower > 0.0 ? pow(jn, jitterPower) : 1.0);

    // Two octaves of shaped 3D noise; z animated by time so the arcs flow.
    vec2 warp = vec2(
        shapeNoise(vec3(sp * freq + seed, t)),
        shapeNoise(vec3(sp * freq + seed + 19.7, t))
    ) * amp;
    warp += vec2(
        shapeNoise(vec3(sp * freq * 2.3 + seed - 5.0, t * 1.7)),
        shapeNoise(vec3(sp * freq * 2.3 + seed + 5.0, t * 1.7))
    ) * amp * 0.5;

    // Displacement is in square space; map x back to uv so the physical
    // wiggle is isotropic too.
    warp.x /= ar.x;

    return texture(distField, uv + warp).r;
}
`;

// SDF mode: light each warped line with the classic `k / distance` falloff,
// which produces both the bright core and the surrounding glow in one pass.
const FRAG_RENDER = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform float softness;
${SABER_WARP}

float hash(vec2 p) {
  return fract(sin(dot(p + time, vec2(428., 193.))) * 48020.) * 2. - 1.;
}

void main() {
    float t = time * speed;
    float eps = 0.5 / res.y;

    float glow = 0.0;
    float freq = frequency;
    float weight = 1.0;
    for (int i = 0; i < ${MAX_LINES}; i++) {
        if (i >= lineCount) {
            break;
        }
        float dist = warpedDist(t, freq, float(i) * 31.7);
        float g = (0.0015 * intensity) / max(dist / thickness, eps);
        glow += pow(g, 1. / (1. + softness)) * weight;

        freq *= noiseScaleStep;
        weight *= WEIGHT_FALLOFF;
    }

    // White-hot core where the glow saturates (uses the raw HDR glow).
    float coreV = smoothstep(0.9, 1.0, glow * core);

    // Soft-saturate the glow so high intensity clips smoothly instead of
    // exposing the distance field's medial-axis creases as dark seams.
    // The quadratic term pulls the shoulder in so mid glow saturates
    // sooner, while the faint low end keeps its near-linear response.
    // glow = 1.0 - exp(-glow - glow * glow);

    // Sub glow
    float dist2 = 0.;
    float s = 0.1;
    for (int i = 0; i < 8; i++) {
      float fi = float(i) * 10.;
      dist2 += texture(distField, uv + vec2(hash(uv + fi), hash(uv + fi + 1.)) * s).r;
      s *= 0.9;
    }
    dist2 /= 8.0;

    float g2 = 0.01 / max(dist2 / thickness, eps);
    float glow2 = pow(g2, 1. / (1. + softness));

    glow = mix(glow, glow2, softness * 0.5);

    vec3 col = color * glow + coreV;

    // Premultiplied output for the runtime's (ONE, 1-SRC_ALPHA) blend.
    float a = clamp(glow + coreV, 0.0, 1.0);
    outColor = vec4(col, a);
}
`;

// Bloom mode, pass 1: draw ONLY the warped edge as a thin bright line into
// an HDR buffer. The surrounding glow is added later by blooming this line,
// so here we want a crisp band around distance 0, not a falloff.
const FRAG_LINE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
${SABER_WARP}

void main() {
    float t = time * speed;
    // Line half-width in normalised distance-field units; thickness widens it.
    float halfW = 0.004 * thickness;

    float line = 0.0;
    float freq = frequency;
    float weight = 1.0;
    for (int i = 0; i < ${MAX_LINES}; i++) {
        if (i >= lineCount) {
            break;
        }
        float dist = warpedDist(t, freq, float(i) * 31.7);
        line += (1.0 - smoothstep(0.0, halfW, dist)) * weight;
        freq *= noiseScaleStep;
        weight *= WEIGHT_FALLOFF;
    }

    // Bright HDR line so the bloom pyramid reads it as a light source.
    float b = line * intensity;
    float coreV = smoothstep(0.7, 1.0, line * core);
    vec3 col = color * b + coreV;
    // Straight (non-premultiplied) color; alpha carries coverage so the
    // pyramid blurs the color and its footprint together.
    float a = clamp(b + coreV, 0.0, 1.0);
    outColor = vec4(col, a);
}
`;

// Bloom mode, pass 2: 13-tap Karis downsample (Jimenez 2014). karis=1 on the
// first step suppresses fireflies from the thin bright line.
const FRAG_DOWNSAMPLE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 texelSize;
uniform int karis;

vec4 s(vec2 o) { return texture(src, uv + o); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 t = texelSize;
    vec4 a = s(vec2(-2.0 * t.x, -2.0 * t.y));
    vec4 b = s(vec2( 0.0,       -2.0 * t.y));
    vec4 c = s(vec2( 2.0 * t.x, -2.0 * t.y));
    vec4 d = s(vec2(-2.0 * t.x,  0.0));
    vec4 e = s(vec2( 0.0,        0.0));
    vec4 f = s(vec2( 2.0 * t.x,  0.0));
    vec4 g = s(vec2(-2.0 * t.x,  2.0 * t.y));
    vec4 h = s(vec2( 0.0,        2.0 * t.y));
    vec4 i = s(vec2( 2.0 * t.x,  2.0 * t.y));
    vec4 j = s(vec2(-1.0 * t.x, -1.0 * t.y));
    vec4 k = s(vec2( 1.0 * t.x, -1.0 * t.y));
    vec4 l = s(vec2(-1.0 * t.x,  1.0 * t.y));
    vec4 m = s(vec2( 1.0 * t.x,  1.0 * t.y));

    vec4 box1 = (a + b + d + e) * 0.25;
    vec4 box2 = (b + c + e + f) * 0.25;
    vec4 box3 = (d + e + g + h) * 0.25;
    vec4 box4 = (e + f + h + i) * 0.25;
    vec4 box5 = (j + k + l + m) * 0.25;

    vec4 color;
    if (karis == 1) {
        float w1 = 1.0 / (1.0 + luma(box1.rgb));
        float w2 = 1.0 / (1.0 + luma(box2.rgb));
        float w3 = 1.0 / (1.0 + luma(box3.rgb));
        float w4 = 1.0 / (1.0 + luma(box4.rgb));
        float w5 = 1.0 / (1.0 + luma(box5.rgb));
        color = (box1 * w1 + box2 * w2 + box3 * w3 + box4 * w4 + box5 * w5)
              / (w1 + w2 + w3 + w4 + w5);
    } else {
        color = box1 * 0.125 + box2 * 0.125 + box3 * 0.125 + box4 * 0.125
              + box5 * 0.5;
    }
    outColor = color;
}
`;

// Bloom mode, pass 3: 3x3 tent upsample, additive pyramid. Each level adds
// `mipsDown[i] * weightLarge + tent(deeper) * weightSmall`.
const FRAG_UPSAMPLE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;
uniform float weightLarge;
uniform float weightSmall;

void main() {
    vec2 t = texelSize;
    vec4 sum = vec4(0.0);
    sum += texture(srcSmall, uv + vec2(-t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0, -t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv                  ) * 4.0;
    sum += texture(srcSmall, uv + vec2( t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0,  t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x,  t.y)) * 1.0;
    sum *= (1.0 / 16.0);
    outColor = texture(srcLarge, uv) * weightLarge + sum * weightSmall;
}
`;

// Bloom mode, pass 4: 5x5 gaussian upsample of the half-res bloom, added to
// the sharp line. Premultiplied output for the runtime's blend.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D lineTex;
uniform sampler2D bloomTex;
uniform vec2 texelSize;
uniform float bloomIntensity;

void main() {
    vec2 t = texelSize * 1.2;
    vec4 b = vec4(0.0);
    b += texture(bloomTex, uv + vec2(-t.x, -t.y)) * 25.0;
    b += texture(bloomTex, uv + vec2( 0.0, -t.y)) * 30.0;
    b += texture(bloomTex, uv + vec2( t.x, -t.y)) * 25.0;
    b += texture(bloomTex, uv + vec2(-t.x,  0.0)) * 30.0;
    b += texture(bloomTex, uv                  ) * 36.0;
    b += texture(bloomTex, uv + vec2( t.x,  0.0)) * 30.0;
    b += texture(bloomTex, uv + vec2(-t.x,  t.y)) * 25.0;
    b += texture(bloomTex, uv + vec2( 0.0,  t.y)) * 30.0;
    b += texture(bloomTex, uv + vec2( t.x,  t.y)) * 25.0;
    b *= (1.0 / 256.0);

    vec4 ln = texture(lineTex, uv);
    vec3 rgb = ln.rgb + max(b.rgb, vec3(0.0)) * bloomIntensity;
    float a = clamp(max(ln.a, b.a * bloomIntensity), 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`;

// Tent offset in mip-texel units — the classic HDRP reconstruction kernel.
const TENT_FILTER = 0.5;

export type SaberParams = {
    /** Glow color (linear RGB, 0..1). Default electric blue. */
    color: [number, number, number];
    /** Overall glow strength. `1` is a gentle, usable glow. */
    intensity: number;
    /** Noise warp amount, in buffer-uv units. */
    amplitude: number;
    /** Spatial frequency of the warp noise (base, for the first line). */
    frequency: number;
    /** Flow speed of the electric arcs (animates the noise z axis). */
    speed: number;
    /**
     * Glow falloff exponent. The raw `k / distance` glow is raised to this
     * power: lower → softer, wider bleed; 1 → sharp reciprocal falloff.
     */
    softness: number;
    /** White-hot core amount — how readily the glow saturates to white. */
    core: number;
    /**
     * Grayscale luminance cutoff (0..1) for edge detection: the silhouette
     * is the iso-line where the source's brightness crosses this value.
     * Mostly visible on sources with midtones (photos / video); a flat
     * black-and-white logo has no midtones so the outline barely moves.
     * Changing it rebuilds the distance field.
     */
    edgeThreshold: number;
    /** Line width — widens the glow by shrinking the effective distance. */
    thickness: number;
    /** How many lines to overlay (1..5). */
    lineCount: number;
    /**
     * Noise-scale growth per line: each successive line's warp frequency is
     * this many times the previous one's, adding finer crackle on top.
     */
    noiseScaleStep: number;
    /**
     * Sharpens the displacement noise (>= 1; 1 = no-op). Higher values
     * suppress small wiggles and keep only the big jolts, for a spikier,
     * zappier warp.
     */
    sharpness: number;
    /** Speed of the temporal amplitude jitter (electric crackle). */
    jitterSpeed: number;
    /**
     * Strength of the temporal amplitude jitter: 0 = off (steady warp),
     * higher makes the warp burst intermittently (more crackle, lower
     * average displacement).
     */
    jitterPower: number;
    /**
     * How the glow is produced.
     * - `"sdf"`: light the distance field with a `k / distance` falloff
     *   (line and glow in one pass).
     * - `"bloom"`: draw only a thin edge line, then bloom it into the glow.
     */
    mode: "sdf" | "bloom";
    /**
     * Bloom-mode halo spread, 0..1. Higher reaches more pyramid levels for a
     * wider glow. Ignored in `"sdf"` mode.
     */
    bloomScatter: number;
    /**
     * Bloom-mode halo gain. Higher makes the glow around the line brighter.
     * Ignored in `"sdf"` mode.
     */
    bloomIntensity: number;
    /**
     * Rebuild the distance field every frame instead of caching it. Needed
     * for live sources (video / webcam) whose silhouette changes; leave
     * `false` for static images and text to avoid the per-frame JFA cost.
     */
    dynamic: boolean;
    /**
     * Extra pad around the element in CSS (logical) px so the glow has room
     * to spread. `"fullscreen"` reaches the viewport edges.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: SaberParams = {
    color: [0.35, 0.65, 1.0],
    intensity: 1.0,
    amplitude: 0.02,
    frequency: 4.0,
    speed: 1.0,
    softness: 0.5,
    core: 0.5,
    edgeThreshold: 0.5,
    thickness: 1.0,
    lineCount: 3,
    noiseScaleStep: 1.8,
    sharpness: 1.0,
    jitterSpeed: 1.0,
    jitterPower: 0.0,
    mode: "sdf",
    bloomScatter: 0.7,
    bloomIntensity: 3.0,
    dynamic: false,
    pad: 80,
};

/**
 * Electric "Saber" energy around an element's silhouette.
 *
 * The distance field is built with the Jump Flooding Algorithm and cached;
 * it is rebuilt only when the buffer resizes. Call {@link invalidate} to
 * force a rebuild (e.g. after the source content changes).
 *
 * Mutate `params` directly or via {@link setParams} — the render uniforms
 * read live each frame, so a reactive UI can bind straight to `params`.
 */
export class SaberEffect implements Effect {
    params: SaberParams;

    #seedA: EffectRenderTarget | null = null;
    #seedB: EffectRenderTarget | null = null;
    #field: EffectRenderTarget | null = null;
    #dirty = true;
    #lastW = 0;
    #lastH = 0;
    #lastEdgeThreshold = Number.NaN;

    // Bloom-mode buffers: the thin edge line plus its downsample/upsample
    // pyramid. Allocated lazily on first bloom-mode frame.
    #lineBuf: EffectRenderTarget | null = null;
    #mipsDown: EffectRenderTarget[] = [];
    #mipsUp: EffectRenderTarget[] = [];
    #mipsAllocated = false;
    #lastLineW = 0;
    #lastLineH = 0;

    constructor(initial: Partial<SaberParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<SaberParams>): void {
        Object.assign(this.params, updates);
    }

    /** Force the distance field to be rebuilt on the next frame. */
    invalidate(): void {
        this.#dirty = true;
    }

    init(ctx: EffectContext): void {
        // Seed / JFA ping-pong buffers store raw coordinates, so they must
        // not be filtered. The resolved field is sampled with the noise
        // warp, so it wants linear filtering. All auto-resize to the
        // padded output rect.
        const seedOpts = {
            float: true,
            filter: "nearest" as const,
            wrap: "clamp" as const,
        };
        this.#seedA = ctx.createRenderTarget(seedOpts);
        this.#seedB = ctx.createRenderTarget(seedOpts);
        this.#field = ctx.createRenderTarget({
            float: true,
            filter: "linear",
            wrap: "clamp",
        });
        // HDR line buffer for bloom mode; blurred by the pyramid.
        this.#lineBuf = ctx.createRenderTarget({
            float: true,
            filter: "linear",
            wrap: "clamp",
        });
    }

    render(ctx: EffectContext): void {
        if (!this.#field || !this.#seedA || !this.#seedB) {
            return;
        }

        const w = this.#field.width;
        const h = this.#field.height;

        // Live sources rebuild the field every frame.
        if (this.params.dynamic) {
            this.#dirty = true;
        }

        // A resize, or a changed edge threshold, wipes the cached field.
        if (w !== this.#lastW || h !== this.#lastH) {
            this.#dirty = true;
            this.#lastW = w;
            this.#lastH = h;
        }
        if (this.params.edgeThreshold !== this.#lastEdgeThreshold) {
            this.#dirty = true;
            this.#lastEdgeThreshold = this.params.edgeThreshold;
        }
        if (this.#dirty) {
            this.#buildField(ctx, w, h);
            this.#dirty = false;
        }

        const {
            color,
            intensity,
            amplitude,
            frequency,
            speed,
            softness,
            core,
            thickness,
            noiseScaleStep,
            sharpness,
            jitterSpeed,
            jitterPower,
            mode,
        } = this.params;
        const lineCount = Math.max(
            1,
            Math.min(MAX_LINES, this.params.lineCount),
        );

        // Uniforms shared by both the SDF shader and the bloom line shader.
        const warpUniforms = {
            distField: this.#field,
            res: [w, h] as [number, number],
            time: ctx.time,
            color,
            intensity,
            amplitude,
            frequency,
            speed,
            core,
            thickness,
            lineCount,
            noiseScaleStep,
            sharpness,
            jitterSpeed,
            jitterPower,
        };

        if (mode === "bloom") {
            this.#renderBloom(ctx, w, h, warpUniforms);
            return;
        }

        ctx.draw({
            frag: FRAG_RENDER,
            uniforms: { ...warpUniforms, softness },
            target: ctx.target,
        });
    }

    // Bloom mode: draw the thin edge line, run a downsample/upsample pyramid,
    // then composite the sharp line with its blurred bloom.
    #renderBloom(
        ctx: EffectContext,
        w: number,
        h: number,
        warpUniforms: EffectUniforms,
    ): void {
        const line = this.#lineBuf;
        if (!line) {
            return;
        }

        ctx.draw({ frag: FRAG_LINE, uniforms: warpUniforms, target: line });

        // Rebuild the pyramid whenever the line buffer resizes.
        if (line.width !== this.#lastLineW || line.height !== this.#lastLineH) {
            this.#mipsDown.length = 0;
            this.#mipsUp.length = 0;
            this.#mipsAllocated = false;
            this.#lastLineW = line.width;
            this.#lastLineH = line.height;
        }
        this.#allocateMips(ctx, line.width, line.height);
        const n = this.#mipsDown.length;
        if (n === 0) {
            // No room for a pyramid — show the bare line.
            ctx.draw({
                frag: FRAG_COMPOSITE,
                uniforms: {
                    lineTex: line,
                    bloomTex: line,
                    texelSize: [1 / line.width, 1 / line.height],
                    bloomIntensity: 0,
                },
                target: ctx.target,
            });
            return;
        }

        // Downsample: line → mipsDown[0] (Karis) → ... → mipsDown[n-1].
        ctx.draw({
            frag: FRAG_DOWNSAMPLE,
            uniforms: {
                src: line,
                texelSize: [1 / line.width, 1 / line.height],
                karis: 1,
            },
            target: this.#mipsDown[0],
        });
        for (let i = 1; i < n; i++) {
            const prev = this.#mipsDown[i - 1];
            ctx.draw({
                frag: FRAG_DOWNSAMPLE,
                uniforms: {
                    src: prev,
                    texelSize: [1 / prev.width, 1 / prev.height],
                    karis: 0,
                },
                target: this.#mipsDown[i],
            });
        }

        // Additive upsample. weight[i] = clamp(activeDepth − i, 0, 1);
        // activeDepth is linear in scatter so the halo grows evenly.
        const scatter = Math.min(Math.max(this.params.bloomScatter, 0), 1);
        const activeDepth = 1 + scatter * Math.max(0, n - 1);
        const weightFor = (i: number) =>
            Math.min(1, Math.max(0, activeDepth - i));
        for (let i = n - 2; i >= 0; i--) {
            const small =
                i === n - 2 ? this.#mipsDown[n - 1] : this.#mipsUp[i + 1];
            const levelScale = 2 ** (i + 2);
            const wSmall = i === n - 2 ? weightFor(n - 1) : 1.0;
            ctx.draw({
                frag: FRAG_UPSAMPLE,
                uniforms: {
                    srcSmall: small,
                    srcLarge: this.#mipsDown[i],
                    texelSize: [
                        (TENT_FILTER * levelScale) / w,
                        (TENT_FILTER * levelScale) / h,
                    ],
                    weightLarge: weightFor(i),
                    weightSmall: wSmall,
                },
                target: this.#mipsUp[i],
            });
        }

        const bloomTex = n >= 2 ? this.#mipsUp[0] : this.#mipsDown[0];
        // No depth normalisation here (unlike BloomEffect): the thin edge
        // line carries little energy, so dividing by the active-level count
        // made the halo vanish at high scatter. Let brightness grow with
        // spread and expose a direct gain knob instead.
        const bloomIntensity = this.params.bloomIntensity;
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                lineTex: line,
                bloomTex,
                texelSize: [(TENT_FILTER * 2) / w, (TENT_FILTER * 2) / h],
                bloomIntensity,
            },
            target: ctx.target,
        });
    }

    #allocateMips(ctx: EffectContext, baseW: number, baseH: number): void {
        if (this.#mipsAllocated) {
            return;
        }
        // Halve until both axes hit 1 px, capped at 8 levels.
        let w = Math.max(1, Math.floor(baseW / 2));
        let h = Math.max(1, Math.floor(baseH / 2));
        for (let i = 0; i < 8; i++) {
            this.#mipsDown.push(
                ctx.createRenderTarget({ size: [w, h], float: true }),
            );
            const nw = Math.max(1, Math.floor(w / 2));
            const nh = Math.max(1, Math.floor(h / 2));
            if (nw === w && nh === h) {
                break;
            }
            w = nw;
            h = nh;
        }
        for (let i = 0; i < this.#mipsDown.length - 1; i++) {
            this.#mipsUp.push(
                ctx.createRenderTarget({
                    size: [this.#mipsDown[i].width, this.#mipsDown[i].height],
                    float: true,
                }),
            );
        }
        this.#mipsAllocated = true;
    }

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        const { pad } = this.params;
        if (pad === "fullscreen") {
            return dims.canvasRect;
        }
        const px = pad * dims.pixelRatio;
        const [, , ew, eh] = dims.contentRect;
        return [-px, -px, ew + 2 * px, eh + 2 * px];
    }

    dispose(): void {
        this.#seedA = null;
        this.#seedB = null;
        this.#field = null;
        this.#lineBuf = null;
        this.#mipsDown.length = 0;
        this.#mipsUp.length = 0;
        this.#mipsAllocated = false;
        this.#dirty = true;
        this.#lastW = 0;
        this.#lastH = 0;
        this.#lastLineW = 0;
        this.#lastLineH = 0;
    }

    // (1) Build the distance field once via JFA: seed → log2(N) flood
    // passes → resolve. Ping-pongs between the two seed buffers.
    #buildField(ctx: EffectContext, w: number, h: number): void {
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        const field = this.#field;
        if (!seedA || !seedB || !field) {
            return;
        }
        const res: [number, number] = [w, h];

        ctx.draw({
            frag: FRAG_SEED,
            uniforms: {
                src: ctx.src,
                srcTexel: [1 / ctx.src.width, 1 / ctx.src.height],
                edgeThreshold: this.params.edgeThreshold,
            },
            target: seedA,
        });

        // Step sizes: largest power of two below max dimension, down to 1.
        const maxDim = Math.max(w, h);
        let step = 1;
        while (step * 2 < maxDim) {
            step *= 2;
        }

        let read = seedA;
        let write = seedB;
        for (; step >= 1; step = Math.floor(step / 2)) {
            ctx.draw({
                frag: FRAG_JFA,
                uniforms: { seed: read, res, stepSize: step },
                target: write,
            });
            const tmp = read;
            read = write;
            write = tmp;
        }

        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { seed: read, res },
            target: field,
        });
    }
}
