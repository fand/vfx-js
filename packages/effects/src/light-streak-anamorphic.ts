// Anamorphic light streak via KinoStreak's horizontal bloom pyramid
// (keijiro/KinoStreak), with brightness-decoupled chromatic dispersion.
//
// Pipeline (all buffers full height, width halving each level):
//   prefilter : threshold highlights (max-channel soft knee) + a small
//               vertical blur → level 0.
//   downsample: 6-tap horizontal box, width halved per level → a
//               horizontal mip pyramid.
//   upsample  : mix(thisLevel, upsampled(lowerLevel), stretch), bottom→top.
//   composite : streak × tint × intensity over the source.
//
// Unlike the Kawase/Blender streak (which grows tap *offsets* at constant
// resolution), the spread here comes from halving resolution and letting
// bilinear upsampling smear it — cheaper, but horizontal-only (true
// anamorphic). For stars / arbitrary angles use LightStreakGlareEffect or
// LightStreakEffect.
//
// Chromatic dispersion is "method A": the per-level upsample blend
// `stretch` is made PER-CHANNEL (red reaches further, blue stays nearer,
// matching diffraction's wavelength dependence). Because each channel is
// a complete normalised streak at a different reach — not an attenuated
// one — dispersion shifts colour without changing overall brightness.
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

// Threshold + small vertical blur. Max-channel soft knee (KinoStreak),
// hue preserved; optional upper clamp tames blown-out sources.
const FRAG_PREFILTER = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float maxBrightness;
uniform float dy;

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;

    vec3 a = texture(src, clamp(uvSrc + vec2(0.0, -dy), 0.0, 1.0)).rgb;
    vec3 b = texture(src, clamp(uvSrc + vec2(0.0, dy), 0.0, 1.0)).rgb;
    vec3 c = (a + b) * 0.5 * m;

    float br = max(c.r, max(c.g, c.b));
    if (br > maxBrightness) {
        c *= maxBrightness / max(br, 1e-5);
        br = maxBrightness;
    }
    c *= max(0.0, br - threshold) / max(br, 1e-5);
    outColor = vec4(c, 1.0);
}
`;

// Horizontal 6-tap box, rendered into a half-width target.
const FRAG_DOWN = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform float texelX;  // 1 / source width

void main() {
    float dx = texelX * 1.25;
    vec3 c = texture(src, uv + vec2(-dx * 5.0, 0.0)).rgb;
    c += texture(src, uv + vec2(-dx * 3.0, 0.0)).rgb;
    c += texture(src, uv + vec2(-dx * 1.0, 0.0)).rgb;
    c += texture(src, uv + vec2(dx * 1.0, 0.0)).rgb;
    c += texture(src, uv + vec2(dx * 3.0, 0.0)).rgb;
    c += texture(src, uv + vec2(dx * 5.0, 0.0)).rgb;
    outColor = vec4(c / 6.0, 1.0);
}
`;

// Upsample: blend this level with the (3-tap smoothed) lower level. The
// blend factor is per-channel so red reaches further than blue.
const FRAG_UP = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D lowTex;
uniform sampler2D highTex;
uniform vec3 stretch;
uniform float texelXLow;  // 1 / lower-level width

void main() {
    vec3 up = texture(lowTex, uv).rgb * 0.5;
    up += texture(lowTex, uv + vec2(texelXLow, 0.0)).rgb * 0.25;
    up += texture(lowTex, uv + vec2(-texelXLow, 0.0)).rgb * 0.25;

    vec3 high = texture(highTex, uv).rgb;
    outColor = vec4(mix(high, up, stretch), 1.0);
}
`;

// Composite the streak over the masked source (premultiplied).
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
    vec3 g = texture(streak, uv).rgb * tint * intensity;

    vec3 rgb = base.rgb * base.a + g;
    float a = clamp(max(base.a, dot(g, vec3(0.2126, 0.7152, 0.0722))), 0.0, 1.0);
    outColor = vec4(rgb, a);
}
`;

const MAX_LEVELS = 8;

