// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
// COD: Advanced Warfare -style bloom (Jimenez 2014):
//   threshold → 13-tap Karis downsample pyramid → 3×3 tent upsample+add
//   → composite with tent-upsample.
// Drastically cheaper than full-res separable Gaussian: fragment work is
// dominated by the pyramid (≈ output × 4/3 total), not N full-res passes.
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
    GLSL_BLOOM_KNEE,
    upsampleBloomPyramid,
} from "./_bloom-common.js";
import { padOutputRect } from "./_pad.js";

// Threshold + sRGB→linear decode. Bloom math runs in linear space so
// downsample averages reflect light intensity (not perceptual levels)
// and Rec.709 luma coefficients apply correctly. `pow(2.2)` is the
// standard fast approximation of the sRGB EOTF.
//
// The inner-rect boundary is *smoothly* masked (was a hard cutoff):
// the pyramid would otherwise capture a bright↔0 step at the pad edge,
// which reappears as a visible ring after gamma-encoded composite.
// Fading `f` (and the lin*f it premultiplies) across `edgeFade` uv
// units past the inner rect gives the cascade a continuous input and
// kills the ring at the source.
const FRAG_THRESHOLD = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float softness;
uniform float edgeFade;
${GLSL_BLOOM_KNEE}
void main() {
    // Hard-gate sampling to uvSrc in [0,1]: a bare clamp would smear
    // src's edge pixels into the pad (visible as a stretched image
    // when edgeFade x pad reaches past the src buffer). The clamp on
    // texture() keeps the sampler happy; srcMask zeroes what lies
    // outside the actual src content.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec3 srgb = texture(src, clamp(uvSrc, 0.0, 1.0)).rgb * srcMask;
    vec3 lin = pow(srgb, vec3(2.2));

    // COD:AW (Jimenez 2014) / Unity HDRP soft-knee brightness
    // response. Quadratic ramp of half-width (threshold * softness)
    // centred on the cutoff — softness gates mid-luma pixels on
    // BOTH sides of threshold, so raising it *widens* the bloom
    // (the previous one-sided smoothstep did the opposite).
    // softness=0 collapses to a hard threshold; softness=1 extends
    // the knee down to zero. br uses max-channel (COD convention)
    // so saturated primaries still trigger bloom where a Rec.709
    // luma would have hidden them.
    float br = max(max(lin.r, lin.g), lin.b);
    float contribution = bloomKnee(br, threshold, threshold * softness);

    // Chebyshev distance outside the inner rect in uvContent units;
    // 0 inside, positive in the pad region.
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float mask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    float f = contribution * mask;

    outColor = vec4(lin * f, f);
}
`;

// Composite: 5×5 binomial-gaussian upsample of bloom from half-res →
// full-res, decode the sRGB src to linear, add the linear halo, then
// re-encode once. Doing the single pow at the end means dither can be
// injected right before 8-bit quantisation — where banding actually
// forms. Gaussian (vs tent) gives a round falloff with no step
// response, so concentric rings from the pyramid's reconstruction no
// longer show up on the visible pass.
//
// Output is *premultiplied*: the runtime blends with (ONE, 1-SRC_ALPHA)
// when writing to screen, so the low-intensity halo in the pad area
// (where sRGB-encoded `rgb` is still visibly bright due to pow(1/2.2)'s
// infinite slope at 0) correctly fades via its alpha instead of painting
// a visible ring.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D bloom;
uniform vec2 texelSize;
uniform float intensity;
uniform float dither;
uniform float edgeFade;

// Interleaved gradient noise (Jimenez 2014). Cheap, high-quality,
// spatially decorrelated — perfect for breaking 8-bit quantisation
// bands in the gamma-encoded bloom halo.
float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
    // 5×5 binomial gaussian ([1,4,6,4,1]/16 outer-producted) via 9
    // bilinear taps at ±1.2 source texels. Each bilinear fetch
    // integrates a tap-pair perfectly, so result ≡ 25-tap convolution.
    vec2 t = texelSize * 1.2;
    vec4 b = vec4(0.0);
    b += texture(bloom, uv + vec2(-t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0, -t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2(-t.x,  0.0)) * 30.0;
    b += texture(bloom, uv                  ) * 36.0;
    b += texture(bloom, uv + vec2( t.x,  0.0)) * 30.0;
    b += texture(bloom, uv + vec2(-t.x,  t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0,  t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x,  t.y)) * 25.0;
    b *= (1.0 / 256.0);

    // Same soft edge-fade as threshold so base and bloom share a
    // coverage footprint — base alpha tapers into the pad instead of
    // stepping from 1 to 0. The hard srcMask (same shape as the
    // threshold pass) kills anything outside src's valid [0,1] so
    // bloom pad extending past the src buffer doesn't repeat edge
    // pixels.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec4 baseColor = texture(src, clamp(uvSrc, 0.0, 1.0)) * srcMask;
    // src is premultiplied; decode the straight color.
    baseColor.rgb = baseColor.a > 0.0 ? baseColor.rgb / baseColor.a : vec3(0.0);
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float baseMask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    baseColor.a *= baseMask;

    // Linear composite: decode base, add linear bloom, single pow out.
    vec3 baseLin = pow(baseColor.rgb, vec3(2.2));
    vec3 lin = baseLin + max(b.rgb, vec3(0.0)) * intensity;
    vec3 rgb = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));

    // TPDF dither just before 8-bit quantisation. Two IGN samples
    // summed give a triangular PDF in [-1, 1], which decorrelates the
    // quantisation error from the signal (uniform dither doesn't).
    // Independent per channel to avoid tinted bands.
    vec3 n1 = vec3(
        ign(gl_FragCoord.xy),
        ign(gl_FragCoord.xy + 17.0),
        ign(gl_FragCoord.xy + 41.0)
    );
    vec3 n2 = vec3(
        ign(gl_FragCoord.xy + 113.0),
        ign(gl_FragCoord.xy + 131.0),
        ign(gl_FragCoord.xy + 149.0)
    );
    vec3 n = n1 + n2 - 1.0;
    rgb += n * dither / 255.0;

    // Premultiply with the union coverage of base and bloom. At pad
    // edges both feed zero so rgb × a → 0 and the halo dissolves
    // instead of leaving a gamma-boosted floor behind.
    float a = clamp(max(baseColor.a, b.a * intensity), 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`;

