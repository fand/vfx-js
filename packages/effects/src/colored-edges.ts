// Detects edges and tints them with a two-color gradient over a solid
// background. Ported from Figma's "Colored edges" shader effect.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";
import { parseHexColor } from "./_figma-common";

const FRAG_COLORED_EDGES = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform float threshold;
uniform float thickness;
uniform float intensity;
uniform float opacity;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 background;

vec3 sampleSrc(vec2 uv) {
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw).rgb;
}

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(void) {
    vec2 d = thickness / resolution;
    // Sobel gradient on luminance.
    float tl = lum(sampleSrc(uvContent + vec2(-d.x, d.y)));
    float tc = lum(sampleSrc(uvContent + vec2(0.0, d.y)));
    float tr = lum(sampleSrc(uvContent + vec2(d.x, d.y)));
    float ml = lum(sampleSrc(uvContent + vec2(-d.x, 0.0)));
    float mr = lum(sampleSrc(uvContent + vec2(d.x, 0.0)));
    float bl = lum(sampleSrc(uvContent + vec2(-d.x, -d.y)));
    float bc = lum(sampleSrc(uvContent + vec2(0.0, -d.y)));
    float br = lum(sampleSrc(uvContent + vec2(d.x, -d.y)));

    float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
    float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
    float g = length(vec2(gx, gy));

    float e = clamp(g * intensity - threshold, 0.0, 1.0);
    vec3 edgeCol = mix(color1.rgb, color2.rgb, clamp(g, 0.0, 1.0));
    vec3 base = mix(background.rgb, edgeCol, e);

    // Opacity blends the untouched source back in over the edge render.
    vec3 orig = sampleSrc(uvContent);
    outColor = vec4(mix(base, orig, opacity), 1.0);
}
`;

export type ColoredEdgesParams = {
    /** Edge detection threshold, in [0, 1]. */
    threshold: number;
    /** Sampling radius for the Sobel kernel, in px. */
    thickness: number;
    /** Edge contrast multiplier. */
    intensity: number;
    /** Blend the source back in over the edges, in [0, 1]. */
    opacity: number;
    /** Gradient start color. Accepts a hex string. */
    color1: string;
    /** Gradient end color. Accepts a hex string. */
    color2: string;
    /** Background color for non-edge areas. Accepts a hex string. */
    background: string;
};

const DEFAULT_PARAMS: ColoredEdgesParams = {
    threshold: 0.2,
    thickness: 3,
    intensity: 4,
    opacity: 0,
    color1: "#ff0000",
    color2: "#0000ff",
    background: "#000000",
};

export class ColoredEdgesEffect implements Effect {
    params: ColoredEdgesParams;

    constructor(initial: Partial<ColoredEdgesParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<ColoredEdgesParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const p = this.params;
        const [w, h] = ctx.dims.elementPixel;
        ctx.draw({
            frag: FRAG_COLORED_EDGES,
            uniforms: {
                src: ctx.src,
                resolution: [Math.max(1, w), Math.max(1, h)],
                threshold: p.threshold,
                thickness: Math.max(0.5, p.thickness),
                intensity: Math.max(0, p.intensity),
                opacity: Math.min(1, Math.max(0, p.opacity)),
                color1: parseHexColor(p.color1),
                color2: parseHexColor(p.color2),
                background: parseHexColor(p.background),
            },
            target: ctx.target,
        });
    }
}
