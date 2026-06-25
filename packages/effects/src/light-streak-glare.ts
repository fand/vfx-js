// Anamorphic / aperture light streaks via Blender's "Glare → Streaks"
// algorithm: a low-resolution highlights pass, then per-streak iterative
// directional filtering, accumulated and composited over the source.
//
// This is the fullscreen counterpart to the instanced LightStreakEffect,
// and a faithful port of Blender's realtime-compositor glare:
//   - Highlights: HSV-value adaptive smooth-clamp to [threshold, max],
//     minus threshold, hue/saturation preserved.
//   - Streak filter (ping-pong, `iterations` passes per streak): 4 taps
//     (centre + 3 neighbours at 1/2/3 × a base-4 exponential step),
//     blended `(centre + Σ fade_i·neighbour_i) / 2`. Retaining half the
//     centre each pass keeps the streak smooth and gap-free.
//   - Per-channel `color_modulation` on the neighbours accumulates into
//     chromatic dispersion along the streak.
//   - Everything runs at `resolution`× the output for speed (Blender's
//     "quality" lever); the accumulator is linearly upsampled at composite.
//
// `streaks` spans both looks (2 = anamorphic, n = n-ray aperture star),
// matching LightStreakEffect.
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// Highlight extraction. Brightness = HSV value (max channel); clamped
// smoothly to [threshold, maxBrightness] then offset by -threshold, with
// hue/saturation kept by scaling rgb uniformly (≡ scaling V in HSV).
const FRAG_HIGHLIGHTS = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float maxBrightness;
uniform float smoothness;

float smooth_min(float a, float b, float k) {
    if (k == 0.0) return min(a, b);
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}
float smooth_max(float a, float b, float k) {
    return -smooth_min(-a, -b, k);
}
float adaptive_smooth_clamp(float x, float lo, float hi, float k) {
    float range = abs(hi - lo);
    float kLo = min(k, min(abs(lo), range));
    float kHi = min(k, min(abs(hi), range));
    return smooth_min(hi, smooth_max(lo, x, kLo), kHi);
}

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;

    vec3 c = texture(src, clamp(uvSrc, 0.0, 1.0)).rgb * m;
    float v = max(max(c.r, c.g), c.b);
    float clamped = adaptive_smooth_clamp(v, threshold, maxBrightness, smoothness);
    float excess = max(clamped - threshold, 0.0);
    float factor = v > 1e-6 ? excess / v : 0.0;
    outColor = vec4(c * factor, 1.0);
}
`;

// One streak iteration. `streakUv` is the per-pass offset in this buffer's
// UV (direction × base-4 magnitude / size). Neighbours at 1/2/3× spread
// the highlight along the ray; the per-channel modulation gives dispersion.
const FRAG_FILTER = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 streakUv;
uniform vec3 fadeFactors;
uniform float colorModulator;

void main() {
    vec4 n0 = texture(src, uv + streakUv);
    vec4 n1 = texture(src, uv + streakUv * 2.0);
    vec4 n2 = texture(src, uv + streakUv * 3.0);

    // Unmodulated weighted sum — the brightness reference.
    vec4 mono = fadeFactors.x * n0 + fadeFactors.y * n1 + fadeFactors.z * n2;

    // Per-channel modulation spreads the channels into dispersion.
    n0.gb *= colorModulator;
    n1.rg *= colorModulator;
    n2.rb *= colorModulator;
    vec4 sum = fadeFactors.x * n0 + fadeFactors.y * n1 + fadeFactors.z * n2;

    // Rescale to the unmodulated luminance so colorModulation shifts
    // *colour* only, not overall brightness.
    const vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    float lm = dot(mono.rgb, luma);
    float ls = dot(sum.rgb, luma);
    sum.rgb *= ls > 1e-6 ? lm / ls : 1.0;

    vec4 center = texture(src, uv);
    outColor = (center + sum) / 2.0;
}
`;

