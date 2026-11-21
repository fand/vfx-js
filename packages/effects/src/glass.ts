// Dispersive glass in the shape of an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// 1. The silhouette is read back from the element (`ctx.src` alpha) and
//    turned into a 2D signed distance field; the 3D shape is its analytic
//    extrusion (see `_silhouette.ts`).
// 2. One fragment shader sphere-traces the shape from the camera, then
//    follows the refracted ray inside it: total internal reflections
//    bounce, and the ray leaves where it can refract out.
// 3. Dispersion: the inside is traced `paths` times, each with its own
//    index of refraction. The spectrum is `samples` wavelengths; the exit
//    ray of each is interpolated between the two nearest traced paths.
//    With `samples == paths` nothing is interpolated, which is the classic
//    "three glass shaders, one per channel" look.
// 4. An exit ray sees a backdrop plane behind the shape (a procedural
//    pattern or an image) and a few soft box lights around it.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import { captureContent } from "./_capture.js";
import { parseHexColor } from "./_figma-common.js";
import { padOutputRect } from "./_pad.js";
import {
    buildShape,
    GLSL_SD2,
    type ShapeData,
    viewMatrix,
} from "./_silhouette.js";
import { GLSL_SIMPLEX3, GLSL_SIMPLEX3_GRAD } from "./_simplex3.js";

/** A procedural {@link GlassParams.backdrop}. `"none"` is black. */
export type GlassPatternName =
    | "none"
    | "stripes"
    | "grid"
    | "checker"
    | "dots"
    | "noise";

/**
 * An image for {@link GlassParams.backdrop}. Strings other than a
 * {@link GlassPatternName} are treated as URLs.
 */
export type GlassImageSource =
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap
    | string;

/**
 * A {@link GlassParams.debug} view: the SDF lookups spent per pixel on
 * finding the surface (`"outer"`), on tracing inside the glass
 * (`"inner"`), or both (`"total"`).
 */
export type GlassDebugView = "off" | "outer" | "inner" | "total";

/**
 * Profile of the {@link GlassParams.bevel}: a quarter circle, or a flat
 * 45° cut with hard edges.
 */
export type GlassBevelShape = "round" | "chamfer";

export type GlassParams = {
    /** Extrusion depth, relative to the long side of the element (= 2). */
    depth: number;
    /**
     * Size of the bevel on the edges, in the same units as `depth`. Most
     * of the dispersion shows on it, where the surface turns.
     */
    bevel: number;
    /** Profile of the bevel. */
    bevelShape: GlassBevelShape;
    /**
     * How far the caps rise in the middle, in the same units as `depth`.
     * 0 keeps them flat; more makes a lens or a gem.
     */
    bulge: number;
    /**
     * Distance from the silhouette's edge over which the caps rise to
     * the full `bulge`. Where the shape is narrower than twice this, the
     * bulge has a crease along its middle.
     */
    bulgeWidth: number;

    /** Index of refraction at the middle of the spectrum. */
    ior: number;
    /**
     * Spread of the index of refraction over the spectrum: red is
     * `ior - dispersion / 2`, violet `ior + dispersion / 2`. Real glass
     * is around 0.02; 0.1 to 0.2 gives the exaggerated rainbow look.
     */
    dispersion: number;
    /**
     * Rays traced through the glass per pixel, 1 to 4, spread over the
     * spectrum. The cost grows linearly. 2 is enough for a small
     * `dispersion`; use more when the rainbow breaks up.
     */
    paths: number;
    /**
     * Wavelengths in the spectrum, 1 to 16. They are interpolated between
     * the traced `paths`, so they are cheap. Equal to `paths`, the
     * channels split into separate bands instead of a smooth rainbow.
     */
    samples: number;
    /** Reflections inside the glass before the ray is forced out, 1 to 6. */
    bounces: number;
    /**
     * Per-pixel offset of the wavelengths, 0 to 1. Trades the banding of
     * a low `samples` for fine noise.
     */
    jitter: number;

    /** Colour of the glass, `#rrggbb`. Thicker glass is more saturated. */
    tint: string;
    /** How fast the glass takes its `tint` with thickness. 0 is clear. */
    absorption: number;
    /** Strength of the reflection on the outer surface. */
    reflection: number;
    /**
     * Ripples on the surface, 0 to 1, like hammered or old glass. Only
     * the normals are bent; the outline stays the same.
     */
    bump: number;
    /** Size of the ripples, in the same units as `depth`. */
    bumpScale: number;
    /**
     * Roughness of the surface, 0 to 1: what is seen through the glass,
     * and reflected on it, blurs with its distance from the surface.
     */
    frost: number;

    /**
     * What is seen through the glass: a pattern name, or an image (an
     * element, an `ImageBitmap` or a URL).
     */
    backdrop: GlassPatternName | GlassImageSource;
    /** Draw the backdrop around the glass too, not only through it. */
    backdropVisible: boolean;
    /**
     * Size of the pattern's features, or of the image, in the same units
     * as `depth`.
     */
    backdropScale: number;
    /** Distance of the backdrop plane behind the shape's centre. */
    backdropDistance: number;
    /**
     * Speed of the pattern, in pattern periods per second. The patterns
     * scroll, except `"noise"`, which morphs in place.
     */
    backdropSpeed: number;
    /** The two colours of a procedural pattern, `#rrggbb`. */
    backdropColors: readonly [string, string];

    /** Brightness of the soft box lights around the shape. 0 turns them off. */
    lightIntensity: number;
    /** Softness of the lights' edges, 0 to 1. */
    lightSoftness: number;

    /** Camera yaw in radians. 0 looks straight at the front cap. */
    yaw: number;
    /** Camera pitch in radians. 0 looks straight at the front cap. */
    pitch: number;
    /** Amplitude of a slow camera wobble, in radians. */
    orbit: number;
    /** Vertical field of view in degrees. */
    fov: number;
    /** Size of the shape relative to the element. */
    zoom: number;
    /** Orbit the camera with pointer drags. */
    drag: boolean;

    /**
     * Render scale, 0.25 to 2. Below 1 is cheaper and softer; 2
     * supersamples the silhouette's edge.
     */
    resolution: number;
    /**
     * Smooth the remaining stair steps with FXAA. Refraction on a narrow
     * bevel changes faster than the pixels can follow; this is the cheap
     * fix, `resolution: 2` the thorough one.
     */
    fxaa: boolean;
    /**
     * Padding around the element, in CSS px, or `"fullscreen"` to draw on
     * the whole canvas.
     */
    pad: number | "fullscreen";
    /**
     * Show the cost of each pixel instead of the glass, as a heat map of
     * SDF lookups: black 0, blue 64, green 128, yellow 192, red 256,
     * white 320 or more.
     */
    debug: GlassDebugView;
};

