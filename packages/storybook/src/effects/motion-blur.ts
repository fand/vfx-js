// Two-pass motion blur. Pass 1 estimates per-pixel optical flow with
// the keeffEoghan/MIOFlow normal-flow formula:
//   flow = It · ∇I / (|∇I| + λ)
// vs. the textbook Horn-Schunck point estimate (-It·∇I/|∇I|²) it
// trades unbounded magnitude for bounded `|It|`-scaled magnitude:
//   • spatial ∇I is centred-difference summed over BOTH frames so the
//     "between" region of a feature trajectory still has signal,
//   • RGB channels are kept (luma collapse loses 70 % of red contrast),
//   • normalisation is by `|∇I|` not `|∇I|²` so the result doesn't
//     blow up where gradients are tiny.
// Pass 2 averages `samples` taps along that vector through the source.
// A persistent buffer holds the previous frame for the temporal diff.
//
// Per-pixel optical flow still gives 0 in uniform-colour interiors
// (`|∇I| = 0` everywhere except at edges) and underestimates motion
// bigger than the gradient's spatial support — those need post-blur
// of the flow field or a multi-scale pyramid to fix.
//
// `window.scrollX/Y` delta is folded in as a global fallback (EMA-
// smoothed because wheel scroll arrives in bursts).
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const FRAG_FLOW = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D prev;
uniform float lambda;

void main() {
    vec2 t = 1.0 / vec2(textureSize(src, 0));
    vec2 ox = vec2(t.x, 0.0);
    vec2 oy = vec2(0.0, t.y);

    // Centred finite-difference, summed over both frames. Sobel was
    // localised to the current frame's edge — for any motion bigger
    // than 1-2 px, the new-frame gradient and the temporal change live
    // at different positions and the formula collapses. Folding in the
    // previous frame's gradient extends the "sensitive zone" along the
    // feature's trajectory.
    vec4 gradX = (texture(src,  uvSrc + ox) - texture(src,  uvSrc - ox))
               + (texture(prev, uvSrc + ox) - texture(prev, uvSrc - ox));
    vec4 gradY = (texture(src,  uvSrc + oy) - texture(src,  uvSrc - oy))
               + (texture(prev, uvSrc + oy) - texture(prev, uvSrc - oy));
    vec4 diff  =  texture(src,  uvSrc) - texture(prev, uvSrc);

    // Per-channel gradient magnitude with lambda softening (avoids
    // div-by-zero in flat regions instead of returning huge spurious
    // flow like an inv-grad-squared denominator would).
    vec4 gradMag = sqrt(gradX * gradX + gradY * gradY + vec4(lambda));

    // flow_c = It_c * gradI_c / |gradI|_c per channel, then sum across
    // RGB (red ball over dark bg: R channel dominates; luma weights
    // would cut it by ~70%). Output magnitude is in luma units, not
    // texels.
    vec4 fx = diff * gradX / gradMag;
    vec4 fy = diff * gradY / gradMag;
    vec2 flow = vec2(fx.r + fx.g + fx.b, fy.r + fy.g + fy.b);
    outColor = vec4(flow, 0.0, 1.0);
}
`;

const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D flow;
uniform vec2 globalFlow;
uniform float strength;
uniform int samples;
uniform int debug;
uniform float debugScale;

const int MAX_SAMPLES = 64;

void main() {
    vec2 srcTexel = 1.0 / vec2(textureSize(src, 0));
    vec2 fpx = texture(flow, uv).xy;
    vec2 flw = (fpx + globalFlow) * srcTexel * strength;

    if (debug == 1) {
        // Per-pixel flow magnitude. R = |x|, G = |y|, B = sign-or-zero.
        outColor = vec4(
            abs(fpx.x) * debugScale,
            abs(fpx.y) * debugScale,
            (fpx.x > 0.0 ? 0.5 : 0.0) + (fpx.y > 0.0 ? 0.5 : 0.0),
            1.0
        );
        return;
    }
    if (debug == 2) {
        // Final blur offset (post-strength). Bigger = more visible blur.
        outColor = vec4(
            abs(flw.x) * debugScale * 100.0,
            abs(flw.y) * debugScale * 100.0,
            0.0,
            1.0
        );
        return;
    }

    int n = max(1, min(samples, MAX_SAMPLES));
    vec4 sum = vec4(0.0);
    for (int i = 0; i < MAX_SAMPLES; i++) {
        if (i >= n) break;
        // Centred kernel: t ∈ [-0.5, +0.5] so blur stays symmetric.
        float t = (n == 1) ? 0.0 : float(i) / float(n - 1) - 0.5;
        sum += texture(src, uvSrc + flw * t);
    }
    outColor = sum / float(n);
}
`;