// Zero the accumulator each frame.
const FRAG_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// Add one finished streak into the accumulator, scaled by attenuation.
const FRAG_ACCUMULATE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform float attenuation;
void main() { outColor = texture(src, uv) * attenuation; }
`;

// Composite the (upsampled) accumulated glare over the masked source.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D glare;
uniform vec3 tint;
uniform float intensity;
uniform float norm;        // core-gain normalisation (cross-method calibration)
uniform vec2 glareTexel;   // 1/size of the glare buffer (uv)
uniform float softness;    // isotropic blur radius (glare texels)

// 3x3 tent-blurred glare sample. The directional filter only blurs along
// the streak, leaving razor-sharp cross-sections (very visible on crisp
// sources like a logo); this softens them perpendicular without washing
// out the long streak.
vec3 sampleGlare(vec2 uv) {
    vec2 t = glareTexel * softness;
    vec3 s = texture(glare, uv).rgb * 4.0;
    s += texture(glare, uv + vec2(t.x, 0.0)).rgb * 2.0;
    s += texture(glare, uv + vec2(-t.x, 0.0)).rgb * 2.0;
    s += texture(glare, uv + vec2(0.0, t.y)).rgb * 2.0;
    s += texture(glare, uv + vec2(0.0, -t.y)).rgb * 2.0;
    s += texture(glare, uv + t).rgb;
    s += texture(glare, uv - t).rgb;
    s += texture(glare, uv + vec2(t.x, -t.y)).rgb;
    s += texture(glare, uv + vec2(-t.x, t.y)).rgb;
    return s / 16.0;
}

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;

    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0)) * m;
    vec3 g = (1.0 - exp(-sampleGlare(uv) * norm * intensity)) * tint;

    vec3 rgb = base.rgb * base.a + g;
    float a = clamp(max(base.a, dot(g, vec3(0.2126, 0.7152, 0.0722))), 0.0, 1.0);
    outColor = vec4(rgb, a);
}
`;

const MAX_ITERATIONS = 5;