export type GlassEffectOptions = {
    /** Freeze time, for deterministic screenshots. */
    still?: boolean;
};

const DEFAULT_PARAMS: GlassParams = {
    depth: 0.2,
    bevel: 0.03,
    bevelShape: "round",
    bulge: 0,
    bulgeWidth: 0.15,
    ior: 1.5,
    dispersion: 0.12,
    paths: 2,
    samples: 8,
    bounces: 3,
    jitter: 0,
    tint: "#ffffff",
    absorption: 0,
    reflection: 1,
    bump: 0,
    bumpScale: 0.15,
    frost: 0,
    backdrop: "stripes",
    backdropVisible: false,
    backdropScale: 0.25,
    backdropDistance: 0.6,
    backdropSpeed: 0.15,
    backdropColors: ["#000000", "#ffffff"],
    lightIntensity: 1.5,
    lightSoftness: 0.15,
    yaw: 0.5,
    pitch: 0.25,
    orbit: 0.35,
    fov: 30,
    zoom: 0.7,
    drag: false,
    resolution: 1,
    fxaa: true,
    pad: "fullscreen",
    debug: "off",
};

const PATTERN_MODES: Record<GlassPatternName, number> = {
    none: 0,
    stripes: 1,
    grid: 2,
    checker: 3,
    dots: 4,
    noise: 5,
};
const IMAGE_MODE = 6;
const DEBUG_VIEWS: Record<GlassDebugView, number> = {
    off: 0,
    outer: 1,
    inner: 2,
    total: 3,
};
const BEVEL_SHAPES: Record<GlassBevelShape, number> = {
    round: 0,
    chamfer: 1,
};
const MAX_PATHS = 4;
const MAX_SAMPLES = 16;
const MAX_BOUNCES = 6;
// Long side of the mipmapped copy of a backdrop image, at most.
const BACKDROP_MIP_LONG = 2048;
// Frost at 1: width of the blur per unit of distance from the surface to
// the backdrop, and the softness of the lights' edges. GLSL floats.
const FROST_SPREAD = "0.35";
const FROST_LIGHT_SOFTNESS = "0.6";
// Noise gradient to surface slope, before it saturates.
const BUMP_SLOPE = "0.6";
// Long side of the silhouette read back from the element, in px, and the
// box blurs of the distance field built from it. Refraction magnifies
// every bump of the normals, so the glass wants a finer and smoother
// field than the pixel staircase of a small mask gives.
const GLASS_MASK_LONG = 1024;
const SMOOTH_RADIUS = 4;
const SMOOTH_PASSES = 3;
// Pitch wobble relative to the yaw wobble.
const PITCH_WOBBLE = 0.3;

const FRAG_GLASS = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

${GLSL_SD2}

uniform int bevelShape;
uniform float bulge;
uniform float bulgeWidth;
// 1 / the Lipschitz constant of the bulged field, 1 without a bulge: the
// march steps are scaled by it so they cannot step through the caps.
uniform float stepScale;

