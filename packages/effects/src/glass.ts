// Dispersive glass in the shape of an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// 1. The silhouette is read back from the element (`ctx.src` alpha, or
//    the channel `sourceChannel` picks) and turned into a 2D signed
//    distance field; the 3D shape is its analytic extrusion (see
//    `_silhouette.ts`).
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
import {
    OrbitCamera,
    type OrbitCameraParams,
    type OrbitCameraView,
} from "./_orbit-camera.js";
import { padOf, padOutputRect } from "./_pad.js";
import {
    BACKDROP_PALETTES,
    type BackdropImageSource,
    type BackdropPaletteName,
    type BackdropPatternName,
    backdropKind,
    clampInt,
    GLSL_HEAT,
    GLSL_SCENE,
    hexToRgb,
    num,
    SceneBackdrop,
    ScenePasses,
    uploadFloatTexture,
} from "./_scene3d.js";
import {
    boxBlur1d,
    buildShape,
    GLSL_SD2,
    type ShapeData,
} from "./_silhouette.js";
import { GLSL_SIMPLEX3, GLSL_SIMPLEX3_GRAD } from "./_simplex3.js";
import {
    SourceCapture,
    type SourceChannel,
    sourceChannelOf,
} from "./_source.js";

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

/** What the pointer does to a {@link GlassEffect}. */
export type GlassPointer = "none" | "tilt";

/**
 * The params of {@link GlassEffect}: the glass's own, and the camera's
 * ({@link OrbitCameraParams}).
 */
