import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
} from "@vfx-js/core";

const trailFrag = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D prev;
uniform vec4 srcRectUv;
uniform vec2 shift;

vec4 readSrc(vec2 p) {
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return vec4(0);
    return texture(src, srcRectUv.xy + p * srcRectUv.zw);
}

void main() {
    vec4 color = readSrc(uvContent - shift);
    // Fade the last frame and shift its color.
    vec4 last = texture(prev, uv) * vec4(0.9, 0.8, 0.96, 0.96);
    outColor = max(color, last);
}
`;

const copyFrag = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D buffer;

void main() {
    outColor = texture(buffer, uv);
}
`;

export class TrailEffect implements Effect {
    #buffer: EffectRenderTarget | null = null;

    init(ctx: EffectContext) {
        // Keeps the last frame. Follows the output size.
        this.#buffer = ctx.createRenderTarget({ persistent: true });
    }

    render(ctx: EffectContext) {
        if (!this.#buffer) {
            return;
        }
        const t = ctx.time * 2;
        ctx.draw({
            frag: trailFrag,
            uniforms: {
                src: ctx.src,
                prev: this.#buffer, // read: last frame
                shift: [Math.cos(t) * 0.12, Math.sin(t) * 0.12],
            },
            target: this.#buffer, // write: this frame
        });
        ctx.draw({
            frag: copyFrag,
            uniforms: { buffer: this.#buffer },
            target: ctx.target,
        });
    }

    // Draw 60 CSS px outside the element on every side.
    outputRect(dims: EffectDims) {
        const pad = 60 * dims.pixelRatio;
        const [, , w, h] = dims.contentRect;
        return [-pad, -pad, w + pad * 2, h + pad * 2] as const;
    }

    dispose() {
        this.#buffer = null;
    }
}
