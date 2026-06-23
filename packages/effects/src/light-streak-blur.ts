// Anamorphic / aperture light streaks via fullscreen directional blur —
// the "bloom-family" counterpart to the instanced LightStreakEffect.
//
// Pipeline (all intermediate buffers are float, auto-sized to the padded
// output so streaks can spread past the element edge):
//   1. threshold  : gate highlights → `bright`
//   2. per ray d  : Kawase progressive directional blur of `bright`,
//                   accumulated into `accum`
//   3. emit       : add `accum × tint × intensity` over the source image
//
// The directional blur is the classic GPU-Gems streak filter: each pass
// takes 4 taps spaced at `base^pass` texels along the ray, with a
// per-pixel attenuation falloff. `passes` doublings (base = 4) reach a
// long, smooth tail from only a handful of cheap 4-tap passes — far
// cheaper than a single wide gather.
//
// `streaks` spans both looks, same convention as LightStreakEffect:
//   2 rays → horizontal anamorphic flare; n rays → n-ray aperture star.
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// Highlight gate. Samples the source content (masked to the inner rect so
// streaks never originate from the pad), and writes a luminance-gated,
// premultiplied colour into the bright buffer.
const FRAG_THRESHOLD = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float gamma;

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float mask = inS.x * inS.y * inC.x * inC.y;

    vec3 col = texture(src, clamp(uvSrc, 0.0, 1.0)).rgb * mask;
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float gate = pow(smoothstep(threshold, 1.0, lum), gamma);
    outColor = vec4(col * gate, gate);
}
`;

// One Kawase streak pass: 4 one-sided taps along `dir`, spaced `stride`
// px apart, weighted by a per-pixel attenuation. Normalised by the weight
// sum so brightness stays bounded as the tail lengthens across passes.
// Out-of-buffer taps are masked to zero (not clamped) so the source's
// edge texels don't streak/replicate across the pad ("bleed").
const FRAG_STREAK = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 dir;          // unit ray direction (px space)
uniform vec2 texelSize;    // 1/w, 1/h of src
uniform float stride;      // tap spacing this pass (px)
uniform float attenuation; // per-px falloff in (0,1)

void main() {
    vec4 c = vec4(0.0);
    float wsum = 0.0;
    for (int b = 0; b < 4; b++) {
        float distPx = float(b) * stride;
        float w = pow(attenuation, distPx);
        vec2 suv = uv + dir * distPx * texelSize;
        vec2 inb = step(vec2(0.0), suv) * step(suv, vec2(1.0));
        c += texture(src, suv) * (w * inb.x * inb.y);
        wsum += w;
    }
    outColor = c / max(wsum, 1e-5);
}
`;