// The extrusion of a 2D sample s (from sd2) at depth z, with a bevel and
// caps that rise by up to \`bulge\` away from the edge.
// x = distance, yzw = unit gradient.
vec4 extrude(vec3 s, float z) {
    float sz = z >= 0.0 ? 1.0 : -1.0;
    // The cap: b = |z| - height, and its gradient (k * grad2, sz).
    float h = halfDepth;
    float k = 0.0;
    if (bulge > 0.0) {
        // f(u) = 1 - (1 - u)^2: steepest at the edge, flat in the middle.
        float u = clamp(-s.x / bulgeWidth, 0.0, 1.0);
        h += bulge * (1.0 - (1.0 - u) * (1.0 - u));
        k = u > 0.0 && u < 1.0 ? 2.0 * bulge * (1.0 - u) / bulgeWidth : 0.0;
    }
    float b = abs(z) - h;
    vec3 gb = vec3(s.yz * k, sz);
    if (bevelShape == 1) {
        // Chamfer: a 45° plane across the corner. Hard edges on purpose.
        float c = (s.x + b + rounding) * 0.7071;
        if (c > s.x && c > b) {
            return vec4(c, normalize(vec3(s.yz, 0.0) + gb));
        }
        if (s.x > b) {
            return vec4(s.x, s.yz, 0.0);
        }
        return vec4(b, k > 0.0 ? normalize(gb) : gb);
    }
    vec2 w = vec2(s.x + rounding, b + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        vec3 g = vec3(s.yz * w.x, 0.0) + gb * w.y;
        return vec4(l - rounding, k > 0.0 ? normalize(g) : g / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, k > 0.0 ? normalize(gb) : gb);
}

vec4 sdf3(vec3 p) {
    return extrude(sd2(p.xy), p.z);
}

uniform vec2 sdfSize;
uniform vec2 shapeHalf;
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 centerPx;
uniform vec2 bufferPx;
// Size of a pixel of the target, in output px.
uniform float pixelSize;

uniform float ior;
uniform float dispersion;
uniform int paths;
uniform int samples;
uniform int bounces;
uniform float jitter;
uniform vec3 tint;
uniform float absorption;
uniform float reflection;
uniform float bump;
uniform float bumpScale;
uniform float frost;

uniform int backdropMode;
uniform sampler2D backdropTex;
uniform float backdropAspect;
uniform float backdropVisible;
uniform float backdropScale;
uniform float backdropDistance;
uniform float backdropOffset;
uniform vec3 backdropA;
uniform vec3 backdropB;

uniform float lightIntensity;
uniform float lightSoftness;
uniform int debugView;

const int MAX_PATHS = ${MAX_PATHS};
const int MAX_SAMPLES = ${MAX_SAMPLES};
const int MAX_BOUNCES = ${MAX_BOUNCES};
const int OUTER_STEPS = 72;
const int INNER_STEPS = 40;
const float HIT = 0.0012;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

${GLSL_SIMPLEX3}
${GLSL_SIMPLEX3_GRAD}

// 0..1 mask for a signed distance in pattern periods, with an edge as
// soft as the pixel's footprint fw.
float edge(float d, float fw) {
    return smoothstep(-fw, fw, d);
}

// The backdrop plane, at view-space xy. fw is the footprint of the pixel
// on it, in the same units.
vec3 backdrop(vec2 p, float fw) {
    if (backdropMode == 0) {
        return vec3(0.0);
    }
    if (backdropMode == ${IMAGE_MODE}) {
        vec2 half_ = backdropScale * vec2(backdropAspect, 1.0)
            / max(backdropAspect, 1.0);
        vec2 q = p / half_ * 0.5 + 0.5;
        // Mirrored repeat, so the image has no visible border.
        q = 1.0 - abs(mod(q, 2.0) - 1.0);
        // The mip level from the footprint: the fold of the mirror and
        // the refraction would throw off the GPU's own derivatives.
        // fwidth's length is about sqrt(2) times the GPU's footprint.
        vec2 size = vec2(textureSize(backdropTex, 0));
        float texels = fw * 0.5 * max(size.x / half_.x, size.y / half_.y);
        float lod = log2(max(texels, 1e-4)) - 0.5;
        return textureLod(backdropTex, q, lod).rgb;
    }
    vec2 q = p / max(backdropScale, 1e-3);
    fw = clamp(fw / max(backdropScale, 1e-3), 0.03, 4.0);
    float m = 0.0;
    // Mean of the pattern: what it fades to when the footprint covers
    // whole periods, where it would only alias.
    float mean = 0.5;
    if (backdropMode == 1) {
        float s = fract((q.x + q.y) * 0.7071 + backdropOffset);
        m = edge(0.25 - abs(s - 0.5), fw);
    } else if (backdropMode == 2) {
        vec2 g = abs(fract(q + vec2(backdropOffset, 0.0)) - 0.5);
        m = 1.0 - edge(min(g.x, g.y) - 0.06, fw);
        mean = 0.23;
    } else if (backdropMode == 3) {
        vec2 g = fract(q * 0.5 + vec2(backdropOffset * 0.5, 0.0)) - 0.5;
        float a = edge(0.25 - abs(g.x), fw);
        float b = edge(0.25 - abs(g.y), fw);
        m = mix(a, 1.0 - a, b);
    } else if (backdropMode == 4) {
        vec2 g = fract(q + vec2(backdropOffset, 0.0)) - 0.5;
        m = edge(0.3 - length(g), fw);
        mean = 0.28;
    } else {
        // Simplex noise that morphs in place: time is its third axis.
        vec3 n = vec3(q * 0.6, backdropOffset);
        float f = snoise(n) * 0.6
            + snoise(n * vec3(2.0, 2.0, 1.4) + vec3(7.1, 3.7, 1.9)) * 0.3
            + snoise(n * vec3(4.0, 4.0, 1.9) + vec3(2.3, 9.1, 5.3)) * 0.1;
        m = smoothstep(-0.12 - fw, 0.12 + fw, f);
    }
    m = mix(m, mean, smoothstep(0.35, 1.0, fw));
    return mix(backdropA, backdropB, m);
}

// A rectangular light seen in direction d: centre c, half size in
// tangent units, edges as soft as \`soft\`.
float boxLight(vec3 d, vec3 c, vec2 halfSize, float soft) {
    c = normalize(c);
    float k = dot(d, c);
    if (k <= 0.0) {
        return 0.0;
    }
    vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 v = cross(c, u);
    vec2 q = abs(vec2(dot(d, u), dot(d, v)) / k);
    vec2 s = max(soft * halfSize, vec2(1e-3));
    vec2 e = smoothstep(halfSize + s, halfSize - s, q);
    return e.x * e.y;
}

vec3 lights(vec3 d, float soft) {
    if (lightIntensity <= 0.0) {
        return vec3(0.0);
    }
    float l = boxLight(d, vec3(-0.7, 0.55, 0.45), vec2(0.55, 0.3), soft)
        + boxLight(d, vec3(0.95, 0.05, 0.3), vec2(0.1, 0.9), soft)
        + 0.6 * boxLight(d, vec3(0.25, -0.85, 0.45), vec2(0.7, 0.15), soft)
        // Behind the shape: only seen without a backdrop.
        + boxLight(d, vec3(0.25, 0.15, -1.0), vec2(0.8, 0.45), soft);
    return vec3(l * lightIntensity);
}

// Radiance along a ray in view space: one that left the glass, or one
// that misses it. \`rough\` is the frost of the surface the ray left (0
// for a miss).
vec3 radiance(vec3 p, vec3 d, float rough) {
    vec3 col = lights(d, max(lightSoftness, rough * ${FROST_LIGHT_SOFTNESS}));
    if (backdropMode != 0 && d.z < -1e-4) {
        float t = (-backdropDistance - p.z) / d.z;
        if (t > 0.0) {
            vec2 q = p.xy + d.xy * t;
            // Strong refraction squeezes a wide piece of the backdrop
            // into one pixel; filter the pattern by that footprint. A
            // rough surface scatters into a cone, so its blur grows
            // with the distance to the backdrop.
            float fw = length(fwidth(q));
            if (rough > 0.0) {
                fw += rough * ${FROST_SPREAD} * t;
            }
            col = backdrop(q, fw);
        }
    }
    return col;
}

// Unpolarised Fresnel reflectance, from a medium of index n1 into n2.
float fresnel(float cosI, float n1, float n2) {
    float e = n1 / n2;
    float sinT2 = e * e * (1.0 - cosI * cosI);
    if (sinT2 >= 1.0) {
        return 1.0;
    }
    float cosT = sqrt(1.0 - sinT2);
    float rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
    float rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
    return 0.5 * (rs * rs + rp * rp);
}

// RGB response at position t of the spectrum (0 red, 1 violet): three
// triangles, so that 3 samples are exactly red, green and blue.
vec3 spectral(float t) {
    return max(1.0 - abs(t - vec3(1.0, 3.0, 5.0) / 6.0) * 3.0, 0.0);
}

// sd2 with a bicubic (B-spline) filter, in 4 bilinear taps. The stored
// gradient is only piecewise linear between texels, which shows as
// streaks once it bends light; this one is smooth.
vec3 sd2Smooth(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
        return sd2(p);
    }
    vec2 st = uv * sdfSize - 0.5;
    vec2 i = floor(st);
    vec2 f = st - i;
    vec2 w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0;
    vec2 w1 = (4.0 - 6.0 * f * f + 3.0 * f * f * f) / 6.0;
    vec2 w2 = (1.0 + 3.0 * f + 3.0 * f * f - 3.0 * f * f * f) / 6.0;
    vec2 w3 = f * f * f / 6.0;
    vec2 g0 = w0 + w1;
    vec2 g1 = w2 + w3;
    vec2 h0 = (i - 0.5 + w1 / g0) / sdfSize;
    vec2 h1 = (i + 1.5 + w3 / g1) / sdfSize;
    vec4 s = (texture(sdfTex, vec2(h0.x, h0.y)) * g0.x
            + texture(sdfTex, vec2(h1.x, h0.y)) * g1.x) * g0.y
        + (texture(sdfTex, vec2(h0.x, h1.y)) * g0.x
            + texture(sdfTex, vec2(h1.x, h1.y)) * g1.x) * g1.y;
    float gl = length(s.gb);
    return vec3(s.r, gl > 1e-5 ? s.gb / gl : vec2(0.0, 1.0));
}

