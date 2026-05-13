// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_PIXELATE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 cellUv;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Snap to cell centers in dst inner UV, then remap into src
        // inner region via srcRectUv so sampling is correct whether
        // src is capture or a prior stage's padded intermediate.
        vec2 cell = (floor(uvContent / cellUv) + 0.5) * cellUv;
        vec2 uv = srcRectUv.xy + clamp(cell, 0.0, 1.0) * srcRectUv.zw;
        c = texture(src, uv);
    }
    outColor = c;
}
`;

export type PixelateParams = {
    /** Cell size in CSS px. */
    size: number;
};

const DEFAULT_PARAMS: PixelateParams = { size: 10 };

export class PixelateEffect implements Effect {
    params: PixelateParams;

    constructor(initial: Partial<PixelateParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<PixelateParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.element;
        const { size } = this.params;
        ctx.draw({
            frag: FRAG_PIXELATE,
            uniforms: {
                src: ctx.src,
                cellUv: [size / (w || 1), size / (h || 1)],
            },
            target: ctx.target,
        });
    }
}
