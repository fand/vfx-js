// Zero-runtime-dep effect: this file imports ONLY types from
// @vfx-js/core. `import type` is erased at compile time, so the built
// module has no runtime dependency on the core package.
import type {
    Effect,
    EffectContext,
    EffectRenderTarget,
} from "@vfx-js/core";

const FRAG_ACCUMULATE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvInner;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D prev;
uniform float decay;

void main() {
    // Only sample the source within the element's inner rect so the
    // trail pad (overflow region) shows only the accumulated history.
    vec4 srcColor = vec4(0.0);
    if (uvInner.x >= 0.0 && uvInner.x <= 1.0 &&
        uvInner.y >= 0.0 && uvInner.y <= 1.0) {
        srcColor = texture(src, uvInner);
    }
    vec4 prevColor = texture(prev, uv) * decay;
    // Max-blend so moving shapes leave a bright trail.
    outColor = max(srcColor, prevColor);
}
`;

const FRAG_COPY = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`;

export type TrailOptions = {
    /** Per-frame multiplier applied to the previous frame. 0..1. Default 0.95. */
    decay?: number;
};

/**
 * Stateful trail effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call.
 */
export function createTrailEffect(opts: TrailOptions = {}): Effect {
    const decay = opts.decay ?? 0.95;
    let feedback: EffectRenderTarget | null = null;

    return {
        init(ctx: EffectContext) {
            feedback = ctx.createRenderTarget({ persistent: true });
        },
        render(ctx: EffectContext) {
            if (!feedback) return;
            // Accumulate: current src ⊕ decayed previous frame.
            ctx.draw({
                frag: FRAG_ACCUMULATE,
                uniforms: {
                    src: ctx.src,
                    prev: feedback,
                    decay,
                },
                target: feedback,
            });
            // Blit feedback onto the final target.
            ctx.draw({
                frag: FRAG_COPY,
                uniforms: { src: feedback },
                target: ctx.output,
            });
        },
        dispose() {
            feedback = null;
        },
    };
}
