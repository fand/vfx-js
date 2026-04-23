// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
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
    // uvInner is the src-sampling UV pointing into src's inner region.
    // uvInnerDst is the destination-space 0..1 over the element proper;
    // outside [0, 1] means pad — contribute nothing to the bright pass.
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

const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
// Single-texel step along the blur axis: [1/width, 0] for H or
// [0, 1/height] for V. Taps are always 1 texel apart to avoid sparse-
// sampling grid aliasing — use more iterations to widen the spread.
uniform vec2 texelStep;

// 9-tap gaussian (σ ≈ 2), precomputed weights.
const float W0 = 0.2270270270;
const float W1 = 0.1945945946;
const float W2 = 0.1216216216;
const float W3 = 0.0540540541;
const float W4 = 0.0162162162;

void main() {
    vec4 result = texture(src, uv) * W0;
    result += texture(src, uv + texelStep * 1.0) * W1;
    result += texture(src, uv - texelStep * 1.0) * W1;
    result += texture(src, uv + texelStep * 2.0) * W2;
    result += texture(src, uv - texelStep * 2.0) * W2;
    result += texture(src, uv + texelStep * 3.0) * W3;
    result += texture(src, uv - texelStep * 3.0) * W3;
    result += texture(src, uv + texelStep * 4.0) * W4;
    result += texture(src, uv - texelStep * 4.0) * W4;
    outColor = result;
}
`;

const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvInner;
in vec2 uvInnerDst;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D bloom;
uniform float intensity;

void main() {
    vec4 baseColor = vec4(0.0);
    bool inside =
        uvInnerDst.x >= 0.0 && uvInnerDst.x <= 1.0 &&
        uvInnerDst.y >= 0.0 && uvInnerDst.y <= 1.0;
    if (inside) {
        baseColor = texture(src, uvInner);
    }
    vec4 bloomColor = texture(bloom, uv) * intensity;
    vec3 rgb = baseColor.rgb + bloomColor.rgb;
    float a = max(baseColor.a, bloomColor.a);
    outColor = vec4(rgb, a);
}
`;

export type BloomOptions = {
    /** Luminance cutoff in [0,1]. Pixels below this are suppressed. Default 0.7. */
    threshold?: number;
    /** Smoothstep width above the threshold. Default 0.1. */
    softness?: number;
    /** Additive gain applied to the blurred bright pass. Default 1.2. */
    intensity?: number;
    /**
     * Number of H+V separable-blur passes. Each iteration adds
     * ~4 texels of spread; cumulative spread ≈ 2×sqrt(iterations)×σ
     * (σ=2). Default 6 — ~20-texel effective radius.
     */
    iterations?: number;
    /**
     * Extra pad around the element (physical px) for the glow to spread
     * into. `"fullscreen"` reaches the viewport edges on all sides.
     * Omit → no pad grown by bloom itself; compose with a prior
     * padding effect to get room for the glow.
     */
    pad?: number | "fullscreen";
};

/**
 * Stateful bloom effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call.
 *
 * Pipeline per frame (deterministic, no feedback):
 *   src  → [threshold]  → bright
 *   bright → [blur H,V × N] ping-pong → blurred
 *   (src, blurred) → [composite] → ctx.output
 */
export function createBloomEffect(opts: BloomOptions = {}): Effect {
    const threshold = opts.threshold ?? 0.7;
    const softness = opts.softness ?? 0.1;
    const intensity = opts.intensity ?? 1.2;
    const iterations = opts.iterations ?? 6;
    const pad = opts.pad;

    let bright: EffectRenderTarget | null = null;
    let pingA: EffectRenderTarget | null = null;
    let pingB: EffectRenderTarget | null = null;

    const effect: Effect = {
        init(ctx: EffectContext) {
            bright = ctx.createRenderTarget();
            pingA = ctx.createRenderTarget();
            pingB = ctx.createRenderTarget();
        },
        render(ctx: EffectContext) {
            if (!bright || !pingA || !pingB) {
                return;
            }

            // 1. Extract bright pixels.
            ctx.draw({
                frag: FRAG_THRESHOLD,
                uniforms: { src: ctx.src, threshold, softness },
                target: bright,
            });

            // 2. Separable blur, ping-pong between pingA / pingB. The
            //    first H pass seeds pingA from `bright`; subsequent
            //    passes alternate read/write. Always step 1 texel per
            //    tap so the 9-tap kernel stays contiguous (no sparse-
            //    sample grid aliasing).
            let read: EffectRenderTarget = bright;
            let write: EffectRenderTarget = pingA;
            for (let pass = 0; pass < iterations * 2; pass++) {
                const step: [number, number] =
                    pass % 2 === 0
                        ? [1 / bright.width, 0]
                        : [0, 1 / bright.height];
                ctx.draw({
                    frag: FRAG_BLUR,
                    uniforms: { src: read, texelStep: step },
                    target: write,
                });
                read = write;
                write = write === pingA ? pingB : pingA;
            }

            // 3. Composite src + blurred * intensity → ctx.output.
            ctx.draw({
                frag: FRAG_COMPOSITE,
                uniforms: { src: ctx.src, bloom: read, intensity },
                target: ctx.output,
            });
        },
        dispose() {
            bright = null;
            pingA = null;
            pingB = null;
        },
    };

    if (pad !== undefined) {
        effect.outputSize = (dims) => {
            if (pad === "fullscreen") {
                return { pad: dims.fullscreenPad };
            }
            return { pad };
        };
    }

    return effect;
}
