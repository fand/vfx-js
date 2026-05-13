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

export type ScanlineParams = {
    /** Line spacing in CSS px. */
    spacing: number;
};

const DEFAULT_PARAMS: ScanlineParams = { spacing: 4 };

export class ScanlineEffect implements Effect {
    params: ScanlineParams;

    constructor(initial: Partial<ScanlineParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<ScanlineParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const { spacing } = this.params;
        ctx.draw({
            frag: FRAG_SCANLINE,
            uniforms: {
                src: ctx.src,
                innerHeight: ctx.dims.element[1] || 1,
                spacing,
            },
            target: ctx.target,
        });
    }
}
