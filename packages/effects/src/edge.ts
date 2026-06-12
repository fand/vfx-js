// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// Edge detection rendered as glowing colored lines. A Sobel operator runs
// over the element's luminance×alpha, and the gradient magnitude is drawn
// as a line in `color`, premultiplied and transparent elsewhere.
//
// On its own this is a thin neon outline; pair it with `BloomEffect` (see
// `saber2()`) to turn the lines into electric energy.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_EDGE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 texel;
uniform vec3 color;
uniform float intensity;
uniform float threshold;

// Luminance×alpha at a content-space UV (0..1 over the element), remapped
// into the (possibly padded) src buffer. Transparent outside the content.
float field(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) {
        return 0.0;
    }
    vec4 v = texture(src, srcRectUv.xy + c * srcRectUv.zw);
    return dot(v.rgb, vec3(0.299, 0.587, 0.114)) * v.a;
}

void main() {
    vec2 t = texel;

    float tl = field(uvContent + vec2(-t.x, -t.y));
    float l  = field(uvContent + vec2(-t.x,  0.0));
    float bl = field(uvContent + vec2(-t.x,  t.y));
    float tp = field(uvContent + vec2( 0.0, -t.y));
    float bt = field(uvContent + vec2( 0.0,  t.y));
    float tr = field(uvContent + vec2( t.x, -t.y));
    float r  = field(uvContent + vec2( t.x,  0.0));
    float br = field(uvContent + vec2( t.x,  t.y));

    float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
    float gy = (bl + 2.0 * bt + br) - (tl + 2.0 * tp + tr);
    float e = length(vec2(gx, gy));

    e = clamp(smoothstep(threshold, threshold + 0.25, e) * intensity, 0.0, 1.0);

    // Premultiplied line color; bloom downstream reads this as its source.
    outColor = vec4(color * e, e);
}
`;

export type EdgeParams = {
    /** Line color (linear RGB, 0..1). */
    color: [number, number, number];
    /** Line brightness multiplier (clamped to 1). */
    intensity: number;
    /** Gradient magnitude at which a line starts to appear. */
    threshold: number;
    /** Line width in source pixels (Sobel sampling radius). */
    thickness: number;
};

const DEFAULT_PARAMS: EdgeParams = {
    color: [0.35, 0.65, 1.0],
    intensity: 1.0,
    threshold: 0.08,
    thickness: 1.0,
};

/**
 * Sobel edge detection drawn as glowing colored lines.
 *
 * Mutate `params` directly or via {@link setParams}; uniforms read live
 * each frame.
 */
export class EdgeEffect implements Effect {
    params: EdgeParams;

    constructor(initial: Partial<EdgeParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<EdgeParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const { color, intensity, threshold, thickness } = this.params;
        const [, , cw, ch] = ctx.dims.contentRect;
        ctx.draw({
            frag: FRAG_EDGE,
            uniforms: {
                src: ctx.src,
                texel: [thickness / (cw || 1), thickness / (ch || 1)],
                color,
                intensity,
                threshold,
            },
            target: ctx.target,
        });
    }
}
