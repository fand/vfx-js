import type { EffectContext, EffectRenderTarget } from "@vfx-js/core";
import { SNOISE3D } from "./_noise.js";
import {
    coreBlurKernel,
    FRAG_SABER_DOWNSAMPLE,
    gaussianKernel,
    remainingBlurSigma,
} from "./_saber-blur.js";
import { GLSL_LINE_COVERAGE } from "./_saber-coverage.js";

/** Independent procedural distortion; native noise patterns remain approximate. */
export type SaberDistortionParams = {
    /** Displacement in CSS px. 0 bypasses distortion. */
    amount: number;
    /** Fluid fractal (domain-warped core), billowing smoke, or ridged energy noise. */
    type: "fluid" | "smoke" | "energy";
    /** Warp the image, or modulate brightness (full modulation at amount 100). */
    composite: "distort" | "multiply";
    /** Reverse displacement, or invert the brightness mask. */
    invert: boolean;
    /** Noise transport in CSS px/second, independent of noise evolution. */
    windSpeed: number;
    /** Degrees: 0 = right, 90 = up, in element-local coordinates. */
    windDirection: number;
    /** AE-calibrated noise evolution rate. 0 freezes evolution, not wind. */
    noiseSpeed: number;
    /** Largest noise wavelength in CSS px. */
    noiseScale: number;
    /** Signed-power contrast applied to each noise component; 1 is neutral. */
    noiseBias: number;
    /** Number of noise octaves, 1..8. */
    noiseComplexity: number;
    /** Octave frequency spacing, 0..1: 2 to about 4.49. Octave gain halves at each step. */
    noiseDetail: number;
    /** Turbulent transport, 0..1. Separates octave wind speeds; Smoke/Energy also gain domain warping. */
    noiseTurbulence: number;
    /** Horizontal frequency multiplier, positive. Above1 compresses X, as in AE. */
    noiseAspectRatio: number;
    /** Constrain displacement to the wind axis: 0 = free, 1 = along wind only. */
    directionality: number;
    /** Wind transport interval in seconds, 0..0.25. Six spatial samples at the current evolution time; zero wind bypasses. */
    motionBlur: number;
    /** Deterministic noise seed. */
    seed: number;
};

/** One of four blurred layers. Layer 4 follows Core Distortion, bypassing Glow Distortion. */
export type SaberGlowLayer = {
    /** Approximate blur radius (Gaussian sigma) in CSS px. 0 disables the layer. */
    size: number;
    /** Non-negative input energy gain, before Pre Gamma and amplification. 0 disables. */
    intensity: number;
};

export const DEFAULT_DISTORTION: SaberDistortionParams = {
    amount: 0,
    type: "fluid",
    composite: "distort",
    invert: false,
    windSpeed: 20,
    windDirection: 90,
    noiseSpeed: 0.5,
    noiseScale: 48,
    noiseBias: 1,
    noiseComplexity: 4,
    noiseDetail: 0,
    noiseTurbulence: 0,
    noiseAspectRatio: 1,
    directionality: 0,
    motionBlur: 0,
    seed: 0,
};

const FRAG_DISTORT = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
#ifdef CACHED_NOISE
uniform sampler2D noiseField;
#endif
uniform vec2 contentSize;
uniform vec4 contentRectUv;
uniform vec2 bufferSize;
uniform vec2 noiseMargin;
uniform vec2 wind;
uniform vec2 windVelocity;
uniform float motionBlur;
uniform vec2 flowDirection;
uniform vec2 flowOffset;
uniform int glowPass;
uniform int haloPass;
uniform int layered;
uniform vec3 layerShares;
uniform float clock;
uniform float amount;
uniform float noiseScale;
uniform float noiseBias;
uniform float noiseDetail;
#ifdef TURBULENT_NOISE
uniform float noiseTurbulence;
#endif
uniform float aspect;
uniform float directionality;
uniform float seed;
uniform int complexity;
uniform int noiseType;
uniform int composite;
uniform float polarity;
#if defined(CORE_BOUNDS) || defined(ANALYTIC_CORE)
uniform sampler2D contourField;
uniform float supportReach;
#endif
#ifdef ANALYTIC_CORE
uniform float signedCoreWidth;
${GLSL_LINE_COVERAGE}
#endif
${SNOISE3D}

// Native fields sample every two content pixels, then interpolate *biased*
// vectors. The origin stays attached to the content, including odd padding.
vec2 noiseGridOrigin() {
    vec2 contentOrigin = contentRectUv.xy * bufferSize;
    vec2 anchor = vec2(0.5, mod(contentSize.y - 0.5, 2.0));
    return floor((-contentOrigin - noiseMargin - anchor) / 2.0) * 2.0 + anchor;
}