const FRAG_COPY = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() { outColor = texture(src, uvSrc); }
`;

export type MotionBlurParams = {
    /** Multiplier on the optical-flow vector. */
    strength: number;
    /** Tap count along the flow direction. Clamped to [1, 64]. */
    samples: number;
    /**
     * EMA smoothing on the element-velocity input, 0..1. Higher = more
     * averaging across frames. Wheel scroll arrives in bursts (e.g.
     * `0,0,50,0,0,60`) so the raw per-frame delta flickers; smoothing
     * decouples the visible blur amount from event timing.
     */
    velocitySmoothing: number;
    /**
     * 0 = normal blur. 1 = visualise per-pixel flow (R = |fx|, G = |fy|).
     * 2 = visualise the final post-strength blur offset. Use to confirm
     * whether optical flow is producing signal at all.
     */
    debug: number;
    /** Brightness multiplier for the debug visualisation. */
    debugScale: number;
    /**
     * Softening constant inside the gradient-magnitude denominator
     * (added under the sqrt). Bigger → flat regions output smaller
     * flow but edges are also slightly desensitised.
     */
    lambda: number;
};

const DEFAULT_PARAMS: MotionBlurParams = {
    // Output of FRAG_FLOW is now in luma units (≈ 0..3 RGB-summed),
    // not pixels — strength multiplies that into a UV offset (via
    // srcTexel) so the natural range that gives a visible blur is
    // higher than the old impl. Tune in the pane.
    strength: 20,
    samples: 16,
    velocitySmoothing: 0.6,
    debug: 0,
    debugScale: 0.2,
    lambda: 1e-4,
};

export class MotionBlurEffect implements Effect {
    params: MotionBlurParams;

    #prev: EffectRenderTarget | null = null;
    #flow: EffectRenderTarget | null = null;

    #prevScrollX = 0;
    #prevScrollY = 0;
    #prevScrollValid = false;
    #smoothedGx = 0;
    #smoothedGy = 0;

    constructor(initial: Partial<MotionBlurParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(ctx: EffectContext): void {
        // Persistent → host ping-pongs so this frame's read sees last
        // frame's write.
        this.#prev = ctx.createRenderTarget({ persistent: true });
        // Float so flow vectors keep sign/precision in flat regions
        // where Ix² + Iy² is tiny.
        this.#flow = ctx.createRenderTarget({ float: true });
    }

    render(ctx: EffectContext): void {
        if (!this.#prev || !this.#flow) {
            return;
        }

        // Track scroll velocity directly. For a post-effect, ctx.src is
        // the whole canvas — its pixels shift with scroll, so optical
        // flow already sees motion, but underestimates magnitude in
        // oblique-gradient regions. Adding scroll delta restores the
        // true global magnitude. Sign-agnostic: the blur kernel is
        // centred on uvSrc so direction line is what matters.
        const sx = typeof window !== "undefined" ? window.scrollX : 0;
        const sy = typeof window !== "undefined" ? window.scrollY : 0;
        let rawGx = 0;
        let rawGy = 0;
        if (this.#prevScrollValid) {
            // Convert logical-px scroll delta → src-texel units
            // (≈ physical px, since src is canvas-sized).
            rawGx = (sx - this.#prevScrollX) * ctx.pixelRatio;
            rawGy = (sy - this.#prevScrollY) * ctx.pixelRatio;
        }
        this.#prevScrollX = sx;
        this.#prevScrollY = sy;
        this.#prevScrollValid = true;

        // EMA: a higher `velocitySmoothing` makes `smoothed` lag the
        // raw delta further, hiding wheel-scroll burst quantisation.
        const s = Math.max(0, Math.min(1, this.params.velocitySmoothing));
        const a = 1 - s;
        this.#smoothedGx = this.#smoothedGx * (1 - a) + rawGx * a;
        this.#smoothedGy = this.#smoothedGy * (1 - a) + rawGy * a;

        ctx.draw({
            frag: FRAG_FLOW,
            uniforms: {
                src: ctx.src,
                prev: this.#prev,
                lambda: Math.max(1e-8, this.params.lambda),
            },
            target: this.#flow,
        });

        ctx.draw({
            frag: FRAG_BLUR,
            uniforms: {
                src: ctx.src,
                flow: this.#flow,
                globalFlow: [this.#smoothedGx, this.#smoothedGy],
                strength: Math.max(0, this.params.strength),
                samples: Math.max(
                    1,
                    Math.min(64, Math.round(this.params.samples)),
                ),
                debug: Math.max(0, Math.min(2, Math.round(this.params.debug))),
                debugScale: Math.max(0, this.params.debugScale),
            },
            target: ctx.target,
        });

        // Stash this frame's src for next frame's temporal gradient.
        ctx.draw({
            frag: FRAG_COPY,
            uniforms: { src: ctx.src },
            target: this.#prev,
        });
    }

    dispose(): void {
        this.#prev = null;
        this.#flow = null;
        this.#prevScrollValid = false;
        this.#smoothedGx = 0;
        this.#smoothedGy = 0;
    }
}
