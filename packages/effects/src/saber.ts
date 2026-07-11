// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// Saber: an "electric energy" effect inspired by Video Copilot's After
// Effects Saber plug-in (https://www.videocopilot.net/tutorials/saber_plug-in).
//
// Pipeline:
//   1. Rasterize the element's silhouette into a binary mask, read it back
//      asynchronously (no GPU stall), and trace its boundary loops on the
//      CPU (marching squares). Every boundary point carries a normalized
//      arc-length parameter.
//   2. Splat the points as seeds and flood with the Jump Flooding Algorithm
//      (JFA): each texel learns its distance to the silhouette AND the
//      arc-length position of its nearest boundary point. The path reveal
//      (`progress`) happens here: seeds past the head are dropped, so the
//      flooded field is exact for the partial path — hidden parts simply
//      don't exist. The field is cached; it rebuilds only when the buffer
//      resizes or `progress` changes (see `#buildField`).
//   3. Every frame, warp the lookup into that field with animated 3D
//      simplex noise (z = time) so the glowing outline wobbles and
//      crackles like electricity.
//   4. Turn distance into light with the classic `color = k / distance`
//      falloff. Arc length drives the traveling `pulse`.
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";
import { type Contour, traceContours } from "./_contour";
import { SNOISE3D } from "./_noise";

/** Max number of overlaid lines (caps the per-frame render loop). */
const MAX_LINES = 5;

// (1a) Mask pass. Rasterize the silhouette as a binary mask at buffer
// resolution; the CPU reads it back and traces the boundary loops.
const FRAG_MASK = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform float edgeThreshold;

void main() {
    // Grayscale luminance, gated to the valid [0,1] src region.
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec4 c = texture(src, clamp(uvSrc, 0.0, 1.0));
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114)) * inside.x * inside.y;
    outColor = vec4(step(edgeThreshold, lum), 0.0, 0.0, 1.0);
}
`;

// (1b) Seed splat. Each traced boundary point is drawn as a 1px point
// carrying its buffer-uv, absolute arc length (1 ≈ one buffer height) and
// signed contour length (negative = a non-pulsing contour; magnitude in
// the same units). Texels without a seed stay at the cleared value
// (a = 0 marks "invalid").
const VERT_SEED = `#version 300 es
precision highp float;
in vec4 position; // xy = buffer uv, z = arc length, w = signed contour length
uniform float progress;
out vec2 vUv;
out float vT;
out float vL;
void main() {
    vUv = position.xy;
    vT = position.z;
    vL = position.w;
    // Path reveal: seeds past the head are moved out of clip space, so
    // the flooded field is exact for the partial path.
    vec2 clip = position.z <= progress * abs(position.w)
        ? position.xy * 2.0 - 1.0
        : vec2(-10.0);
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = 1.0;
}
`;

const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 vUv;
in float vT;
in float vL;
out vec4 outColor;
void main() {
    outColor = vec4(vUv, vT, vL);
}
`;

