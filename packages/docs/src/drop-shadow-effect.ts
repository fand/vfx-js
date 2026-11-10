import type { Effect, EffectContext, EffectDims } from "@vfx-js/core";

/** Blurred alpha of `read()` around `uv`, from 5 reads. `blurUv` is the blur radius in uv. */
export const SHADOW_GLSL = `
float shadowAlpha(vec2 uv, vec2 blurUv) {
    vec2 d = blurUv * 0.5;
    float sum = read(uv).a * 2.0;
    sum += read(uv + vec2(-d.x, -d.y)).a;
    sum += read(uv + vec2( d.x, -d.y)).a;
    sum += read(uv + vec2(-d.x,  d.y)).a;
    sum += read(uv + vec2( d.x,  d.y)).a;
    return sum / 6.0;
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 elementPx;
uniform vec2 offsetPx;
uniform float blurPx;
uniform float opacity;

vec4 read(vec2 uv) {
    vec2 t = srcRectUv.xy + uv * srcRectUv.zw;
    if (any(lessThan(t, vec2(0.0))) || any(greaterThan(t, vec2(1.0)))) return vec4(0.0);
    return texture(src, t);
}
${SHADOW_GLSL}
void main(void) {
    vec4 color = read(uvContent);
    float a = shadowAlpha(uvContent - offsetPx / elementPx, vec2(blurPx) / elementPx) * opacity;
    // Draw the element over a black shadow. Colors are premultiplied.
    outColor = color + vec4(0.0, 0.0, 0.0, a) * (1.0 - color.a);
}
`;

export type DropShadowOptions = {
    /** Shadow offset in CSS px, [x, y]. y goes up. Default [0, -8]. */
    offset?: [number, number];
    /** Blur radius in CSS px. Default 16. */
    blur?: number;
    /** Shadow opacity, 0 to 1. Default 0.5. */
    opacity?: number;
};

/** Black drop shadow under the element. */
export class DropShadowEffect implements Effect {
    offset: [number, number];
    blur: number;
    opacity: number;

    constructor({
        offset = [0, -1],
        blur = 1,
        opacity = 0.5,
    }: DropShadowOptions = {}) {
        this.offset = offset;
        this.blur = blur;
        this.opacity = opacity;
    }

    render(ctx: EffectContext): void {
        const pr = ctx.dims.pixelRatio;
        ctx.draw({
            frag: FRAG,
            uniforms: {
                src: ctx.src,
                elementPx: [...ctx.dims.elementPixel],
                offsetPx: [this.offset[0] * pr, this.offset[1] * pr],
                blurPx: this.blur * pr,
                opacity: this.opacity,
            },
            target: ctx.target,
        });
    }

    // Grow the input rect so the shadow has room.
    outputRect(dims: EffectDims): [number, number, number, number] {
        const pr = dims.pixelRatio;
        const pad =
            (this.blur +
                Math.max(Math.abs(this.offset[0]), Math.abs(this.offset[1]))) *
            pr;
        const [sx, sy, sw, sh] = dims.srcRect;
        const [, , ew, eh] = dims.contentRect;
        const x0 = Math.min(sx, -pad);
        const y0 = Math.min(sy, -pad);
        const x1 = Math.max(sx + sw, ew + pad);
        const y1 = Math.max(sy + sh, eh + pad);
        return [x0, y0, x1 - x0, y1 - y0];
    }
}