// The surface normal at p, for a ray along d that meets it there.
vec3 normalAt(vec3 p, vec3 d) {
    vec3 n = extrude(sd2Smooth(p.xy), p.z).yzw;
    if (bump <= 0.0) {
        return n;
    }
    // Ripples: tilt the normal against the tangential part of a noise
    // gradient. The noise is in object space, so it sticks to the shape.
    vec3 g = snoiseD(p / bumpScale).xyz * ${BUMP_SLOPE};
    g -= n * dot(g, n);
    // Saturate the slope, so the tilt stays under 45°. Refraction
    // through two rippled faces magnifies the tilt a lot, so the strength
    // goes as bump^2 to leave room for subtle ripples.
    vec3 m = normalize(n - g * (bump * bump / sqrt(1.0 + dot(g, g))));
    // At grazing angles the tilt can turn the normal past the ray, which
    // would refract it to the wrong side: keep the side of n.
    float s = dot(d, n) < 0.0 ? -1.0 : 1.0;
    float lim = min(abs(dot(d, n)), 0.1);
    float c = dot(d, m) * s;
    if (c < lim) {
        m = normalize(m + d * (s * (lim - c)));
    }
    return m;
}

// Heat map of a count of SDF lookups, 64 per colour step.
vec4 heat(float n) {
    float x = clamp(n / 64.0, 0.0, 5.0);
    vec3 c = mix(vec3(0.0), vec3(0.0, 0.0, 1.0), clamp(x, 0.0, 1.0));
    c = mix(c, vec3(0.0, 1.0, 0.0), clamp(x - 1.0, 0.0, 1.0));
    c = mix(c, vec3(1.0, 1.0, 0.0), clamp(x - 2.0, 0.0, 1.0));
    c = mix(c, vec3(1.0, 0.0, 0.0), clamp(x - 3.0, 0.0, 1.0));
    c = mix(c, vec3(1.0), clamp(x - 4.0, 0.0, 1.0));
    return vec4(c, 1.0);
}