// Composite the source and the accumulated streaks in one premultiplied
// pass. The base is hard-masked to the inner rect (uvSrc/uvContent in
// [0,1]) so the capture's edge texels never clamp-replicate across the
// pad — sampling the source via ctx.blit, which has no such mask, is what
// made the image "bleed" into the padded region as `length`/`pad` grew.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D streak;
uniform vec3 tint;
uniform float intensity;

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;

    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0)) * m;
    vec3 glow = texture(streak, uv).rgb * tint * intensity;

    // Premultiplied: base contributes rgb*a, the streak adds light on top.
    vec3 rgb = base.rgb * base.a + glow;
    float a = clamp(
        max(base.a, dot(glow, vec3(0.2126, 0.7152, 0.0722))),
        0.0,
        1.0
    );
    outColor = vec4(rgb, a);
}
`;

export type LightStreakBlurParams = {
    /**
     * Number of rays. `2` → horizontal anamorphic flare; `n` → n-ray
     * aperture starburst. For a physical aperture map blade count to
     * spikes: `blades` if even, `2 * blades` if odd.
     */
    streaks: number;
    /** Base rotation of the ray fan, in radians. */
    angle: number;
    /** Streak reach in CSS (logical) px. */
    length: number;
    /**
     * Maximum directional-blur passes (quality/reach cap). The first pass
     * is a fine ~1 px blur and each later pass triples its reach; the
     * actual count used is derived from `length` and capped here. Raise to
     * allow longer streaks, lower to bound cost.
     */
    passes: number;
    /** Per-pixel brightness falloff along the streak, in (0,1). */
    attenuation: number;
    /** Luminance gate in [0,1]. Only highlights above this throw streaks. */
    threshold: number;
    /** Gate response curve. Higher = sharper highlight selection. */
    gamma: number;
    /** Additive gain on the streaks. */
    intensity: number;
    /** Per-channel multiplier on the streak colour. */
    tint: readonly [number, number, number];
    /**
     * Extra pad around the element in CSS px so streaks aren't clipped.
     * Should be ≥ `length`. `"fullscreen"` reaches the viewport edges.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: LightStreakBlurParams = {
    streaks: 2,
    angle: 0,
    length: 220,
    passes: 6,
    attenuation: 0.97,
    threshold: 0.75,
    gamma: 2.0,
    intensity: 1.0,
    tint: [0.6, 0.8, 1.0],
    pad: 220,
};

// 4 one-sided taps span 3 intervals; base 3 makes consecutive passes tile
// edge-to-edge with no gaps (base 4 would leave a 1-interval hole each
// pass, which reads as a dashed/jagged streak).
const STREAK_BASE = 3;

/**
 * Light-streak effect (anamorphic flare / aperture starburst) built from a
 * Kawase directional blur. Heavier but smoother and longer-tailed than the
 * instanced {@link LightStreakEffect}; prefer this when you want long,
 * clean streaks. Mutate `params` directly or via `setParams`.
 */
export class LightStreakBlurEffect implements Effect {
    params: LightStreakBlurParams;

    #bright: EffectRenderTarget | null = null;
    #scratch0: EffectRenderTarget | null = null;
    #scratch1: EffectRenderTarget | null = null;
    #accum: EffectRenderTarget | null = null;

    constructor(initial: Partial<LightStreakBlurParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<LightStreakBlurParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        // Float so the gated highlights keep precision through the blur
        // chain; auto-sized so they track the padded output rect.
        this.#bright = ctx.createRenderTarget({ float: true });
        this.#scratch0 = ctx.createRenderTarget({ float: true });
        this.#scratch1 = ctx.createRenderTarget({ float: true });
        this.#accum = ctx.createRenderTarget({ float: true });
    }

    render(ctx: EffectContext): void {
        const bright = this.#bright;
        const scratch0 = this.#scratch0;
        const scratch1 = this.#scratch1;
        const accum = this.#accum;
        if (!bright || !scratch0 || !scratch1 || !accum) {
            return;
        }

        ctx.draw({
            frag: FRAG_THRESHOLD,
            uniforms: {
                src: ctx.src,
                threshold: this.params.threshold,
                gamma: this.params.gamma,
            },
            target: bright,
        });

        const rays = Math.max(1, Math.round(this.params.streaks));
        const pr = ctx.dims.pixelRatio;
        const lengthPx = Math.max(0, this.params.length) * pr;
        // The first pass is a fine ~1 CSS px blur (smooth, gap-free); each
        // later pass triples its reach. Derive how many passes are needed
        // to span `length`, capped by `passes` so cost stays bounded.
        // Keeping pass 0 fine — instead of scaling it to `length` — is what
        // stops long streaks from breaking into discrete, jagged copies.
        const stride0 = Math.max(1, pr);
        const cap = Math.max(1, Math.round(this.params.passes));
        let passes = 1;
        while (
            passes < cap &&
            3 * stride0 * STREAK_BASE ** (passes - 1) < lengthPx
        ) {
            passes++;
        }
        const texelSize: [number, number] = [
            1 / bright.width,
            1 / bright.height,
        ];

        for (let k = 0; k < rays; k++) {
            const angle = this.params.angle + (k * Math.PI * 2) / rays;
            const dir: [number, number] = [Math.cos(angle), Math.sin(angle)];

            let input: EffectRenderTarget = bright;
            for (let p = 0; p < passes; p++) {
                const last = p === passes - 1;
                // Last pass of each ray lands in `accum`: overwrite for the
                // first ray (clears last frame), add for the rest.
                const target = last ? accum : p % 2 === 0 ? scratch0 : scratch1;
                const blend = last && k > 0 ? "additive" : "none";
                ctx.draw({
                    frag: FRAG_STREAK,
                    blend,
                    target,
                    uniforms: {
                        src: input,
                        dir,
                        texelSize,
                        stride: stride0 * STREAK_BASE ** p,
                        attenuation: this.params.attenuation,
                    },
                });
                input = target;
            }
        }

        // Single premultiplied composite of source + streaks.
        ctx.draw({
            frag: FRAG_COMPOSITE,
            target: ctx.target,
            uniforms: {
                src: ctx.src,
                streak: accum,
                tint: [
                    this.params.tint[0],
                    this.params.tint[1],
                    this.params.tint[2],
                ],
                intensity: this.params.intensity,
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
        this.#bright = null;
        this.#scratch0 = null;
        this.#scratch1 = null;
        this.#accum = null;
    }
}
