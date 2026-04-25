// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_POSTERIZE = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float levels;

void main() {
    // uvContent gates on the element proper (pad yields zeros). uvSrc
    // resolves the src sample into src's inner region, correct whether
    // src is capture or a prior stage's intermediate.
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        c = texture(src, uvSrc);
    }
    // Quantize each channel to N = levels discrete steps.
    // Output bands: 0, 1/N, 2/N, ..., (N-1)/N. Values stay in [0,1).
    vec3 q = floor(c.rgb * levels) / levels;
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