// (1c) One JFA step. Look at the 8 neighbours (plus self) at the current
// step distance and keep whichever carries the nearest valid seed.
// The payload (seed uv + arc-length t) rides along untouched.
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

    vec4 best = vec4(0.0);
    float bestD = 1e20;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(float(x), float(y)) * stepSize * texel;
            vec4 s = texture(seed, uv + o);
            if (s.a != 0.0) {
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

// (1d) Resolve pass. Convert "nearest seed coord" into an aspect-correct
// distance, normalised so 1.0 ≈ one buffer-height away.
// The sharp distance lands in .r, the nearest point's arc length in .b
// and its signed contour length in .a; a blurred distance is packed into
// .g by the two blur passes below.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D seed;
uniform vec2 res;

void main() {
    vec4 s = texture(seed, uv);
    float dist = 1.0;
    float t = 0.0;
    float sl = 0.0;
    if (s.a != 0.0) {
        vec2 d = (uv - s.rg) * vec2(res.x / res.y, 1.0);
        dist = length(d);
        t = s.b;
        sl = s.a;
    }
    outColor = vec4(dist, 0.0, t, sl);
}
`;

// (1e) Separable gaussian blur, run twice (dir = horizontal then vertical).
// Passes the sharp distance (.r), arc length (.b) and signed contour
// length (.a) through and writes the blurred distance to .g: the render
// pass reads the crisp edge and the crease-free glow field from one
// fetch. The first pass blurs .r, the second re-blurs .g.
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
    outColor = vec4(c.r, sum / wsum, c.b, c.a);
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
uniform float pulseIntensity;
uniform float pulseSpeed;
uniform float pulseWidth;

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

// Traveling-pulse modulation along the contour. arc is the absolute
// arc length of the nearest boundary point and sl the signed length of
// its contour (negative = a non-pulsing contour: a hole, or shorter
// than pulseMinLength). Width and speed are in field units (1 ≈ buffer
// height), so the pulse looks the same on short and long contours; one
// pulse travels per loop.
// d is the distance from the path: the pulse widens with d (conserving
// energy) so it diffuses into the glow tails instead of cutting
// cell-shaped highlights where the field jumps at Voronoi cell
// boundaries.
float arcMod(float arc, float sl, float d) {
    if (sl <= 0.0) {
        return 1.0;
    }
    float phase = fract((arc - time * pulseSpeed) / sl + 0.5) - 0.5;
    float pd = abs(phase) * sl;
    float w = pulseWidth * (1.0 + d * 4.0);
    float gain = pulseIntensity * (pulseWidth / w);
    return 1.0 + gain * exp(-pd * pd / (w * w));
}

// Arc modulation at p, averaged over a disc that widens with the
// distance d from the path. The arc field is piecewise constant
// (nearest boundary point), so a single tap cuts hard Voronoi seams
// into the glow tails. The tap pattern is rotated per pixel with
// interleaved gradient noise, dissolving the discrete tap levels into
// grain instead of visible bands. m0 is the already-fetched center tap.
float arcModCone(float m0, vec2 p, float d) {
    float r = max(d, 0.0) * 0.8;
    float base = 6.2831853 * fract(52.9829189 *
        fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec2 ar = vec2(res.y / res.x, 1.0);
    float m = m0;
    for (int i = 0; i < 8; i++) {
        float a = base + float(i) * 0.7853982;
        // Alternate radii so taps cover the disc, not a single ring.
        float rr = r * (i % 2 == 0 ? 1.0 : 0.55);
        vec2 o = vec2(cos(a), sin(a)) * rr * ar;
        vec4 f = texture(distField, p + o);
        m += arcMod(f.b, f.a, d);
    }
    return m / 9.0;
}

// Noise-warped lookup uv for one line. freq scales the noise, seed
// decorrelates lines.
vec2 warpUv(float t, float freq, float seed) {
    // Sample noise in an aspect-corrected (square) space so cells stay
    // round on non-square buffers instead of stretching horizontally.
    vec2 ar = vec2(res.x / res.y, 1.0);
    vec2 sp = uv * ar;

    // Two octaves of shaped 3D noise; z animated by time so the arcs flow.
    vec2 warp = vec2(
        shapeNoise(vec3(sp * freq + seed, t)),
        shapeNoise(vec3(sp * freq + seed + 19.7, t))
    ) * amplitude;
    warp += vec2(
        shapeNoise(vec3(sp * freq * 2.3 + seed - 5.0, t * 1.7)),
        shapeNoise(vec3(sp * freq * 2.3 + seed + 5.0, t * 1.7))
    ) * amplitude * 0.5;

    // Displacement is in square space; map x back to uv so the physical
    // wiggle is isotropic too.
    warp.x /= ar.x;

    return uv + warp;
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
    bool arcActive = pulseIntensity > 0.0;

    float glow = 0.0;
    float freq = frequency;
    float weight = 1.0;
    for (int i = 0; i < ${MAX_LINES}; i++) {
        if (i >= lineCount) {
            break;
        }
        vec2 wuv = warpUv(t, freq, float(i) * 31.7);
        vec4 f = texture(distField, wuv);
        float g = (0.0015 * intensity) / max(f.r / thickness, eps);
        float m = arcActive
            ? arcModCone(arcMod(f.b, f.a, f.r), wuv, f.r)
            : 1.0;
        glow += pow(g, 1. / (1. + softness)) * m * weight;

        freq *= noiseScaleStep;
        weight *= WEIGHT_FALLOFF;
    }

    // White-hot core where the glow saturates (uses the raw HDR glow).
    float coreV = smoothstep(0.9, 1.0, glow * core);

    // Sub glow from the pre-blurred distance (g channel): a rounded field
    // with no medial-axis creases, mixed in by softness.
    vec4 f2 = texture(distField, uv);
    float g2 = 0.01 / max(f2.g / thickness, eps);
    float m2 = arcActive
        ? arcModCone(arcMod(f2.b, f2.a, f2.g), uv, f2.g)
        : 1.0;
    float glow2 = pow(g2, 1. / (1. + softness)) * m2;

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
    /**
     * Path-reveal progress (0..1) along each contour: the outline draws
     * on from its start point up to this fraction of its length. The
     * reveal is applied to the distance field itself (hidden parts don't
     * exist), so a change rebuilds the field — animating it costs a few
     * GPU passes per frame, like `dynamic` mode.
     */
    progress: number;
    /**
     * Brightness of a pulse of light traveling along each contour.
     * `0` disables the pulse. Inner contours (holes) don't pulse.
     */
    pulseIntensity: number;
    /**
     * Pulse travel speed along the path, in buffer-height units per
     * second — independent of each contour's length. One pulse loops
     * per contour.
     */
    pulseSpeed: number;
    /**
     * Pulse width along the path, in buffer-height units (1 ≈ one
     * buffer height) — independent of each contour's length.
     */
    pulseWidth: number;
    /**
     * Contours shorter than this (in buffer-height units) don't pulse.
     * Filters out the flicker of tiny specks on noisy sources.
     * `0` pulses every contour.
     */
    pulseMinLength: number;
    /**
     * Rebuild the distance field continuously instead of caching it.
     * Needed for live sources (video / webcam) whose silhouette changes;
     * leave `false` for static images and text. Rebuilds are pipelined
     * through an async readback, so they don't stall the GPU, but the
     * outline lags the source by a couple of frames and each rebuild
     * costs a CPU contour trace.
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
    progress: 1.0,
    pulseIntensity: 0.0,
    pulseSpeed: 0.5,
    pulseWidth: 0.05,
    pulseMinLength: 0.0,
    dynamic: false,
    pad: 80,
};

/**
 * Electric "Saber" energy around an element's silhouette.
 *
 * The silhouette is contour-traced on the CPU, then flooded into a
 * distance + arc-length field with the Jump Flooding Algorithm and
 * cached; it is rebuilt only when the buffer resizes. Call
 * {@link invalidate} to force a rebuild (e.g. after the source content
 * changes).
 *
 * Mutate `params` directly or via {@link setParams} — the render uniforms
 * read live each frame, so a reactive UI can bind straight to `params`.
 */
export class SaberEffect implements Effect {
    params: SaberParams;

    #mask: EffectRenderTarget | null = null;
    #seedA: EffectRenderTarget | null = null;
    #seedB: EffectRenderTarget | null = null;
    #field: EffectRenderTarget | null = null;
    #seedGeometry: EffectGeometry | null = null;
    #maskPixels: Uint8Array | null = null;

    /** True while a mask readback is in flight (one at a time). */
    #pendingTrace = false;

    /** Latest traced contours + their buffer dims. Kept for re-floods. */
    #contours: readonly Contour[] | null = null;
    #traceW = 0;
    #traceH = 0;

    /** New contours arrived; the seed geometry must be rebuilt. */
    #seedsFresh = false;

    /** Params the field was last flooded with. */
    #lastBuiltProgress = Number.NaN;
    #lastBuiltPulseMinLength = Number.NaN;

    /** False until the first flood; the field RT is all zeros before. */
    #fieldBuilt = false;

    #disposed = false;
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
        this.#mask = ctx.createRenderTarget({
            filter: "nearest",
            wrap: "clamp",
        });
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

        // Rebuilds are pipelined: kick a mask readback now, trace it when
        // the async read resolves, and fold the traced contours into the
        // field on a later frame. The old field keeps rendering meanwhile,
        // so the GPU never stalls. One readback in flight at a time.
        if (this.#dirty && !this.#pendingTrace) {
            this.#dirty = false;
            this.#kickTrace(ctx, w, h);
        }

        // Flood when new contours arrived or a field-baked param moved.
        // The contours are kept, so these changes re-flood without a
        // new trace.
        const progress = Math.min(Math.max(this.params.progress, 0), 1);
        const pulseMinLength = Math.max(this.params.pulseMinLength, 0);
        if (
            this.#contours &&
            (this.#seedsFresh ||
                progress !== this.#lastBuiltProgress ||
                pulseMinLength !== this.#lastBuiltPulseMinLength)
        ) {
            this.#buildField(ctx, w, h, progress, pulseMinLength);
        }

        // Until the first trace lands the field RT is all zeros; distance 0
        // saturates the glow, so drawing would flash the whole rect white.
        if (!this.#fieldBuilt) {
            return;
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
            pulseIntensity,
            pulseSpeed,
            pulseWidth,
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
            pulseIntensity,
            pulseSpeed,
            pulseWidth,
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
        this.#disposed = true;
        this.#mask = null;
        this.#seedA = null;
        this.#seedB = null;
        this.#field = null;
        this.#seedGeometry = null;
        this.#maskPixels = null;
        this.#contours = null;
        this.#seedsFresh = false;
        this.#lastBuiltProgress = Number.NaN;
        this.#lastBuiltPulseMinLength = Number.NaN;
        this.#fieldBuilt = false;
        this.#dirty = true;
        this.#lastW = 0;
        this.#lastH = 0;
    }

    // (1) Draw the silhouette mask and start its async readback. On
    // resolve, trace the contours; `render` folds them into the field on
    // a later frame. On failure (context loss), re-mark dirty to retry.
    #kickTrace(ctx: EffectContext, w: number, h: number): void {
        const mask = this.#mask;
        if (!mask) {
            return;
        }
        ctx.draw({
            frag: FRAG_MASK,
            uniforms: {
                src: ctx.src,
                edgeThreshold: this.params.edgeThreshold,
            },
            target: mask,
        });
        if (!this.#maskPixels || this.#maskPixels.length !== w * h * 4) {
            this.#maskPixels = new Uint8Array(w * h * 4);
        }
        this.#pendingTrace = true;
        ctx.readPixels(mask, this.#maskPixels).then(
            (pixels) => {
                this.#pendingTrace = false;
                if (this.#disposed) {
                    return;
                }
                this.#contours = traceContours(pixels, w, h);
                this.#traceW = w;
                this.#traceH = h;
                this.#seedsFresh = true;
            },
            () => {
                this.#pendingTrace = false;
                this.#dirty = true;
            },
        );
    }

    // One seed vertex per boundary point: buffer uv (in the dims the mask
    // was traced at), absolute arc length and signed contour length, both
    // in buffer-height units (matching the field's distance
    // normalization). Non-pulsing contours — holes and those shorter than
    // pulseMinLength — carry a negative length.
    #packSeeds(pulseMinLength: number): Float32Array {
        const contours = this.#contours ?? [];
        const w = this.#traceW;
        const h = this.#traceH;
        let total = 0;
        for (const c of contours) {
            total += c.t.length;
        }
        const position = new Float32Array(total * 4);
        let o = 0;
        for (const c of contours) {
            const len = c.length / h;
            const pulses = c.area >= 0 && len >= pulseMinLength;
            const signedLen = pulses ? len : -len;
            for (let i = 0; i < c.t.length; i++) {
                position[o++] = (c.points[i * 2] + 0.5) / w;
                position[o++] = (c.points[i * 2 + 1] + 0.5) / h;
                position[o++] = c.t[i] * len;
                position[o++] = signedLen;
            }
        }
        return position;
    }

    // (2) Build the field from the traced seed points: splat (dropping
    // seeds past the reveal head) → log2(N) JFA flood passes → resolve →
    // blur (packs .g). Ping-pongs the two seed buffers.
    #buildField(
        ctx: EffectContext,
        w: number,
        h: number,
        progress: number,
        pulseMinLength: number,
    ): void {
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        const field = this.#field;
        if (!seedA || !seedB || !field || !this.#contours) {
            return;
        }
        const res: [number, number] = [w, h];

        // The geometry is reused across re-floods (progress changes);
        // it is repacked only when a new trace arrived or the pulse
        // cutoff (baked into the seeds' sign) changed.
        if (
            this.#seedsFresh ||
            pulseMinLength !== this.#lastBuiltPulseMinLength
        ) {
            if (this.#seedGeometry) {
                ctx.releaseGeometry(this.#seedGeometry);
                this.#seedGeometry = null;
            }
            const position = this.#packSeeds(pulseMinLength);
            if (position.length > 0) {
                this.#seedGeometry = {
                    mode: "points",
                    attributes: { position: { data: position, itemSize: 4 } },
                };
            }
        }
        this.#seedsFresh = false;
        this.#lastBuiltProgress = progress;
        this.#lastBuiltPulseMinLength = pulseMinLength;

        ctx.clear(seedA);
        if (this.#seedGeometry) {
            ctx.draw({
                frag: FRAG_SEED,
                vert: VERT_SEED,
                geometry: this.#seedGeometry,
                uniforms: { progress },
                target: seedA,
            });
        }

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

        this.#fieldBuilt = true;
    }
}
