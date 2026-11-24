// A separable, discrete Gaussian. Pair adjacent texels into one bilinear fetch
// so all texels contribute, even when the requested sigma is near a mip boundary.
// Internal: shared by the layered Saber renderer and its numerical tests.

export type GaussianKernel = {
    weights: Float32Array;
    offsets: Float32Array;
};

// A separable version of the original bloom filter's 1D marginal response:
// [1,2,2,2,1]/8. The sparse 13-tap filter passes the diagonal checkerboard
// frequency, amplifying a thin highlight when odd dimensions align the grids.
// Fold interpolation into six texel weights and pair them into three reads
// per axis. This remains exact at any UV phase, including odd-sized pyramids.
export const FRAG_SABER_PYRAMID_DOWNSAMPLE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform float pyramidGain;
void main() {
    vec2 size = vec2(textureSize(src, 0));
    vec2 p = uv * size - 0.5;
    vec2 f = fract(p);
    vec2 left = (3.0 - 2.0 * f) / 8.0;
    vec2 right = (1.0 + 2.0 * f) / 8.0;
    vec2 a = (floor(p) - 1.5 + (2.0 - f) / (3.0 - 2.0 * f)) / size;
    vec2 b = (floor(p) + 1.0) / size;
    vec2 c = (floor(p) + 2.5 + f / (1.0 + 2.0 * f)) / size;
    vec4 light = texture(src, a) * left.x * left.y;
    light += texture(src, vec2(b.x, a.y)) * 0.5 * left.y;
    light += texture(src, vec2(c.x, a.y)) * right.x * left.y;
    light += texture(src, vec2(a.x, b.y)) * left.x * 0.5;
    light += texture(src, b) * 0.25;
    light += texture(src, vec2(c.x, b.y)) * right.x * 0.5;
    light += texture(src, vec2(a.x, c.y)) * left.x * right.y;
    light += texture(src, vec2(b.x, c.y)) * 0.5 * right.y;
    light += texture(src, c) * right.x * right.y;
    outColor = light * pyramidGain;
}
`;

// Separable [1,4,6,4,1]/16, including half-texel interpolation. Pair the
// resulting six taps into three bilinear reads per axis. A fixed 2:1 grid
// (with ceil-sized targets) preserves this phase even for odd input sizes.
// Unlike the sparse 13-tap bloom filter, this rejects checkerboard frequencies
// on both axes, so an odd-sized input cannot double a thin highlight's energy.
export const FRAG_SABER_DOWNSAMPLE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
vec4 lightAt(vec2 p) {
    vec2 size = vec2(textureSize(src, 0));
    vec2 coverage = clamp(p * size + 0.5, 0.0, 1.0)
        * clamp((1.0 - p) * size + 0.5, 0.0, 1.0);
    return texture(src, clamp(p, 0.0, 1.0)) * coverage.x * coverage.y;
}
void main() {
    vec2 size = vec2(textureSize(src, 0));
    vec2 b = gl_FragCoord.xy * 2.0 / size;
    vec2 a = b - (5.0 / 3.0) / size;
    vec2 c = b + (5.0 / 3.0) / size;
    vec4 light = lightAt(a) * 9.0;
    light += lightAt(vec2(b.x, a.y)) * 30.0;
    light += lightAt(vec2(c.x, a.y)) * 9.0;
    light += lightAt(vec2(a.x, b.y)) * 30.0;
    light += lightAt(b) * 100.0;
    light += lightAt(vec2(c.x, b.y)) * 30.0;
    light += lightAt(vec2(a.x, c.y)) * 9.0;
    light += lightAt(vec2(b.x, c.y)) * 30.0;
    light += lightAt(c) * 9.0;
    outColor = light / 256.0;
}
`;

/** Up to 25 discrete taps, reconstructed with 13 bilinear fetches. */
export function gaussianKernel(sigma: number): GaussianKernel {
    const weights = new Float32Array(7);
    const offsets = new Float32Array(6);
    const samples = new Float64Array(13);
    samples[0] = 1;
    let total = 1;
    for (let i = 1; i <= 12; i++) {
        samples[i] = sigma > 0 ? Math.exp((-0.5 * i * i) / (sigma * sigma)) : 0;
        total += 2 * samples[i];
    }
    // At sigma >= 1 the infinite discrete sum differs from this integral by
    // less than 1e-8. Keep that normalization even when an enormous glow reaches
    // the 1x1 mip: omitted samples then represent light outside the image.
    if (sigma >= 1) {
        total = sigma * Math.sqrt(2 * Math.PI);
    }
    weights[0] = 1 / total;
    for (let i = 0; i < 6; i++) {
        const a = i * 2 + 1;
        const pair = samples[a] + samples[a + 1];
        weights[i + 1] = pair / total;
        offsets[i] = a + (pair > 0 ? samples[a + 1] / pair : 0);
    }
    return { weights, offsets };
}

/** Approximate variance already introduced by downsampling and reconstruction. */
export function remainingBlurSigma(sigma: number, level: number): number {
    const scale = 2 ** level;
    // Binomial downsample: variance 1, plus half-texel interpolation. Sum
    // the geometric series, then add cubic reconstruction in original pixels.
    const variance =
        level > 0 ? (1.25 * (scale * scale - 1)) / 3 + (scale * scale) / 3 : 0;
    return Math.sqrt(Math.max(0, sigma * sigma - variance)) / scale;
}
