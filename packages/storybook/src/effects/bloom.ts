// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
// COD: Advanced Warfare -style bloom (Jimenez 2014):
//   threshold → 13-tap Karis downsample pyramid → 3×3 tent upsample+add
//   → composite with tent-upsample.
// Drastically cheaper than full-res separable Gaussian: fragment work is
// dominated by the pyramid (≈ output × 4/3 total), not N full-res passes.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

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
in vec2 uvInner;
in vec2 uvInnerDst;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float softness;
uniform float edgeFade;

void main() {
    // Clamp sampling — the mask zeroes anything far outside anyway, but
    // using the edge color across the narrow fade band avoids feeding
    // the pyramid whatever the src's outside-of-range policy returns.
    vec3 srgb = texture(src, clamp(uvInner, 0.0, 1.0)).rgb;
    vec3 lin = pow(srgb, vec3(2.2));
    float lum = dot(lin, vec3(0.2126, 0.7152, 0.0722));
    float f = smoothstep(threshold, threshold + softness, lum);

    // Chebyshev distance outside the inner rect in uvInnerDst units;
    // 0 inside, positive in the pad region.
    vec2 outside = max(vec2(0.0), max(-uvInnerDst, uvInnerDst - 1.0));
    float outDist = max(outside.x, outside.y);
    float mask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    f *= mask;

    outColor = vec4(lin * f, f);
}
`;

// 13-tap downsample. Five 2×2 boxes (4 outer + 1 inner) weighted
// 0.125×4 + 0.5. `karis=1` → per-box Karis average (weight by
// 1/(1+luma)) to suppress fireflies on the first downsample.
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

// 3×3 tent upsample — COD:AW additive pyramid. Each level contributes
// `mipsDown[i] * weightLarge + tent(deeper) * weightSmall`; weights are
// driven from JS so scatter maps to halo radius linearly.
// (Unity HDRP's `mix(down, tent, scatter)` is geometric in radius —
// replaced here with a per-level linear gate.)
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

// Composite: 5×5 binomial-gaussian upsample of bloom from half-res →
// full-res, decode the sRGB src to linear, add the linear halo, then
// re-encode once. Doing the single pow at the end means dither can be
// injected right before 8-bit quantisation — where banding actually
// forms. Gaussian (vs tent) gives a round falloff with no step
// response, so concentric rings from the pyramid's reconstruction no
// longer show up on the visible pass.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvInner;
in vec2 uvInnerDst;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D bloom;
uniform vec2 texelSize;
uniform float intensity;
uniform float dither;

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

    vec4 baseColor = vec4(0.0);
    if (uvInnerDst.x >= 0.0 && uvInnerDst.x <= 1.0 &&
        uvInnerDst.y >= 0.0 && uvInnerDst.y <= 1.0) {
        baseColor = texture(src, uvInner);
    }

    // Linear composite: decode base, add linear bloom, single pow out.
    vec3 baseLin = pow(baseColor.rgb, vec3(2.2));
    vec3 lin = baseLin + max(b.rgb, vec3(0.0)) * intensity;
    vec3 rgb = pow(lin, vec3(1.0 / 2.2));

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

    float a = min(1.0, max(baseColor.a, b.a * intensity));
    outColor = vec4(rgb, a);
}
`;

export type BloomOptions = {
    /** Luminance cutoff in [0,1]. Default 0.7. */
    threshold?: number;
    /** Smoothstep width above the threshold. Default 0.1. */
    softness?: number;
    /** Additive gain on the bloom. Default 1.2. */
    intensity?: number;
    /**
     * Halo radius, 0..1 (default 0.7). Maps linearly to src-px reach:
     * scatter=0 uses only the shallowest downsample (≈ 2 src-px halo),
     * scatter=1 activates the full pyramid (≈ 2^(depth−1) src-px).
     * Internally the scatter value is log2-warped to a fractional
     * pyramid depth so that the visible halo radius grows linearly
     * with the knob. Intensity is normalised by active depth, so
     * brightness is roughly scatter-independent.
     */
    scatter?: number;
    /**
     * Extra pad around the element in CSS (logical) px so the glow has
     * room to spread. `"fullscreen"` reaches the viewport edges on all
     * sides. Default 50.
     */
    pad?: number | "fullscreen";
    /**
     * Dither amount 0..1 (default 0). Non-zero injects ±0.5-LSB
     * interleaved-gradient noise at composite time to mask residual
     * 8-bit banding from the linear→sRGB re-encode. 1 is typically
     * invisible but enough to dissolve bands; raise for aggressive
     * smoothing.
     */
    dither?: number;
    /**
     * Width (in uvInnerDst units, 0..1 spans the element) over which
     * the threshold input fades to zero past the element boundary.
     * Default 0.02 (~2 % of element dim). Too small re-introduces
     * the pad-edge ring; too large trims bright content near the
     * element's own edge.
     */
    edgeFade?: number;
};

// Tent offset in mip-texel units. 0.5 here combined with the
// base-anchored offset (`levelScale / base`) produces a 1-texel tent
// on srcSmall — the classic HDRP reconstruction kernel, fixed now
// that scatter no longer dials the filter width.
const TENT_FILTER = 0.5;