// The three native modes share octave scales, but not their accumulation.
// Smoke adds bounded density; Energy adds ridges gated by coarser ridges.
// Fluid advects that ridge field with a fractal displacement of its own.
vec2 noisePair(vec3 p) {
    return vec2(snoise(p), snoise(p + vec3(43.7, 17.3, 9.1)));
}

vec2 fractalWarp(vec3 p) {
    vec2 total = vec2(0.0);
    float weight = 0.5;
    float lacunarity = exp2(1.0 + (7.0 / 6.0) * noiseDetail);
    for (int i = 0; i < 8; i++) {
        if (i >= complexity) break;
        total += weight * vec2(snoise(p + 3.1), snoise(p + 19.7));
        p = p * lacunarity + vec3(17.1, 9.2, 13.7);
        // Octaves refine space, not the rate of evolution. Retain the seeded
        // phase offsets while keeping the same clock speed at every octave.
        p.z -= clock * (lacunarity - 1.0);
        weight *= 0.5;
    }
    return total;
}

vec2 fractalDensity(vec3 p
#ifdef TURBULENT_NOISE
    , vec2 transport
#endif
) {
    vec2 total = vec2(0.0), feedback = vec2(1.0);
    float weight = 0.5;
    float frequency = 1.0;
    float lacunarity = exp2(1.0 + (7.0 / 6.0) * noiseDetail);
    for (int i = 0; i < 8; i++) {
        if (i >= complexity) break;
        vec3 position = p;
#ifdef TURBULENT_NOISE
        position.xy += transport * frequency * (1.0 - min(0.6 + 0.3 * float(i), 1.8)) * noiseTurbulence;
#endif
        vec2 value = noisePair(position);
        vec2 signal = noiseType == 1
            ? clamp(0.6 + 0.85 * value, 0.0, 1.0)
            // The native signed-vector distribution has broad dark valleys.
            // A squared ridge matches the mean but loses almost all <-0.9
            // excursions after four octaves, especially visible at Bias3.
            : pow(max(vec2(0.0), 1.0 - 1.2 * abs(value)), vec2(1.5));
        total += weight * signal * feedback;
        // AE's isolated 1→4 octave increments retain fine ridges even where
        // the first octave is weak. Clamp the accumulated feedback so a later
        // ridge can recover; multiplying clamped factors only loses detail.
        if (noiseType != 1) feedback = clamp(2.0 * signal * feedback, 0.0, 1.0);
        p = p * lacunarity + vec3(17.1, 9.2, 13.7);
        // Octaves refine space, not the rate of evolution. Retain the seeded
        // phase offsets while keeping the same clock speed at every octave.
        p.z -= clock * (lacunarity - 1.0);
        frequency *= lacunarity;
        weight *= 0.5;
    }
    // AE complexity sweeps retain the octave sum; normalizing it erases the
    // measured darkening of Smoke and brightening of Energy/Fluid.
    vec2 mask = noiseType == 1 ? 1.0 - total : 1.25 * total;
    vec2 value = 2.0 * mask - 1.0;
    return sign(value) * pow(abs(value), vec2(noiseBias));
}

vec3 lightAt(vec2 p) {
    vec2 size = vec2(textureSize(src, 0));
    vec2 inside = clamp(p * size + 0.5, 0.0, 1.0)
        * clamp((1.0 - p) * size + 0.5, 0.0, 1.0);
    vec4 sampled = texture(src, clamp(p, 0.0, 1.0));
    vec3 light = haloPass == 1 ? vec3(sampled.a) : sampled.rgb;
    return (layered == 1 ? light * layerShares : vec3(light.r)) * inside.x * inside.y;
}

vec3 sampleLight(vec2 p) {
    vec3 light = lightAt(p);
    if (dot(flowOffset, flowOffset) > 0.0) {
        // Transport the emitting envelope as well as the noise. A moving mask
        // over a symmetric blur alone looks like boiling, not rising flames.
        light = light * 0.5 + lightAt(p - flowOffset * 0.45) * 0.3
            + lightAt(p - flowOffset) * 0.2;
    }
    return light;
}

#ifdef CACHED_NOISE
vec2 cachedNoiseAt(vec2 position) {
    vec2 fieldUv = ((position - noiseGridOrigin()) / 2.0 + 0.5)
        / vec2(textureSize(noiseField, 0));
    return texture(noiseField, clamp(fieldUv, 0.0, 1.0)).rg;
}
#endif

