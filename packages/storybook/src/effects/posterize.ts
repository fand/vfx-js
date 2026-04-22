// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_POSTERIZE = `#version 300 es
precision highp float;
in vec2 uvInner;
out vec4 outColor;
uniform sampler2D src;
uniform float levels;

void main() {
    vec4 c = vec4(0.0);
    if (uvInner.x >= 0.0 && uvInner.x <= 1.0 &&
        uvInner.y >= 0.0 && uvInner.y <= 1.0) {
        c = texture(src, uvInner);
    }
    // Quantize each channel to N = levels discrete steps.
    vec3 q = floor(c.rgb * levels) / (levels - 1.0);
    outColor = vec4(q, c.a);
}
`;

export type PosterizeOptions = {
    /** Number of discrete color steps per channel. Default 4. */
    levels?: number;
};

/**
 * Stateful posterize effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call. (Internally
 * stateless, but the Effect contract reserves per-instance state.)
 */
export function createPosterizeEffect(opts: PosterizeOptions = {}): Effect {
    const levels = opts.levels ?? 4;
    return {
        render(ctx: EffectContext) {
            ctx.draw({
                frag: FRAG_POSTERIZE,
                uniforms: { src: ctx.src, levels },
                target: ctx.output,
            });
        },
    };
}
