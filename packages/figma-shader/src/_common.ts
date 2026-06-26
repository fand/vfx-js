// Shared GLSL snippets reused across the Figma shader ports.
//
// Each effect is a single full-screen fragment pass that reads the
// element capture through the framework-provided `uvContent` /
// `srcRectUv` mapping (see @vfx-js/core EffectContext). These strings
// are concatenated into the per-effect fragment shaders below.

import type { Effect, EffectContext } from "@vfx-js/core";

/** Header shared by every fragment shader: precision + I/O + `readTex`. */
export const GLSL_HEADER = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;

// Sample the captured content. Anything outside the content rect reads
// as fully transparent so effects can sample neighbours safely.
vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}
`;

/** Rec. 709 luminance. */
export const GLSL_LUMA = `
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

/** HSV <-> RGB conversion (Iñigo Quílez / Sam Hocevar). */
export const GLSL_HSV = `
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
`;

/** Cheap hash + 2D value noise + fractal-Brownian-motion. */
export const GLSL_NOISE = `
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        v += amp * vnoise(p);
        p = rot * p * 2.0;
        amp *= 0.5;
    }
    return v;
}
`;

/**
 * Convenience base class for the single-pass Figma shader effects.
 *
 * Each subclass supplies its fragment shader and a function that maps
 * its `params` to GLSL uniforms; this class wires up the boilerplate
 * `params` / `setParams` / `render` plumbing common to all of them.
 */
export abstract class SinglePassEffect<P extends object> implements Effect {
    params: P;
    protected abstract frag: string;

    constructor(defaults: P, initial: Partial<P> = {}) {
        this.params = { ...defaults, ...initial };
    }

    setParams(updates: Partial<P>): void {
        Object.assign(this.params as object, updates);
    }

    /** Map current params + context to the shader's extra uniforms. */
    protected abstract uniforms(
        ctx: EffectContext,
    ): Record<string, number | number[] | boolean>;

    render(ctx: EffectContext): void {
        ctx.draw({
            frag: this.frag,
            uniforms: {
                src: ctx.src,
                ...this.uniforms(ctx),
            },
            target: ctx.target,
        });
    }
}

/** Content size in physical px, guarded against the pre-layout `0`. */
export function contentResolution(ctx: EffectContext): [number, number] {
    const [w, h] = ctx.dims.elementPixel;
    return [w || 1, h || 1];
}