export type AnamorphicStreakParams = {
    /** Highlight luminance cutoff in [0,1]. */
    threshold: number;
    /** Upper clamp on highlight brightness — tame blown-out sources. */
    maxBrightness: number;
    /**
     * Streak reach, 0..0.95. Per-level upsample blend (KinoStreak
     * `_Stretch`); higher reaches further. Approaches infinite reach at 1.
     */
    stretch: number;
    /**
     * Chromatic dispersion, 0..1. Spreads the per-channel reach (red
     * further, blue nearer). Brightness-preserving — it shifts colour
     * toward the tips, not overall level.
     */
    dispersion: number;
    /** Streak gain in the composite. */
    intensity: number;
    /** Per-channel multiplier on the streak colour. */
    tint: readonly [number, number, number];
    /**
     * Internal processing scale, 0.25..1. Lower is faster and softens the
     * streak's vertical cross-section.
     */
    resolution: number;
    /**
     * Extra pad around the element in CSS px so streaks aren't clipped.
     * `"fullscreen"` reaches the viewport edges.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: AnamorphicStreakParams = {
    threshold: 0.75,
    maxBrightness: 1.0,
    stretch: 0.78,
    dispersion: 0.3,
    intensity: 2.0,
    tint: [0.7, 0.85, 1.0],
    resolution: 0.5,
    pad: 240,
};

/**
 * Anamorphic light-streak effect built from KinoStreak's horizontal bloom
 * pyramid, with brightness-decoupled chromatic dispersion. The lightest of
 * the streak effects, but horizontal-only — pair with
 * {@link LightStreakGlareEffect} / {@link LightStreakEffect} for stars and
 * arbitrary angles. Mutate `params` directly or via `setParams`.
 */
export class AnamorphicStreakEffect implements Effect {
    params: AnamorphicStreakParams;

    #down: EffectRenderTarget[] = [];
    #up: EffectRenderTarget[] = [];
    #levels = 0;
    #lastW = 0;
    #lastH = 0;

    constructor(initial: Partial<AnamorphicStreakParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<AnamorphicStreakParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const dst = this.outputRect(ctx.dims);
        const scale = Math.min(1, Math.max(0.1, this.params.resolution));
        const baseW = Math.max(2, Math.round(dst[2] * scale));
        const baseH = Math.max(2, Math.round(dst[3] * scale));
        const levels = Math.max(
            2,
            Math.min(MAX_LEVELS, Math.floor(Math.log2(baseW)) - 1),
        );

        if (
            baseW !== this.#lastW ||
            baseH !== this.#lastH ||
            levels !== this.#levels
        ) {
            this.#down = [];
            this.#up = [];
            for (let i = 0; i < levels; i++) {
                const w = Math.max(1, baseW >> i);
                const opts = {
                    size: [w, baseH] as [number, number],
                    float: true,
                    filter: "linear" as const,
                };
                this.#down.push(ctx.createRenderTarget(opts));
                this.#up.push(ctx.createRenderTarget(opts));
            }
            this.#levels = levels;
            this.#lastW = baseW;
            this.#lastH = baseH;
        }
        const down = this.#down;
        const up = this.#up;
        if (down.length < 2) {
            return;
        }

        // Prefilter highlights into the top level.
        ctx.draw({
            frag: FRAG_PREFILTER,
            target: down[0],
            uniforms: {
                src: ctx.src,
                threshold: this.params.threshold,
                maxBrightness: this.params.maxBrightness,
                dy: 0.75 / baseH,
            },
        });

        // Downsample chain (width halving).
        for (let i = 1; i < levels; i++) {
            ctx.draw({
                frag: FRAG_DOWN,
                target: down[i],
                uniforms: { src: down[i - 1], texelX: 1 / down[i - 1].width },
            });
        }

        // Per-channel reach for dispersion (red further, blue nearer).
        const s = this.params.stretch;
        const d = this.params.dispersion;
        const clampS = (x: number) => Math.min(0.95, Math.max(0, x));
        const stretch: [number, number, number] = [
            clampS(s * (1 + d * 0.5)),
            clampS(s),
            clampS(s * (1 - d * 0.5)),
        ];

        // Upsample chain (bottom → top).
        let low: EffectRenderTarget = down[levels - 1];
        for (let i = levels - 2; i >= 0; i--) {
            ctx.draw({
                frag: FRAG_UP,
                target: up[i],
                uniforms: {
                    lowTex: low,
                    highTex: down[i],
                    stretch,
                    texelXLow: 1 / low.width,
                },
            });
            low = up[i];
        }

        // Composite the top-level streak over the source.
        ctx.draw({
            frag: FRAG_COMPOSITE,
            target: ctx.target,
            uniforms: {
                src: ctx.src,
                streak: low,
                intensity: this.params.intensity,
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
        this.#down = [];
        this.#up = [];
        this.#levels = 0;
        this.#lastW = 0;
        this.#lastH = 0;
    }
}