export type LightStreakGlareParams = {
    /**
     * Number of rays. `2` → horizontal anamorphic flare; `n` → n-ray
     * aperture starburst. For a physical aperture map blade count to
     * spikes: `blades` if even, `2 * blades` if odd.
     */
    streaks: number;
    /** Base rotation of the ray fan, in radians. */
    angle: number;
    /**
     * Streak-filter iterations (2–5). Reach grows ~4ᶦ per iteration, so
     * this is the primary length control.
     */
    iterations: number;
    /** Per-step brightness falloff, in (0,1). Lower = shorter, sharper tail. */
    fade: number;
    /** Highlight luminance cutoff in [0,1]. */
    threshold: number;
    /** Upper clamp on highlight brightness — tame blown-out sources. */
    maxBrightness: number;
    /** Smoothness of the highlight clamp knee. */
    smoothness: number;
    /** Chromatic dispersion along the streak, 0..1 (Blender color modulation). */
    colorModulation: number;
    /**
     * Perpendicular softening of the streaks (in glare-buffer texels). The
     * directional filter is razor-sharp across the streak; raise this to
     * soften the cross-section on crisp sources. 0 disables it.
     */
    streakSoftness: number;
    /** Glare gain in the composite. */
    intensity: number;
    /** Per-channel multiplier on the glare colour. */
    tint: readonly [number, number, number];
    /**
     * Internal processing scale, 0.25..1. Lower is much faster (streaks
     * are low-frequency, so it barely shows) — Blender's "quality" lever.
     */
    resolution: number;
    /**
     * Extra pad around the element in CSS px so streaks aren't clipped.
     * `"fullscreen"` reaches the viewport edges.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: LightStreakGlareParams = {
    streaks: 2,
    angle: 0,
    iterations: 3,
    fade: 0.9,
    threshold: 0.75,
    maxBrightness: 1.0,
    smoothness: 0.1,
    colorModulation: 0.25,
    streakSoftness: 1.5,
    intensity: 3.0,
    tint: [0.6, 0.8, 1.0],
    resolution: 0.5,
    pad: 200,
};

/**
 * Light-streak effect (anamorphic flare / aperture starburst) ported from
 * Blender's Glare→Streaks: a low-res highlights pass and per-streak
 * iterative directional filtering. Smooth and gap-free with only a handful
 * of fullscreen passes — the lightweight fullscreen alternative to the
 * instanced {@link LightStreakEffect}. Mutate `params` directly or via
 * `setParams`.
 */
export class LightStreakGlareEffect implements Effect {
    params: LightStreakGlareParams;

    #highlights: EffectRenderTarget | null = null;
    #pingA: EffectRenderTarget | null = null;
    #pingB: EffectRenderTarget | null = null;
    #accum: EffectRenderTarget | null = null;
    #lastW = 0;
    #lastH = 0;

    constructor(initial: Partial<LightStreakGlareParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<LightStreakGlareParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const dst = this.outputRect(ctx.dims);
        const scale = Math.min(1, Math.max(0.1, this.params.resolution));
        const w = Math.max(1, Math.round(dst[2] * scale));
        const h = Math.max(1, Math.round(dst[3] * scale));

        // (Re)allocate the low-res buffers when the working size changes.
        if (w !== this.#lastW || h !== this.#lastH) {
            const opts = {
                size: [w, h] as [number, number],
                float: true,
                filter: "linear" as const,
            };
            this.#highlights = ctx.createRenderTarget(opts);
            this.#pingA = ctx.createRenderTarget(opts);
            this.#pingB = ctx.createRenderTarget(opts);
            this.#accum = ctx.createRenderTarget(opts);
            this.#lastW = w;
            this.#lastH = h;
        }
        const highlights = this.#highlights;
        const pingA = this.#pingA;
        const pingB = this.#pingB;
        const accum = this.#accum;
        if (!highlights || !pingA || !pingB || !accum) {
            return;
        }

        // 1. Highlights.
        ctx.draw({
            frag: FRAG_HIGHLIGHTS,
            target: highlights,
            uniforms: {
                src: ctx.src,
                threshold: this.params.threshold,
                maxBrightness: this.params.maxBrightness,
                smoothness: this.params.smoothness,
            },
        });

        // 2. Per-streak iterative filtering, accumulated.
        ctx.draw({ frag: FRAG_CLEAR, target: accum, blend: "none" });

        const rays = Math.max(1, Math.round(this.params.streaks));
        const iterations = Math.max(
            1,
            Math.min(MAX_ITERATIONS, Math.round(this.params.iterations)),
        );
        const attenuation = 1 / (MAX_ITERATIONS + 1 - iterations);

        for (let k = 0; k < rays; k++) {
            const angle = this.params.angle + (k * Math.PI * 2) / rays;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            let input = highlights;
            for (let i = 0; i < iterations; i++) {
                const magnitude = 4 ** i;
                const fade = this.params.fade ** magnitude;
                const colorModulator =
                    1 - this.params.colorModulation ** (i + 1);
                const out = i % 2 === 0 ? pingA : pingB;
                ctx.draw({
                    frag: FRAG_FILTER,
                    target: out,
                    uniforms: {
                        src: input,
                        streakUv: [(dx * magnitude) / w, (dy * magnitude) / h],
                        fadeFactors: [fade, fade ** 2, fade ** 3],
                        colorModulator,
                    },
                });
                input = out;
            }

            ctx.draw({
                frag: FRAG_ACCUMULATE,
                target: accum,
                blend: "additive",
                uniforms: { src: input, attenuation },
            });
        }

        // 3. Composite over the source. `norm` cancels the filter's core
        // gain (≈ rays × 0.5^iters / (MAX+1-iters)) so the streak core
        // matches the other strategies at the same intensity.
        const coreGain =
            (rays * 0.5 ** iterations) / (MAX_ITERATIONS + 1 - iterations);
        ctx.draw({
            frag: FRAG_COMPOSITE,
            target: ctx.target,
            uniforms: {
                src: ctx.src,
                glare: accum,
                intensity: this.params.intensity,
                norm: 1 / coreGain,
                glareTexel: [1 / accum.width, 1 / accum.height],
                softness: Math.max(0, this.params.streakSoftness),
                tint: [
                    this.params.tint[0],
                    this.params.tint[1],
                    this.params.tint[2],
                ],
            },
        });
    }

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        if (this.params.pad === "fullscreen") {
            return dims.canvasRect;
        }
        const px = this.params.pad * dims.pixelRatio;
        const [, , ew, eh] = dims.contentRect;
        return [-px, -px, ew + 2 * px, eh + 2 * px];
    }

    dispose(): void {
        this.#highlights = null;
        this.#pingA = null;
        this.#pingB = null;
        this.#accum = null;
        this.#lastW = 0;
        this.#lastH = 0;
    }
}
