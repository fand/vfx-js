// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_PIXELATE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 rectSrc;
uniform vec2 cellUv;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Snap to cell centers in dst inner UV, then remap into src
        // inner region via rectSrc so sampling is correct whether
        // src is capture or a prior stage's padded intermediate.
        vec2 cell = (floor(uvContent / cellUv) + 0.5) * cellUv;
        vec2 uv = rectSrc.xy + clamp(cell, 0.0, 1.0) * rectSrc.zw;
        c = texture(src, uv);
    }
    outColor = c;
}
`;

export type PixelateOptions = {
    /** Cell size in physical px. Default 10. */
    size?: number;
};

/**
 * Stateful pixelate effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call.
 */
export function createPixelateEffect(opts: PixelateOptions = {}): Effect {
    const size = opts.size ?? 10;
    return {
        render(ctx: EffectContext) {
            const w = ctx.src.width || 1;
            const h = ctx.src.height || 1;
            ctx.draw({
                frag: FRAG_PIXELATE,
                uniforms: {
                    src: ctx.src,
                    cellUv: [size / w, size / h],
                },
                target: ctx.target,
            });
        },
    };
}