vec2 distortionAt(float offset) {
#ifdef CACHED_NOISE
    vec2 position = uvContent * contentSize - windVelocity * offset;
    return cachedNoiseAt(position);
#else
    float sampleClock = clock;
    vec2 position = noiseGridOrigin() + floor(gl_FragCoord.xy) * 2.0;
    vec2 q = (position - wind - windVelocity * offset) / noiseScale;
    // Native aspect sweeps keep Y unchanged and multiply X frequency.
    // Dividing X inverted the elongation of flames and vortices.
    q.x *= aspect;
    // One type-specific wavelength conversion, fitted to isolated AE fields.
    float frequency = noiseType == 1 ? 1.15 : 0.625;
    q *= frequency;
    vec3 p = vec3(q, sampleClock) + vec3(seed * 0.123, seed * 0.719, seed * 0.317);
    if (noiseType == 0) {
        p.xy += 1.8 * fractalWarp(p);
    }
#ifdef TURBULENT_NOISE
    vec2 transport = (wind + windVelocity * offset) / noiseScale * frequency;
    transport.x *= aspect;
    if (noiseType != 0 && noiseTurbulence > 0.0) {
        p.xy += 0.2 * noiseTurbulence
            * vec2(snoise(p + 3.1), snoise(p + 19.7));
    }
#endif
    return fractalDensity(p
#ifdef TURBULENT_NOISE
        , transport
#endif
    ) * polarity;
#endif
}

float maskGain(vec2 n) {
    // Bias has already acted on both components. Amount interpolates toward
    // their density average; Invert complements it.
    float mask = max(0.0, 0.5 + 0.25 * (n.x + n.y));
    return max(0.0, mix(1.0, mask, amount / 100.0));
}

#if defined(ANALYTIC_CORE) && defined(CACHED_NOISE)
float nearbyDistance(vec2 delta, float offset) {
    vec2 n = cachedNoiseAt(uvContent * contentSize + delta * bufferSize - windVelocity * offset);
    n = mix(n, flowDirection * dot(n, flowDirection), directionality);
    return texture(contourField, uv + delta + n * amount / bufferSize).r;
}
#endif

vec3 shadeNoise(vec2 n, float offset) {
    vec3 light;
    n = mix(n, flowDirection * dot(n, flowDirection), directionality);
    vec2 warped = uv + n * amount / bufferSize;
#ifdef ANALYTIC_CORE
    // Pulling a thin raster line through a steep warp misses whole pixels.
    // For a single steady contour, integrate the warped distance field
    // instead. Keep the raster path for animated reveals.
    vec4 field = texture(contourField, warped);
#ifdef CACHED_NOISE
    // Lattice knots make quad derivatives depend on odd/even padding. Sample
    // the actual pullback symmetrically around this pixel instead.
    vec2 stepUv = 0.5 / vec2(textureSize(src, 0));
    vec2 gradient = vec2(
        nearbyDistance(vec2(stepUv.x, 0.0), offset) - nearbyDistance(vec2(-stepUv.x, 0.0), offset),
        nearbyDistance(vec2(0.0, stepUv.y), offset) - nearbyDistance(vec2(0.0, -stepUv.y), offset));
#else
    vec2 gradient = vec2(dFdx(field.r), dFdy(field.r));
#endif
    float slope = max(length(gradient), 1e-3);
    vec2 normal = slope > 1e-3 ? gradient / slope : vec2(1.0, 0.0);
    light = vec3(lineCoverage(abs(field.r) / slope, signedCoreWidth / slope, normal));
    light *= step(0.5, field.a) * step(0.0, min(warped.x, warped.y))
        * step(max(warped.x, warped.y), 1.0);
#else
    light = sampleLight(warped);
#endif

    return light;
}