export type BloomParams = {
    /** Luminance cutoff in [0,1]. */
    threshold: number;
    /**
     * Soft-knee width, 0..1. COD:AW-style quadratic knee of half-width
     * `threshold × softness` centred on the cutoff. softness=0 → hard
     * threshold; 1 → knee stretches down to zero.
     */
    softness: number;
    /** Additive gain on the bloom. */
    intensity: number;
    /**
     * Halo spread, 0..1. Linear in *octaves* of reach: each step of
     * `1/(depth−1)` activates one more pyramid level. Intensity is
     * normalised by active depth so brightness stays roughly
     * scatter-independent.
     */
    scatter: number;
    /**
     * Extra pad around the element in CSS (logical) px so the glow has
     * room to spread. `"fullscreen"` reaches the viewport edges.
     */
    pad: number | "fullscreen";
    /**
     * Dither amount 0..1. Non-zero injects ±0.5-LSB interleaved-gradient
     * noise at composite time to mask 8-bit banding.
     */
    dither: number;
    /**
     * Width (in uvContent units) over which the threshold input fades
     * to zero past the element boundary.
     */
    edgeFade: number;
};

const DEFAULT_PARAMS: BloomParams = {
    threshold: 0.7,
    softness: 0.1,
    intensity: 1.2,
    scatter: 0.7,
    pad: 50,
    dither: 0,
    edgeFade: 0.02,
};

// Tent offset in mip-texel units. 0.5 here combined with the
// base-anchored offset (`levelScale / base`) produces a 1-texel tent
// on srcSmall — the classic HDRP reconstruction kernel, fixed now
// that scatter no longer dials the filter width.
const TENT_FILTER = 0.5;

/**
 * COD:AW-style bloom. Mutate `params` directly or via `setParams` —
 * uniforms and `outputRect` read live each frame, so a reactive UI
 * (e.g. Tweakpane) can bind directly to `effect.params`.
 */
export class BloomEffect implements Effect {
    params: BloomParams;

    #bright: EffectRenderTarget | null = null;
    #pyramid: BloomPyramid | null = null;
    #lastBaseW = 0;
    #lastBaseH = 0;

