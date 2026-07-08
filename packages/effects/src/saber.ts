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
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";
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
// The sharp distance lands in .r; a blurred copy is packed into .g by the
// two blur passes below (1d).
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

// (1d) Separable gaussian blur, run twice (dir = horizontal then vertical).
// Passes the sharp distance through in .r and writes the blurred distance
// to .g: the render pass reads the crisp edge and the crease-free glow
// field from one fetch. The first pass blurs .r, the second re-blurs .g.
const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 res;
uniform vec2 dir;

// Kernel half-width (≈ 3σ) in distance units (1.0 ≈ one buffer height).
const float RADIUS = 0.1;
const int TAPS = 6;

void main() {
    vec4 c = texture(src, uv);
    // Scale x steps by 1/aspect so the blur is isotropic on screen.
    vec2 ar = vec2(res.y / res.x, 1.0);

    float sum = 0.0;
    float wsum = 0.0;
    for (int i = -TAPS; i <= TAPS; i++) {
        float x = float(i) / float(TAPS);
        float w = exp(-x * x * 4.5);
        vec4 s = texture(src, uv + dir * ar * (x * RADIUS));
        sum += (dir.y > 0.5 ? s.g : s.r) * w;
        wsum += w;
    }
    outColor = vec4(c.r, sum / wsum, 0.0, 1.0);
}
`;

// Shared warp code for the render pass. Declares the warp uniforms plus
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

// Render pass: light each warped line with the classic `k / distance` falloff,
// which produces both the bright core and the surrounding glow in one pass.
const FRAG_RENDER = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform float softness;
${SABER_WARP}

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

    // Sub glow from the pre-blurred distance (g channel): a rounded field
    // with no medial-axis creases, mixed in by softness.
    float dist2 = texture(distField, uv).g;
    float g2 = 0.01 / max(dist2 / thickness, eps);
    float glow2 = pow(g2, 1. / (1. + softness));

    glow = mix(glow, glow2, softness * 0.5);

    vec3 col = color * glow + coreV;

    // Premultiplied output for the runtime's (ONE, 1-SRC_ALPHA) blend.
    float a = clamp(glow + coreV, 0.0, 1.0);
    outColor = vec4(col, a);
}
`;

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
        } = this.params;
        const lineCount = Math.max(
            1,
            Math.min(MAX_LINES, this.params.lineCount),
        );

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

        ctx.draw({
            frag: FRAG_RENDER,
            uniforms: { ...warpUniforms, softness },
            target: ctx.target,
        });
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
        this.#dirty = true;
        this.#lastW = 0;
        this.#lastH = 0;
    }

    // (1) Build the distance field once via JFA: seed → log2(N) flood
    // passes → resolve → blur (packs .g). Ping-pongs the two seed buffers.
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

        // Resolve into the free seed buffer, then pack a blurred copy into
        // .g with two separable passes, reusing the other seed buffer.
        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { seed: read, res },
            target: write,
        });
        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: { src: write, res, dir: [1, 0] },
            target: read,
        });
        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: { src: read, res, dir: [0, 1] },
            target: field,
        });
    }
}
