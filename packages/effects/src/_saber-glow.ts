import type { EffectContext, EffectRenderTarget } from "@vfx-js/core";
import { SNOISE3D } from "./_noise.js";
import {
    FRAG_SABER_DOWNSAMPLE,
    gaussianKernel,
    remainingBlurSigma,
} from "./_saber-blur.js";
import { GLSL_LINE_COVERAGE } from "./_saber-coverage.js";

/** Independent procedural distortion settings; units are not AE-compatible. */
export type SaberDistortionParams = {
    /** Displacement in CSS px. 0 bypasses distortion. */
    amount: number;
    /** Fluid fractal (domain-warped core), billowing smoke, or ridged energy noise. */
    type: "fluid" | "smoke" | "energy";
    /** Warp the image, or modulate brightness (full modulation at amount 32). */
    composite: "distort" | "multiply";
    /** Reverse displacement, or invert the brightness mask. */
    invert: boolean;
    /** Noise transport in CSS px/second, independent of noise evolution. */
    windSpeed: number;
    /** Degrees: 0 = right, 90 = up, in element-local coordinates. */
    windDirection: number;
    /** Noise evolution cycles/second. 0 freezes evolution, not wind. */
    noiseSpeed: number;
    /** Largest noise wavelength in CSS px. */
    noiseScale: number;
    /** Positive contrast control; 1 is neutral. Detailed Fluid core above 1 confines turbulence to pockets. */
    noiseBias: number;
    /** Number of noise octaves, 1..8. */
    noiseComplexity: number;
    /** Fine turbulence and octave spacing, 0..1. Energy/multiply glow blends ridges toward cloud-like density. 0 preserves the original look. */
    noiseDetail: number;
    /** Horizontal wavelength multiplier, positive. */
    noiseAspectRatio: number;
    /** Constrain displacement to the wind axis: 0 = free, 1 = along wind only. */
    directionality: number;
    /** Approximate shutter duration in seconds, 0..0.25. Two noise fields, five light samples; 0 disables. */
    motionBlur: number;
    /** Deterministic noise seed. */
    seed: number;
};