export type GlassParams = OrbitCameraParams & {
    /**
     * Which channel of the element is read as the silhouette: `"alpha"`
     * (where it is opaque; default), `"luminance"` (where it is bright,
     * so the text or the light parts of an opaque image) or `"none"` (the
     * whole element rect). A change reads the element back again, like
     * {@link GlassEffect.refresh | refresh()}.
     */
    sourceChannel: SourceChannel;
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
    /**
     * Height of a relief on the front cap, in the same units as `depth`,
     * from the element's luminance: positive raises the bright parts,
     * negative the dark ones (by sinking the bright ones). It makes a
     * button's label or a photo's content show as shape. 0 is off. Read
     * back with the silhouette (see {@link GlassEffect.refresh | refresh()}),
     * so a video gives a still relief. At 0 the relief is not built;
     * moving it off 0 reads the element back again, so the relief shows
     * a few frames later.
     */
    relief: number;
    /**
     * How much the relief's height map is blurred, in the same units as
     * `depth`. More calms a busy photo and rounds a label's edges.
     * Changing it rebuilds the height map on the CPU.
     */
    reliefBlur: number;

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
    /** Reflections inside the glass before the ray is forced out, 0 to 5. */
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
    backdrop: BackdropPatternName | BackdropImageSource;
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
     * scroll, except `"marble"` and `"flow"`, which morph in place.
     */
    backdropSpeed: number;
    /**
     * The palette of a procedural pattern: a {@link BackdropPaletteName} or
     * two or more `#rrggbb` colours in order, each with an equal share of
     * the area. One colour is a flat fill. Stripes, marble bands and
     * the flow go round the colours, the last running into the first;
     * the grid nests them as concentric squares.
     */
    backdropColors: BackdropPaletteName | readonly string[];
    /**
     * Share of the area that the second colour covers when the palette
     * has two colours, 0 to 1: the width of the stripes and marble bands,
     * of the grid's lines. Ignored for three or more colours.
     */
    backdropRatio: number;
    /**
     * Softness of the edges between the palette's colours, 0 to 1. 0 is
     * hard bands; near 1 the pattern is a continuous gradient through
     * the colours.
     */
    backdropSoftness: number;

    /** Brightness of the soft box lights around the shape. 0 turns them off. */
    lightIntensity: number;
    /** Softness of the lights' edges, 0 to 1. */
    lightSoftness: number;

    /**
     * Render scale, 0.25 to 2. Below 1 is cheaper and softer; 2
     * supersamples the silhouette's edge.
     */
    resolution: number;
    /**
     * Smooth the edges with FXAA, a cheap pass over the final image. The
     * glass is ray-marched in one pass, so multisampling would not help;
     * the march already blends the silhouette by coverage, and FXAA
     * smooths what is left, mostly the refraction on a narrow bevel,
     * which changes faster than the pixels can follow. `resolution: 2`
     * is the thorough (and costly) fix.
     */
    antialias: boolean;
    /**
     * How the glass reacts to the pointer hovering over the page:
     *
     * - `"none"` (default): it doesn't.
     * - `"tilt"`: hover parallax. The shape turns to face the pointer,
     *   up to 20° × {@link OrbitCameraParams.pointerStrength | pointerStrength}
     *   (capped at 90°), reached when the pointer is half a viewport
     *   away from the element's centre.
     *
     * Ignored by still frames. While `"tilt"`, it listens for pointer
     * events on `window` to tell when the pointer leaves the page.
     */
    pointer: GlassPointer;
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
    sourceChannel: "alpha",
    depth: 0.2,
    bevel: 0.03,
    bevelShape: "round",
    bulge: 0,
    bulgeWidth: 0.15,
    relief: 0,
    reliefBlur: 0.006,
    ior: 1.5,
    dispersion: 0.12,
    paths: 2,
    samples: 8,
    bounces: 2,
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
    backdropColors: "mono",
    backdropRatio: 0.5,
    backdropSoftness: 0.03,
    lightIntensity: 1.5,
    lightSoftness: 0.15,
    yaw: 29,
    pitch: 14,
    orbitAnimation: 20,
    orbitSpeed: 3.3,
    fov: 30,
    zoom: 0.7,
    drag: false,
    cameraOrigin: "element",
    pointer: "none",
    pointerStrength: 1,
    resolution: 1,
    antialias: true,
    pad: "fullscreen",
    debug: "off",
};

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
const MAX_BOUNCES = 5;
// Noise gradient to surface slope, before it saturates.
const BUMP_SLOPE = "0.6";
// Long side of the silhouette read back from the element, in px, and the
// box blurs of the distance field built from it. Refraction magnifies
// every bump of the normals, so the glass wants a finer and smoother
// field than the pixel staircase of a small mask gives.
const GLASS_MASK_LONG = 1024;
const SMOOTH_RADIUS = 4;
const SMOOTH_PASSES = 3;
// Box blurs of the relief's height map: glyph edges become a short
// smooth ramp instead of a cliff, which bounds the slope too. The radius
// comes from `reliefBlur`; the default gives 3 mask px.
const RELIEF_PASSES = 3;
const RELIEF_MAX_RADIUS = 256;
// A sunk relief keeps at least this share of the glass's thickness.
const RELIEF_MIN_THICKNESS = 0.2;

