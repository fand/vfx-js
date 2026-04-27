// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_SCANLINE = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float innerHeight;
uniform float spacing;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Keep one 1-px line per spacing-px band; rest goes black.
        float yPx = uvContent.y * innerHeight;
        if (mod(floor(yPx), spacing) < 1.0) {
            c = texture(src, uvSrc);
        }
    }
    outColor = c;
}
`;

export type ScanlineOptions = {
    /** Line spacing in physical px. Default 4. */
    spacing?: number;
};

/**
 * Stateful scanline effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call.
 */
export function createScanlineEffect(opts: ScanlineOptions = {}): Effect {
    const spacing = opts.spacing ?? 4;
    return {
        render(ctx: EffectContext) {
            ctx.draw({
                frag: FRAG_SCANLINE,
                uniforms: {
                    src: ctx.src,
                    innerHeight: ctx.src.height || 1,
                    spacing,
                },
                target: ctx.output,
            });
        },
    };
}
