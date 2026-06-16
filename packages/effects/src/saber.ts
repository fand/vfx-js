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

// (2) + (3) Per-frame render. Several glowing lines are overlaid: each
// layer warps the distance lookup with its own animated 3D noise (scale +
// seed) and line width, then lights it up with the `k / distance` falloff.
const FRAG_RENDER = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D distField;
uniform vec2 res;
uniform float time;
uniform vec3 color;
uniform float intensity;
uniform float amplitude;
uniform float frequency;
uniform float speed;
uniform float softness;
uniform float core;
uniform int layerCount;
uniform vec4 layerThickness;
uniform vec4 layerNoiseScale;
uniform vec4 layerWeight;

${SNOISE3D}

// One warped, lit line. freq scales the noise, seed decorrelates layers,
// thickness widens the glow (shrinks the effective distance).
float lineGlow(float t, float freq, float thickness, float seed, float eps) {
    // Two octaves of 3D noise; z animated by time so the arcs flow.
    vec2 warp = vec2(
        snoise(vec3(uv * freq + seed, t)),
        snoise(vec3(uv * freq + seed + 19.7, t))
    ) * amplitude;
    warp += vec2(
        snoise(vec3(uv * freq * 2.3 + seed - 5.0, t * 1.7)),
        snoise(vec3(uv * freq * 2.3 + seed + 5.0, t * 1.7))
    ) * amplitude * 0.5;

    float dist = texture(distField, uv + warp).r;
    float glow = (0.03 * intensity) / max(dist / thickness, eps);
    return pow(glow, softness);
}

void main() {
    float ths[4] = float[4](
        layerThickness.x, layerThickness.y, layerThickness.z, layerThickness.w);
    float nss[4] = float[4](
        layerNoiseScale.x, layerNoiseScale.y,
        layerNoiseScale.z, layerNoiseScale.w);
    float wts[4] = float[4](
        layerWeight.x, layerWeight.y, layerWeight.z, layerWeight.w);

    float t = time * speed;
    float eps = 0.5 / res.y;

    float glow = 0.0;
    for (int i = 0; i < 4; i++) {
        if (i >= layerCount) {
            break;
        }
        glow += lineGlow(
            t, frequency * nss[i], ths[i], float(i) * 31.7, eps) * wts[i];
    }

    // White-hot core where the glow saturates.
    float coreV = smoothstep(0.9, 1.0, glow * core);
    vec3 col = color * glow + coreV;

    // Premultiplied output for the runtime's (ONE, 1-SRC_ALPHA) blend.
    float a = clamp(glow + coreV, 0.0, 1.0);
    outColor = vec4(col, a);
}
`;

/** One overlaid glowing line. */
export type SaberLayer = {
    /** Line width — widens the glow by shrinking the effective distance. */
    thickness: number;
    /** Multiplies the base `frequency` for this layer's noise warp. */
    noiseScale: number;
    /** Contribution weight when the layers are summed. */
    weight: number;
};

export type SaberParams = {
    /** Glow color (linear RGB, 0..1). Default electric blue. */
    color: [number, number, number];
    /** Overall glow strength, scales the `k / distance` numerator. */
    intensity: number;
    /** Noise warp amount, in buffer-uv units. */
    amplitude: number;
    /** Spatial frequency of the warp noise (base; scaled per layer). */
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
     * Changing it rebuilds the distance field.
     */
    edgeThreshold: number;
    /** Overlaid lines, each with its own thickness + noise scale (max 4). */
    layers: SaberLayer[];
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
    layers: [
        { thickness: 1.0, noiseScale: 1.0, weight: 1.0 },
        { thickness: 0.6, noiseScale: 2.2, weight: 0.6 },
        { thickness: 1.8, noiseScale: 0.5, weight: 0.4 },
    ],
    dynamic: false,
    pad: 80,
};

const MAX_LAYERS = 4;

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
        } = this.params;
        const layers = this.params.layers.slice(0, MAX_LAYERS);

        // Pack per-layer params into vec4s (unused slots stay zero).
        const thickness = [0, 0, 0, 0];
        const noiseScale = [0, 0, 0, 0];
        const weight = [0, 0, 0, 0];
        layers.forEach((layer, i) => {
            thickness[i] = layer.thickness;
            noiseScale[i] = layer.noiseScale;
            weight[i] = layer.weight;
        });

        ctx.draw({
            frag: FRAG_RENDER,
            uniforms: {
                distField: this.#field,
                res: [w, h],
                time: ctx.time,
                color,
                intensity,
                amplitude,
                frequency,
                speed,
                softness,
                core,
                layerCount: layers.length,
                layerThickness: thickness,
                layerNoiseScale: noiseScale,
                layerWeight: weight,
            },
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