void main() {
#ifdef CORE_BOUNDS
    // The support bound includes displacement and shutter transport. Decide once per
    // derivative quad; retained quads still evaluate every derivative lane.
    vec4 bounds = texelFetch(contourField, ivec2(gl_FragCoord.xy) & ~1, 0);
    if (bounds.a < 0.5 || abs(bounds.r) > supportReach) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
#endif
    if (amount <= 0.0) {
        vec3 light = sampleLight(uv);
        vec4 original = texture(src, uv);
        if (layered == 1) light += original.rgb * (vec3(1.0) - layerShares);
        outColor = vec4(light, layered == 1 ? original.a : 1.0);
        return;
    }
    vec2 n = distortionAt(0.0);
    vec3 light;
    if (composite == 1) {
        // Multiply keeps the source anchored. Average the six gains before
        // fetching light, avoiding five identical source reads per pixel.
        float gain = maskGain(n);
        if (motionBlur > 0.0) {
            for (int i = 1; i < 6; i++) {
                gain += maskGain(distortionAt(motionBlur * float(i) / 5.0));
            }
            gain /= 6.0;
        }
        light = sampleLight(uv) * gain;
    } else {
        light = shadeNoise(n, 0.0);
        if (motionBlur > 0.0) {
            // Distort averages separately warped source samples. Evolution
            // stays at the current time; only the noise travels with the wind.
            for (int i = 1; i < 6; i++) {
                light += shadeNoise(distortionAt(motionBlur * float(i) / 5.0), motionBlur * float(i) / 5.0);
            }
            light /= 6.0;
        }
    }
    // RGB retain the distorted/bypass groups; A is the undistorted Halo layer.
    vec4 original = texture(src, uv);
    if (layered == 1) light += original.rgb * (vec3(1.0) - layerShares);
    outColor = vec4(light, layered == 1 ? original.a : 1.0);
}
`;

const FRAG_DISTORT_BOUNDED = FRAG_DISTORT.replace(
    "#version 300 es",
    "#version 300 es\n#define CORE_BOUNDS",
);

const FRAG_DISTORT_CONTOUR = FRAG_DISTORT_BOUNDED.replace(
    "#version 300 es",
    "#version 300 es\n#define ANALYTIC_CORE",
);

// Compile the opt-in path separately: zero turbulence retains the original
// arithmetic, register usage and displayed pixels of existing recipes.
function turbulentFragment(fragment: string): string {
    return fragment.replace(
        "#version 300 es",
        "#version 300 es\n#define TURBULENT_NOISE",
    );
}
const FRAG_DISTORT_TURBULENT = turbulentFragment(FRAG_DISTORT);
const FRAG_DISTORT_BOUNDED_TURBULENT = turbulentFragment(FRAG_DISTORT_BOUNDED);
const FRAG_DISTORT_CONTOUR_TURBULENT = turbulentFragment(FRAG_DISTORT_CONTOUR);

const noiseShaderVariants = new Map<
    string,
    { field: string; cached: string }
>();
function noiseShaders(fragment: string) {
    let shaders = noiseShaderVariants.get(fragment);
    if (!shaders) {
        const main = fragment.lastIndexOf("void main() {");
        shaders = {
            field:
                fragment.slice(0, main) +
                `void main() {
    outColor = vec4(distortionAt(0.0), 0.0, 1.0);
}
`,
            cached: fragment.replace(
                "#version 300 es",
                "#version 300 es\n#define CACHED_NOISE",
            ),
        };
        noiseShaderVariants.set(fragment, shaders);
    }
    return shaders;
}

const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 axis;
uniform float weights[7];
uniform float offsets[6];
float lightAt(vec2 p) {
    vec2 size = vec2(textureSize(src, 0));
    vec2 coverage = clamp(p * size + 0.5, 0.0, 1.0)
        * clamp((1.0 - p) * size + 0.5, 0.0, 1.0);
    return texture(src, clamp(p, 0.0, 1.0)).r * coverage.x * coverage.y;
}
void main() {
    float sum = lightAt(uv) * weights[0];
    for (int i = 0; i < 6; i++) {
        if (weights[i + 1] > 0.0) {
            vec2 delta = axis * offsets[i];
            sum += (lightAt(uv - delta) + lightAt(uv + delta)) * weights[i + 1];
        }
    }
    outColor = vec4(vec3(sum), 1.0);
}
`;

export type SaberGlowLayers = {
    layer0: EffectRenderTarget;
    layer1: EffectRenderTarget;
    layer2: EffectRenderTarget;
    layer3: EffectRenderTarget;
    weights: number[];
    nearShares: number[];
    outputSize: [number, number];
    layerScales: number[];
    preGamma: number;
    layerBias: number[];
    inputGain: number;
    response: number;
};

export const GLSL_SABER_SAMPLE = `
float layerAt(sampler2D image, float scale, vec2 outputSize) {
    vec2 size = vec2(textureSize(image, 0));
    if (scale == 1.0) return texture(image, uv).r;
    // Cubic B-spline reconstruction: four bilinear reads instead of sixteen.
    // Positive weights avoid ringing in the dim outer halo.
    // Mips cover a fixed power-of-two grid; odd edge pixels are padded, not
    // stretched. Reconstruct in that grid rather than normalized mip UVs.
    vec2 p = uv * outputSize / scale - 0.5;
    vec2 f = fract(p);
    vec2 f2 = f * f;
    vec2 f3 = f2 * f;
    vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
    vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
    vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
    vec2 w3 = f3 / 6.0;
    vec2 left = w0 + w1;
    vec2 right = w2 + w3;
    vec2 a = (floor(p) - 0.5 + w1 / left) / size;
    vec2 b = (floor(p) + 1.5 + w3 / right) / size;
    return texture(image, a).r * left.x * left.y
        + texture(image, vec2(b.x, a.y)).r * right.x * left.y
        + texture(image, vec2(a.x, b.y)).r * left.x * right.y
        + texture(image, b).r * right.x * right.y;
}
`;

