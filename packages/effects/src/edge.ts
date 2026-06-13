// Zero-runtime-dep effect — imports only types from @vfx-js/core plus the
// shared noise helper in this package.
//
// Edge detection rendered as glowing colored lines. A Sobel operator runs
// over the element's luminance×alpha, and the gradient magnitude is drawn
// as a line in `color`, premultiplied and transparent elsewhere.
//
// The sampling position is warped by animated 3D simplex noise (z = time)
// so the lines flow like electricity, and several layers — each with its
// own line thickness and noise scale — are overlaid to build up a thin
// crackling core surrounded by broader, slower wavers.
//
// On its own this is a neon outline; pair it with `BloomEffect` (see
// `saber2()`) to turn the lines into a glow.
import type { Effect, EffectContext } from "@vfx-js/core";
import { SNOISE3D } from "./_noise";

const MAX_LAYERS = 4;

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
uniform float time;
uniform float speed;
uniform float amplitude;
uniform int layerCount;
uniform vec4 layerThickness;
uniform vec4 layerNoiseScale;
uniform vec4 layerWeight;

${SNOISE3D}

// Luminance×alpha at a content-space UV (0..1 over the element), remapped
// into the (possibly padded) src buffer. Transparent outside the content.
float field(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) {
        return 0.0;
    }
    vec4 v = texture(src, srcRectUv.xy + c * srcRectUv.zw);
    return dot(v.rgb, vec3(0.299, 0.587, 0.114)) * v.a;
}

// Sobel gradient magnitude of the field, sampled with th-pixel spacing.
float edgeAt(vec2 c, float th) {
    vec2 t = texel * th;
    float tl = field(c + vec2(-t.x, -t.y));
    float l  = field(c + vec2(-t.x,  0.0));
    float bl = field(c + vec2(-t.x,  t.y));
    float tp = field(c + vec2( 0.0, -t.y));
    float bt = field(c + vec2( 0.0,  t.y));
    float tr = field(c + vec2( t.x, -t.y));
    float r  = field(c + vec2( t.x,  0.0));
    float br = field(c + vec2( t.x,  t.y));
    float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
    float gy = (bl + 2.0 * bt + br) - (tl + 2.0 * tp + tr);
    return length(vec2(gx, gy));
}

void main() {
    float ths[4] = float[4](
        layerThickness.x, layerThickness.y, layerThickness.z, layerThickness.w);
    float nss[4] = float[4](
        layerNoiseScale.x, layerNoiseScale.y,
        layerNoiseScale.z, layerNoiseScale.w);
    float wts[4] = float[4](
        layerWeight.x, layerWeight.y, layerWeight.z, layerWeight.w);

    float t = time * speed;
    float acc = 0.0;

    for (int i = 0; i < ${MAX_LAYERS}; i++) {
        if (i >= layerCount) {
            break;
        }
        float ns = nss[i];

        // Animated 3D-noise warp; coarser layers (small noise scale) waver
        // slowly, fine layers crackle.
        vec2 warp = vec2(
            snoise(vec3(uvContent * ns, t)),
            snoise(vec3(uvContent * ns + 17.0, t))
        ) * amplitude;

        float e = edgeAt(uvContent + warp, ths[i]);
        e = smoothstep(threshold, threshold + 0.25, e);
        acc += e * wts[i];
    }

    acc = clamp(acc * intensity, 0.0, 1.0);

    // Premultiplied line color; bloom downstream reads this as its source.
    outColor = vec4(color * acc, acc);
}
`;

/** One overlaid edge line. */
export type EdgeLayer = {
    /** Line width in source pixels (Sobel sampling radius). */
    thickness: number;
    /** Spatial frequency of the noise warp for this layer. */
    noiseScale: number;
    /** Contribution weight when the layers are summed. */
    weight: number;
};

export type EdgeParams = {
    /** Line color (linear RGB, 0..1). */
    color: [number, number, number];
    /** Overall line brightness multiplier (sum is clamped to 1). */
    intensity: number;
    /** Gradient magnitude at which a line starts to appear. */
    threshold: number;
    /** Noise animation speed. */
    speed: number;
    /** Warp amount in content-uv units. */
    amplitude: number;
    /** Overlaid lines, each with its own thickness + noise scale (max 4). */
    layers: EdgeLayer[];
};

const DEFAULT_PARAMS: EdgeParams = {
    color: [0.35, 0.65, 1.0],
    intensity: 1.0,
    threshold: 0.08,
    speed: 1.0,
    amplitude: 0.012,
    layers: [
        { thickness: 1.0, noiseScale: 9.0, weight: 1.0 },
        { thickness: 2.5, noiseScale: 4.0, weight: 0.6 },
        { thickness: 5.0, noiseScale: 2.0, weight: 0.35 },
    ],
};

/**
 * Sobel edge detection drawn as animated, multi-layered glowing lines.
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
        const { color, intensity, threshold, speed, amplitude } = this.params;
        const layers = this.params.layers.slice(0, MAX_LAYERS);

        // Pack per-layer params into vec4s (unused slots stay zero).
        const thickness = [0, 0, 0, 0];
        const noiseScale = [0, 0, 0, 0];
        const weight = [0, 0, 0, 0];
        layers.forEach((layer, i) => {
            thickness[i] = layer.thickness;
            noiseScale[i] = layer.noiseScale;
            weight[i] = layer.weight;
        });

        const [, , cw, ch] = ctx.dims.contentRect;
        ctx.draw({
            frag: FRAG_EDGE,
            uniforms: {
                src: ctx.src,
                texel: [1 / (cw || 1), 1 / (ch || 1)],
                color,
                intensity,
                threshold,
                time: ctx.time,
                speed,
                amplitude,
                layerCount: layers.length,
                layerThickness: thickness,
                layerNoiseScale: noiseScale,
                layerWeight: weight,
            },
            target: ctx.target,
        });
    }
}
