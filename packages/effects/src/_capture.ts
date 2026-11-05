// Copies into custom-sized render targets.
// `ctx.blit` and the `uvSrc` / `uvContent` varyings follow the stage's rects,
// so under a padded stage they don't map onto element-sized targets.
import type {
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";

const FRAG_CAPTURE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
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

/** Copy the content rect of `ctx.src` (no pad) into the whole `target`. */
export function captureContent(
    ctx: EffectContext,
    target: EffectRenderTarget,
): void {
    ctx.draw({ frag: FRAG_CAPTURE, uniforms: { src: ctx.src }, target });
}

/** Copy `src` into the whole `target`, both 0..1. */
export function copyRT(
    ctx: EffectContext,
    src: EffectTexture | EffectRenderTarget,
    target: EffectRenderTarget,
): void {
    ctx.draw({ frag: FRAG_COPY, uniforms: { src }, target });
}
