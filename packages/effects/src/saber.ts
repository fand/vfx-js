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

// Ashima / Stefan Gustavson simplex noise (public domain, webgl-noise).
// Shared by the warp pass; `snoise(vec3)` returns roughly [-1, 1].
const SNOISE = `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(
        vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(
        dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(
        dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// (1a) Seed pass. Detect the silhouette edge from the element's alpha and
// write each edge texel's own buffer-uv as a JFA seed. Non-edge texels get
// an invalid seed (b = 0) sitting far away so they contribute no distance.
const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 srcTexel;

// Element coverage at a src-uv, gated to the valid [0,1] src region.
float mask(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    return texture(src, clamp(p, 0.0, 1.0)).a * inside.x * inside.y;
}

void main() {
    float c = step(0.5, mask(uvSrc));
    float l = step(0.5, mask(uvSrc - vec2(srcTexel.x, 0.0)));
    float r = step(0.5, mask(uvSrc + vec2(srcTexel.x, 0.0)));
    float d = step(0.5, mask(uvSrc - vec2(0.0, srcTexel.y)));
    float u = step(0.5, mask(uvSrc + vec2(0.0, srcTexel.y)));

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

// (2) + (3) Per-frame render. Warp the distance lookup with animated 3D
// noise, then light it up with `0.1 / distance`.
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

${SNOISE}

void main() {
    float t = time * speed;

    // Two octaves of 3D noise; z animated by time so the arcs flow.
    vec2 warp = vec2(
        snoise(vec3(uv * frequency, t)),
        snoise(vec3(uv * frequency + 19.7, t))
    ) * amplitude;
    warp += vec2(
        snoise(vec3(uv * frequency * 2.3 - 5.0, t * 1.7)),
        snoise(vec3(uv * frequency * 2.3 + 5.0, t * 1.7))
    ) * amplitude * 0.5;

    float dist = texture(distField, uv + warp).r;

    // The Saber glow: brightness is the reciprocal of distance to the edge.
    float eps = 0.5 / res.y;
    float glow = (0.1 * intensity) / max(dist, eps);

    // White-hot core where the glow saturates.
    float core = smoothstep(1.0, 3.0, glow);
    vec3 col = color * glow + vec3(1.0) * core;

    // Premultiplied output for the runtime's (ONE, 1-SRC_ALPHA) blend.
    float a = clamp(glow + core, 0.0, 1.0);
    outColor = vec4(col * a, a);
}
`;

export type SaberParams = {
    /** Glow color (linear RGB, 0..1). Default electric blue. */
    color: [number, number, number];
    /** Overall glow strength, scales the `0.1 / distance` numerator. */
    intensity: number;
    /** Noise warp amount, in buffer-uv units. */
    amplitude: number;
    /** Spatial frequency of the warp noise. */
    frequency: number;
    /** Flow speed of the electric arcs (animates the noise z axis). */
    speed: number;
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

        // A resize wipes the cached field — rebuild it.
        if (w !== this.#lastW || h !== this.#lastH) {
            this.#dirty = true;
            this.#lastW = w;
            this.#lastH = h;
        }
        if (this.#dirty) {
            this.#buildField(ctx, w, h);
            this.#dirty = false;
        }

        const { color, intensity, amplitude, frequency, speed } = this.params;
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
