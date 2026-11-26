// Finds the outline once and caches it: distance and normal to the nearest contour point.
// Independent distortion animates the cached contour and its four glow layers.
// For the reveal, a traced copy of the outline gives each contour point its position along its loop, and the core pass cuts the lines by it.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";
import { type Contour, traceContours } from "./_contour.js";
import { parseHexColor } from "./_figma-common.js";
import { padOutputRect } from "./_pad.js";
import { coreBlurSigma } from "./_saber-blur.js";
import { saberColorRamp } from "./_saber-color.js";
import { GLSL_LINE_COVERAGE } from "./_saber-coverage.js";
import { saberFlickerGain } from "./_saber-flicker.js";
import {
    DEFAULT_DISTORTION,
    GLSL_SABER_LAYERS,
    type SaberDistortionParams,
    type SaberGlowLayer,
    type SaberGlowLayers,
    SaberGlowPasses,
} from "./_saber-glow.js";
import { SABER_PRESETS, type SaberPresetName } from "./saber-presets.js";

export type { SaberDistortionParams, SaberGlowLayer } from "./_saber-glow.js";

// Edge value of the source, zero outside the valid src rect.
const GLSL_MASK = `
uniform sampler2D src;
uniform int edgeMode;
uniform float edgeThreshold;
uniform vec2 maskFilterStep;

float alphaAt(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    return texture(src, clamp(p, 0.0, 1.0)).a * inside.x * inside.y;
}

float filteredAlpha(vec2 p) {
    if (maskFilterStep.x + maskFilterStep.y == 0.0) return alphaAt(p);
    // Area prefilter only when the source is minified. Four bilinear samples
    // cover a 2x2 or 4x4 source footprint without an extra render pass.
    vec2 d = maskFilterStep * 0.25;
    return (alphaAt(p + d) + alphaAt(p - d)
        + alphaAt(p + vec2(d.x, -d.y)) + alphaAt(p + vec2(-d.x, d.y))) * 0.25;
}

float lumaAt(vec2 p) {
    vec2 inside = step(vec2(0.0), p) * step(p, vec2(1.0));
    vec3 c = texture(src, clamp(p, 0.0, 1.0)).rgb;
    return dot(c, vec3(0.299, 0.587, 0.114)) * inside.x * inside.y;
}

float maskAt(vec2 p) {
    if (edgeMode == 1) {
        // Blur photos a little, so texture noise does not make tiny contours.
        vec2 t = 1.5 / vec2(textureSize(src, 0));
        float m = lumaAt(p) * 0.2;
        m += (lumaAt(p + vec2(t.x, t.y)) + lumaAt(p + vec2(-t.x, t.y))
            + lumaAt(p + vec2(t.x, -t.y)) + lumaAt(p - t)) * 0.1;
        m += (lumaAt(p + vec2(2.0 * t.x, 0.0)) + lumaAt(p - vec2(2.0 * t.x, 0.0))
            + lumaAt(p + vec2(0.0, 2.0 * t.y)) + lumaAt(p - vec2(0.0, 2.0 * t.y))) * 0.1;
        return m - max(edgeThreshold, 1e-6);
    }
    // Threshold zero includes nonzero coverage, not the transparent padding.
    return filteredAlpha(p) - max(edgeThreshold, 1e-6);
}
`;

// Marks texels next to a threshold crossing.
// Stores the px offset from the texel centre to the contour point.
// With the reveal on, it also stores the arc position from the nearest traced point.
const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D payload;
uniform int payloadOn;
${GLSL_MASK}

// Arc position and 1 + loop length of the nearest traced point within 4 texels.
// The wide search also catches points traced a few frames ago on a moving source.
// Without one, the length part is 1, which reads as a miss.
vec2 nearestPayload() {
    vec2 best = vec2(0.0, 1.0);
    if (payloadOn == 0) {
        return best;
    }
    ivec2 p = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(payload, 0);
    int bestDist = 100;
    for (int y = -4; y <= 4; y++) {
        for (int x = -4; x <= 4; x++) {
            ivec2 q = p + ivec2(x, y);
            if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, size))) {
                continue;
            }
            vec4 s = texelFetch(payload, q, 0);
            int dist = x * x + y * y;
            if (s.a > 0.0 && dist < bestDist) {
                bestDist = dist;
                best = vec2(s.r, 1.0 + s.g);
            }
        }
    }
    return best;
}

// Signed offset to the crossing towards each neighbour; 2 when there is none.
float crossing(float m, float a, float b) {
    float toA = (m >= 0.0) != (a >= 0.0) ? -m / (m - a) : 2.0;
    float toB = (m >= 0.0) != (b >= 0.0) ? m / (m - b) : 2.0;
    return abs(toA) < abs(toB) ? toA : toB;
}

void main() {
    vec2 dx = dFdx(uvSrc);
    vec2 dy = dFdy(uvSrc);
    float m = maskAt(uvSrc);
    vec4 neighbors = vec4(maskAt(uvSrc - dx), maskAt(uvSrc + dx),
        maskAt(uvSrc - dy), maskAt(uvSrc + dy));
    float ox = crossing(m, neighbors.x, neighbors.y);
    float oy = crossing(m, neighbors.z, neighbors.w);
    bool hasX = abs(ox) <= 1.0;
    bool hasY = abs(oy) <= 1.0;
    if (!hasX && !hasY) {
        outColor = vec4(0.0);
        return;
    }
    // Nearest point on the straight line through both axis crossings.
    vec2 o = vec2(ox, oy);
    o = sign(o + 1e-9) * max(abs(o), vec2(1e-4));
    vec2 inv = vec2(hasX ? 1.0 / o.x : 0.0, hasY ? 1.0 / o.y : 0.0);
    vec2 offset = inv / dot(inv, inv);
    if (hasX != hasY) {
        // One crossing alone sits on a pixel axis, not at the closest point.
        // Project it along the local mask normal to reduce oblique-edge scallops.
        vec2 grad = vec2(neighbors.y - neighbors.x, neighbors.w - neighbors.z);
        float grad2 = dot(grad, grad);
        // A one-pixel stroke can have two opposing crossings and no gradient.
        if (grad2 > 1e-8) offset = grad * dot(offset, grad) / grad2;
    }
    outColor = vec4(offset, nearestPayload());
}
`;

// One jump flood step: keep the nearest contour point among 9 neighbours.
const FRAG_JFA = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D seed;
uniform int stepSize;

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(seed, 0);
    vec4 best = vec4(0.0);
    float bestLen = 1e20;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            ivec2 delta = ivec2(x, y) * stepSize;
            ivec2 q = p + delta;
            if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, size))) {
                continue;
            }
            vec4 s = texelFetch(seed, q, 0);
            if (s.a == 0.0) {
                continue;
            }
            vec2 candidate = s.rg + vec2(delta);
            float len = dot(candidate, candidate);
            if (len < bestLen) {
                bestLen = len;
                best = vec4(candidate, s.ba);
            }
        }
    }
    outColor = best;
}
`;