// The shader compiles only the kind of backdrop in use (see GLSL_SCENE):
// a change of kind compiles a new shader on its first frame.
const fragGlass = (kind: number) => `#version 300 es
#define BACKDROP_KIND ${kind}
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
// Relief of the front cap: \`relief\` times the height map in reliefTex
// (r = height 0..1, gb = its gradient in world units), on the SDF's grid.
uniform sampler2D reliefTex;
uniform float relief;
// The relief's share of the Lipschitz bound, <= 1: steps that may meet
// the relief are scaled by it on top of stepScale.
uniform float reliefScale;

// The extrusion of a 2D sample s (from sd2) at depth z, with a bevel and
// caps that rise by up to \`bulge\` away from the edge. hr is the relief
// sample (height, gradient) under it, only read when relief != 0.
// x = distance, yzw = unit gradient.
vec4 extrude(vec3 s, vec3 hr, float z) {
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
    bool tilted = k > 0.0;
    if (relief != 0.0) {
        // Only the front cap carries the relief; the nearer cap wins.
        float bf = z - h - relief * hr.x;
        float bb = -z - h;
        b = max(bf, bb);
        gb = bf >= bb
            ? vec3(s.yz * k - relief * hr.yz, 1.0)
            : vec3(s.yz * k, -1.0);
        tilted = true;
    }
    if (bevelShape == 1) {
        // Chamfer: a 45° plane across the corner. Hard edges on purpose.
        float c = (s.x + b + rounding) * 0.7071;
        if (c > s.x && c > b) {
            return vec4(c, normalize(vec3(s.yz, 0.0) + gb));
        }
        if (s.x > b) {
            return vec4(s.x, s.yz, 0.0);
        }
        return vec4(b, tilted ? normalize(gb) : gb);
    }
    vec2 w = vec2(s.x + rounding, b + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        vec3 g = vec3(s.yz * w.x, 0.0) + gb * w.y;
        return vec4(l - rounding, tilted ? normalize(g) : g / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, tilted ? normalize(gb) : gb);
}

vec3 reliefAt(vec2 p) {
    return texture(reliefTex, (p - sdfRect.xy) / sdfRect.zw).rgb;
}

vec4 sdf3(vec3 p) {
    vec3 s = sd2(p.xy);
    if (relief == 0.0) {
        return extrude(s, vec3(0.0), p.z);
    }
    vec4 e = extrude(s, reliefAt(p.xy), p.z);
    // Steep relief needs short steps, but only near it. Two lower bounds
    // on the distance: the field scaled by the relief's Lipschitz share,
    // and the distance to the shape with the cap at its outermost plane
    // (outside) or innermost plane (inside), which has no relief slope.
    // The larger one is safe; far from the relief it is the plane's.
    bool out_ = e.x > 0.0;
    float hEnv = out_ == (relief > 0.0) ? 1.0 : 0.0;
    float env = extrude(s, vec3(hEnv, 0.0, 0.0), p.z).x;
    e.x = out_ ? max(env, e.x * reliefScale) : min(env, e.x * reliefScale);
    return e;
}

uniform vec2 sdfSize;
uniform vec2 shapeHalf;
// The camera (see _orbit-camera.ts): the eye in view space is
// (eye, camDist), and its axis meets the output at principalPx.
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 eye;
uniform vec2 principalPx;
uniform vec2 bufferPx;
// Size of a pixel of the target, in output px.
uniform float pixelSize;

uniform float ior;
uniform float dispersion;
uniform int paths;
uniform int samples;
uniform int exits;
uniform float jitter;
uniform vec3 tint;
uniform float absorption;
uniform float reflection;
uniform float bump;
uniform float bumpScale;
uniform float frost;

uniform int debugView;

const int MAX_PATHS = ${MAX_PATHS};
const int MAX_SAMPLES = ${MAX_SAMPLES};
// Tries to leave the glass: one more than the reflections.
const int MAX_EXITS = ${MAX_BOUNCES + 1};
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
${GLSL_SCENE}

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

// A bicubic (B-spline) filtered lookup of a texture on the SDF's grid,
// in 4 bilinear taps. Stored gradients are only piecewise linear between
// texels, which shows as streaks once they bend light; these are smooth.
vec4 bicubic(sampler2D tex, vec2 uv) {
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
    return (texture(tex, vec2(h0.x, h0.y)) * g0.x
            + texture(tex, vec2(h1.x, h0.y)) * g1.x) * g0.y
        + (texture(tex, vec2(h0.x, h1.y)) * g0.x
            + texture(tex, vec2(h1.x, h1.y)) * g1.x) * g1.y;
}

// sd2, bicubic filtered.
vec3 sd2Smooth(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
        return sd2(p);
    }
    vec4 s = bicubic(sdfTex, uv);
    float gl = length(s.gb);
    return vec3(s.r, gl > 1e-5 ? s.gb / gl : vec2(0.0, 1.0));
}

// The surface normal at p, for a ray along d that meets it there.
vec3 normalAt(vec3 p, vec3 d) {
    vec3 hr = relief != 0.0
        ? bicubic(reliefTex, (p.xy - sdfRect.xy) / sdfRect.zw).rgb
        : vec3(0.0);
    vec3 n = extrude(sd2Smooth(p.xy), hr, p.z).yzw;
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

${GLSL_HEAT}
// Slab test against the shape's bounding box. x = near, y = far.
vec2 boundsHit(vec3 ro, vec3 rd) {
    vec3 b = vec3(shapeHalf + 0.01, halfDepth + bulge + max(relief, 0.0) + 0.01);
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
    int nExits = clamp(exits, 1, MAX_EXITS);
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
        for (int b = 0; b < MAX_EXITS; b++) {
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
            bool last = b >= nExits - 1;
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
    vec3 rdV = normalize(vec3((px - principalPx) / focalPx, -1.0));
    vec3 roV = vec3(eye, camDist);
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

// The shaders made so far, by kind of backdrop.
const FRAG_GLASS = new Map<number, string>();
function fragGlassFor(kind: number): string {
    let frag = FRAG_GLASS.get(kind);
    if (!frag) {
        frag = fragGlass(kind);
        FRAG_GLASS.set(kind, frag);
    }
    return frag;
}

// The SDF, plus the relief's height map on the same grid. The arrays
// are emptied once uploaded (see dropArrays); the sizes stay.
type GlassShape = ShapeData & {
    /**
     * Luminance 0..1 before the blur, kept to rebuild the relief. Null
     * while `relief` is 0: no relief is built.
     */
    reliefLum: Float32Array | null;
    /** Box blur radius of `relief`, in grid px. */
    reliefRadius: number;
    /** RGBA: height 0..1, its gradient in world units, 0. */
    relief: Float32Array;
    /** Largest length of the relief's gradient, in world units. */
    reliefMaxGrad: number;
};

const EMPTY = new Float32Array(0);

// Whether `relief` raises the cap. UI sliders leave remainders like
// 5e-17; those count as 0, so the default path stays exact.
function reliefOn(relief: number): boolean {
    return Number.isFinite(relief) && Math.abs(relief) > 1e-6;
}

// Free the big arrays once they are on the GPU. A restored context reads
// the element back again instead. The luminance stays, to rebuild the
// relief when `reliefBlur` changes.
function dropArrays(shape: GlassShape): void {
    shape.sdf = EMPTY;
    shape.spawn = EMPTY;
    shape.relief = EMPTY;
}

/**
 * Luminance of the captured RGBA pixels (bottom-up rows, premultiplied),
 * so 0 where alpha is 0, on the grid of `shape`'s SDF.
 */
function reliefLuminance(
    pixels: Uint8Array | Float32Array,
    mw: number,
    mh: number,
    shape: ShapeData,
): Float32Array {
    const scale = pixels instanceof Float32Array ? 1 : 1 / 255;
    const W = shape.sdfW;
    const pad = Math.round((W - mw) / 2);
    const h = new Float32Array(W * shape.sdfH);
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const i = (y * mw + x) * 4;
            const l =
                0.2126 * pixels[i] +
                0.7152 * pixels[i + 1] +
                0.0722 * pixels[i + 2];
            h[(y + pad) * W + x + pad] = Math.min(Math.max(l * scale, 0), 1);
        }
    }
    return h;
}

// Box blur radius in grid px for a `reliefBlur` in world units.
function reliefRadius(blur: number, shape: ShapeData): number {
    const px = shape.sdfRect[2] / shape.sdfW;
    const r = Number.isFinite(blur) ? Math.round(Math.max(blur, 0) / px) : 0;
    return Math.min(r, RELIEF_MAX_RADIUS);
}

/**
 * The relief's height map: the luminance `lum` blurred by `RELIEF_PASSES`
 * box blurs of `radius` grid px, and its gradient.
 */
function buildRelief(
    lum: Float32Array,
    shape: ShapeData,
    radius: number,
): Pick<GlassShape, "relief" | "reliefMaxGrad"> {
    const W = shape.sdfW;
    const H = shape.sdfH;
    const h = lum.slice();
    const line = new Float32Array(Math.max(W, H));
    for (let pass = 0; pass < RELIEF_PASSES; pass++) {
        for (let y = 0; y < H; y++) {
            boxBlur1d(h, y * W, 1, W, radius, line);
        }
        for (let x = 0; x < W; x++) {
            boxBlur1d(h, x, W, H, radius, line);
        }
    }
    // Central differences, in height per world unit.
    const inv = 1 / (2 * (shape.sdfRect[2] / W));
    const out = new Float32Array(W * H * 4);
    let maxGrad = 0;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const gx =
                (h[y * W + Math.min(x + 1, W - 1)] -
                    h[y * W + Math.max(x - 1, 0)]) *
                inv;
            const gy =
                (h[Math.min(y + 1, H - 1) * W + x] -
                    h[Math.max(y - 1, 0) * W + x]) *
                inv;
            out[i * 4] = h[i];
            out[i * 4 + 1] = gx;
            out[i * 4 + 2] = gy;
            maxGrad = Math.max(maxGrad, Math.hypot(gx, gy));
        }
    }
    return { relief: out, reliefMaxGrad: maxGrad };
}

// Lipschitz constant of a field whose cap has slope up to k: the cap's
// gradient is (k * grad2, 1), k = 2 * bulge / bulgeWidth plus the
// relief's slope, and the bevel mixes it with the side's (grad2, 0). The
// worst mix is the largest singular value of [[1, k], [0, 1]], a little
// above sqrt(1 + k^2).
function capLipschitz(k: number): number {
    return Math.sqrt((2 + k * k + k * Math.sqrt(k * k + 4)) / 2);
}

/**
 * Turns the element's silhouette into a block of dispersive glass: the
 * alpha is extruded into 3D and ray-traced with refraction, internal
 * reflections and a rainbow split of the light.
 *
 * ```ts
 * vfx.add(img, { effect: new GlassEffect({ backdrop: "grid" }) });
 * ```
 *
 * The silhouette is the element's alpha (or the channel
 * {@link GlassParams.sourceChannel | sourceChannel} picks), read back
 * when the effect starts and again when the element's aspect ratio
 * changes. Call {@link GlassEffect.refresh | refresh()} after its
 * content changes. An opaque photo becomes a slab. The glass shows a
 * `backdrop` behind it, a procedural pattern or an image, not the page:
 * the output is opaque where the backdrop is seen and premultiplied over
 * transparency elsewhere.
 *
 * The camera ({@link OrbitCameraParams}: `yaw`, `pitch`,
 * `orbitAnimation`, `fov`, …) works as in {@link SwirlParticleEffect},
 * with angles in degrees. Its defaults here: the glass turned by `yaw` 29
 * and `pitch` 14, a faster orbit animation (`orbitSpeed` 3.3), and
 * `zoom` 0.7, so the glass is a little smaller than the element. Set `drag: true` to orbit it with
 * pointer drags that start on the element, and `pointer: "tilt"` to turn
 * it towards the pointer. The default
 * `pad: "fullscreen"` leaves room for an off-centre element to lean out
 * of its rect with `cameraOrigin: "viewport"`.
 *
 * All params are read every frame, so you can mutate `params` live.
 */
export class GlassEffect implements Effect {
    params: GlassParams;
    readonly #still: boolean;

    // Reads the silhouette back: when the effect starts, on refresh(),
    // and when the element's aspect ratio changes.
    readonly #source = new SourceCapture({
        longSide: GLASS_MASK_LONG,
        onRead: (r) => this.#onRead(r.pixels, r.width, r.height, r.aspect),
    });
    // `sourceChannel` of the last shape read; a change reads it again.
    #channel: SourceChannel | null = null;
    #pending: GlassShape | null = null;
    #shape: GlassShape | null = null;
    readonly #passes = new ScenePasses();

    #gl: WebGL2RenderingContext | null = null;
    #sdfRaw: WebGLTexture | null = null;
    #sdfTex: EffectTexture | null = null;
    #reliefRaw: WebGLTexture | null = null;
    #reliefTex: EffectTexture | null = null;
    readonly #backdrop = new SceneBackdrop(BACKDROP_PALETTES, DEFAULT_PARAMS);

    #time = 0;
    // Drags, the "tilt", and the window listeners while `drag` is on or
    // `pointer` is "tilt".
    readonly #camera = new OrbitCamera(DEFAULT_PARAMS);
    #unsubRestored: (() => void) | null = null;

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
        this.#unsubRestored = ctx.onContextRestored(() => {
            // The raw SDF texture is gone, and its array was freed: read
            // the element back again. A readback in flight was rejected;
            // start it over. The glass shows again once it is read.
            this.#source.contextRestored();
            if (!this.#pending) {
                this.#source.refresh();
            }
            this.#gl = ctx.gl;
            this.#sdfTex?.dispose();
            this.#reliefTex?.dispose();
            this.#sdfRaw = null;
            this.#sdfTex = null;
            this.#reliefRaw = null;
            this.#reliefTex = null;
            this.#backdrop.contextRestored();
            this.#shape = null;
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(padOf(this.params.pad, DEFAULT_PARAMS.pad), dims);
    }

    render(ctx: EffectContext): void {
        if (
            this.#source.phase === "idle" &&
            this.#channel !== null &&
            sourceChannelOf(this.params.sourceChannel) !== this.#channel
        ) {
            this.#source.refresh();
        }
        this.#source.update(ctx);
        // A new shape replaces the current one once it has been read back.
        if (this.#pending) {
            this.#upload(ctx, this.#pending);
            dropArrays(this.#pending);
            this.#shape = this.#pending;
            this.#pending = null;
        }
        this.#updateRelief(ctx);
        this.#backdrop.update(ctx, this.params);
        if (!this.#still) {
            this.#time += Math.min(ctx.deltaTime, 0.1);
        }

        const cam = this.#camera.update(this.params, {
            time: this.#time,
            dt: this.#still ? 0 : ctx.deltaTime,
            dims: ctx.dims,
            outputRect: padOutputRect(
                padOf(this.params.pad, DEFAULT_PARAMS.pad),
                ctx.dims,
            ),
            mouse: ctx.mouse,
            mouseViewport: ctx.mouseViewport,
            pixelRatio: ctx.pixelRatio,
            live: !this.#still,
            tilt: this.params.pointer === "tilt",
        });
        const scene = this.#drawGlass(ctx, cam);
        this.#passes.output(ctx, scene, {
            pad: padOf(this.params.pad, DEFAULT_PARAMS.pad),
            antialias: this.params.antialias,
            raw: this.#debugView() !== 0,
        });
    }

    #debugView(): number {
        return DEBUG_VIEWS[this.params.debug] ?? 0;
    }

    #drawGlass(
        ctx: EffectContext,
        cam: OrbitCameraView,
    ): EffectRenderTarget | null {
        const shape = this.#shape;
        const sdfTex = this.#sdfTex;
        if (!shape || !sdfTex) {
            return null;
        }
        const p = this.params;
        const scene = this.#passes.scene(
            ctx,
            padOf(p.pad, DEFAULT_PARAMS.pad),
            p.resolution,
        );
        const [, , ow, oh] = padOutputRect(
            padOf(p.pad, DEFAULT_PARAMS.pad),
            ctx.dims,
        );
        if (!scene || ow <= 0 || oh <= 0) {
            return null;
        }
        const t = this.#time;
        const D = DEFAULT_PARAMS;
        const halfDepth = num(p.depth, 0.01, 100, D.depth) / 2;
        const bulge = num(p.bulge, 0, 100, 0);
        const bulgeWidth = num(p.bulgeWidth, 1e-3, 100, D.bulgeWidth);
        const bulgeSlope = bulge > 0 ? (2 * bulge) / bulgeWidth : 0;
        // A sunk relief must keep the front cap above the back one. Until
        // the relief is built, the cap stays flat.
        const relief =
            reliefOn(p.relief) && this.#reliefTex
                ? Math.max(
                      p.relief,
                      -2 * halfDepth * (1 - RELIEF_MIN_THICKNESS),
                  )
                : 0;
        const reliefSlope = Math.abs(relief) * shape.reliefMaxGrad;

        ctx.draw({
            frag: fragGlassFor(backdropKind(this.params.backdrop)),
            uniforms: {
                sdfTex,
                sdfRect: shape.sdfRect,
                sdfSize: [shape.sdfW, shape.sdfH],
                halfDepth,
                rounding: Math.min(
                    num(p.bevel, 0, halfDepth, D.bevel),
                    halfDepth,
                ),
                bevelShape: BEVEL_SHAPES[p.bevelShape] ?? 0,
                bulge,
                bulgeWidth,
                stepScale: bulge > 0 ? 1 / capLipschitz(bulgeSlope) : 1,
                reliefTex: this.#reliefTex ?? sdfTex,
                relief,
                reliefScale:
                    capLipschitz(bulgeSlope) /
                    capLipschitz(bulgeSlope + reliefSlope),
                shapeHalf: shape.shapeHalf,
                viewRot: cam.viewRot,
                camDist: cam.camDist,
                focalPx: cam.focalPx,
                eye: [cam.eye[0], cam.eye[1]],
                principalPx: cam.principalPx,
                bufferPx: [ow, oh],
                pixelSize: ow / scene.width,
                ior: num(p.ior, 1.0001, 10, D.ior),
                dispersion: num(p.dispersion, -10, 10, D.dispersion),
                paths: clampInt(p.paths, 1, MAX_PATHS, 2),
                samples: clampInt(p.samples, 1, MAX_SAMPLES, 8),
                exits: clampInt(p.bounces, 0, MAX_BOUNCES, 2) + 1,
                jitter: num(p.jitter, 0, 1, D.jitter),
                tint: hexToRgb(p.tint),
                absorption: num(p.absorption, 0, 1e3, D.absorption),
                reflection: num(p.reflection, 0, 100, D.reflection),
                bump: num(p.bump, 0, 1, D.bump),
                bumpScale: num(p.bumpScale, 1e-3, 100, D.bumpScale),
                frost: num(p.frost, 0, 1, D.frost),
                ...this.#backdrop.uniforms(
                    p,
                    t,
                    halfDepth + bulge + Math.max(relief, 0),
                    sdfTex,
                ),
                debugView: this.#debugView(),
            },
            target: scene,
        });
        return scene;
    }

    /**
     * Capture the element's silhouette again, for when its content
     * changed: an image's `src` swapped, a text edit. For an `<img>`,
     * call it after `vfx.update(img)` has reloaded the image.
     *
     * The glass keeps the current shape until the new one has been read
     * back (a few frames later), then switches to it. A change of the
     * element's aspect ratio is recaptured automatically once its size
     * settles; a change of size alone needs none.
     *
     * Safe to call at any time and any number of times; a call while a
     * capture is pending restarts it, so the latest content wins.
     */
    refresh(): void {
        this.#source.refresh();
    }

    // Build the shape and the relief's luminance from the element read
    // back. False when the silhouette is empty, to try again later.
    #onRead(
        px: Uint8Array | Float32Array,
        mw: number,
        mh: number,
        aspect: number,
    ): boolean {
        const channel = sourceChannelOf(this.params.sourceChannel);
        const shape = buildShape(
            px,
            mw,
            mh,
            channel,
            this.params.depth / 2,
            aspect,
            SMOOTH_RADIUS,
            SMOOTH_PASSES,
        );
        if (!shape) {
            return false;
        }
        if (reliefOn(this.params.relief)) {
            const lum = reliefLuminance(px, mw, mh, shape);
            const radius = reliefRadius(this.params.reliefBlur, shape);
            this.#pending = {
                ...shape,
                reliefLum: lum,
                reliefRadius: radius,
                ...buildRelief(lum, shape, radius),
            };
        } else {
            this.#pending = {
                ...shape,
                reliefLum: null,
                reliefRadius: -1,
                relief: EMPTY,
                reliefMaxGrad: 0,
            };
        }
        this.#channel = channel;
        return true;
    }

    #upload(ctx: EffectContext, shape: GlassShape): void {
        const gl = ctx.gl;
        this.#sdfTex?.dispose();
        if (this.#sdfRaw) {
            gl.deleteTexture(this.#sdfRaw);
        }
        this.#sdfRaw = null;
        this.#sdfTex = null;
        const sdf = uploadFloatTexture(gl, shape.sdfW, shape.sdfH, shape.sdf);
        ctx.resetState();
        if (sdf) {
            this.#sdfRaw = sdf;
            this.#sdfTex = ctx.wrapTexture(sdf, {
                size: [shape.sdfW, shape.sdfH],
                filter: "linear",
                wrap: "clamp",
            });
        }
        this.#uploadRelief(ctx, shape);
    }

    // Rebuild the relief when `reliefBlur` changes, from the luminance
    // kept from the readback: no new capture, and the SDF stays. Free it
    // when `relief` goes to 0; when it leaves 0, read the element again
    // for its luminance.
    #updateRelief(ctx: EffectContext): void {
        const shape = this.#shape;
        if (!shape) {
            return;
        }
        if (!reliefOn(this.params.relief)) {
            if (shape.reliefLum) {
                shape.reliefLum = null;
                shape.reliefRadius = -1;
                shape.reliefMaxGrad = 0;
                this.#freeRelief(ctx.gl);
            }
            return;
        }
        if (!shape.reliefLum) {
            if (this.#source.phase === "idle" && !this.#pending) {
                this.#source.refresh();
            }
            return;
        }
        const radius = reliefRadius(this.params.reliefBlur, shape);
        if (radius === shape.reliefRadius) {
            return;
        }
        Object.assign(shape, buildRelief(shape.reliefLum, shape, radius));
        shape.reliefRadius = radius;
        this.#uploadRelief(ctx, shape);
        shape.relief = EMPTY;
    }

    #freeRelief(gl: WebGL2RenderingContext): void {
        this.#reliefTex?.dispose();
        if (this.#reliefRaw) {
            gl.deleteTexture(this.#reliefRaw);
        }
        this.#reliefRaw = null;
        this.#reliefTex = null;
    }

    #uploadRelief(ctx: EffectContext, shape: GlassShape): void {
        const gl = ctx.gl;
        this.#freeRelief(gl);
        if (!shape.reliefLum) {
            return;
        }
        const rel = uploadFloatTexture(
            gl,
            shape.sdfW,
            shape.sdfH,
            shape.relief,
        );
        ctx.resetState();
        const size = [shape.sdfW, shape.sdfH] as const;
        if (rel) {
            this.#reliefRaw = rel;
            this.#reliefTex = ctx.wrapTexture(rel, {
                size,
                filter: "linear",
                wrap: "clamp",
            });
        }
    }

    dispose(): void {
        this.#camera.dispose();
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        this.#sdfTex?.dispose();
        this.#reliefTex?.dispose();
        if (this.#gl && this.#sdfRaw) {
            this.#gl.deleteTexture(this.#sdfRaw);
        }
        if (this.#gl && this.#reliefRaw) {
            this.#gl.deleteTexture(this.#reliefRaw);
        }
        this.#backdrop.dispose(this.#gl);
        this.#reliefRaw = null;
        this.#reliefTex = null;
        this.#gl = null;
        this.#sdfRaw = null;
        this.#sdfTex = null;
        this.#passes.dispose();
        this.#shape = null;
        this.#pending = null;
        // Start over like a new instance if it is added again.
        this.#source.reset();
        this.#channel = null;
    }
}
