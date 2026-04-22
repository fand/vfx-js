// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_RGB_MIX = `#version 300 es
precision highp float;
in vec2 uvInner;
in vec2 uvInnerDst;
out vec4 outColor;
uniform sampler2D src;
uniform vec3 gains;

void main() {
    vec4 c = vec4(0.0);
    if (uvInnerDst.x >= 0.0 && uvInnerDst.x <= 1.0 &&
        uvInnerDst.y >= 0.0 && uvInnerDst.y <= 1.0) {
        c = texture(src, uvInner);
    }
    outColor = vec4(c.rgb * gains, c.a);
}
`;

export type RgbMixOptions = {
    /** Per-channel multipliers applied to src. Default `[1, 1, 1]`. */
    gains?: readonly [number, number, number];
};

/**
 * Stateful RGB-mix effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call.
 *
 * Multiplies each channel of src by the corresponding entry in `gains`.
 * `[0, 1, 0]` isolates the green channel; `[1, 0, 0]` isolates red.
 */
export function createRgbMixEffect(opts: RgbMixOptions = {}): Effect {
    const gains = opts.gains ?? ([1, 1, 1] as const);
    const gainsTuple: [number, number, number] = [gains[0], gains[1], gains[2]];
    return {
        render(ctx: EffectContext) {
            ctx.draw({
                frag: FRAG_RGB_MIX,
                uniforms: { src: ctx.src, gains: gainsTuple },
                target: ctx.output,
            });
        },
    };
}