/** One of the four independently blurred glow layers. */
export type SaberGlowLayer = {
    /** Approximate blur radius (Gaussian sigma) in CSS px. 0 disables the layer. */
    size: number;
    /** Non-negative brightness, normalized for thin lines. 0 disables the layer. */
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
    noiseComplexity: 3,
    noiseDetail: 0,
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
uniform vec2 contentSize;
uniform vec2 bufferSize;
uniform vec2 wind;
uniform vec2 windVelocity;
uniform float noiseVelocity;
uniform float motionBlur;
uniform vec2 flowDirection;
uniform vec2 flowOffset;
uniform int glowPass;
uniform int layered;
uniform float clock;
uniform float amount;
uniform float noiseScale;
uniform float noiseBias;
uniform float noiseDetail;
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

float noiseFootprint(vec2 p) {
    return max(length(dFdx(p)), length(dFdy(p)));
}

float noiseBand(float footprint) {
    return 1.0 - smoothstep(0.25, 1.0, footprint);
}

float fbm(vec3 p, float footprint) {
    float sum = 0.0;
    float weight = 0.5;
    // Density needs a strong coarse envelope with diminishing fine detail.
    // Boosting every octave turns a seven-octave field into bright grain.
    bool density = glowPass == 1 && ((noiseType == 2 && composite == 1) || (noiseType != 2 && noiseDetail > 0.0));
    float persistence = mix(0.5, 0.58, density ? 0.0 : noiseDetail);
    float lacunarity = mix(2.03, 2.7, noiseDetail);
    for (int i = 0; i < 8; i++) {
        if (i >= complexity) break;
        float band = noiseBand(footprint);
        if (band <= 0.0) break;
        sum += snoise(p) * weight * band;
        p = p * lacunarity + vec3(17.1, 9.2, 13.7);
        footprint *= lacunarity;
        weight *= persistence;
    }
    // Keep the original normalization as fine bands disappear, so the coarse
    // flow does not grow brighter/stronger at a resolution boundary.
    float normalization = noiseDetail == 0.0
        ? 1.0 - exp2(-float(complexity))
        : 0.5 * (1.0 - pow(persistence, float(complexity))) / (1.0 - persistence);
    return sum / normalization;
}

float shape(float n) {
    if (noiseType == 1) n = abs(n) * 2.0 - (glowPass == 1 && noiseDetail > 0.0 ? 0.5 : 1.0);
    if (noiseType == 2) {
        // A brightness field should form filled pockets, not just the zero
        // contours of fBm. Keep ridges for displacement and the legacy look.
        float ridgeWeight = glowPass == 1 && composite == 1 ? 1.0 - noiseDetail : 1.0;
        if (ridgeWeight == 0.0) return sign(n) * pow(abs(n), noiseBias);
        // Integrate sqrt(abs(n)) across the pixel's noise footprint. The cusp
        // at zero otherwise produces thin ridges that sparkle while moving.
        float h = 0.5 * fwidth(n);
        float x = abs(n);
        float root;
        if (h < max(x * 0.01, 1e-5)) {
            root = sqrt(x);
        } else {
            float a = n + h;
            float b = n - h;
            root = (sign(a) * abs(a) * sqrt(abs(a))
                - sign(b) * abs(b) * sqrt(abs(b))) / (3.0 * h);
        }
        n = mix(n, 1.0 - 2.0 * root, ridgeWeight);
    }
    float exponent = glowPass == 0 && noiseType == 0 && noiseDetail > 0.0 ? min(noiseBias, 1.0) : noiseBias;
    return sign(n) * pow(abs(n), exponent);
}

float lightAt(vec2 p) {
    vec2 size = vec2(textureSize(src, 0));
    vec2 inside = clamp(p * size + 0.5, 0.0, 1.0)
        * clamp((1.0 - p) * size + 0.5, 0.0, 1.0);
    vec3 light = texture(src, clamp(p, 0.0, 1.0)).rgb;
    return (layered == 1 ? light.g : light.r) * inside.x * inside.y;
}

float sampleLight(vec2 p) {
    float light = lightAt(p);
    if (dot(flowOffset, flowOffset) > 0.0) {
        // Transport the emitting envelope as well as the noise. A moving mask
        // over a symmetric blur alone looks like boiling, not rising flames.
        light = light * 0.5 + lightAt(p - flowOffset * 0.45) * 0.3
            + lightAt(p - flowOffset) * 0.2;
    }
    return light;
}

vec2 distortionAt(float offset) {
    // Anchor noise to the element, so changing pad does not move it.
    float sampleClock = clock + noiseVelocity * offset;
    vec2 q = (uvContent * contentSize - wind - windVelocity * offset) / noiseScale;
    q.x /= aspect;
    vec2 n;
    if (glowPass == 1 && noiseType != 2 && noiseDetail == 0.0) {
        // Broad, wind-aligned flow. Fine strands appear only in active pockets,
        // rather than folding every part of the halo into the same marbling.
        vec2 across = vec2(flowDirection.y, -flowDirection.x);
        vec3 flow = vec3(dot(q, across), dot(q, flowDirection) * 0.4, sampleClock * 0.6)
            + vec3(seed * 0.123, seed * 0.719, seed * 0.317);
        float footprint = noiseFootprint(flow.xy);
        float baseBand = noiseBand(footprint);
        float broad = snoise(flow) * baseBand;
        float activity = smoothstep(-0.15, 0.65, snoise(flow * 0.65 + 27.3));
        float detail = 0.0;
        float weight = mix(0.22, 0.48, noiseDetail);
        vec3 fine = flow;
        for (int i = 1; i < 8; i++) {
            if (i >= complexity) break;
            fine = fine * 2.03 + vec3(17.1, 9.2, 13.7);
            footprint *= 2.03;
            float band = noiseBand(footprint);
            if (band <= 0.0) break;
            detail += snoise(fine) * weight * band;
            weight *= mix(0.35, 0.6, noiseDetail);
        }
        float turbulence = shape(clamp(broad + detail * activity, -1.0, 1.0)) * baseBand;
        n = (across * turbulence * 0.45
            + flowDirection * (0.55 + 0.45 * turbulence)) * polarity;
        // Brightness modulation must remain centered around neutral.
        if (composite == 1) n.x = turbulence * polarity;
    } else {
        vec2 domain = q;
        if (glowPass == 1 && noiseType == 2 && noiseDetail > 0.0) {
            // Density retains broad pockets. Displacement can use long strands;
            // applying that same stretch to density creates repeated flame ribs.
            vec2 across = vec2(flowDirection.y, -flowDirection.x);
            float stretch = composite == 1 ? 0.65 : 0.15;
            domain = mix(q, vec2(dot(q, across), dot(q, flowDirection) * stretch), noiseDetail);
        }
        vec3 p = vec3(domain, sampleClock) + vec3(seed * 0.123, seed * 0.719, seed * 0.317);
        float baseFootprint = noiseFootprint(p.xy);
        if (noiseType == 0 && glowPass == 0) {
            // The warp itself must disappear when its wavelength is unresolved.
            p.xy += 0.65 * noiseBand(baseFootprint) * vec2(snoise(p + 3.1), snoise(p + 19.7));
        }
        float footprint = max(baseFootprint, noiseFootprint(p.xy));
        n.x = shape(fbm(p, footprint));
        // Multiply consumes one scalar; avoid evaluating a second fractal field.
        n.y = composite == 1 ? 0.0 : shape(fbm(p + vec3(43.7, 17.3, 9.1), footprint));
        n *= polarity * noiseBand(footprint);
    }
    if (glowPass == 0 && noiseType == 0 && noiseDetail > 0.0 && noiseBias > 1.0) {
        float activity = clamp(0.5 + snoise(vec3(q * 0.35, sampleClock * 0.3) + 11.7), 0.0, 1.0);
        n *= mix(1.0, pow(activity, noiseBias - 1.0), noiseDetail);
    }
    return n;
}

float shadeNoise(vec2 n) {
    float light;
    if (composite == 1) {
        float mask = clamp(n.x + 1.0, 0.0, 2.0);
        // Local hot pockets and dark gaps, without a global brightness clock.
        // The noise itself is footprint filtered before this contrast curve.
        float hot = min(4.0 * pow(max(n.x + 0.55, 0.0), 3.0), 8.0);
        mask = mix(mask, hot, noiseDetail);
        light = sampleLight(uv) * mix(1.0, mask, min(amount / 32.0, 1.0));
    } else {
        n = mix(n, flowDirection * dot(n, flowDirection), directionality);
        vec2 warped = uv - n * amount / bufferSize;
#ifdef ANALYTIC_CORE
        // Pulling a thin raster line through a steep warp misses whole pixels.
        // For a single steady contour, integrate the warped distance field
        // instead. Keep the raster path for reveals and undetailed distortion.
        vec4 field = texture(contourField, warped);
        vec2 gradient = vec2(dFdx(field.r), dFdy(field.r));
        float slope = max(length(gradient), 1e-3);
        vec2 normal = slope > 1e-3 ? gradient / slope : vec2(1.0, 0.0);
        light = lineCoverage(abs(field.r) / slope, signedCoreWidth / slope, normal);
        light *= step(0.5, field.a) * step(0.0, min(warped.x, warped.y))
            * step(max(warped.x, warped.y), 1.0);
#else
        light = sampleLight(warped);
#endif
        if (glowPass == 1) light = mix(light, sampleLight(uv), 0.15 * (1.0 - noiseDetail));
    }
    return light;
}

void main() {
#ifdef CORE_BOUNDS
    // A warp can only pull light from within sqrt(2) * amount. Decide once per
    // derivative quad; retained quads still evaluate every derivative lane.
    vec4 bounds = texelFetch(contourField, ivec2(gl_FragCoord.xy) & ~1, 0);
    if (bounds.a < 0.5 || abs(bounds.r) > supportReach) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
#endif
    if (amount <= 0.0) {
        float light = sampleLight(uv);
        if (layered == 1) light += texture(src, uv).b;
        outColor = vec4(vec3(light), 1.0);
        return;
    }
    vec2 n = distortionAt(motionBlur * 0.5);
    float light = shadeNoise(n);
    if (motionBlur > 0.0) {
        // Approximate velocity over the shutter using two endpoint fields.
        // Simpson weights integrate five light samples without five fBm calls.
        vec2 start = distortionAt(-motionBlur * 0.5);
        light = (shadeNoise(start) + light
            + 4.0 * shadeNoise(mix(start, n, 0.25))
            + 2.0 * shadeNoise(mix(start, n, 0.5))
            + 4.0 * shadeNoise(mix(start, n, 0.75))) / 12.0;
    }
    // R carries the bypass image, G the deformable light, B the soft halo.
    if (layered == 1) light += texture(src, uv).b;
    outColor = vec4(vec3(light), 1.0);
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

const FRAG_PRE_GAMMA = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform float gamma;
void main() {
    // Preserve HDR while keeping extreme interactive settings finite in 16F.
    float light = min(pow(max(texture(src, uv).r, 0.0), 1.0 / gamma), 4096.0);
    outColor = vec4(vec3(light), 1.0);
}
`;

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

vec3 sampleLayeredGlow() {
    vec4 lights = vec4(0.0);
    if (weights.x > 0.0) lights.x = layerAt(layer0, layerScales.x, outputSize) * weights.x;
    if (weights.y > 0.0) lights.y = layerAt(layer1, layerScales.y, outputSize) * weights.y;
    if (weights.z > 0.0) lights.z = layerAt(layer2, layerScales.z, outputSize) * weights.z;
    if (weights.w > 0.0) lights.w = layerAt(layer3, layerScales.w, outputSize) * weights.w;
    float nearLight = dot(lights, nearShares);
    float farLight = dot(lights, vec4(1.0) - nearShares);
    return min(vec3(nearLight + farLight, nearLight, farLight), 4096.0);
}
`;

const FRAG_SUM = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
${GLSL_SABER_LAYERS}
void main() {
    outColor = vec4(sampleLayeredGlow(), 1.0);
}
`;

// Separate targets ensure neither distortion pass can overwrite its own input.
// Auto-sized targets belong to the effect host. Explicit mip/layer targets are
// released on resize and disposal.
export class SaberGlowPasses {
    #core: EffectRenderTarget | null = null;
    #input: EffectRenderTarget | null = null;
    #output: EffectRenderTarget | null = null;
    #distortedGlow: EffectRenderTarget | null = null;
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
        kind: "core" | "glow",
        layered = false,
        bounds?: {
            field: EffectRenderTarget;
            reach: number;
            lineWidth?: number;
        },
        flowDistance = 0,
    ): EffectRenderTarget {
        if (!(params.amount > 0) && !(flowDistance > 0)) {
            return src;
        }
        let target = kind === "core" ? this.#core : this.#distortedGlow;
        if (!target) {
            target = ctx.createRenderTarget({ float: true });
            if (kind === "core") {
                this.#core = target;
            } else {
                this.#distortedGlow = target;
            }
        }
        const angle = (params.windDirection * Math.PI) / 180;
        const distance = ctx.time * params.windSpeed;
        ctx.draw({
            frag:
                bounds?.lineWidth && params.composite === "distort"
                    ? FRAG_DISTORT_CONTOUR
                    : bounds
                      ? FRAG_DISTORT_BOUNDED
                      : FRAG_DISTORT,
            uniforms: {
                ...(bounds
                    ? {
                          contourField: bounds.field,
                          signedCoreWidth:
                              (bounds.lineWidth ?? 0) * ctx.dims.pixelRatio,
                          supportReach:
                              (bounds.reach + Math.SQRT2 * params.amount) *
                                  ctx.dims.pixelRatio +
                              8,
                      }
                    : {}),
                src,
                contentSize: [...ctx.dims.element],
                bufferSize: [
                    target.width / ctx.dims.pixelRatio,
                    target.height / ctx.dims.pixelRatio,
                ],
                wind: [Math.cos(angle) * distance, Math.sin(angle) * distance],
                windVelocity: [
                    Math.cos(angle) * params.windSpeed,
                    Math.sin(angle) * params.windSpeed,
                ],
                noiseVelocity: params.noiseSpeed,
                motionBlur:
                    params.windSpeed !== 0 || params.noiseSpeed !== 0
                        ? Math.max(0, Math.min(0.25, params.motionBlur))
                        : 0,
                flowDirection: [Math.cos(angle), Math.sin(angle)],
                flowOffset: [
                    (Math.cos(angle) *
                        Math.max(0, flowDistance) *
                        (params.windSpeed < 0 ? -1 : 1) *
                        ctx.dims.pixelRatio) /
                        target.width,
                    (Math.sin(angle) *
                        Math.max(0, flowDistance) *
                        (params.windSpeed < 0 ? -1 : 1) *
                        ctx.dims.pixelRatio) /
                        target.height,
                ],
                glowPass: kind === "glow" ? 1 : 0,
                layered: layered ? 1 : 0,
                clock: ctx.time * params.noiseSpeed,
                amount: params.amount,
                noiseScale: Math.max(params.noiseScale, 0.1),
                noiseBias: Math.max(params.noiseBias, 0.05),
                noiseDetail: Math.min(1, Math.max(0, params.noiseDetail)),
                aspect: Math.max(params.noiseAspectRatio, 0.05),
                directionality: Math.max(0, Math.min(1, params.directionality)),
                seed: params.seed,
                complexity: Math.max(
                    1,
                    Math.min(8, Math.round(params.noiseComplexity)),
                ),
                noiseType:
                    params.type === "smoke"
                        ? 1
                        : params.type === "energy"
                          ? 2
                          : 0,
                composite: params.composite === "multiply" ? 1 : 0,
                polarity: params.invert ? -1 : 1,
            },
            target,
        });
        return target;
    }

    preGamma(
        ctx: EffectContext,
        src: EffectRenderTarget,
        gamma: number,
    ): EffectRenderTarget {
        if (gamma === 1) {
            return src;
        }
        this.#input ??= ctx.createRenderTarget({ float: true });
        const target = this.#input;
        ctx.draw({
            frag: FRAG_PRE_GAMMA,
            uniforms: { src, gamma: Math.max(gamma, 0.05) },
            target,
        });
        return target;
    }

    layers(
        ctx: EffectContext,
        src: EffectRenderTarget,
        layers: readonly SaberGlowLayer[],
        sizeMultiplier: number,
        noiseScale: number,
    ): EffectRenderTarget {
        return this.combineLayers(
            ctx,
            this.prepareLayers(ctx, src, layers, sizeMultiplier, noiseScale),
        );
    }

    combineLayers(
        ctx: EffectContext,
        uniforms: SaberGlowLayers,
    ): EffectRenderTarget {
        this.#output ??= ctx.createRenderTarget({ float: true });
        ctx.draw({ frag: FRAG_SUM, uniforms, target: this.#output });
        return this.#output;
    }

    prepareLayers(
        ctx: EffectContext,
        src: EffectRenderTarget,
        layers: readonly SaberGlowLayer[],
        sizeMultiplier: number,
        noiseScale: number,
        distortAllLayers = false,
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
                    float: true,
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
                radius > 0 ? Math.max(0, layers[i].intensity) * radius : 0;
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
                        float: true,
                    }),
                    ctx.createRenderTarget({
                        size: [input.width, input.height],
                        float: true,
                    }),
                ];
                this.#layers[i] = pair;
            }
            const sigma = radius * ctx.dims.pixelRatio;
            const key = `${sigma}:${level}`;
            let kernel = this.#kernels[i];
            if (kernel?.key !== key) {
                kernel = {
                    key,
                    taps: gaussianKernel(remainingBlurSigma(sigma, level)),
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
        this.#core = null;
        this.#input = null;
        this.#output = null;
        this.#distortedGlow = null;
    }
}