// Signed distance in px (negative inside), outward normal, valid flag.
const FRAG_RESOLVE = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D seed;
${GLSL_MASK}

void main() {
    vec2 dx = dFdx(uvSrc);
    vec2 dy = dFdy(uvSrc);
    vec4 s = texelFetch(seed, ivec2(gl_FragCoord.xy), 0);
    if (s.a == 0.0) {
        outColor = vec4(0.0);
        return;
    }
    float side = maskAt(uvSrc) >= 0.0 ? -1.0 : 1.0;
    float d = length(s.rg);
    vec2 n;
    if (d > 1e-3) {
        n = -side * s.rg / d;
    } else {
        // On the contour: use the mask gradient instead.
        vec2 grad = vec2(
            maskAt(uvSrc + dx) - maskAt(uvSrc - dx),
            maskAt(uvSrc + dy) - maskAt(uvSrc - dy)
        );
        float len = length(grad);
        n = len > 0.0 ? -grad / len : vec2(0.0);
    }
    outColor = vec4(side * d, n, 1.0);
}
`;

// Arc position and loop length of the nearest contour point, for the reveal.
const FRAG_ARC = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D seed;

void main() {
    vec4 s = texelFetch(seed, ivec2(gl_FragCoord.xy), 0);
    outColor = vec4(s.b, max(s.a - 1.0, 0.0), 0.0, 1.0);
}
`;

// Traced contour points, splatted as single texels into the payload target.
const VERT_SPLAT = `#version 300 es
precision highp float;
in vec4 position;
uniform vec4 outputRect;
out vec2 arc;

void main() {
    arc = position.zw;
    gl_Position = vec4((position.xy - outputRect.xy) / outputRect.zw * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 1.0;
}
`;

const FRAG_SPLAT = `#version 300 es
precision highp float;
in vec2 arc;
out vec4 outColor;

void main() {
    outColor = vec4(arc, 0.0, 1.0);
}
`;

// Edge mask for the contour tracer, from the same edge value as the seed pass.
const FRAG_TRACE_MASK = `#version 300 es
precision highp float;
uniform vec2 maskSize;
out vec4 outColor;
${GLSL_MASK}

void main() {
    outColor = vec4(maskAt(gl_FragCoord.xy / maskSize) >= 0.0 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}
`;

// Integrate a steady contour from its distance field, with optional arc reveal.
const FRAG_CORE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D field;
uniform sampler2D arcTex;
uniform float thickness;
uniform float pixelRatio;
uniform int reveal;
uniform float revealStart;
uniform float revealEnd;
uniform float segments;
uniform float fade;
${GLSL_LINE_COVERAGE}

const float CUT_SOFTNESS = 3.0;
const float HEAD_LENGTH = 12.0;
const float HEAD_GAIN = 1.5;
const float MIN_SEGMENT = 160.0;