// Slab test against the shape's bounding box. x = near, y = far.
vec2 boundsHit(vec3 ro, vec3 rd) {
    vec3 b = vec3(shapeHalf + 0.01, halfDepth + bulge + 0.01);
    vec3 inv = 1.0 / rd;
    vec3 t0 = (-b - ro) * inv;
    vec3 t1 = (b - ro) * inv;
    vec3 lo = min(t0, t1);
    vec3 hi = max(t0, t1);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

// The glass seen along rd at surface point p0: the reflection on the
// outside, plus the light that comes back out of the inside.
vec3 shade(vec3 p0, vec3 rd, inout float innerCount) {
    vec3 n0 = normalAt(p0, rd);
    float cos0 = clamp(-dot(rd, n0), 0.0, 1.0);

    // Reflection on the outer surface.
    float f0 = fresnel(cos0, 1.0, ior);
    vec3 col = radiance(viewRot * p0, viewRot * reflect(rd, n0), frost)
        * f0 * reflection;

    // Trace the inside once per path, each with its own IOR.
    vec3 exPos[MAX_PATHS];
    vec3 exDir[MAX_PATHS];
    float exLen[MAX_PATHS];
    float exW[MAX_PATHS];
    int exN[MAX_PATHS];
    int nPaths = clamp(paths, 1, MAX_PATHS);
    int nBounces = clamp(bounces, 1, MAX_BOUNCES);
    for (int m = 0; m < MAX_PATHS; m++) {
        if (m >= nPaths) {
            break;
        }
        float n = ior + dispersion * ((float(m) + 0.5) / float(nPaths) - 0.5);
        n = max(n, 1.0001);
        vec3 d = refract(rd, n0, 1.0 / n);
        vec3 p = p0 - n0 * (HIT * 3.0);
        float w = 1.0 - fresnel(cos0, 1.0, n);
        float len = 0.0;
        int nb = 0;
        for (int b = 0; b < MAX_BOUNCES; b++) {
            float ti = 0.0;
            vec4 si;
            for (int i = 0; i < INNER_STEPS; i++) {
                si = sdf3(p + d * ti);
                innerCount += 1.0;
                float di = -si.x;
                // At the wall, and heading out of it.
                if (di < HIT && dot(d, si.yzw) > 0.0) {
                    break;
                }
                ti += max(di * stepScale, HIT);
            }
            // The same Newton step onto the wall.
            ti += clamp(-si.x / max(dot(d, si.yzw), 0.1), 0.0, HIT * 4.0);
            p += d * ti;
            len += ti;
            vec3 ni = normalAt(p, d);
            float cosI = clamp(dot(d, ni), 0.0, 1.0);
            vec3 o = refract(d, -ni, n);
            bool last = b >= nBounces - 1;
            if (dot(o, o) > 0.0) {
                w *= 1.0 - fresnel(cosI, n, 1.0);
                d = o;
                break;
            }
            if (last) {
                // Out of bounces inside: let it out along the surface
                // normal's side, dimmed.
                d = normalize(d + ni * 0.5);
                w *= 0.5;
                break;
            }
            d = reflect(d, ni);
            p -= ni * (HIT * 3.0);
            nb++;
        }
        exPos[m] = viewRot * p;
        exDir[m] = viewRot * d;
        exLen[m] = len;
        exW[m] = w;
        exN[m] = nb;
    }

    // Spectrum: each wavelength's exit ray is interpolated between the
    // two nearest paths.
    int nSamples = clamp(samples, 1, MAX_SAMPLES);
    float j = (hash12(gl_FragCoord.xy) - 0.5) * jitter;
    vec3 acc = vec3(0.0);
    vec3 wsum = vec3(0.0);
    vec3 absorb = absorption * (1.0 - tint);
    for (int i = 0; i < MAX_SAMPLES; i++) {
        if (i >= nSamples) {
            break;
        }
        float ts = clamp((float(i) + 0.5 + j) / float(nSamples), 0.0, 1.0);
        float x = ts * float(nPaths) - 0.5;
        int a = clamp(int(floor(x)), 0, max(nPaths - 2, 0));
        int b = min(a + 1, nPaths - 1);
        float f = x - float(a);
        // Paths that left through different faces can't be blended:
        // snap to the nearest one.
        if (a == b || exN[a] != exN[b] || dot(exDir[a], exDir[b]) < 0.9) {
            f = step(0.5, f);
        }
        vec3 p = mix(exPos[a], exPos[b], f);
        vec3 d = normalize(mix(exDir[a], exDir[b], f));
        float len = mix(exLen[a], exLen[b], clamp(f, 0.0, 1.0));
        float w = mix(exW[a], exW[b], clamp(f, 0.0, 1.0));
        vec3 l = radiance(p, d, frost) * w * exp(-absorb * len);
        vec3 sw = nSamples == 1 ? vec3(1.0) : spectral(ts);
        acc += sw * l;
        wsum += sw;
    }
    return col + acc / max(wsum, vec3(1e-4));
}

void main() {
    vec2 px = uv * bufferPx;
    vec3 rdV = normalize(vec3((px - centerPx) / focalPx, -1.0));
    vec3 roV = vec3(0.0, 0.0, camDist);
    // viewRot maps object to view; its transpose maps back.
    vec3 ro = roV * viewRot;
    vec3 rd = rdV * viewRot;

    vec3 miss = vec3(0.0);
    float missA = 0.0;
    if (backdropVisible > 0.5) {
        miss = radiance(roV, rdV, 0.0) * step(0.5, float(backdropMode));
        missA = backdropMode == 0 ? 0.0 : 1.0;
    }

    vec2 tb = boundsHit(ro, rd);
    if (tb.x > tb.y || tb.y < 0.0) {
        outColor = debugView != 0 ? heat(0.0) : vec4(miss, missA);
        return;
    }
    float outerCount = 0.0;
    float innerCount = 0.0;
    float t = max(tb.x, 0.0);
    // Radius of the pixel's cone per unit of distance.
    float cone = pixelSize / focalPx;
    // Front to back: what is left to cover, and the colour so far. A ray
    // that grazes an edge covers part of the pixel with it and goes on
    // to what is behind, so edges are antialiased by their coverage.
    float remain = 1.0;
    // Up to two layers: their surface points and weights. They are
    // shaded after the march, where screen-space derivatives are valid.
    vec3 layerP[2];
    float layerW[2];
    int layers = 0;
    bool leaving = false;
    for (int i = 0; i < OUTER_STEPS; i++) {
        vec4 s = sdf3(ro + rd * t);
        outerCount += 1.0;
        float r = t * cone;
        float zone = max(HIT, r);
        if (leaving) {
            // Step away from the edge that was just grazed.
            if (s.x > zone) {
                leaving = false;
            }
            t += max(s.x * stepScale, 3.0 * r);
        } else if (s.x < zone) {
            // Near the surface. Step to where the ray would cross its
            // tangent plane: a ray that hits gets there, one that
            // grazes a convex edge ends up moving away from it.
            float k = s.x / r;
            bool solid = false;
            for (int j = 0; j < 6; j++) {
                if (s.x < 0.15 * r) {
                    solid = true;
                    break;
                }
                float c = dot(rd, s.yzw);
                if (c > -0.02) {
                    break;
                }
                t += min(s.x / -c * stepScale, 0.05);
                s = sdf3(ro + rd * t);
                outerCount += 1.0;
                k = min(k, s.x / (t * cone));
            }
            float cov = solid ? 1.0 : clamp(1.0 - k, 0.0, 1.0);
            if (cov > 0.0) {
                // Onto the surface: the march stops anywhere near it,
                // which would show as contour lines once refracted.
                vec3 p0 = ro + rd * t;
                if (solid) {
                    p0 += rd * clamp(
                        s.x / max(-dot(rd, s.yzw), 0.1),
                        -HIT * 4.0,
                        HIT * 4.0
                    );
                } else {
                    p0 -= s.yzw * s.x;
                }
                if (layers == 0) {
                    layerP[0] = p0;
                    layerW[0] = remain * cov;
                } else {
                    layerP[1] = p0;
                    layerW[1] = remain * cov;
                }
                remain *= 1.0 - cov;
                layers++;
            }
            if (solid || layers >= 2 || remain < 0.02) {
                break;
            }
            leaving = true;
            t += max(s.x * stepScale, 3.0 * r);
        } else {
            t += s.x * stepScale;
        }
        if (t > tb.y) {
            break;
        }
    }

    float layerA = backdropMode == 0 ? 0.0 : 1.0;
    vec4 acc = remain * vec4(miss, missA);
    if (layers > 0) {
        acc += layerW[0] * vec4(shade(layerP[0], rd, innerCount), layerA);
    }
    if (layers > 1) {
        acc += layerW[1] * vec4(shade(layerP[1], rd, innerCount), layerA);
    }
    outColor = acc;
    if (debugView != 0) {
        outColor = heat(
            (debugView != 2 ? outerCount : 0.0)
                + (debugView != 1 ? innerCount : 0.0)
        );
        return;
    }
}
`;

// Premultiplied output. The scene's alpha is 1 where the backdrop shows;
// lights on a black backdrop are additive over the page.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform int hasScene;
uniform int raw;
out vec4 outColor;

vec3 softClip(vec3 x) {
    vec3 k = 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
    return mix(x, k, step(0.8, x));
}

void main() {
    if (hasScene == 0) {
        outColor = vec4(0.0);
        return;
    }
    vec4 s = texture(scene, uv);
    if (raw != 0) {
        outColor = s;
        return;
    }
    vec3 col = softClip(max(s.rgb, 0.0));
    float a = clamp(max(s.a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    outColor = vec4(min(col, a), a);
}
`;

// FXAA (after the public domain FXAA 3 by Timothy Lottes, in its compact
// form): blur along the local edge direction, unless that reaches past
// the local luma range. Works on the premultiplied output.
const FRAG_FXAA = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 texel;
out vec4 outColor;

float luma(vec4 c) {
    return dot(c.rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec4 m = texture(srcTex, uv);
    float lNW = luma(texture(srcTex, uv + texel * vec2(-1.0, -1.0)));
    float lNE = luma(texture(srcTex, uv + texel * vec2(1.0, -1.0)));
    float lSW = luma(texture(srcTex, uv + texel * vec2(-1.0, 1.0)));
    float lSE = luma(texture(srcTex, uv + texel * vec2(1.0, 1.0)));
    float lM = luma(m);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    if (lMax - lMin < max(0.03, lMax * 0.1)) {
        outColor = m;
        return;
    }
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
    float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * texel;
    vec4 a = 0.5 * (texture(srcTex, uv + dir * (1.0 / 3.0 - 0.5))
        + texture(srcTex, uv + dir * (2.0 / 3.0 - 0.5)));
    vec4 b = a * 0.5 + 0.25 * (texture(srcTex, uv - dir * 0.5)
        + texture(srcTex, uv + dir * 0.5));
    float lB = luma(b);
    outColor = (lB < lMin || lB > lMax) ? a : b;
}
`;

const FRAG_COPY = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
out vec4 outColor;

void main() {
    outColor = texture(srcTex, uv);
}
`;

type BackdropElement = Exclude<GlassImageSource, string>;

// Native size of a backdrop element; 0 while a video has no frame.
function sourceSize(el: BackdropElement): [number, number] {
    if (
        typeof HTMLImageElement !== "undefined" &&
        el instanceof HTMLImageElement
    ) {
        return [el.naturalWidth || el.width, el.naturalHeight || el.height];
    }
    if (
        typeof HTMLVideoElement !== "undefined" &&
        el instanceof HTMLVideoElement
    ) {
        return [el.videoWidth || el.width, el.videoHeight || el.height];
    }
    return [el.width, el.height];
}

function isPattern(v: GlassParams["backdrop"]): v is GlassPatternName {
    return typeof v === "string" && v in PATTERN_MODES;
}

function hexToRgb(hex: string): [number, number, number] {
    const [r, g, b] = parseHexColor(hex);
    return [r, g, b];
}

// Lipschitz constant of the bulged field: the cap's gradient is
// (k * grad2, 1) with k up to 2 * bulge / bulgeWidth, and the bevel mixes
// it with the side's (grad2, 0). The worst mix is the largest singular
// value of [[1, k], [0, 1]], a little above sqrt(1 + k^2).
function bulgeLipschitz(bulge: number, bulgeWidth: number): number {
    const k = (2 * bulge) / bulgeWidth;
    return Math.sqrt((2 + k * k + k * Math.sqrt(k * k + 4)) / 2);
}

function clampInt(v: number, lo: number, hi: number, fallback: number): number {
    return Number.isFinite(v)
        ? Math.min(Math.max(Math.round(v), lo), hi)
        : fallback;
}

type Phase = "capture" | "reading" | "ready";

/**
 * Turns the element's silhouette into a block of dispersive glass: the
 * alpha is extruded into 3D and ray-traced with refraction, internal
 * reflections and a rainbow split of the light.
 *
 * ```ts
 * vfx.add(img, { effect: new GlassEffect({ backdrop: "grid" }) });
 * ```
 *
 * The silhouette is read once when the effect starts. An opaque photo
 * becomes a slab. The glass shows a `backdrop` behind it, a procedural
 * pattern or an image, not the page: the output is opaque where the
 * backdrop is seen and premultiplied over transparency elsewhere.
 *
 * All params are read every frame, so you can mutate `params` live.
 */
export class GlassEffect implements Effect {
    params: GlassParams;
    readonly #still: boolean;

    #phase: Phase = "capture";
    #srcFrames = 0;
    #pending: ShapeData | null = null;
    #shape: ShapeData | null = null;
    #mask: EffectRenderTarget | null = null;
    #scene: EffectRenderTarget | null = null;
    #ldr: EffectRenderTarget | null = null;

    #gl: WebGL2RenderingContext | null = null;
    #sdfRaw: WebGLTexture | null = null;
    #sdfTex: EffectTexture | null = null;

    // The backdrop image, and the param value it was loaded from.
    #image: EffectTexture | null = null;
    #imageKey: GlassParams["backdrop"] | null = null;
    #imageAspect = 1;
    #imageEl: BackdropElement | null = null;
    // Videos and canvases change every frame; images only when replaced.
    #imageLive = false;
    // The image copied into a mipmapped target, so it can be filtered by
    // the footprint of a pixel on it.
    #backdropMip: EffectRenderTarget | null = null;
    #backdropDirty = false;

    #time = 0;
    #dragYaw = 0;
    #dragPitch = 0;
    #dragging = false;
    #lastPointer: [number, number] = [0, 0];
    #unlisten: (() => void) | null = null;
    #unsubRestored: (() => void) | null = null;
    #disposed = false;

    constructor(
        initial: Partial<GlassParams> = {},
        opts: GlassEffectOptions = {},
    ) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
        this.#still = opts.still ?? false;
    }

    setParams(updates: Partial<GlassParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        this.#gl = ctx.gl;
        this.#disposed = false;
        this.#unsubRestored = ctx.onContextRestored(() => {
            // The raw SDF texture is gone; upload it again.
            this.#gl = ctx.gl;
            this.#sdfRaw = null;
            this.#sdfTex = null;
            this.#pending = this.#shape;
            this.#backdropDirty = true;
        });

        if (!this.#still && typeof window !== "undefined") {
            const down = (e: PointerEvent) => {
                if (!this.params.drag) {
                    return;
                }
                this.#dragging = true;
                this.#lastPointer = [e.clientX, e.clientY];
            };
            const move = (e: PointerEvent) => {
                if (!this.#dragging) {
                    return;
                }
                const dx = e.clientX - this.#lastPointer[0];
                const dy = e.clientY - this.#lastPointer[1];
                this.#lastPointer = [e.clientX, e.clientY];
                this.#dragYaw += dx * 0.006;
                this.#dragPitch = Math.max(
                    -1.2,
                    Math.min(1.2, this.#dragPitch + dy * 0.006),
                );
            };
            const up = () => {
                this.#dragging = false;
            };
            window.addEventListener("pointerdown", down);
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
            window.addEventListener("pointercancel", up);
            this.#unlisten = () => {
                window.removeEventListener("pointerdown", down);
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                window.removeEventListener("pointercancel", up);
            };
        }
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
    }

    render(ctx: EffectContext): void {
        if (this.#phase === "capture") {
            this.#capture(ctx);
        }
        if (this.#pending) {
            this.#upload(ctx, this.#pending);
            this.#shape = this.#pending;
            this.#pending = null;
            this.#phase = "ready";
        }
        this.#updateImage(ctx);
        this.#updateBackdropMip(ctx);
        if (!this.#still) {
            this.#time += Math.min(ctx.deltaTime, 0.1);
        }

        const scene = this.#drawGlass(ctx);
        const debug = this.#debugView() !== 0;
        // FXAA reads the tone-mapped image, so it gets its own target.
        const [, , ow, oh] = padOutputRect(this.params.pad, ctx.dims);
        const lw = Math.round(ow);
        const lh = Math.round(oh);
        const fxaa =
            this.params.fxaa && scene !== null && !debug && lw > 0 && lh > 0;
        if (fxaa && (this.#ldr?.width !== lw || this.#ldr?.height !== lh)) {
            this.#ldr?.dispose();
            this.#ldr = ctx.createRenderTarget({
                size: [lw, lh],
                filter: "linear",
            });
        }
        const ldr = fxaa ? this.#ldr : null;
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                scene: scene ?? ctx.src,
                hasScene: scene ? 1 : 0,
                raw: debug ? 1 : 0,
            },
            target: ldr ?? ctx.target,
        });
        if (ldr) {
            ctx.draw({
                frag: FRAG_FXAA,
                uniforms: {
                    srcTex: ldr,
                    texel: [1 / ldr.width, 1 / ldr.height],
                },
                target: ctx.target,
            });
        }
    }

    #debugView(): number {
        return DEBUG_VIEWS[this.params.debug] ?? 0;
    }

    #drawGlass(ctx: EffectContext): EffectRenderTarget | null {
        const shape = this.#shape;
        const sdfTex = this.#sdfTex;
        if (this.#phase !== "ready" || !shape || !sdfTex) {
            return null;
        }
        const p = this.params;
        const dims = ctx.dims;
        const [ox, oy, ow, oh] = padOutputRect(p.pad, dims);
        if (ow <= 0 || oh <= 0) {
            return null;
        }

        const scale = Number.isFinite(p.resolution)
            ? Math.min(Math.max(p.resolution, 0.25), 2)
            : 1;
        const sw = Math.max(1, Math.round(ow * scale));
        const sh = Math.max(1, Math.round(oh * scale));
        if (
            !this.#scene ||
            this.#scene.width !== sw ||
            this.#scene.height !== sh
        ) {
            this.#scene?.dispose();
            this.#scene = ctx.createRenderTarget({
                size: [sw, sh],
                float: true,
                filter: "linear",
            });
        }
        const scene = this.#scene;

        const t = this.#time;
        const orbit = Number.isFinite(p.orbit) ? p.orbit : 0;
        const yaw = p.yaw + orbit * Math.sin(t * 0.43) + this.#dragYaw;
        const pitch =
            p.pitch +
            orbit * PITCH_WOBBLE * Math.sin(t * 0.31 + 1.3) +
            this.#dragPitch;
        // Distance so that the long side (2 world units) spans `fov`.
        const fov = Math.min(Math.max(p.fov, 1), 150);
        const camDist = 1 / Math.tan((fov * Math.PI) / 360);
        const [ew, eh] = dims.elementPixel;
        const unitPx = (Math.max(ew, eh) / 2) * p.zoom;

        const halfDepth = Math.max(p.depth / 2, 0.005);
        const bulge = Number.isFinite(p.bulge) ? Math.max(p.bulge, 0) : 0;
        const bulgeWidth = Math.max(p.bulgeWidth, 1e-3);
        const image = isPattern(p.backdrop) ? null : this.#backdropMip;
        // An image that is still loading shows as black.
        const mode = isPattern(p.backdrop)
            ? PATTERN_MODES[p.backdrop]
            : image
              ? IMAGE_MODE
              : 0;

        ctx.draw({
            frag: FRAG_GLASS,
            uniforms: {
                sdfTex,
                sdfRect: shape.sdfRect,
                sdfSize: [shape.sdfW, shape.sdfH],
                halfDepth,
                rounding: Math.min(Math.max(p.bevel, 0), halfDepth),
                bevelShape: BEVEL_SHAPES[p.bevelShape] ?? 0,
                bulge,
                bulgeWidth,
                stepScale:
                    bulge > 0 ? 1 / bulgeLipschitz(bulge, bulgeWidth) : 1,
                shapeHalf: shape.shapeHalf,
                viewRot: viewMatrix(yaw, pitch),
                camDist,
                focalPx: camDist * unitPx,
                centerPx: [ew / 2 - ox, eh / 2 - oy],
                bufferPx: [ow, oh],
                pixelSize: ow / sw,
                ior: Math.max(p.ior, 1.0001),
                dispersion: p.dispersion,
                paths: clampInt(p.paths, 1, MAX_PATHS, 2),
                samples: clampInt(p.samples, 1, MAX_SAMPLES, 8),
                bounces: clampInt(p.bounces, 1, MAX_BOUNCES, 3),
                jitter: Math.min(Math.max(p.jitter, 0), 1),
                tint: hexToRgb(p.tint),
                absorption: Math.max(p.absorption, 0),
                reflection: Math.max(p.reflection, 0),
                bump: Number.isFinite(p.bump)
                    ? Math.min(Math.max(p.bump, 0), 1)
                    : 0,
                bumpScale: Math.max(p.bumpScale, 1e-3),
                frost: Number.isFinite(p.frost)
                    ? Math.min(Math.max(p.frost, 0), 1)
                    : 0,
                backdropMode: mode,
                backdropTex: image ?? sdfTex,
                backdropAspect: this.#imageAspect,
                backdropVisible: p.backdropVisible ? 1 : 0,
                backdropScale: p.backdropScale,
                backdropDistance: Math.max(
                    p.backdropDistance,
                    halfDepth + bulge,
                ),
                backdropOffset: t * p.backdropSpeed,
                backdropA: hexToRgb(p.backdropColors[0]),
                backdropB: hexToRgb(p.backdropColors[1]),
                lightIntensity: Math.max(p.lightIntensity, 0),
                lightSoftness: Math.min(Math.max(p.lightSoftness, 0), 1),
                debugView: this.#debugView(),
            },
            target: scene,
        });
        return scene;
    }

    // Read the element's alpha back once to build the shape.
    #capture(ctx: EffectContext): void {
        if (ctx.src.width === 0 || ctx.src.height === 0) {
            return;
        }
        // Give the source a couple of frames to upload.
        if (++this.#srcFrames < 3) {
            return;
        }
        const [ew, eh] = ctx.dims.elementPixel;
        const aspect = ew / Math.max(eh, 1);
        const mw =
            aspect >= 1
                ? GLASS_MASK_LONG
                : Math.round(GLASS_MASK_LONG * aspect);
        const mh =
            aspect >= 1
                ? Math.round(GLASS_MASK_LONG / aspect)
                : GLASS_MASK_LONG;
        if (
            !this.#mask ||
            this.#mask.width !== mw ||
            this.#mask.height !== mh
        ) {
            this.#mask?.dispose();
            this.#mask = ctx.createRenderTarget({ size: [mw, mh] });
        }
        captureContent(ctx, this.#mask);
        this.#phase = "reading";
        ctx.readPixels(this.#mask).then(
            (px) => {
                const shape = buildShape(
                    px,
                    mw,
                    mh,
                    this.params.depth / 2,
                    aspect,
                    SMOOTH_RADIUS,
                    SMOOTH_PASSES,
                );
                if (shape) {
                    this.#pending = shape;
                } else {
                    // Nothing drawn yet: try again on a later frame.
                    this.#srcFrames = 0;
                    this.#phase = "capture";
                }
            },
            () => {},
        );
    }

    #upload(ctx: EffectContext, shape: ShapeData): void {
        const gl = ctx.gl;
        if (this.#sdfRaw) {
            gl.deleteTexture(this.#sdfRaw);
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        // Half float so it can be filtered linearly everywhere.
        const sdf = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, sdf);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA16F,
            shape.sdfW,
            shape.sdfH,
            0,
            gl.RGBA,
            gl.FLOAT,
            shape.sdf,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        ctx.resetState();
        if (!sdf) {
            return;
        }
        this.#sdfRaw = sdf;
        this.#sdfTex = ctx.wrapTexture(sdf, {
            size: [shape.sdfW, shape.sdfH],
            filter: "linear",
            wrap: "clamp",
        });
    }

    // Load the backdrop image when `backdrop` changes to a new one.
    #updateImage(ctx: EffectContext): void {
        const src = this.params.backdrop;
        if (src === this.#imageKey) {
            return;
        }
        this.#imageKey = src;
        this.#image?.dispose();
        this.#image = null;
        this.#imageEl = null;
        this.#backdropMip?.dispose();
        this.#backdropMip = null;
        if (isPattern(src)) {
            return;
        }
        const wrap = (el: BackdropElement) => {
            if (this.#disposed || this.#imageKey !== src) {
                return;
            }
            const [w, h] = sourceSize(el);
            this.#imageAspect = w > 0 && h > 0 ? w / h : 1;
            this.#imageEl = el;
            this.#imageLive =
                (typeof HTMLCanvasElement !== "undefined" &&
                    el instanceof HTMLCanvasElement) ||
                (typeof HTMLVideoElement !== "undefined" &&
                    el instanceof HTMLVideoElement);
            this.#backdropDirty = true;
            this.#image = ctx.wrapTexture(el, {
                filter: "linear",
                wrap: "clamp",
            });
        };
        if (typeof src !== "string") {
            wrap(src);
            return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.decode().then(
            () => wrap(img),
            () => {},
        );
    }

    // Copy the backdrop image into its mipmapped target: once per image,
    // or every frame for a video or canvas.
    #updateBackdropMip(ctx: EffectContext): void {
        const image = this.#image;
        const el = this.#imageEl;
        if (!image || !el || !(this.#backdropDirty || this.#imageLive)) {
            return;
        }
        const [iw, ih] = sourceSize(el);
        const fit = Math.min(1, BACKDROP_MIP_LONG / Math.max(iw, ih, 1));
        const w = Math.max(1, Math.round(iw * fit));
        const h = Math.max(1, Math.round(ih * fit));
        if (this.#backdropMip?.width !== w || this.#backdropMip?.height !== h) {
            this.#backdropMip?.dispose();
            this.#backdropMip = ctx.createRenderTarget({
                size: [w, h],
                filter: "linear",
                mipmap: true,
            });
        }
        ctx.draw({
            frag: FRAG_COPY,
            uniforms: { srcTex: image },
            target: this.#backdropMip,
        });
        this.#backdropDirty = false;
    }

    dispose(): void {
        this.#disposed = true;
        this.#unlisten?.();
        this.#unlisten = null;
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        if (this.#gl && this.#sdfRaw) {
            this.#gl.deleteTexture(this.#sdfRaw);
        }
        this.#gl = null;
        this.#sdfRaw = null;
        this.#sdfTex = null;
        this.#image?.dispose();
        this.#image = null;
        this.#imageEl = null;
        this.#imageKey = null;
        this.#backdropMip?.dispose();
        this.#backdropMip = null;
        this.#mask?.dispose();
        this.#mask = null;
        this.#scene?.dispose();
        this.#scene = null;
        this.#ldr?.dispose();
        this.#ldr = null;
        this.#shape = null;
        this.#pending = null;
        this.#phase = "capture";
        this.#srcFrames = 0;
    }
}