export function createBloomEffect(opts: BloomOptions = {}): Effect {
    const threshold = opts.threshold ?? 0.7;
    const softness = opts.softness ?? 0.1;
    const intensity = opts.intensity ?? 1.2;
    const scatter = Math.min(Math.max(opts.scatter ?? 0.7, 0), 1);
    const dither = Math.max(0, opts.dither ?? 0);
    const edgeFade = Math.max(1e-6, opts.edgeFade ?? 0.02);
    const pad = opts.pad ?? 50;

    let bright: EffectRenderTarget | null = null;
    const mipsDown: EffectRenderTarget[] = [];
    const mipsUp: EffectRenderTarget[] = [];
    let allocated = false;

    function allocateMips(ctx: EffectContext, baseW: number, baseH: number) {
        if (allocated) {
            return;
        }
        // Auto-depth: halve until both axes hit 1 px, capped at 8
        // levels. Going past the 13-tap stencil's "nice" size (4 px)
        // is intentional — the deepest mips become degenerate box
        // averages over the whole buffer, which is exactly what
        // contributes the wide low-frequency halo tail that smears
        // the 8-bit cutoff across enough pixels for dither to dissolve.
        let w = Math.max(1, Math.floor(baseW / 2));
        let h = Math.max(1, Math.floor(baseH / 2));
        for (let i = 0; i < 8; i++) {
            mipsDown.push(
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
        for (let i = 0; i < mipsDown.length - 1; i++) {
            mipsUp.push(
                ctx.createRenderTarget({
                    size: [mipsDown[i].width, mipsDown[i].height],
                    float: true,
                }),
            );
        }
        allocated = true;
    }

    const effect: Effect = {
        init(ctx) {
            // Full-output, auto-resize — threshold needs inner-rect gating.
            // Float storage so linear-space bloom values keep precision in
            // the dark end across the downsample chain (8-bit would band).
            bright = ctx.createRenderTarget({ float: true });
        },
        render(ctx) {
            if (!bright) {
                return;
            }
            allocateMips(ctx, bright.width, bright.height);
            const n = mipsDown.length;
            if (n === 0) {
                return;
            }

            ctx.draw({
                frag: FRAG_THRESHOLD,
                uniforms: { src: ctx.src, threshold, softness, edgeFade },
                target: bright,
            });

            // Downsample: bright → mipsDown[0] (Karis) → ... → mipsDown[n-1]
            ctx.draw({
                frag: FRAG_DOWNSAMPLE,
                uniforms: {
                    src: bright,
                    texelSize: [1 / bright.width, 1 / bright.height],
                    karis: 1,
                },
                target: mipsDown[0],
            });
            for (let i = 1; i < n; i++) {
                const prev = mipsDown[i - 1];
                ctx.draw({
                    frag: FRAG_DOWNSAMPLE,
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
            // weight[i] = clamp(activeDepth − i, 0, 1) where activeDepth is
            // 1 + log2(radiusPx) with radiusPx linear in scatter. This makes
            // the halo radius linear in scatter while keeping the pyramid
            // cascade itself COD-faithful (pure additive, no nested mix).
            //
            // Tent offsets use the *ideal* (non-floored) texel size
            //   idealTexelUV = 2^smallLevel / base
            // where smallLevel = i + 2. Anchoring to the base dimensions
            // cancels the cumulative floor error from the halving chain.
            const baseW = bright.width;
            const baseH = bright.height;
            const maxRadius = 2 ** Math.max(0, n - 1);
            const radiusPx = 1 + scatter * (maxRadius - 1);
            const activeDepth = 1 + Math.log2(radiusPx);
            const weightFor = (i: number) =>
                Math.min(1, Math.max(0, activeDepth - i));
            for (let i = n - 2; i >= 0; i--) {
                const small = i === n - 2 ? mipsDown[n - 1] : mipsUp[i + 1];
                const levelScale = 2 ** (i + 2);
                // Bottom mip is raw downsample — its weight is applied here.
                // Intermediate upsamples already carry per-level weights
                // baked in from previous iterations, so pass-through = 1.
                const wSmall = i === n - 2 ? weightFor(n - 1) : 1.0;
                ctx.draw({
                    frag: FRAG_UPSAMPLE,
                    uniforms: {
                        srcSmall: small,
                        srcLarge: mipsDown[i],
                        texelSize: [
                            (TENT_FILTER * levelScale) / baseW,
                            (TENT_FILTER * levelScale) / baseH,
                        ],
                        weightLarge: weightFor(i),
                        weightSmall: wSmall,
                    },
                    target: mipsUp[i],
                });
            }

            const bloomTex = n >= 2 ? mipsUp[0] : mipsDown[0];
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
                },
                target: ctx.output,
            });
        },
        dispose() {
            bright = null;
            mipsDown.length = 0;
            mipsUp.length = 0;
            allocated = false;
        },
    };

    effect.outputSize = (dims) => {
        if (pad === "fullscreen") {
            return { pad: dims.fullscreenPad };
        }
        return { pad: pad * dims.pixelRatio };
    };

    return effect;
}