export const GLSL_SABER_LAYERS = `
${GLSL_SABER_SAMPLE}
uniform sampler2D layer0;
uniform sampler2D layer1;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform vec4 weights;
uniform vec4 nearShares;
uniform vec2 outputSize;
uniform vec4 layerScales;
uniform float preGamma;
uniform vec4 layerBias;
uniform float inputGain;
uniform int response;

vec4 sampleLayeredGlow() {
    vec4 lights = vec4(0.0);
    if (weights.x > 0.0) lights.x = layerAt(layer0, layerScales.x, outputSize) * weights.x;
    if (weights.y > 0.0) lights.y = layerAt(layer1, layerScales.y, outputSize) * weights.y;
    if (weights.z > 0.0) lights.z = layerAt(layer2, layerScales.z, outputSize) * weights.z;
    if (weights.w > 0.0) lights.w = layerAt(layer3, layerScales.w, outputSize) * weights.w;
    lights *= layerBias * inputGain;
    if (preGamma != 1.0) {
        // AE isolated layers place Pre Gamma before amplification and Screen.
        // Keep zero layers dark, including at very small positive gamma.
        lights = pow(min(max(lights, 0.0), vec4(pow(4096.0, 1.0 / preGamma))), vec4(preGamma));
    }
    if (response == 1) {
        // Isolated AE sweeps: a cubic response after per-layer Pre Gamma.
        // First layer blends this response equally with the linear signal.
        // Saturate the input before the polynomial to keep HDR finite.
        vec4 x = min(lights, 32.0);
        vec4 amplified = x * (0.34 + x * (0.18 + 0.48 * x));
        amplified.x = 0.5 * (x.x + amplified.x);
        return min(amplified, 4096.0);
    }
    float nearLight = dot(lights, nearShares);
    float farLight = dot(lights, vec4(1.0) - nearShares);
    return vec4(min(vec3(nearLight + farLight, nearLight, farLight), 4096.0), 1.0);
}
`;

