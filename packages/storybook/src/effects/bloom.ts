// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
// COD: Advanced Warfare -style bloom (Jimenez 2014):
//   threshold → 13-tap Karis downsample pyramid → 3×3 tent upsample+add
//   → composite with tent-upsample.
// Drastically cheaper than full-res separable Gaussian: fragment work is
// dominated by the pyramid (≈ output × 4/3 total), not N full-res passes.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const FRAG_THRESHOLD = `#version 300 es
precision highp float;
in vec2 uvInner;
in vec2 uvInnerDst;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float softness;

void main() {
    vec4 c = vec4(0.0);
    if (uvInnerDst.x >= 0.0 && uvInnerDst.x <= 1.0 &&
        uvInnerDst.y >= 0.0 && uvInnerDst.y <= 1.0) {
        c = texture(src, uvInner);
    }
    float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float f = smoothstep(threshold, threshold + softness, lum);
    outColor = vec4(c.rgb * f, f);
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

// 3×3 tent upsample of `srcSmall` added to `srcLarge` (same-size).
const FRAG_UPSAMPLE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;

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
    outColor = texture(srcLarge, uv) + sum;
}
`;

// Composite: tent-upsample bloom from half-res → full-res and add to src.
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

void main() {
    vec2 t = texelSize;
    vec4 b = vec4(0.0);
    b += texture(bloom, uv + vec2(-t.x, -t.y)) * 1.0;
    b += texture(bloom, uv + vec2( 0.0, -t.y)) * 2.0;
    b += texture(bloom, uv + vec2( t.x, -t.y)) * 1.0;
    b += texture(bloom, uv + vec2(-t.x,  0.0)) * 2.0;
    b += texture(bloom, uv                  ) * 4.0;
    b += texture(bloom, uv + vec2( t.x,  0.0)) * 2.0;
    b += texture(bloom, uv + vec2(-t.x,  t.y)) * 1.0;
    b += texture(bloom, uv + vec2( 0.0,  t.y)) * 2.0;
    b += texture(bloom, uv + vec2( t.x,  t.y)) * 1.0;
    b *= (1.0 / 16.0);

    vec4 baseColor = vec4(0.0);
    if (uvInnerDst.x >= 0.0 && uvInnerDst.x <= 1.0 &&
        uvInnerDst.y >= 0.0 && uvInnerDst.y <= 1.0) {
        baseColor = texture(src, uvInner);
    }
    vec3 rgb = baseColor.rgb + b.rgb * intensity;
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
     * How diffuse the bloom looks. 0..1 (default 0.7). Follows the
     * Unity HDRP / COD:AW "Scatter" convention — 0 is focused/tight,
     * 1 is a wide soft halo. Not a pixel radius: total extent is
     * dominated by the mip pyramid depth (auto-fit to the element +
     * pad buffer), which is effectively full-frame.
     */
    scatter?: number;
    /**
     * Extra pad around the element in CSS (logical) px so the glow has
     * room to spread. `"fullscreen"` reaches the viewport edges on all
     * sides. Default 50.
     */
    pad?: number | "fullscreen";
};

// Map user scatter 0..1 → tent filter factor. Mirrors Unity HDRP's
// `Lerp(0.05, 0.95, scatter)` to keep tent offsets inside 1 texel and
// avoid sparse-sample aliasing at the endpoints.
function scatterFilter(scatter: number): number {
    return 0.05 + 0.9 * Math.min(Math.max(scatter, 0), 1);
}

export function createBloomEffect(opts: BloomOptions = {}): Effect {
    const threshold = opts.threshold ?? 0.7;
    const softness = opts.softness ?? 0.1;
    const intensity = opts.intensity ?? 1.2;
    const tentFilter = scatterFilter(opts.scatter ?? 0.7);
    const pad = opts.pad ?? 50;

    let bright: EffectRenderTarget | null = null;
    const mipsDown: EffectRenderTarget[] = [];
    const mipsUp: EffectRenderTarget[] = [];
    let allocated = false;

    function allocateMips(ctx: EffectContext, baseW: number, baseH: number) {
        if (allocated) {
            return;
        }
        // Auto-depth: halve until a further level would drop below 4 px
        // on either axis. Cap at 8 levels.
        let w = Math.max(1, Math.floor(baseW / 2));
        let h = Math.max(1, Math.floor(baseH / 2));
        for (let i = 0; i < 8; i++) {
            mipsDown.push(ctx.createRenderTarget({ size: [w, h] }));
            const nw = Math.max(1, Math.floor(w / 2));
            const nh = Math.max(1, Math.floor(h / 2));
            if (nw < 4 || nh < 4) {
                break;
            }
            w = nw;
            h = nh;
        }
        for (let i = 0; i < mipsDown.length - 1; i++) {
            mipsUp.push(
                ctx.createRenderTarget({
                    size: [mipsDown[i].width, mipsDown[i].height],
                }),
            );
        }
        allocated = true;
    }

    const effect: Effect = {
        init(ctx) {
            // Full-output, auto-resize — threshold needs inner-rect gating.
            bright = ctx.createRenderTarget();
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
                uniforms: { src: ctx.src, threshold, softness },
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

            // Upsample-add: write into mipsUp[i] at mipsDown[i]'s size.
            //   mipsUp[n-2] = tent(mipsDown[n-1]) + mipsDown[n-2]
            //   mipsUp[i]   = tent(mipsUp[i+1])   + mipsDown[i]  (i=n-3..0)
            //
            // Tent offsets use the *ideal* (non-floored) texel size
            //   idealTexelUV = 2^smallLevel / base
            // where smallLevel = i + 2. Anchoring to the base dimensions
            // cancels the cumulative floor error from the halving chain,
            // so reach stays calibrated to `tentFilter × 2^smallLevel`
            // source-px regardless of the actual mip dims.
            const baseW = bright.width;
            const baseH = bright.height;
            for (let i = n - 2; i >= 0; i--) {
                const small = i === n - 2 ? mipsDown[n - 1] : mipsUp[i + 1];
                const levelScale = 2 ** (i + 2);
                ctx.draw({
                    frag: FRAG_UPSAMPLE,
                    uniforms: {
                        srcSmall: small,
                        srcLarge: mipsDown[i],
                        texelSize: [
                            (tentFilter * levelScale) / baseW,
                            (tentFilter * levelScale) / baseH,
                        ],
                    },
                    target: mipsUp[i],
                });
            }

            const bloomTex = n >= 2 ? mipsUp[0] : mipsDown[0];
            // bloomTex is always at level 1 (half of base).
            ctx.draw({
                frag: FRAG_COMPOSITE,
                uniforms: {
                    src: ctx.src,
                    bloom: bloomTex,
                    texelSize: [
                        (tentFilter * 2) / baseW,
                        (tentFilter * 2) / baseH,
                    ],
                    intensity,
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