void main() {
    // Decide once per derivative quad, retaining all lanes needed for coverage.
    vec4 quad = texelFetch(field, ivec2(gl_FragCoord.xy) & ~1, 0);
    if (quad.a < 0.5 || abs(quad.r) > thickness + 4.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    vec4 f = texelFetch(field, ivec2(gl_FragCoord.xy), 0);
    float d = f.r;
    vec2 n = f.gb;
    vec2 q = gl_FragCoord.xy - d * n;

    // Reveal: which part of each loop shows, a long fading tail behind start, and a bright head at end.
    float shown = 1.0;
    float head = 0.0;
    if (reveal == 1) {
        vec2 arc = texelFetch(arcTex, ivec2(q), 0).rg;
        // Split each loop into segments that reveal together; short loops get fewer.
        float count = clamp(floor(arc.y / (MIN_SEGMENT * pixelRatio)), 1.0, segments);
        float along = fract(arc.x * count);
        float segmentLength = arc.y / count;
        float soft = CUT_SOFTNESS * pixelRatio;
        float fromStart = (along - revealStart) * segmentLength;
        float toEnd = (revealEnd - along) * segmentLength;
        // The tail grows with start, so nothing dims while start is still 0.
        float tail = max(soft, min(fade, revealStart * segmentLength));
        shown = smoothstep(0.0, tail, fromStart);
        shown *= revealEnd >= 1.0 ? 1.0 : smoothstep(0.0, soft, toEnd);
        // A loop the tracer missed has no length; hide it rather than show it whole.
        shown *= step(0.5, arc.y);
        // A bright head at the growing end, which fades out as the loop closes.
        float headLength = HEAD_LENGTH * pixelRatio;
        head = exp(-max(toEnd, 0.0) / headLength);
        head *= clamp((1.0 - revealEnd) * segmentLength / headLength, 0.0, 1.0);
    }

    // The tail thins out without changing the distance field's energy.
    float width = thickness * mix(0.5, 1.0, shown);
    vec2 grad = vec2(dFdx(d), dFdy(d));
    float screenGrad = length(grad);
    vec2 lineNormal = screenGrad > 1e-3 ? grad / screenGrad : n;
    // Quantized masks can have no usable normal; preserve a pixel footprint.
    if (dot(lineNormal, lineNormal) < 0.25) lineNormal = vec2(1.0, 0.0);
    // An undisplaced core is already a distance field. Dividing by its finite
    // difference gradient would thin oblique edges and modulate their energy.
    float light = lineCoverage(abs(d), width, lineNormal);
    light *= shown * (1.0 + HEAD_GAIN * head);
    outColor = vec4(vec3(light), 1.0);
}
`;

// Light = crisp core + blurred glow, burnt to white where it is bright.
// Output is premultiplied; the light adds on top of the source.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D core;
uniform sampler2D glowTex;
#ifdef WARPED_HALO
uniform sampler2D haloTex;
#endif
uniform vec3 colorRamp[33];
uniform float coreGain;
#ifdef CORE_TINT
uniform float coreWhiteness;
#endif
uniform float glowGain;
#ifdef CORE_OVERLAY
uniform sampler2D originalCore;
#endif
uniform int source;
uniform float edgeFade;
uniform float whiteMix;
uniform float outputGamma;
uniform float outputBrightness;
uniform float glowOutputBrightness;
uniform float outputSaturation;
#ifdef LAYERED_GLOW
${GLSL_SABER_LAYERS}
#endif

float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 tintLight(float energy, float whiteness) {
    float light = clamp(energy, 0.0, 1.0);
    float coordinate = sqrt(light) * 32.0;
    int i = min(int(coordinate), 31);
    vec3 tinted = mix(colorRamp[i], colorRamp[i + 1], coordinate - float(i));
    return mix(tinted, vec3(light), whiteness);
}

vec3 gradeLight(vec3 energy) {
    float gray = (energy.r + energy.g + energy.b) / 3.0;
    vec3 graded = max(mix(vec3(gray), energy, outputSaturation), 0.0);
    return clamp(pow(graded, vec3(outputGamma)), 0.0, 1.0);
}

void main() {
    vec4 lights = vec4(0.0);
    if (glowGain > 0.0) {
#ifdef LAYERED_GLOW
        lights = sampleLayeredGlow();
#else
        lights = texture(glowTex, uv);
#endif
#ifdef WARPED_HALO
        lights.a = texture(haloTex, uv).r;
#endif
        // Fade the glow out towards the buffer edge.
        vec2 edgeDist = min(uv, 1.0 - uv) * vec2(textureSize(core, 0));
        if (edgeFade > 0.0) {
            lights *= smoothstep(0.0, edgeFade, min(edgeDist.x, edgeDist.y));
        }
    }

    float coreLight = texture(core, uv).r * coreGain;
    lights = max(lights, 0.0) * glowGain;
    float coreWhite = whiteMix;
#ifdef CORE_TINT
    coreWhite = coreWhiteness;
#endif
    // AE combines scalar light before colorization, Saturation and Gamma.
    // Halo retains its measured extra Brightness factor inside core coverage.
    float haloLight = clamp(lights.a * outputBrightness, 0.0, 1.0);
    float haloContribution = haloLight * (1.0 - clamp(coreLight, 0.0, 1.0));
    float coreAndHalo = clamp((coreLight + haloContribution) * outputBrightness, 0.0, 1.0);
    vec3 glowLight = clamp(lights.rgb * glowOutputBrightness, 0.0, 1.0);
    float light = 1.0 - (1.0 - coreAndHalo)
        * (1.0 - glowLight.r) * (1.0 - glowLight.g) * (1.0 - glowLight.b);
    // Whiteness is an extension to the native colorizer. Weight the separate
    // Core/Glow controls by their input light; native presets leave both zero.
    float coreWeight = max(coreLight * outputBrightness, 0.0);
    float glowWeight = haloContribution * outputBrightness
        + glowLight.r + glowLight.g + glowLight.b;
#ifdef CORE_OVERLAY
    // Blend on Top participates in scalar Screen, before the shared grade.
    float overlay = clamp(texture(originalCore, uv).r * coreGain * outputBrightness, 0.0, 1.0);
    light = 1.0 - (1.0 - light) * (1.0 - overlay);
    coreWeight += overlay;
#endif
    float weight = coreWeight + glowWeight;
    float whiteness = weight > 0.0
        ? (coreWhite * coreWeight + whiteMix * glowWeight) / weight : 0.0;
    vec3 rgb = gradeLight(tintLight(light, whiteness));
    // TPDF dither, faded out where there is no light.
    vec2 p = gl_FragCoord.xy;
    vec3 noise = vec3(ign(p), ign(p + 17.0), ign(p + 41.0))
        + vec3(ign(p + 113.0), ign(p + 131.0), ign(p + 149.0)) - 1.0;
    float lightAlpha = max(max(rgb.r, rgb.g), rgb.b);
    rgb = max(rgb + noise / 255.0 * clamp(lightAlpha * 64.0, 0.0, 1.0), 0.0);

    vec4 base = vec4(0.0);
    if (source == 1) {
        vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
        base = texture(src, clamp(uvSrc, 0.0, 1.0)) * inside.x * inside.y;
    }
    float a = clamp(max(base.a, lightAlpha), 0.0, 1.0);
    outColor = vec4(base.rgb + rgb, a);
}
`;

// Optional samplers/branches disappear entirely when their feature is off.
const COMPOSITE_SHADERS = Array.from({ length: 16 }, (_, flags) =>
    FRAG_COMPOSITE.replace(
        "#version 300 es",
        "#version 300 es" +
            ["LAYERED_GLOW", "CORE_TINT", "CORE_OVERLAY", "WARPED_HALO"]
                .map((name, bit) =>
                    flags & (1 << bit) ? `\n#define ${name}` : "",
                )
                .join(""),
    ),
);

export type SaberParams = {
    /** Light tint, CSS hex. coreWhiteness controls the core's additional white mix. */
    color: string;
    /** Overall brightness of the lines and glow. */
    intensity: number;
    /** Output exponent, 0.1..10. 1 is neutral; below 1 lifts midtones, above 1 darkens them. */
    gamma: number;
    /** Output light multiplier before gamma, 0..5. 1 is neutral; 0 hides the light. */
    brightness: number;
    /** Output saturation about the RGB mean, 0..2. 0 is grayscale; 1 is neutral. */
    saturation: number;
    /** Visible core brightness only. 1 is neutral gain; 0 hides the core. */
    coreIntensity: number;
    /** Mix the visible core's tint toward white, 0..1. */
    coreWhiteness: number;
    /** Core softness in CSS px (two box filters before deformation). 0 bypasses; leaves Glow unchanged. */
    coreSoftness: number;
    /** Screen original Core light before color grading when Glow and Core Distortion are active. */
    coreBlendOnTop: boolean;
    /** Layer 4 input intensity multiplier in percent, 0..1000. 100 = unchanged; 0 disables. */
    haloIntensity: number;
    /** Layer 4 radius multiplier in percent, 0..1000. 100 = unchanged; 0 disables. */
    haloSize: number;
    /** Brightness modulation depth, 0..1. 0 disables; affects core, halo and glow, not source. */
    flickerIntensity: number;
    /** Brightness-noise keyframes per second, independent of distortion clocks. 0 freezes. */
    flickerSpeed: number;
    /** Integer seed for brightness flicker, independent of distortion seeds. */
    flickerSeed: number;
    /** Width of the undistorted contour in CSS px. */
    thickness: number;
    /** Input glow gain, before per-layer Pre Gamma and nonlinear amplification. */
    glow: number;
    /** Mix Glow/Halo toward white independently of the core, 0..1. */
    glowWhiteness: number;
    /** Four independent size/intensity pairs. Each size is in CSS px. */
    glowLayers: [
        SaberGlowLayer,
        SaberGlowLayer,
        SaberGlowLayer,
        SaberGlowLayer,
    ];
    /** Approximate AE layer balance, 0..5. 1 preserves layer gains; 0 suppresses layer 1. Not a contrast exponent. */
    glowBias: number;
    /** Glow layer radius multiplier. 1 = neutral, 0 = no glow. */
    glowSizeMultiplier: number;
    /** Shape each weighted, blurred layer before amplification/distortion: pow(light, gamma), 0.1..5; 1 = neutral. */
    glowPreGamma: number;
    /** Directional glow trail in CSS px, following glowDistortion wind. 0 disables. */
    glowFlow: number;
    /** Distort all three glow layers instead of protecting wide blur layers. Layer 4 (Halo) is always unchanged. */
    glowDistortAllLayers: boolean;
    /** Warp/modulate the visible core independently of the Glow source. */
    coreDistortion: SaberDistortionParams;
    /** Warp/modulate glow separately, leaving visible core lines unchanged. */
    glowDistortion: SaberDistortionParams;
    /**
     * What the outline is taken from.
     * `"alpha"` for logos, text and cut-out images; `"luminance"` for photos and video.
     */
    edge: "alpha" | "luminance";
    /** Cutoff on the edge value, 0..1. */
    edgeThreshold: number;
    /** Draw the element under the light. */
    source: boolean;
    /** Rebuild the outline every frame, for video and canvas. */
    dynamic: boolean;
    /**
     * Where the lines start along each outline loop, 0..1.
     * Animate it from 0 to 1 to wipe the outline out.
     */
    start: number;
    /**
     * Where the lines end along each outline loop, 0..1.
     * Animate it from 0 to 1 to draw the outline on.
     */
    end: number;
    /**
     * Number of pieces each outline loop is split into for `start` and `end`, so several heads grow at once.
     * Short loops use fewer. 1 draws each loop from a single point.
     */
    segments: number;
    /**
     * Length of the fading tail behind `start`, in CSS px, so a wipe-out trails off gently.
     * 0 cuts crisply.
     */
    fade: number;
    /**
     * Room for the lines and glow around the element, in CSS px.
     * `"fullscreen"` fills the canvas.
     */
    pad: number | "fullscreen";
};

/** Constructor/setParams options; distortion groups accept partial updates. */
export type SaberOptions = Omit<
    Partial<SaberParams>,
    "coreDistortion" | "glowDistortion"
> & {
    /** Apply a named appearance first, then explicit overrides. Input/reveal/pad are retained. */
    preset?: SaberPresetName;
    coreDistortion?: Partial<SaberDistortionParams>;
    glowDistortion?: Partial<SaberDistortionParams>;
};

// Distance-field support in CSS px. Preserve flood paths for core distortion.
const FIELD_REACH = 96;

// Light gain of the core line and the glow, before `intensity`.
const CORE_GAIN = 1;
const GLOW_GAIN = 1;
// Share of white in the light tint; higher burns the core whiter.
const WHITE_MIX = 0.15;

const DEFAULT_PARAMS: SaberParams = {
    color: "#3399ff",
    intensity: 1,
    gamma: 1,
    brightness: 1,
    saturation: 1,
    coreIntensity: 1,
    coreWhiteness: WHITE_MIX,
    coreSoftness: 0,
    coreBlendOnTop: false,
    haloIntensity: 100,
    haloSize: 100,
    flickerIntensity: 0,
    flickerSpeed: 12,
    flickerSeed: 0,
    thickness: 2,
    glow: 1,
    glowWhiteness: WHITE_MIX,
    glowLayers: [
        { size: 3, intensity: 3 },
        { size: 12, intensity: 6 },
        { size: 36, intensity: 9 },
        { size: 96, intensity: 12 },
    ],
    glowBias: 1,
    glowSizeMultiplier: 1,
    glowPreGamma: 1,
    glowFlow: 0,
    glowDistortAllLayers: false,
    coreDistortion: { ...DEFAULT_DISTORTION },
    glowDistortion: { ...DEFAULT_DISTORTION, seed: 71 },
    edge: "alpha",
    edgeThreshold: 0.5,
    source: true,
    dynamic: false,
    start: 0,
    end: 1,
    segments: 3,
    fade: 100,
    pad: 80,
};

/**
 * Electric lines along the outline of an element, with a glow.
 * Defaults to the Electric preset. Independent core/glow distortion animates
 * the contour and its four glow layers.
 *
 * ```ts
 * vfx.add(img, { effect: new SaberEffect({ color: "#ff7a1a" }) });
 * ```
 *
 * The outline comes from the element's alpha, or its luminance with `edge: "luminance"`.
 * It is computed once and cached.
 * It is computed again when the element's size, `edge` or `edgeThreshold` changes.
 * After `vfx.update()` changes the content but not the size, call {@link SaberEffect.invalidate}.
 * For video, set `dynamic: true` to follow the outline every frame.
 *
 * Animate `end` from 0 to 1 to draw the outline on along each loop, and `start` from 0 to 1 to wipe it out.
 * With `segments`, each loop grows from several points at once, and `fade` makes the wiped-out end trail off gently.
 * The reveal traces the outline on the CPU once, so the lines show a few frames after it is first used.
 *
 * The lines and glow draw outside the element, within `pad` CSS px.
 * Over a white element the lines inside its edge are hard to see; use `source: false` to draw the light only.
 * All params are read every frame, so you can change `params` live.
 *
 * `coreDistortion` and `glowDistortion` have independent wind/noise clocks.
 * Set both `windSpeed` and `noiseSpeed`
 * to 0 to freeze a distortion. Amount 0 skips noise; a nonzero `glowFlow`
 * still transports the glow envelope.
 * Four independently sized glow layers are unaffected by
 * `pad` except for clipping at the buffer boundary. Allow roughly three times
 * the largest effective radius, plus distortion reach, when choosing `pad`.
 * These controls approximate Saber concepts, not its proprietary renderer or units.
 */
export class SaberEffect implements Effect {
    params: SaberParams;

    #seedA: EffectRenderTarget | null = null;
    #seedB: EffectRenderTarget | null = null;
    #field: EffectRenderTarget | null = null;
    #core: EffectRenderTarget | null = null;
    #region: EffectGeometry | undefined;
    #regionKey: readonly number[] = [];
    #glowPasses = new SaberGlowPasses();
    #rampColor = "";
    #colorRamp: Float32Array = new Float32Array(99);
    #dirty = true;
    #builtW = 0;
    #builtH = 0;
    #builtEdge: SaberParams["edge"] | null = null;
    #builtThreshold = Number.NaN;
    #builtLayout: readonly (number | string)[] = [];
    #builtGeometry: readonly number[] = [];
    #fieldVersion = 0;
    #coreVersion = 0;
    #coreKey: CacheKey = [];
    #visibleCore: EffectRenderTarget | null = null;
    #visibleCoreKey: CacheKey = [];
    #coreSoftener = new SaberGlowPasses();

    #softCore: EffectRenderTarget | null = null;
    #softCoreKey: CacheKey = [];
    #glowBase: EffectRenderTarget | null = null;
    #glowLayers: SaberGlowLayers | undefined;
    #preparedGlowLayers: SaberGlowLayers | undefined;
    #preparedGlowKey: CacheKey = [];
    #haloPasses = new SaberGlowPasses();
    #haloResult: EffectRenderTarget | null = null;
    #haloResultKey: CacheKey = [];
    #glowBaseVersion = 0;
    #glowBaseKey: CacheKey = [];
    #glowResult: EffectRenderTarget | null = null;
    #glowResultKey: CacheKey = [];

    // Reveal: traced contours give each contour point its arc position.
    #traceMask: EffectRenderTarget | null = null;
    #payload: EffectRenderTarget | null = null;
    #arc: EffectRenderTarget | null = null;
    #splat: EffectGeometry | null = null;
    #landed: TracedSource | null = null;
    #sourceVersion = 0;
    #traceInFlight = false;
    #traceSerial = 0;
    #traceStale = true;
    #payloadReady = false;
    #fieldHasPayload = false;
    #disposed = false;

    constructor(initial: SaberOptions = {}) {
        this.params = {
            ...DEFAULT_PARAMS,
            coreDistortion: { ...DEFAULT_PARAMS.coreDistortion },
            glowDistortion: { ...DEFAULT_PARAMS.glowDistortion },
            glowLayers: DEFAULT_PARAMS.glowLayers.map((layer) => ({
                ...layer,
            })) as SaberParams["glowLayers"],
        };
        validateOptions(initial);
        this.setParams(SABER_PRESETS.electric);
        this.setParams(initial);
    }

    setParams(partial: SaberOptions): void {
        validateOptions(partial);
        const { preset, coreDistortion, glowDistortion, glowLayers, ...rest } =
            partial;
        if (preset !== undefined) {
            if (!Object.hasOwn(SABER_PRESETS, preset)) {
                throw new RangeError(`Unknown Saber preset: ${preset}`);
            }
            this.setParams(SABER_PRESETS[preset]);
        }
        Object.assign(this.params, rest);
        Object.assign(this.params.coreDistortion, coreDistortion);
        Object.assign(this.params.glowDistortion, glowDistortion);
        if (glowLayers) {
            // Preserve live UI bindings while copying caller-owned values.
            glowLayers.forEach((layer, i) => {
                Object.assign(this.params.glowLayers[i], layer);
            });
        }
    }

    /** Compute the outline again on the next frame, after the element's content changed. */
    invalidate(): void {
        this.#dirty = true;
    }

    init(ctx: EffectContext): void {
        this.#disposed = false;
        // Flooding reads texelFetch, so linear filtering is safe. Once the field
        // has been resolved, B holds the live core. Reusing this scratch image
        // saves a full-size float buffer.
        this.#seedA = ctx.createRenderTarget({ float: true });
        this.#seedB = ctx.createRenderTarget({ float: true });
        // The host only clears the stage output.
        // So this keeps the field between frames without `persistent`.
        this.#field = ctx.createRenderTarget({ float: true });
        this.#core = this.#seedB;
        this.#dirty = true;
        // Restored targets come back empty, so the cached field must be built again.
        ctx.onContextRestored(() => {
            this.#dirty = true;
        });
    }

    render(ctx: EffectContext): void {
        const field = this.#field;
        const core = this.#core;
        if (!field || !core) {
            return;
        }
        const { edge, edgeThreshold, dynamic, start, end } = this.params;
        const regionChanged = this.#updateRegion(ctx, field);
        // Equal-sized buffers can still have different mappings (notably a
        // moving element with fullscreen padding, or a DPR/layout change).
        const geometry = [
            ...ctx.dims.element,
            ctx.dims.pixelRatio,
            ...ctx.dims.srcRect,
        ];
        const layout = [
            this.params.pad,
            ...(this.params.pad === "fullscreen" ? ctx.dims.canvasRect : []),
        ];
        const geometryChanged =
            this.#dirty ||
            edge !== this.#builtEdge ||
            edgeThreshold !== this.#builtThreshold ||
            geometry.some((value, i) => value !== this.#builtGeometry[i]);
        const sourceChanged =
            geometryChanged ||
            regionChanged ||
            field.width !== this.#builtW ||
            field.height !== this.#builtH ||
            layout.length !== this.#builtLayout.length ||
            layout.some((value, i) => value !== this.#builtLayout[i]);
        if (geometryChanged) {
            // The traced contours no longer match the element.
            this.#sourceVersion++;
            this.#payloadReady = false;
            this.#landed = null;
            this.#traceStale = true;
        } else if (dynamic) {
            this.#traceStale = true;
        }

        const reveal = start > 0 || end < 1;
        let usePayload = false;
        if (reveal) {
            this.#updatePayload(ctx);
            usePayload = this.#payloadReady;
        }
        if (
            sourceChanged ||
            dynamic ||
            (usePayload && !this.#fieldHasPayload)
        ) {
            this.#buildField(ctx, usePayload);
            this.#builtLayout = layout;
            this.#builtGeometry = geometry;
        }
        const { pixelRatio } = ctx.dims;
        const { thickness } = this.params;
        const coreKey: CacheKey = [
            this.#fieldVersion,
            thickness,
            reveal,
            usePayload,
            start,
            end,
            this.params.segments,
            this.params.fade,
        ];
        if (!sameKey(coreKey, this.#coreKey)) {
            ctx.draw({
                frag: FRAG_CORE,
                uniforms: {
                    field,
                    thickness: thickness * pixelRatio,
                    pixelRatio,
                    arcTex: usePayload && this.#arc ? this.#arc : field,
                    reveal: reveal ? 1 : 0,
                    // Until the traced contours land, show nothing rather than the whole outline.
                    revealStart: usePayload ? start : 1,
                    revealEnd: usePayload ? end : 0,
                    segments: Math.max(1, Math.round(this.params.segments)),
                    fade: Math.max(this.params.fade, 0) * pixelRatio,
                },
                target: core,
                geometry: this.#region,
            });
            this.#coreKey = coreKey;
            this.#coreVersion++;
        }
        // Native Softness filters the original core before deformation. Cache
        // that source; the animated warp must not redistribute its blur energy.
        const softness = Math.max(0, this.params.coreSoftness);
        const soften = softness > 0 && this.params.coreIntensity > 0;
        let originalCore = core;
        if (soften) {
            const softnessSigma = coreBlurSigma(softness);
            const key = [this.#coreVersion, softness];
            if (!this.#softCore || !sameKey(key, this.#softCoreKey)) {
                this.#softCore = this.#coreSoftener.layers(
                    ctx,
                    core,
                    [
                        { size: softnessSigma, intensity: 1 / softnessSigma },
                        { size: 0, intensity: 0 },
                        { size: 0, intensity: 0 },
                        { size: 0, intensity: 0 },
                    ],
                    1,
                    48,
                    softness,
                );
                this.#softCoreKey = key;
            }
            originalCore = this.#softCore;
        }
        const visibleCoreKey = [
            this.#coreVersion,
            soften ? softness : 0,
            ...distortionKey(this.params.coreDistortion, ctx.time),
        ];
        if (
            !this.#visibleCore ||
            !sameKey(visibleCoreKey, this.#visibleCoreKey)
        ) {
            this.#visibleCore = this.#glowPasses.distort(
                ctx,
                originalCore,
                this.params.coreDistortion,
                "core",
                false,
                this.params.coreDistortion.composite === "distort"
                    ? {
                          field,
                          lineWidth: !reveal && !soften ? thickness : 0,
                          reach: thickness + (soften ? softness + 2 : 0),
                      }
                    : undefined,
            );
            this.#visibleCoreKey = visibleCoreKey;
        }
        const displayedCore = this.#visibleCore;
        const { color, intensity, glow, source } = this.params;
        const haloIntensity =
            outputParam(this.params.haloIntensity, 0, 1000, 100) / 100;
        const haloSize = outputParam(this.params.haloSize, 0, 1000, 100) / 100;
        const effectiveLayers = this.params.glowLayers.map((layer, i) => ({
            size: layer.size * (i === 3 ? haloSize : 1),
            intensity: layer.intensity * (i === 3 ? haloIntensity : 1),
        }));
        const glowEnabled =
            glow > 0 &&
            intensity > 0 &&
            this.params.glowSizeMultiplier > 0 &&
            effectiveLayers.some(
                (layer) => layer.size > 0 && layer.intensity > 0,
            );
        let glowTex = core;
        let glowLayers: SaberGlowLayers | undefined;
        let haloTex: EffectRenderTarget | undefined;
        if (glowEnabled) {
            // Halo is blurred/amplified from the original core, then follows
            // Core Distortion. Blurring a deformed contour creates false pools.
            const warpHalo =
                this.params.coreDistortion.amount > 0 &&
                effectiveLayers[3].intensity > 0 &&
                effectiveLayers[3].size > 0;
            const preparedGlowKey: CacheKey = [
                this.#coreVersion,
                this.params.glowSizeMultiplier,
                this.params.pad,
                this.params.glowDistortion.noiseScale,
                this.params.glowDistortAllLayers,
                this.params.glowDistortion.amount > 0 ||
                    this.params.glowFlow > 0,
                ...effectiveLayers.flatMap((layer) => [
                    layer.size,
                    layer.intensity > 0,
                ]),
            ];
            const glowBaseKey = [
                ...preparedGlowKey,
                warpHalo,
                this.params.glowDistortion.amount > 0 ||
                this.params.glowFlow > 0
                    ? outputParam(this.params.brightness, 0, 5)
                    : -1,
                this.params.glowPreGamma,
                this.params.glowBias,
                glow,
                ...effectiveLayers.map((layer) => layer.intensity),
            ];
            if (!this.#glowBase || !sameKey(glowBaseKey, this.#glowBaseKey)) {
                if (
                    !this.#preparedGlowLayers ||
                    !sameKey(preparedGlowKey, this.#preparedGlowKey)
                ) {
                    this.#preparedGlowLayers = this.#glowPasses.prepareLayers(
                        ctx,
                        core,
                        effectiveLayers.map((layer) => ({
                            ...layer,
                            intensity: layer.intensity > 0 ? 1 : 0,
                        })),
                        this.params.glowSizeMultiplier,
                        this.params.glowDistortion.noiseScale,
                        this.params.glowDistortAllLayers,
                        true,
                    );
                    this.#preparedGlowKey = preparedGlowKey;
                }
                const bias = outputParam(this.params.glowBias, 0, 5);
                const layers = {
                    ...this.#preparedGlowLayers,
                    preGamma: outputParam(this.params.glowPreGamma, 0.1, 5),
                    // AE line probes saturate Glow source mass at Core Size ~3.4
                    // (6.8 px full width). Preserve that measured mass limit;
                    // the wide contour footprint remains an approximation.
                    inputGain:
                        outputParam(glow, 0, 1000) *
                        Math.min(1, 6.8 / Math.max(thickness, 1e-6)),
                    response: 1,
                    weights: effectiveLayers.map((layer) =>
                        layer.size > 0 ? Math.max(0, layer.intensity) : 0,
                    ),
                    // Small-signal slopes measured with isolated AE layers.
                    // This approximates balance, not AE's nonlinear HDR transfer.
                    layerBias: [
                        bias,
                        (1 + 2 * bias) / 3,
                        (3 + 2 * bias) / 5,
                        (4 + bias) / 5,
                    ],
                };
                const distortGlow =
                    this.params.glowDistortion.amount > 0 ||
                    this.params.glowFlow > 0;
                if (distortGlow || warpHalo) {
                    glowTex = this.#glowPasses.combineLayers(
                        ctx,
                        layers,
                        distortGlow
                            ? outputParam(this.params.brightness, 0, 5)
                            : -1,
                    );
                } else {
                    // Reconstruct the layers directly in the final composite when
                    // no distortion needs an intermediate, full-size glow image.
                    glowLayers = layers;
                }
                this.#glowBase = glowTex;
                this.#glowLayers = glowLayers;
                this.#glowBaseKey = glowBaseKey;
                this.#glowBaseVersion++;
            }
            glowLayers = this.#glowLayers;
            const glowResultKey = [
                this.#glowBaseVersion,
                this.params.glowFlow,
                this.params.glowDistortion.windDirection,
                this.params.glowDistortion.windSpeed < 0,
                ...distortionKey(this.params.glowDistortion, ctx.time),
            ];
            if (
                !this.#glowResult ||
                !sameKey(glowResultKey, this.#glowResultKey)
            ) {
                this.#glowResult = this.#glowPasses.distort(
                    ctx,
                    this.#glowBase,
                    this.params.glowDistortion,
                    "glow",
                    true,
                    undefined,
                    this.params.glowFlow,
                    [1, 0, 0], // Packed active/bypass groups, Halo stays in A.
                );
                this.#glowResultKey = glowResultKey;
            }
            if (warpHalo) {
                const haloKey = [
                    this.#glowBaseVersion,
                    ...distortionKey(this.params.coreDistortion, ctx.time),
                ];
                if (
                    !this.#haloResult ||
                    !sameKey(haloKey, this.#haloResultKey)
                ) {
                    this.#haloResult = this.#haloPasses.distort(
                        ctx,
                        this.#glowBase,
                        this.params.coreDistortion,
                        "halo",
                    );
                    this.#haloResultKey = haloKey;
                }
                haloTex = this.#haloResult;
            }
            glowTex = this.#glowResult;
        }
        if (color !== this.#rampColor) {
            this.#colorRamp = saberColorRamp(parseHexColor(color));
            this.#rampColor = color;
        }
        const coreWhiteness = Math.min(
            1,
            Math.max(0, this.params.coreWhiteness),
        );
        const glowWhiteness = Math.min(
            1,
            Math.max(0, this.params.glowWhiteness),
        );
        const customTint = coreWhiteness !== glowWhiteness;
        const flickerGain = saberFlickerGain(
            ctx.time,
            this.params.flickerIntensity,
            this.params.flickerSpeed,
            this.params.flickerSeed,
        );
        ctx.draw({
            frag: COMPOSITE_SHADERS[
                (glowLayers ? 1 : 0) |
                    (customTint ? 2 : 0) |
                    (this.params.coreBlendOnTop &&
                    glowEnabled &&
                    this.params.coreDistortion.amount > 0
                        ? 4
                        : 0) |
                    (haloTex ? 8 : 0)
            ],
            uniforms: {
                ...glowLayers,
                src: ctx.src,
                core: displayedCore,
                originalCore,
                glowTex,
                ...(haloTex ? { haloTex } : {}),
                colorRamp: this.#colorRamp,
                coreGain:
                    CORE_GAIN *
                    intensity *
                    Math.max(0, this.params.coreIntensity) *
                    flickerGain,
                coreWhiteness,
                glowGain: glowEnabled ? GLOW_GAIN * intensity * flickerGain : 0,
                source: source ? 1 : 0,
                whiteMix: glowWhiteness,
                outputGamma: outputParam(this.params.gamma, 0.1, 10),
                outputBrightness: outputParam(this.params.brightness, 0, 5),
                glowOutputBrightness:
                    this.params.glowDistortion.amount > 0 ||
                    this.params.glowFlow > 0
                        ? 1
                        : outputParam(this.params.brightness, 0, 5),
                outputSaturation: outputParam(this.params.saturation, 0, 2),
                edgeFade: this.params.pad === "fullscreen" ? 0 : 2 * pixelRatio,
            },
            target: ctx.target,
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
    }

    dispose(): void {
        this.#glowPasses.dispose();
        this.#haloPasses.dispose();
        this.#haloResult = null;
        this.#haloResultKey = [];
        this.#coreSoftener.dispose();
        this.#softCore = null;
        this.#softCoreKey = [];
        this.#disposed = true;
        this.#traceMask?.dispose();
        this.#traceMask = null;
        this.#payload = null;
        this.#arc = null;
        this.#splat = null;
        this.#landed = null;
        this.#traceInFlight = false;
        this.#traceSerial++;
        this.#traceStale = true;
        this.#payloadReady = false;
        this.#fieldHasPayload = false;
        this.#seedA = null;
        this.#seedB = null;
        this.#field = null;
        this.#core = null;
        this.#region = undefined;
        this.#regionKey = [];
        this.#dirty = true;
        this.#builtW = 0;
        this.#builtH = 0;
        this.#builtEdge = null;
        this.#builtThreshold = Number.NaN;
        this.#builtLayout = [];
        this.#builtGeometry = [];
        this.#fieldVersion = 0;
        this.#coreVersion = 0;
        this.#coreKey = [];
        this.#visibleCore = null;
        this.#visibleCoreKey = [];
        this.#glowBase = null;
        this.#glowLayers = undefined;
        this.#preparedGlowLayers = undefined;
        this.#preparedGlowKey = [];
        this.#glowBaseVersion = 0;
        this.#glowBaseKey = [];
        this.#glowResult = null;
        this.#glowResultKey = [];
    }

    // Keep expensive field/core draws near the source when padding dominates.
    // Full-size targets remain zero outside this region, so blur/distortion can
    // still sample the whole image. Leave modest padding on the shared quad.
    #updateRegion(ctx: EffectContext, field: EffectRenderTarget): boolean {
        const { pixelRatio, srcRect } = ctx.dims;
        const dst = this.outputRect(ctx.dims);
        const width = field.width;
        const height = field.height;
        const reach = Math.min(
            Math.max(width, height),
            FIELD_REACH * pixelRatio * 2,
        );
        const largestJump = 2 ** Math.ceil(Math.log2(Math.max(reach, 1))) / 2;
        // Preserve flood paths, line widths, and luminance
        // prefilter samples. This bound does not depend on animated noise.
        const maskReach =
            this.params.edge === "luminance"
                ? 3 *
                  Math.max(
                      srcRect[2] / Math.max(ctx.src.width, 1),
                      srcRect[3] / Math.max(ctx.src.height, 1),
                  )
                : 0;
        const margin =
            Math.max(
                largestJump,
                (FIELD_REACH + Math.max(this.params.thickness, 0)) * pixelRatio,
            ) +
            maskReach +
            8;
        const sx = width / dst[2];
        const sy = height / dst[3];
        const x0 = Math.max(
            0,
            Math.floor(((srcRect[0] - dst[0] - margin) * sx) / 2) * 2,
        );
        const y0 = Math.max(
            0,
            Math.floor(((srcRect[1] - dst[1] - margin) * sy) / 2) * 2,
        );
        const x1 = Math.min(
            width,
            Math.ceil(((srcRect[0] + srcRect[2] - dst[0] + margin) * sx) / 2) *
                2,
        );
        const y1 = Math.min(
            height,
            Math.ceil(((srcRect[1] + srcRect[3] - dst[1] + margin) * sy) / 2) *
                2,
        );
        const useRegion =
            x1 > x0 && y1 > y0 && (x1 - x0) * (y1 - y0) < width * height * 0.75;
        const key = useRegion ? [x0, y0, x1, y1, width, height] : [];
        if (sameKey(key, this.#regionKey)) {
            return false;
        }
        if (this.#region) {
            ctx.releaseGeometry(this.#region);
        }
        this.#region = undefined;
        this.#regionKey = key;
        if (useRegion) {
            const l = (x0 / width) * 2 - 1;
            const r = (x1 / width) * 2 - 1;
            const b = (y0 / height) * 2 - 1;
            const t = (y1 / height) * 2 - 1;
            this.#region = {
                attributes: {
                    position: {
                        itemSize: 2,
                        data: new Float32Array([
                            l,
                            b,
                            r,
                            b,
                            l,
                            t,
                            l,
                            t,
                            r,
                            b,
                            r,
                            t,
                        ]),
                    },
                },
            };
        }
        return true;
    }

    // Start a trace when the contours are stale, and turn landed contours into splat points.
    // One readback at a time; a trace that lands after the element changed is dropped.
    #updatePayload(ctx: EffectContext): void {
        if (!this.#payload) {
            const nearest = { float: true, filter: "nearest" } as const;
            this.#payload = ctx.createRenderTarget(nearest);
            this.#arc = ctx.createRenderTarget(nearest);
        }
        const landed = this.#landed;
        if (landed) {
            this.#landed = null;
            if (this.#splat) {
                ctx.releaseGeometry(this.#splat);
                this.#splat = null;
            }
            this.#splat = splatGeometry(landed);
            this.#payloadReady = true;
            this.#fieldHasPayload = false;
        }
        if (!this.#traceStale || this.#traceInFlight) {
            return;
        }
        // Padding can dwarf a small text source. Trace only the source and keep
        // its points in element coordinates, so moving/resizing the output
        // does not require another readback or briefly hide the reveal.
        const srcRect = [...ctx.dims.srcRect] as [
            number,
            number,
            number,
            number,
        ];
        const width = Math.max(1, Math.ceil(srcRect[2]));
        const height = Math.max(1, Math.ceil(srcRect[3]));
        if (
            this.#traceMask?.width !== width ||
            this.#traceMask.height !== height
        ) {
            this.#traceMask?.dispose();
            this.#traceMask = ctx.createRenderTarget({
                filter: "nearest",
                size: [width, height],
            });
        }
        const mask = this.#traceMask;
        const { edge, edgeThreshold } = this.params;
        ctx.draw({
            frag: FRAG_TRACE_MASK,
            uniforms: {
                src: ctx.src,
                maskSize: [width, height],
                maskFilterStep: maskFilterStep(ctx, 1 / width, 1 / height),
                edgeMode: edge === "luminance" ? 1 : 0,
                edgeThreshold,
            },
            target: mask,
        });
        const version = this.#sourceVersion;
        const serial = ++this.#traceSerial;
        this.#traceStale = false;
        this.#traceInFlight = true;
        ctx.readPixels(mask).then(
            (pixels) => {
                if (this.#disposed || serial !== this.#traceSerial) {
                    return;
                }
                this.#traceInFlight = false;
                if (version !== this.#sourceVersion) {
                    return;
                }
                const contours = traceContours(
                    pixels as Uint8Array,
                    width,
                    height,
                );
                this.#landed = { contours, srcRect, width, height };
            },
            () => {
                if (this.#disposed || serial !== this.#traceSerial) {
                    return;
                }
                this.#traceInFlight = false;
                this.#traceStale = true;
            },
        );
    }

    #buildField(ctx: EffectContext, usePayload: boolean): void {
        const seedA = this.#seedA;
        const seedB = this.#seedB;
        const field = this.#field;
        if (!seedA || !seedB || !field) {
            return;
        }
        const { edge, edgeThreshold } = this.params;
        const dst = this.outputRect(ctx.dims);
        const maskUniforms = {
            src: ctx.src,
            edgeMode: edge === "luminance" ? 1 : 0,
            edgeThreshold,
            maskFilterStep: maskFilterStep(
                ctx,
                dst[2] / (field.width * Math.max(ctx.dims.srcRect[2], 1)),
                dst[3] / (field.height * Math.max(ctx.dims.srcRect[3], 1)),
            ),
        };
        if (this.#region) {
            // The core pass reuses a seed target. Clear only when the
            // field changes; untouched pixels then stay transparent throughout.
            ctx.clear(seedA);
            ctx.clear(seedB);
            ctx.clear(field);
        }

        const payload = this.#payload;
        const splat = this.#splat;
        const withPayload = usePayload && payload !== null && splat !== null;
        if (withPayload) {
            ctx.clear(payload);
            ctx.draw({
                frag: FRAG_SPLAT,
                vert: VERT_SPLAT,
                geometry: splat,
                uniforms: { outputRect: [...this.outputRect(ctx.dims)] },
                target: payload,
            });
        }
        ctx.draw({
            frag: FRAG_SEED,
            uniforms: {
                ...maskUniforms,
                payload: withPayload ? payload : seedB,
                payloadOn: withPayload ? 1 : 0,
            },
            target: seedA,
            geometry: this.#region,
        });

        let read = seedA;
        let write = seedB;
        const flood = (stepSize: number) => {
            ctx.draw({
                frag: FRAG_JFA,
                uniforms: { seed: read, stepSize },
                target: write,
                geometry: this.#region,
            });
            [read, write] = [write, read];
        };
        // Keep the established field support for distorted contour sampling.
        // Texels further out stay invalid and draw nothing.
        const maxSide = Math.max(field.width, field.height);
        const reach = Math.min(maxSide, FIELD_REACH * ctx.dims.pixelRatio * 2);
        for (
            let stepSize = 2 ** Math.ceil(Math.log2(reach)) / 2;
            stepSize >= 1;
            stepSize /= 2
        ) {
            flood(stepSize);
        }
        // One more step-1 pass fixes most leftover errors.
        flood(1);

        ctx.draw({
            frag: FRAG_RESOLVE,
            uniforms: { ...maskUniforms, seed: read },
            target: field,
            geometry: this.#region,
        });
        if (withPayload && this.#arc) {
            if (this.#region) {
                ctx.clear(this.#arc);
            }
            ctx.draw({
                frag: FRAG_ARC,
                uniforms: { seed: read },
                target: this.#arc,
                geometry: this.#region,
            });
        }
        this.#fieldHasPayload = withPayload;
        this.#fieldVersion++;

        this.#dirty = false;
        this.#builtW = field.width;
        this.#builtH = field.height;
        this.#builtEdge = edge;
        this.#builtThreshold = edgeThreshold;
    }
}

type TracedSource = {
    contours: Contour[];
    srcRect: readonly [number, number, number, number];
    width: number;
    height: number;
};

type CacheKey = readonly (number | string | boolean)[];

function maskFilterStep(ctx: EffectContext, x: number, y: number): number[] {
    return [x, y].map((step, i) => {
        const ratio = step * (i === 0 ? ctx.src.width : ctx.src.height);
        if (ratio <= 1.001) {
            return 0;
        }
        // Fade in continuously while shrinking from native size to half size.
        const t = Math.min(1, ratio - 1);
        return step * t * t * (3 - 2 * t);
    });
}

function sameKey(a: CacheKey, b: CacheKey): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i]);
}

function distortionKey(p: SaberDistortionParams, time: number): CacheKey {
    if (p.amount <= 0) {
        return [0];
    }
    return [
        p.amount,
        p.type,
        p.composite,
        p.invert,
        p.windSpeed,
        p.windDirection,
        p.noiseSpeed,
        p.noiseScale,
        p.noiseBias,
        p.noiseComplexity,
        p.noiseDetail,
        p.noiseTurbulence,
        p.noiseAspectRatio,
        p.directionality,
        p.motionBlur,
        p.seed,
        p.windSpeed !== 0 || p.noiseSpeed !== 0 ? time : 0,
    ];
}

// One point per traced vertex: element-relative position, arc position and loop length.
// Tracer coordinates put texel centres on integers, so add half a texel.
function splatGeometry({
    contours,
    srcRect,
    width,
    height,
}: TracedSource): EffectGeometry | null {
    let count = 0;
    for (const c of contours) {
        count += c.t.length;
    }
    if (count === 0) {
        return null;
    }
    const position = new Float32Array(count * 4);
    const sx = srcRect[2] / width;
    const sy = srcRect[3] / height;
    let o = 0;
    for (const c of contours) {
        const arc = new Float64Array(c.t.length);
        let length = 0;
        for (let i = 0; i < arc.length; i++) {
            arc[i] = length;
            const j = (i + 1) % arc.length;
            length += Math.hypot(
                (c.points[j * 2] - c.points[i * 2]) * sx,
                (c.points[j * 2 + 1] - c.points[i * 2 + 1]) * sy,
            );
        }
        for (let i = 0; i < c.t.length; i++) {
            position[o++] = srcRect[0] + (c.points[i * 2] + 0.5) * sx;
            position[o++] = srcRect[1] + (c.points[i * 2 + 1] + 0.5) * sy;
            position[o++] = arc[i] / Math.max(length, 1e-6);
            position[o++] = length;
        }
    }
    return {
        mode: "points",
        attributes: { position: { data: position, itemSize: 4 } },
    };
}

function outputParam(
    value: number,
    min: number,
    max: number,
    neutral = 1,
): number {
    return Number.isFinite(value)
        ? Math.min(max, Math.max(min, value))
        : neutral;
}

function validateOptions(options: SaberOptions): void {
    const unknown = Reflect.ownKeys(options).filter(
        (key) => key !== "preset" && !Object.hasOwn(DEFAULT_PARAMS, key),
    );
    if (unknown.length > 0) {
        const migration = unknown.includes("toneMapping")
            ? "toneMapping has been removed; use gamma, brightness and saturation."
            : "Legacy line and pyramid glow options have been removed; use coreDistortion, glowDistortion and glowLayers.";
        throw new TypeError(
            `Unknown Saber option${unknown.length === 1 ? "" : "s"}: ${unknown.map(String).join(", ")}. ${migration}`,
        );
    }
}