const FRAG_SUM = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
${GLSL_SABER_LAYERS}
uniform float distortionBrightness;
float sharedLight(float light, float share) {
    if (share <= 0.0) return 0.0;
    if (share >= 1.0) return light;
    // Split transmission so Screen(active, bypass) preserves the original
    // light even for partially protected layers.
    return 1.0 - pow(max(1.0 - light, 0.0), share);
}
void main() {
    outColor = sampleLayeredGlow();
    // AE Screens the three bounded scalar layers before applying Glow noise.
    // R carries the combined distorted group, G its stationary bypass, A Halo.
    // Core softening uses response=0 and keeps its linear sum unchanged.
    if (distortionBrightness >= 0.0) {
        vec3 light = clamp(outColor.rgb * distortionBrightness, 0.0, 1.0);
        vec3 affected = vec3(sharedLight(light.r, nearShares.r),
            sharedLight(light.g, nearShares.g), sharedLight(light.b, nearShares.b));
        vec3 bypass = vec3(sharedLight(light.r, 1.0 - nearShares.r),
            sharedLight(light.g, 1.0 - nearShares.g), sharedLight(light.b, 1.0 - nearShares.b));
        outColor.rgb = vec3(
            1.0 - (1.0 - affected.r) * (1.0 - affected.g) * (1.0 - affected.b),
            1.0 - (1.0 - bypass.r) * (1.0 - bypass.g) * (1.0 - bypass.b), 0.0);
    }
}
`;

// Separate targets ensure neither distortion pass can overwrite its own input.
// Auto-sized targets belong to the effect host. Explicit mip/layer targets are
// released on resize and disposal.
export class SaberGlowPasses {
    #core: EffectRenderTarget | null = null;
    #output: EffectRenderTarget | null = null;
    #distortedGlow: EffectRenderTarget | null = null;
    #noise: Partial<Record<"core" | "glow" | "halo", EffectRenderTarget>> = {};
    #down: EffectRenderTarget[] = [];
    #layers: ([EffectRenderTarget, EffectRenderTarget] | null)[] = [];
    #kernels: {
        key: string;
        taps: ReturnType<typeof gaussianKernel>;
    }[] = [];

    distort(
        ctx: EffectContext,
        src: EffectRenderTarget,
        params: SaberDistortionParams,
        kind: "core" | "glow" | "halo",
        layered = false,
        bounds?: {
            field: EffectRenderTarget;
            reach: number;
            lineWidth?: number;
        },
        flowDistance = 0,
        layerShares: readonly number[] = [1, 1, 1],
        outputSize: readonly number[] = [src.width, src.height],
    ): EffectRenderTarget {
        if (!(params.amount > 0) && !(flowDistance > 0)) {
            return src;
        }
        let target = kind !== "glow" ? this.#core : this.#distortedGlow;
        if (
            target &&
            kind !== "core" &&
            (target.width !== outputSize[0] || target.height !== outputSize[1])
        ) {
            target.dispose();
            target = null;
        }
        if (!target) {
            target = ctx.createRenderTarget({
                format: kind === "glow" ? "rgba16f" : "r16f",
                ...(kind !== "core"
                    ? { size: [outputSize[0], outputSize[1]] as const }
                    : {}),
            });
            if (kind !== "glow") {
                this.#core = target;
            } else {
                this.#distortedGlow = target;
            }
        }
        const angle = (params.windDirection * Math.PI) / 180;
        const distance = ctx.time * params.windSpeed;
        const fragment =
            bounds?.lineWidth && params.composite === "distort"
                ? params.noiseTurbulence > 0
                    ? FRAG_DISTORT_CONTOUR_TURBULENT
                    : FRAG_DISTORT_CONTOUR
                : bounds
                  ? params.noiseTurbulence > 0
                      ? FRAG_DISTORT_BOUNDED_TURBULENT
                      : FRAG_DISTORT_BOUNDED
                  : params.noiseTurbulence > 0
                    ? FRAG_DISTORT_TURBULENT
                    : FRAG_DISTORT;
        const uniforms = {
            ...(bounds
                ? {
                      contourField: bounds.field,
                      signedCoreWidth:
                          (bounds.lineWidth ?? 0) * ctx.dims.pixelRatio,
                      supportReach:
                          (bounds.reach +
                              Math.SQRT2 *
                                  Math.max(
                                      1,
                                      1.5 ** Math.max(params.noiseBias, 0.05),
                                  ) *
                                  params.amount +
                              Math.abs(params.windSpeed) *
                                  Math.max(
                                      0,
                                      Math.min(0.25, params.motionBlur),
                                  )) *
                              ctx.dims.pixelRatio +
                          8,
                  }
                : {}),
            src,
            contentSize: [...ctx.dims.element],
            bufferSize: [
                outputSize[0] / ctx.dims.pixelRatio,
                outputSize[1] / ctx.dims.pixelRatio,
            ],
            noiseMargin: [
                Math.max(
                    0,
                    Math.cos(angle) *
                        params.windSpeed *
                        Math.max(0, Math.min(0.25, params.motionBlur)),
                ),
                Math.max(
                    0,
                    Math.sin(angle) *
                        params.windSpeed *
                        Math.max(0, Math.min(0.25, params.motionBlur)),
                ),
            ],
            wind: [Math.cos(angle) * distance, Math.sin(angle) * distance],
            windVelocity: [
                Math.cos(angle) * params.windSpeed,
                Math.sin(angle) * params.windSpeed,
            ],
            motionBlur:
                params.windSpeed !== 0
                    ? Math.max(0, Math.min(0.25, params.motionBlur))
                    : 0,
            flowDirection: [Math.cos(angle), Math.sin(angle)],
            flowOffset: [
                (Math.cos(angle) *
                    Math.max(0, flowDistance) *
                    (params.windSpeed < 0 ? -1 : 1) *
                    ctx.dims.pixelRatio) /
                    outputSize[0],
                (Math.sin(angle) *
                    Math.max(0, flowDistance) *
                    (params.windSpeed < 0 ? -1 : 1) *
                    ctx.dims.pixelRatio) /
                    outputSize[1],
            ],
            glowPass: kind === "glow" ? 1 : 0,
            haloPass: kind === "halo" ? 1 : 0,
            layered: layered ? 1 : 0,
            layerShares: layerShares.slice(0, 3),
            // Isolated temporal correlations: ridged fields use a slower
            // evolution unit than Smoke. This is shared across all presets.
            clock:
                ctx.time *
                params.noiseSpeed *
                (params.type === "smoke"
                    ? 1
                    : params.type === "fluid"
                      ? 0.5
                      : 0.75),
            amount: params.amount,
            noiseScale: Math.max(params.noiseScale, 0.1),
            noiseBias: Math.max(params.noiseBias, 0.05),
            noiseDetail: Math.min(1, Math.max(0, params.noiseDetail)),
            noiseTurbulence: Math.min(1, Math.max(0, params.noiseTurbulence)),
            aspect: Math.max(params.noiseAspectRatio, 0.05),
            directionality: Math.max(0, Math.min(1, params.directionality)),
            seed: params.seed,
            complexity: Math.max(
                1,
                Math.min(8, Math.round(params.noiseComplexity)),
            ),
            noiseType:
                params.type === "smoke" ? 1 : params.type === "energy" ? 2 : 0,
            composite: params.composite === "multiply" ? 1 : 0,
            polarity: params.invert ? -1 : 1,
        };
        if (params.amount > 0) {
            const width =
                Math.ceil(
                    (uniforms.bufferSize[0] +
                        Math.abs(uniforms.windVelocity[0]) *
                            uniforms.motionBlur) /
                        2,
                ) + 2;
            const height =
                Math.ceil(
                    (uniforms.bufferSize[1] +
                        Math.abs(uniforms.windVelocity[1]) *
                            uniforms.motionBlur) /
                        2,
                ) + 2;
            let field = this.#noise[kind];
            if (field && (field.width !== width || field.height !== height)) {
                field.dispose();
                field = undefined;
            }
            field ??= ctx.createRenderTarget({
                float: true,
                size: [width, height],
            });
            this.#noise[kind] = field;
            const shaders = noiseShaders(fragment);
            ctx.draw({
                frag: shaders.field,
                uniforms: { ...uniforms, noiseFieldPass: 1 },
                target: field,
            });
            ctx.draw({
                frag: shaders.cached,
                uniforms: { ...uniforms, noiseField: field },
                target,
            });
        } else {
            this.#noise[kind]?.dispose();
            delete this.#noise[kind];
            ctx.draw({ frag: fragment, uniforms, target });
        }
        return target;
    }

    layers(
        ctx: EffectContext,
        src: EffectRenderTarget,
        layers: readonly SaberGlowLayer[],
        sizeMultiplier: number,
        noiseScale: number,
        coreSoftness = 0,
    ): EffectRenderTarget {
        const prepared = this.prepareLayers(
            ctx,
            src,
            layers,
            sizeMultiplier,
            noiseScale,
            false,
            false,
            coreSoftness,
        );
        // Softness has one unit-weight scalar layer. At full resolution its
        // vertical blur already is the final core; avoid another full-size copy.
        if (
            coreSoftness > 0 &&
            prepared.weights[0] === 1 &&
            prepared.weights.slice(1).every((weight) => weight === 0) &&
            prepared.layerScales[0] === 1
        ) {
            this.#output?.dispose();
            this.#output = null;
            return prepared.layer0;
        }
        return this.combineLayers(ctx, prepared, -1, 1, coreSoftness > 0);
    }

    combineLayers(
        ctx: EffectContext,
        uniforms: SaberGlowLayers,
        distortionBrightness = -1,
        resolutionScale = 1,
        scalar = false,
    ): EffectRenderTarget {
        const width = Math.max(
            1,
            Math.ceil(uniforms.outputSize[0] * resolutionScale),
        );
        const height = Math.max(
            1,
            Math.ceil(uniforms.outputSize[1] * resolutionScale),
        );
        if (
            this.#output &&
            (this.#output.width !== width || this.#output.height !== height)
        ) {
            this.#output.dispose();
            this.#output = null;
        }
        this.#output ??= ctx.createRenderTarget({
            format: scalar ? "r16f" : "rgba16f",
            size: [width, height],
        });
        ctx.draw({
            frag: FRAG_SUM,
            uniforms: { ...uniforms, distortionBrightness },
            target: this.#output,
        });
        return this.#output;
    }

    prepareLayers(
        ctx: EffectContext,
        src: EffectRenderTarget,
        layers: readonly SaberGlowLayer[],
        sizeMultiplier: number,
        noiseScale: number,
        distortAllLayers = false,
        // Normalize blur energy before the transfer. Soft-core callers retain
        // their existing radius-weighted units.
        normalizeEnergy = false,
        coreSoftness = 0,
    ): SaberGlowLayers {
        const sizes = layers.map((layer) =>
            layer.intensity > 0
                ? Math.max(0, layer.size * Math.max(0, sizeMultiplier))
                : 0,
        );
        const maxSize = Math.max(...sizes);
        const depth = Math.min(
            Math.ceil(Math.log2(Math.max(src.width, src.height))),
            Math.max(
                0,
                Math.ceil(
                    Math.log2(Math.max(1, (maxSize * ctx.dims.pixelRatio) / 3)),
                ),
            ),
        );
        if (
            this.#down.length > 0 &&
            (this.#down[0].width !== Math.max(1, Math.ceil(src.width / 2)) ||
                this.#down[0].height !== Math.max(1, Math.ceil(src.height / 2)))
        ) {
            this.releaseLayers();
        }
        while (this.#down.length > depth) {
            this.#down.pop()?.dispose();
        }
        while (this.#down.length < depth) {
            const previous = this.#down.at(-1) ?? src;
            this.#down.push(
                ctx.createRenderTarget({
                    size: [
                        Math.max(1, Math.ceil(previous.width / 2)),
                        Math.max(1, Math.ceil(previous.height / 2)),
                    ],
                    format: "r16f",
                }),
            );
        }
        let previous = src;
        for (const target of this.#down) {
            ctx.draw({
                frag: FRAG_SABER_DOWNSAMPLE,
                uniforms: { src: previous },
                target,
            });
            previous = target;
        }
        const textures: EffectRenderTarget[] = [];
        const weights: number[] = [];
        const layerScales: number[] = [];
        for (let i = 0; i < 4; i++) {
            const radius = sizes[i];
            const weight =
                radius > 0
                    ? Math.max(0, layers[i].intensity) *
                      (normalizeEnergy ? 1 : radius)
                    : 0;
            if (weight === 0) {
                for (const target of this.#layers[i] ?? []) {
                    target.dispose();
                }
                this.#layers[i] = null;
                textures.push(src);
                weights.push(0);
                layerScales.push(1);
                continue;
            }
            let shared = -1;
            for (let j = 0; j < i; j++) {
                if (sizes[j] === radius && weights[j] > 0) {
                    shared = j;
                    break;
                }
            }
            if (shared >= 0) {
                // Independently weighted layers with the same radius can share
                // one blur. Dispose only this slot's former, unshared pair.
                for (const target of this.#layers[i] ?? []) {
                    target.dispose();
                }
                this.#layers[i] = null;
                textures.push(textures[shared]);
                weights.push(weight);
                layerScales.push(layerScales[shared]);
                continue;
            }
            const level = Math.min(
                depth,
                Math.max(
                    0,
                    Math.ceil(
                        Math.log2(
                            Math.max(1, (radius * ctx.dims.pixelRatio) / 3),
                        ),
                    ),
                ),
            );
            const input = level === 0 ? src : this.#down[level - 1];
            let pair = this.#layers[i];
            if (
                !pair ||
                pair[0].width !== input.width ||
                pair[0].height !== input.height
            ) {
                if (pair) {
                    for (const target of pair) {
                        target.dispose();
                    }
                }
                pair = [
                    ctx.createRenderTarget({
                        size: [input.width, input.height],
                        format: "r16f",
                    }),
                    ctx.createRenderTarget({
                        size: [input.width, input.height],
                        format: "r16f",
                    }),
                ];
                this.#layers[i] = pair;
            }
            const sigma = radius * ctx.dims.pixelRatio;
            const key = `${sigma}:${level}:${coreSoftness}`;
            let kernel = this.#kernels[i];
            if (kernel?.key !== key) {
                kernel = {
                    key,
                    taps:
                        coreSoftness > 0
                            ? coreBlurKernel(
                                  level === 0 && ctx.dims.pixelRatio === 1
                                      ? coreSoftness + 1
                                      : Math.sqrt(
                                            6 *
                                                remainingBlurSigma(
                                                    sigma,
                                                    level,
                                                ) **
                                                    2 +
                                                1,
                                        ),
                              )
                            : gaussianKernel(remainingBlurSigma(sigma, level)),
                };
                this.#kernels[i] = kernel;
            }
            ctx.draw({
                frag: FRAG_BLUR,
                uniforms: {
                    src: input,
                    axis: [1 / input.width, 0],
                    ...kernel.taps,
                },
                target: pair[0],
            });
            ctx.draw({
                frag: FRAG_BLUR,
                uniforms: {
                    src: pair[0],
                    axis: [0, 1 / input.height],
                    ...kernel.taps,
                },
                target: pair[1],
            });
            textures.push(pair[1]);
            weights.push(weight);
            layerScales.push(2 ** level);
        }
        return {
            layer0: textures[0],
            layer1: textures[1],
            layer2: textures[2],
            layer3: textures[3],
            weights,
            outputSize: [src.width, src.height],
            layerScales,
            preGamma: 1,
            layerBias: [1, 1, 1, 1],
            inputGain: 1,
            response: 0,
            // Classify by actual blur radius, independent of layer order.
            nearShares: sizes.map((radius) => {
                if (distortAllLayers) {
                    return 1;
                }
                const scale = Math.max(noiseScale, 0.1);
                const t = Math.max(
                    0,
                    Math.min(1, (radius / scale - 0.25) / 0.75),
                );
                return 1 - t * t * (3 - 2 * t);
            }),
        };
    }

    releaseLayers(): void {
        for (const target of this.#down) {
            target.dispose();
        }
        for (const pair of this.#layers) {
            for (const target of pair ?? []) {
                target.dispose();
            }
        }
        this.#down = [];
        this.#layers = [];
        this.#kernels = [];
    }

    dispose(): void {
        this.releaseLayers();
        this.#noise.core?.dispose();
        this.#noise.halo?.dispose();
        this.#noise.glow?.dispose();
        this.#noise = {};
        this.#core?.dispose();
        this.#output?.dispose();
        this.#distortedGlow?.dispose();
        this.#core = null;
        this.#output = null;
        this.#distortedGlow = null;
    }
}