    constructor(initial: Partial<BloomParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(partial: Partial<BloomParams>): void {
        Object.assign(this.params, partial);
    }

    init(ctx: EffectContext): void {
        // Full-output, auto-resize — threshold needs inner-rect gating.
        // Float storage so linear-space bloom values keep precision in
        // the dark end across the downsample chain (8-bit would band).
        this.#bright = ctx.createRenderTarget({ float: true });
    }

    render(ctx: EffectContext): void {
        if (!this.#bright) {
            return;
        }
        const { threshold, softness, intensity } = this.params;
        const scatter = Math.min(Math.max(this.params.scatter, 0), 1);
        const dither = Math.max(0, this.params.dither);
        const edgeFade = Math.max(1e-6, this.params.edgeFade);
        // If `pad` changed (outputRect is re-queried every frame by
        // the host), `bright` auto-resizes — rebuild the pyramid so
        // mip dims keep matching the buffer.
        if (
            !this.#pyramid ||
            this.#bright.width !== this.#lastBaseW ||
            this.#bright.height !== this.#lastBaseH
        ) {
            if (this.#pyramid) {
                disposeBloomPyramid(this.#pyramid);
            }
            // Auto-depth: halve until both axes hit 1 px, capped at 8
            // levels. Going past the 13-tap stencil's "nice" size (4 px)
            // is intentional — the deepest mips become degenerate box
            // averages over the whole buffer, which is exactly what
            // contributes the wide low-frequency halo tail that smears
            // the 8-bit cutoff across enough pixels for dither to
            // dissolve.
            this.#pyramid = createBloomPyramid(
                ctx,
                this.#bright.width,
                this.#bright.height,
                8,
            );
            this.#lastBaseW = this.#bright.width;
            this.#lastBaseH = this.#bright.height;
        }
        const mipsDown = this.#pyramid.down;
        const n = mipsDown.length;

        ctx.draw({
            frag: FRAG_THRESHOLD,
            uniforms: { src: ctx.src, threshold, softness, edgeFade },
            target: this.#bright,
        });

        // Downsample: bright → mipsDown[0] (Karis) → ... → mipsDown[n-1]
        ctx.draw({
            frag: FRAG_BLOOM_DOWNSAMPLE,
            uniforms: {
                src: this.#bright,
                texelSize: [1 / this.#bright.width, 1 / this.#bright.height],
                karis: 1,
            },
            target: mipsDown[0],
        });
        for (let i = 1; i < n; i++) {
            const prev = mipsDown[i - 1];
            ctx.draw({
                frag: FRAG_BLOOM_DOWNSAMPLE,
                uniforms: {
                    src: prev,
                    texelSize: [1 / prev.width, 1 / prev.height],
                    karis: 0,
                },
                target: mipsDown[i],
            });
        }

        // Additive pyramid upsample with per-level weights.
        //   upsample[D-1] = mipsDown[D-1] × w[D-1]
        //   upsample[i]   = mipsDown[i]   × w[i] + tent(upsample[i+1])
        // weight[i] = clamp(activeDepth − i, 0, 1). activeDepth is
        // linear in scatter (each step of 1/(n−1) activates one more
        // level), giving ~even perceptual change across the knob.
        // A radius-linear (log2) mapping bunches all visible motion
        // into scatter < 0.2 because halo reach is dominated by the
        // outermost level — octave-linear is what "feels" linear.
        //
        // Tent offsets use the *ideal* (non-floored) texel size
        //   idealTexelUV = 2^smallLevel / base
        // where smallLevel = i + 2. Anchoring to the base dimensions
        // cancels the cumulative floor error from the halving chain.
        const baseW = this.#bright.width;
        const baseH = this.#bright.height;
        const activeDepth = 1 + scatter * Math.max(0, n - 1);
        const weightFor = (i: number) =>
            Math.min(1, Math.max(0, activeDepth - i));
        const bloomTex = upsampleBloomPyramid(ctx, this.#pyramid, (i) => {
            const levelScale = 2 ** (i + 2);
            return {
                texelSize: [
                    (TENT_FILTER * levelScale) / baseW,
                    (TENT_FILTER * levelScale) / baseH,
                ],
                weightLarge: weightFor(i),
                // Bottom mip is raw downsample — its weight is applied
                // here. Intermediate upsamples already carry per-level
                // weights baked in from previous iterations, so
                // pass-through = 1.
                weightSmall: i === n - 2 ? weightFor(n - 1) : 1.0,
            };
        });

        // Normalise by active depth so bloom amplitude stays roughly
        // constant across scatter — fully-additive pyramid sums N
        // levels, so raw amplitude scales with level count otherwise.
        const effectiveIntensity = intensity / Math.max(1, activeDepth);
        // bloomTex is always at level 1 (half of base).
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                src: ctx.src,
                bloom: bloomTex,
                texelSize: [
                    (TENT_FILTER * 2) / baseW,
                    (TENT_FILTER * 2) / baseH,
                ],
                intensity: effectiveIntensity,
                dither,
                edgeFade,
            },
            target: ctx.target,
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
    }

    dispose(): void {
        this.#bright = null;
        if (this.#pyramid) {
            disposeBloomPyramid(this.#pyramid);
        }
        this.#pyramid = null;
        this.#lastBaseW = 0;
        this.#lastBaseH = 0;
    }
}
