// A foam of soap bubbles filling an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// 1. The silhouette is read back from the element (`ctx.src` alpha) and
//    turned into a 2D signed distance field; the 3D volume is its
//    extrusion (see `_silhouette.ts`).
// 2. Each cell of a jittered lattice inside the volume holds a sphere,
//    sized by `cellSize`, `roundness` and `cellSizeRandomness`. Where
//    spheres overlap, they are cut by their radical plane and share one
//    flat film there (a power diagram); where a sphere is exposed, its
//    own round surface is the film.
// 3. A soap film is thin, so it does not bend light: each camera ray is
//    straight. Along it, the power of every sphere is t² + b t + k, and
//    t² is the same for all of them, so the cell that owns a point is the
//    lower envelope of the lines b t + k. The films are found exactly,
//    with no marching inside the foam (see `_sphere-foam.ts`, which
//    mirrors the solver in TypeScript, and `sphereSegment` below). The
//    ray walks the lattice with a window of the 27 seeds round it, and
//    loads only the 9 that come in at each step.
// 4. A film's colour is thin-film interference: a LUT of reflectance by
//    thickness and angle, baked once from the CIE colour matching
//    functions (`_thin-film.ts`). It reflects the same backdrop and box
//    lights as GlassEffect, softened. The films are composited front to
//    back.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import { captureContent } from "./_capture.js";
import { padOutputRect } from "./_pad.js";
import {
    cameraUniforms,
    clampInt,
    GLSL_HEAT,
    GLSL_SCENE,
    hexToRgb,
    OrbitDrag,
    SceneBackdrop,
    ScenePasses,
    uploadFloatTexture,
} from "./_scene3d.js";
import { buildShape, GLSL_SDF, type ShapeData } from "./_silhouette.js";
import { GLSL_SIMPLEX3, GLSL_SIMPLEX3_GRAD } from "./_simplex3.js";
import {
    THIN_FILM_LUT_H,
    THIN_FILM_LUT_W,
    THIN_FILM_THICKNESS_MAX,
    thinFilmLut,
} from "./_thin-film.js";
import {
    GLASS_PALETTES,
    type GlassImageSource,
    type GlassPaletteName,
    type GlassPatternName,
} from "./glass.js";

/**
 * A {@link BubbleParams.debug} view: texture lookups per pixel
 * (`"cost"`), films shaded (`"layers"`), or each bubble in a flat colour
 * where the ray first meets it (`"cells"`).
 */
export type BubbleDebugView = "off" | "cost" | "layers" | "cells";

export type BubbleParams = {
    /** Extrusion depth, relative to the long side of the element (= 2). */
    depth: number;

    /**
     * Size of the bubbles: the spacing of the lattice they sit on, in the
     * same units as `depth`. Several bubbles across a stroke make it read
     * as foam.
     */
    cellSize: number;
    /**
     * How much the bubbles' radii vary, 0 (all alike) to 1 (each shrunk
     * by a random share, up to all of it).
     */
    cellSizeRandomness: number;
    /**
     * How round the bubbles are, 0 to 1: their radius, from a whole
     * `cellSize` at 0 (heavy overlap: a flat-walled foam with shallow
     * round caps) to about half of it at 1 (nearly separate spheres that
     * just touch).
     */
    roundness: number;
    /**
     * How far each bubble's centre wanders from its lattice cell's
     * centre, 0 (a regular lattice) to 0.9.
     */
    jitter: number;
    /** Seed of the random placement. */
    seed: number;
    /**
     * Moves the foam's outside in (positive) or out (negative) from the
     * silhouette, world units. At 0, bubbles poke out of the silhouette
     * by half a `cellSize` at most.
     */
    skin: number;
    /**
     * Amplitude of the bubbles' slow drift, relative to `cellSize`, 0 to
     * 0.15: the walls breathe.
     */
    wobble: number;
    /** Speed of the drift, in cycles per second. */
    speed: number;
    /**
     * Films composited per pixel, front to back, 1 to 16. A ray through
     * n bubbles crosses about n + 1.
     */
    maxLayers: number;

    /**
     * Interference colour, 0 (colourless reflection) to 1 (the full
     * thin-film colours).
     */
    iridescence: number;
    /** Mean thickness of the films, in nm. The colours cycle with it. */
    thickness: number;
    /** Swirls in the thickness, 0 to 1, as a share of `thickness`. */
    thicknessVariation: number;
    /**
     * Drainage, 0 to 1: films are thinner at the top of each bubble and
     * thicker at the bottom, by this share of `thickness`.
     */
    drain: number;
    /** Size of the swirls: noise frequency per cell size. */
    swirlScale: number;
    /** Speed at which the swirls flow down and change, per second. */
    swirlSpeed: number;
    /** Strength of the reflected light, without changing transparency. */
    reflection: number;
    /**
     * Colour the soapy water gives the light it scatters (a CSS hex
     * colour). Films seen at a grazing angle, and stacks of them, take it
     * on: the depth cue of a foam.
     */
    tint: string;
    /** How much each film takes on `tint`, 0 to 1. */
    tintStrength: number;
    /**
     * 0 to 1: the bubbles' first faces turn into a matte, softly lit body
     * of `color`. 1 gives opaque balls.
     */
    opacity: number;
    /** Colour of the body that `opacity` blends in (a CSS hex colour). */
    color: string;

    /**
     * The backdrop: a pattern name, or an image (an element, an
     * `ImageBitmap` or a URL). Films reflect it and, with
     * `backdropVisible`, it is drawn behind the foam; otherwise the page
     * shows through it.
     */
    backdrop: GlassPatternName | GlassImageSource;
    /** Draw the backdrop behind and around the foam. */
    backdropVisible: boolean;
    /** Size of the pattern's features, or of the image. */
    backdropScale: number;
    /** Distance of the backdrop plane behind the shape's centre. */
    backdropDistance: number;
    /** Speed of the pattern, in pattern periods per second. */
    backdropSpeed: number;
    /** The palette of a pattern, as `GlassParams.backdropColors`. */
    backdropColors: GlassPaletteName | readonly string[];
    /** Share of the second colour of a two-colour palette, 0 to 1. */
    backdropRatio: number;
    /** Softness of the edges between the palette's colours, 0 to 1. */
    backdropSoftness: number;

    /**
     * Brightness of the soft box lights around the shape, and of a dim
     * sky over it, which the films reflect. 0 turns them off.
     */
    lightIntensity: number;
    /** Softness of the lights' edges, 0 to 1. */
    lightSoftness: number;

    /** Camera yaw in radians. 0 looks straight at the front. */
    yaw: number;
    /** Camera pitch in radians. 0 looks straight at the front. */
    pitch: number;
    /** Amplitude of a slow camera wobble, in radians. */
    orbit: number;
    /** Vertical field of view in degrees. */
    fov: number;
    /** Size of the shape relative to the element. */
    zoom: number;
    /** Orbit the camera with pointer drags. */
    drag: boolean;

    /** Render scale, 0.25 to 2. Below 1 is cheaper and softer. */
    resolution: number;
    /** Smooth the remaining stair steps with FXAA. */
    fxaa: boolean;
    /**
     * Padding around the element, in CSS px, or `"fullscreen"` to draw on
     * the whole canvas.
     */
    pad: number | "fullscreen";
    /**
     * Show a debug view instead of the foam: texture lookups per pixel
     * (`"cost"`: black 0, blue 64, green 128, yellow 192, red 256, white
     * 320 or more), films shaded (`"layers"`, 1.6 per colour step), or
     * the bubbles in flat colours (`"cells"`).
     */
    debug: BubbleDebugView;
};

export type BubbleEffectOptions = {
    /** Freeze time, for deterministic screenshots. */
    still?: boolean;
};

const DEFAULT_PARAMS: BubbleParams = {
    depth: 0.1,
    cellSize: 0.05,
    cellSizeRandomness: 0.25,
    roundness: 0.45,
    jitter: 0.6,
    seed: 1,
    skin: 0,
    wobble: 0.05,
    speed: 0.15,
    maxLayers: 6,
    iridescence: 0.5,
    thickness: 420,
    thicknessVariation: 0.35,
    drain: 0.5,
    swirlScale: 1.2,
    swirlSpeed: 0.12,
    reflection: 1.4,
    tint: "#6d8ee8",
    tintStrength: 0.3,
    opacity: 0,
    color: "#2f7fe0",
    backdrop: "none",
    backdropVisible: false,
    backdropScale: 0.25,
    backdropDistance: 0.6,
    backdropSpeed: 0.15,
    backdropColors: "mono",
    backdropRatio: 0.5,
    backdropSoftness: 0.03,
    lightIntensity: 1.2,
    lightSoftness: 0.8,
    yaw: 0.35,
    pitch: 0.2,
    orbit: 0.2,
    fov: 30,
    zoom: 0.75,
    drag: false,
    resolution: 1,
    fxaa: true,
    pad: "fullscreen",
    debug: "off",
};

const DEBUG_VIEWS: Record<BubbleDebugView, number> = {
    off: 0,
    cost: 1,
    layers: 2,
    cells: 3,
};
const MAX_LAYERS = 16;
const JITTER_MAX = 0.9;
const WOBBLE_MAX = 0.15;
// Long side of the silhouette read back from the element, in px, and
// the smoothing of its field. The field only places the bubbles, so it
// can be coarser than GlassEffect's.
const BUBBLE_MASK_LONG = 512;
const SMOOTH_RADIUS = 2;
const SMOOTH_PASSES = 2;
// Radius per lattice spacing at roundness 0 and 1.
const SPHERE_R_FLAT = 1.0;
const SPHERE_R_ROUND = 0.52;
// How far a bubble may poke out of the silhouette, and how much further
// out of the front and back, per cell size.
const SPHERE_PROTRUDE = 0.5;
const SPHERE_BULGE_Z = 0.3;
// Seeds near the outline are pulled in to this depth, and at most this
// far (seeds farther out are dropped), per cell size.
const PULL_DEPTH = 0.1;
const PULL_MAX = 0.6;

const FRAG_BUBBLE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 uv;
out vec4 outColor;

${GLSL_SDF}

uniform vec2 shapeHalf;
uniform float boxMargin;
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 centerPx;
uniform vec2 bufferPx;
uniform float pixelSize;

uniform int maxLayers;
uniform float time;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform uint seed;

// The lattice (cell size per axis, origin, layers in z) and its seeds.
uniform float cellSize;
uniform vec3 latCell;
uniform vec3 latOrigin;
uniform int latLayers;
uniform float jitter;
uniform float pullDepth;
uniform float pullMax;
// The base radius, its random share, how far a sphere may poke out of
// the shape (and out of its front and back, further), and how far any
// can reach out of it.
uniform float sphereR;
uniform float radiusVar;
uniform float protrude;
uniform float bulgeZ;
uniform float reachMax;

uniform sampler2D filmLut;
uniform float iridescence;
uniform float thickness;
uniform float thicknessVariation;
uniform float drain;
uniform float swirlScale;
uniform float swirlOffset;
uniform float reflection;
uniform vec3 tint;
uniform float tintStrength;
uniform float opacity;
uniform vec3 bodyColor;
uniform int debugView;

// Spheres the ray passes through in one lattice cell, at most.
const int MAX_CAND = 12;
const int MAX_LAYERS = ${MAX_LAYERS};
const float THICKNESS_MAX = ${THIN_FILM_THICKNESS_MAX.toFixed(1)};
const float TAU = 6.2831853;
// Brightness of the lights in reflections, the most a film reflects, and
// how much of that the walls inside the foam keep.
const float LIGHT_GAIN = 8.0;
const float RIM_MAX = 0.2;
const float WALL_DIM = 0.35;

${GLSL_SIMPLEX3}
${GLSL_SIMPLEX3_GRAD}
${GLSL_SCENE}
${GLSL_HEAT}

vec3 ro;
vec3 rd;
float cost = 0.0;

uvec3 pcg3d(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec4 hash4(uvec3 v) {
    uvec3 a = pcg3d(v ^ uvec3(seed, seed * 7u, seed * 13u));
    uint w = (a.x ^ (a.y >> 11u) ^ (a.z << 7u)) * 747796405u;
    return vec4(a, w ^ (w >> 16u)) * (1.0 / 4294967295.0);
}

// A slow drift of length <= wobbleAmp, from a random phase.
vec3 drift(vec4 h) {
    if (wobbleAmp <= 0.0) {
        return vec3(0.0);
    }
    vec3 f = (0.6 + 0.8 * h.yzw) * (wobbleSpeed * TAU);
    return wobbleAmp * 0.5774 * sin(time * f + h.zwx * TAU);
}

// ---- shading ----

vec3 col = vec3(0.0);
vec3 remain = vec3(1.0);
int films = 0;
float firstId = -1.0;

// Film thickness in nm at l (from the cell's seed, per cell size):
// thinner at the top, with slow swirls flowing down.
float filmThickness(vec3 l, float id) {
    float g = max(1.0 - drain * l.y, 0.05);
    vec3 q = l * swirlScale + vec3(id * 1.37, id * 0.71 - swirlOffset, id * 2.13);
    float n = 0.7 * snoise(q + vec3(0.0, 0.0, swirlOffset * 0.5))
        + 0.3 * snoise(q * 2.3 + 11.7);
    return thickness * g * max(1.0 + thicknessVariation * n, 0.05);
}

// Reflectance of a film without interference: both faces' Fresnel
// (water, Schlick), summed incoherently.
float plainFilm(float c) {
    float f = 0.02 + 0.98 * pow(1.0 - c, 5.0);
    return 2.0 * f / (1.0 + f);
}

// The light a film of reflectance R reflects: a soft studio sky, and the
// scene's lights (or the backdrop). The lights are much brighter than
// their surroundings, as studio lights are, so a cap facing one shows a
// highlight at the few percent a film reflects head on; past that, a
// grazing film reflects them no more, so rims stay soft.
vec3 reflected(vec3 R, vec3 pV, vec3 dV) {
    vec3 L = radiance(pV, dV, 0.0);
    bool lit = backdropMode == 0 || dV.z >= -1e-4;
    float sky = lightIntensity * 0.35 * (0.3 + 0.7 * smoothstep(-0.7, 0.9, dV.y));
    vec3 r = lit ? min(R, vec3(0.05)) * LIGHT_GAIN * L : R * L;
    return r + R * sky;
}

// Shade a film at p with normal n, of the cell round \`center\` with id
// \`id\`: \`outer\` is 1 on the foam's outside, 0 on a wall inside it;
// \`cover\` is how much of the pixel it covers.
void shadeFilm(vec3 p, vec3 n, vec3 center, float id, float outer, bool entering, float cover) {
    vec3 nf = dot(n, rd) > 0.0 ? -n : n;
    float cosI = clamp(-dot(rd, nf), 0.0, 1.0);
    float th = filmThickness((p - center) / cellSize, id);
    vec3 R = mix(
        vec3(plainFilm(cosI)),
        textureLod(filmLut, vec2(th / THICKNESS_MAX, cosI), 0.0).rgb,
        iridescence
    );
    // Grazing films reflect most, but a foam is mostly grazing films:
    // their reflectance is held down, more for the walls inside it.
    R = min(R, vec3(RIM_MAX)) * mix(WALL_DIM, 1.0, outer) * cover;
    vec3 rv = viewRot * reflect(rd, nf);
    vec3 refl = reflected(R, viewRot * p, rv) * reflection;
    col += remain * refl / (1.0 + refl);
    // The light that passes: some of it scattered in the tint, more at a
    // grazing angle, where the path through the film is longer.
    vec3 T = 1.0 - R;
    float k = (1.0 - exp(-tintStrength * 0.03 / max(cosI * cosI, 0.1))) * cover;
    col += remain * T * k * tint;
    remain *= T * (1.0 - k);
    if (entering && opacity > 0.0) {
        // A matte, softly lit body: wrapped diffuse from the upper left,
        // a little rim light.
        vec3 nV = viewRot * n;
        float wrap = clamp((dot(nV, normalize(vec3(-0.5, 0.75, 0.6))) + 0.5) / 1.5, 0.0, 1.0);
        float rim = pow(1.0 - cosI, 3.0);
        float li = 0.35 + 0.5 * lightIntensity;
        vec3 body = bodyColor * li * (0.25 + 0.85 * wrap * wrap)
            + rim * 0.2 * li * vec3(0.8, 0.9, 1.0);
        float o = opacity * cover;
        col += remain * o * body;
        remain *= 1.0 - o;
    }
    if (films == 0) {
        firstId = id;
    }
    films++;
}

// ---- the foam: a power diagram of spheres on a jittered lattice ----

// The 27 seeds round the lattice cell the ray is in (index x + 3 y + 9 z,
// offsets -1..1): centre and radius (radius 0: none), id, and the ray's
// power line b t + k for each.
vec4 win[27];
float winId[27];
vec2 winBK[27];
// Where the ray is inside each sphere (empty when it misses).
vec2 winHit[27];

// The sphere of lattice cell L. Its seed is pulled into the shape (or
// dropped) at rest, so the drift never makes one appear or vanish. Its
// radius pokes out of the shape by \`protrude\` at most, and stays within
// one lattice cell of its own, so the 27 round a point hold every sphere
// that can own it.
void sphereSeed(ivec3 L, out vec4 sph, out float id) {
    sph = vec4(0.0);
    id = 0.0;
    if (L.z < 0 || L.z >= latLayers) {
        return;
    }
    vec4 h = hash4(uvec3(L + 4096));
    vec3 cell = latOrigin + (vec3(L) + 0.5) * latCell;
    vec3 c = cell + jitter * (h.xyz - 0.5) * vec3(1.0, 1.0, 0.5) * latCell;
    vec3 s = sd2(c.xy);
    cost += 1.0;
    float depthIn = -s.x;
    if (s.x > -pullDepth) {
        // Pulled in along the field to pullDepth (one lookup: the field
        // is close enough to linear over the pull).
        float move = s.x + pullDepth;
        if (move > pullMax) {
            return;
        }
        c.xy -= s.yz * move;
        depthIn = pullDepth;
    }
    float r = sphereR * (1.0 - radiusVar * fract(h.w * 7.31));
    // The outline stays readable: a sphere pokes out of the silhouette by
    // protrude at most. Out of the front and back it may bulge more.
    r = min(r, min(depthIn, halfDepth - abs(c.z) + bulgeZ) + protrude);
    vec3 room = (1.5 - abs(c - cell) / latCell) * latCell - wobbleAmp;
    r = min(r, min(room.x, min(room.y, room.z)));
    if (r <= 0.0) {
        return;
    }
    sph = vec4(c + drift(h), r);
    id = h.w * 251.0;
}

void loadSlot(int i, ivec3 L) {
    vec4 sph;
    float id;
    sphereSeed(L, sph, id);
    win[i] = sph;
    winId[i] = id;
    vec3 oc = ro - sph.xyz;
    vec2 bk = vec2(2.0 * dot(rd, oc), dot(oc, oc) - sph.w * sph.w);
    winBK[i] = bk;
    float disc = bk.x * bk.x - 4.0 * bk.y;
    winHit[i] = sph.w > 0.0 && disc > 0.0
        ? 0.5 * (-bk.x + vec2(-1.0, 1.0) * sqrt(disc))
        : vec2(1e30, -1e30);
}

// A lattice cell's slot in the window: its coordinates mod 3, so a step
// only overwrites the 9 slots of the slab it leaves.
int slotOf(ivec3 L) {
    ivec3 m = ((L % 3) + 3) % 3;
    return m.x + 3 * m.y + 9 * m.z;
}

void loadWindow(ivec3 C) {
    for (int i = 0; i < 27; i++) {
        ivec3 L = C + ivec3(i % 3, (i / 3) % 3, i / 9) - 1;
        loadSlot(slotOf(L), L);
    }
}

// Step the window to cell C, one cell along an axis (0 x, 1 y, 2 z) in
// direction dir: load the 9 seeds of the slab that comes in.
void shiftWindow(ivec3 C, int axis, int dir) {
    for (int i = 0; i < 9; i++) {
        ivec3 L = C;
        L[axis] += dir;
        L[(axis + 1) % 3] += i % 3 - 1;
        L[(axis + 2) % 3] += i / 3 - 1;
        loadSlot(slotOf(L), L);
    }
}

bool sphereInside = false;

// Shade a sphere's own surface at t.
void sphereFilm(int i, float t, bool entering, float cover) {
    vec3 p = ro + rd * t;
    shadeFilm(p, (p - win[i].xyz) / win[i].w, win[i].xyz, winId[i], 1.0, entering, cover);
}

// The films of the foam on [t0, t1] with this window: the lower envelope
// of the power lines, as in \`_sphere-foam.ts\`.
void sphereSegment(float t0, float t1, float cone, int layers) {
    // Only spheres the ray passes through on the segment can own a point
    // inside the foam; the others are left out of the envelope.
    int cand[MAX_CAND];
    int n = 0;
    for (int i = 0; i < 27; i++) {
        vec2 h = winHit[i];
        if (h.x < t1 && h.y > t0 && n < MAX_CAND) {
            cand[n] = i;
            n++;
        }
    }
    if (n == 0) {
        sphereInside = false;
        return;
    }
    int own = cand[0];
    float lo = winBK[own].x * t0 + winBK[own].y;
    for (int c = 1; c < MAX_CAND; c++) {
        if (c >= n) {
            break;
        }
        int i = cand[c];
        float l = winBK[i].x * t0 + winBK[i].y;
        if (l < lo || (l == lo && winBK[i].x < winBK[own].x)) {
            lo = l;
            own = i;
        }
    }
    float ta = t0;
    for (int guard = 0; guard <= MAX_CAND; guard++) {
        if (films >= layers) {
            return;
        }
        vec2 bo = winBK[own];
        float ts = 1e30;
        int next = -1;
        for (int c = 0; c < MAX_CAND; c++) {
            if (c >= n) {
                break;
            }
            int j = cand[c];
            vec2 bj = winBK[j];
            if (bj.x < bo.x) {
                float tj = max((bj.y - bo.y) / (bo.x - bj.x), ta);
                if (tj < ts) {
                    ts = tj;
                    next = j;
                }
            }
        }
        float tb = min(ts, t1);
        float disc = bo.x * bo.x - 4.0 * bo.y;
        if (disc > 0.0) {
            float hh = sqrt(disc);
            float tIn = 0.5 * (-bo.x - hh);
            float tOut = 0.5 * (-bo.x + hh);
            // Edge antialiasing: a chord shorter than the pixel's
            // footprint covers part of it.
            float cover = clamp(0.5 * hh / max(cone * tIn, 1e-6), 0.0, 1.0);
            if (!sphereInside && tIn > ta && tIn <= tb && tIn > 0.0) {
                sphereFilm(own, tIn, true, cover);
                sphereInside = true;
            }
            if (sphereInside && tOut > ta && tOut <= tb && films < layers) {
                sphereFilm(own, tOut, false, cover);
                sphereInside = false;
            }
        }
        if (next < 0 || ts >= t1) {
            return;
        }
        if (sphereInside && films < layers) {
            // One flat wall on the radical plane, shared by both cells.
            vec3 p = ro + rd * ts;
            vec3 c = 0.5 * (win[own].xyz + win[next].xyz);
            shadeFilm(p, normalize(win[next].xyz - win[own].xyz), c, winId[own] + winId[next], 0.0, false, 1.0);
        }
        own = next;
        ta = ts;
    }
}

void traceSpheres(vec2 tb, float cone, int layers) {
    float t = max(tb.x, 0.0);
    bool walking = false;
    ivec3 C = ivec3(0);
    vec3 tMax = vec3(0.0);
    vec3 tDelta = vec3(0.0);
    ivec3 stp = ivec3(0);
    for (int i = 0; i < 160; i++) {
        if (t > tb.y || films >= layers || max(remain.r, max(remain.g, remain.b)) < 0.02) {
            break;
        }
        if (!walking) {
            // Empty space: no sphere reaches farther than this out of the
            // shape.
            float s = sdf3(ro + rd * t).x;
            cost += 1.0;
            if (s > reachMax + 1e-4) {
                t += s - reachMax;
                continue;
            }
            vec3 q = (ro + rd * t - latOrigin) / latCell;
            C = ivec3(floor(q));
            vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
            vec3 inv = 1.0 / d;
            stp = ivec3(sign(d));
            tMax = t + (floor(q) + step(0.0, d) - q) * latCell * inv;
            tDelta = latCell * abs(inv);
            loadWindow(C);
            sphereInside = false;
            walking = true;
        }
        float tn = min(tMax.x, min(tMax.y, tMax.z));
        sphereSegment(t, min(tn, tb.y), cone, layers);
        t = tn;
        int axis = tMax.x <= tMax.y && tMax.x <= tMax.z ? 0 : (tMax.y <= tMax.z ? 1 : 2);
        C[axis] += stp[axis];
        tMax[axis] += tDelta[axis];
        shiftWindow(C, axis, stp[axis]);
        // Out of every sphere and well away from the shape: back to
        // tracing, which skips the empty cells faster than stepping.
        if (!sphereInside) {
            float s = sdf3(ro + rd * t).x;
            cost += 1.0;
            if (s > reachMax + 2.0 * cellSize) {
                walking = false;
            }
        }
    }
}

// Slab test against the shape's bounding box. x = near, y = far.
vec2 boundsHit() {
    vec3 b = vec3(shapeHalf, halfDepth) + boxMargin + 0.01;
    vec3 inv = 1.0 / rd;
    vec3 t0 = (-b - ro) * inv;
    vec3 t1 = (b - ro) * inv;
    vec3 lo = min(t0, t1);
    vec3 hi = max(t0, t1);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

void main() {
    vec2 px = uv * bufferPx;
    vec3 rdV = normalize(vec3((px - centerPx) / focalPx, -1.0));
    vec3 roV = vec3(0.0, 0.0, camDist);
    // viewRot maps object to view; its transpose maps back.
    ro = roV * viewRot;
    rd = rdV * viewRot;

    vec3 miss = vec3(0.0);
    float missA = 0.0;
    if (backdropVisible > 0.5 && backdropMode != 0) {
        miss = radiance(roV, rdV, 0.0);
        missA = 1.0;
    }

    vec2 tb = boundsHit();
    if (tb.x > tb.y || tb.y < 0.0) {
        outColor = debugView != 0 ? (debugView == 3 ? vec4(0.0, 0.0, 0.0, 1.0) : heat(0.0)) : vec4(miss, missA);
        return;
    }
    // Radius of the pixel's cone per unit of distance.
    float cone = pixelSize / focalPx;
    traceSpheres(tb, cone, clamp(maxLayers, 1, MAX_LAYERS));

    if (debugView == 1) {
        outColor = heat(cost);
        return;
    }
    if (debugView == 2) {
        outColor = heat(float(films) * 40.0);
        return;
    }
    if (debugView == 3) {
        vec3 c = firstId < 0.0
            ? vec3(0.0)
            : 0.25 + 0.75 * hash4(uvec3(uint(firstId * 7.0 + 3.0), 11u, 3u)).rgb;
        outColor = vec4(c, 1.0);
        return;
    }
    // What is behind: the backdrop when it is drawn, otherwise the page,
    // dimmed by what the films take from it.
    if (missA > 0.0) {
        outColor = vec4(col + remain * miss, 1.0);
    } else {
        float a = 1.0 - (remain.r + remain.g + remain.b) / 3.0;
        outColor = vec4(col, a);
    }
}
`;

type Phase = "capture" | "reading" | "ready";

function finite(v: number, fallback: number): number {
    return Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    return Math.min(Math.max(finite(v, fallback), lo), hi);
}

function colorOf(hex: string, fallback: string): [number, number, number] {
    return hexToRgb(typeof hex === "string" ? hex : fallback);
}

/**
 * Fills the element's silhouette, extruded into 3D, with a foam of
 * transparent soap bubbles in thin-film colours.
 *
 * ```ts
 * vfx.add(img, { effect: new BubbleEffect({ roundness: 0.7 }) });
 * ```
 *
 * The volume is filled with spheres on a jittered lattice. Where they
 * overlap, they are cut by a flat wall they share (a power diagram);
 * where they are exposed, they keep their round outside. `roundness`
 * goes from a flat-walled foam to nearly separate spheres. The films are
 * found exactly along each ray.
 *
 * The silhouette is read once when the effect starts. Films do not bend
 * light, so the page shows through the foam, dimmed by what the films
 * reflect; the output is premultiplied over it. With `backdropVisible`,
 * a backdrop is drawn behind the foam instead.
 *
 * All params are read every frame, so you can mutate `params` live.
 */
export class BubbleEffect implements Effect {
    params: BubbleParams;
    readonly #still: boolean;

    #phase: Phase = "capture";
    #srcFrames = 0;
    #pending: ShapeData | null = null;
    #shape: ShapeData | null = null;
    #mask: EffectRenderTarget | null = null;
    readonly #passes = new ScenePasses();

    #gl: WebGL2RenderingContext | null = null;
    #raw: WebGLTexture[] = [];
    #sdfTex: EffectTexture | null = null;
    #lutTex: EffectTexture | null = null;
    readonly #backdrop = new SceneBackdrop(GLASS_PALETTES);

    #time = 0;
    readonly #drag = new OrbitDrag();
    #unsubRestored: (() => void) | null = null;

    constructor(
        initial: Partial<BubbleParams> = {},
        opts: BubbleEffectOptions = {},
    ) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
        this.#still = opts.still ?? false;
    }

    setParams(updates: Partial<BubbleParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        this.#gl = ctx.gl;
        this.#unsubRestored = ctx.onContextRestored(() => {
            // The raw textures are gone; upload them again.
            this.#gl = ctx.gl;
            this.#raw = [];
            this.#sdfTex = null;
            this.#lutTex = null;
            this.#backdrop.contextRestored();
            this.#pending = this.#shape;
        });
        if (!this.#still) {
            this.#drag.listen(() => this.params.drag);
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
        this.#backdrop.update(ctx, this.params);
        if (!this.#still) {
            this.#time += Math.min(ctx.deltaTime, 0.1);
        }
        const scene = this.#draw(ctx);
        this.#passes.output(ctx, scene, {
            pad: this.params.pad,
            fxaa: this.params.fxaa,
            raw: this.#debugView() !== 0,
        });
    }

    #debugView(): number {
        return DEBUG_VIEWS[this.params.debug] ?? 0;
    }

    // The params, clamped to what the shader can take, and what follows
    // from them.
    #resolved() {
        const p = this.params;
        const d = DEFAULT_PARAMS;
        const halfDepth = Math.max(finite(p.depth, d.depth) / 2, 0.005);
        const cellSize = Math.max(finite(p.cellSize, d.cellSize), 0.02);
        const skin = clamp(p.skin, -cellSize / 2, cellSize / 2, d.skin);
        const roundness = clamp(p.roundness, 0, 1, d.roundness);
        const wobbleAmp = clamp(p.wobble, 0, WOBBLE_MAX, d.wobble) * cellSize;
        const protrude = Math.max(SPHERE_PROTRUDE * cellSize - skin, 0);
        const bulgeZ = SPHERE_BULGE_Z * cellSize;
        // The lattice: whole layers through the depth, each about a cell
        // size thick.
        const layers = Math.max(1, Math.round((2 * halfDepth) / cellSize));
        return {
            halfDepth,
            cellSize,
            wobbleAmp,
            layers,
            zCell: (2 * halfDepth) / layers,
            // Heavy overlap at roundness 0, nearly kissing at 1.
            radius:
                cellSize *
                (SPHERE_R_FLAT + (SPHERE_R_ROUND - SPHERE_R_FLAT) * roundness),
            protrude,
            bulgeZ,
            // How far any sphere reaches out of the shape: out of the
            // outline by `protrude`, out of the front and back by `bulgeZ`
            // more, plus the drift.
            reach: protrude + bulgeZ + wobbleAmp + 0.01 * cellSize,
        };
    }

    #draw(ctx: EffectContext): EffectRenderTarget | null {
        const shape = this.#shape;
        const sdfTex = this.#sdfTex;
        const lutTex = this.#lutTex;
        if (this.#phase !== "ready" || !shape || !sdfTex || !lutTex) {
            return null;
        }
        const p = this.params;
        const d = DEFAULT_PARAMS;
        const scene = this.#passes.scene(ctx, p.pad, p.resolution);
        if (!scene) {
            return null;
        }
        const t = this.#time;
        const cam = cameraUniforms(p, t, this.#drag, ctx.dims);
        const r = this.#resolved();

        ctx.draw({
            frag: FRAG_BUBBLE,
            uniforms: {
                sdfTex,
                sdfRect: shape.sdfRect,
                halfDepth: r.halfDepth,
                // The shape is only used to skip empty space: sharp edges.
                rounding: 0,
                shapeHalf: shape.shapeHalf,
                boxMargin: r.reach,
                ...cam,
                pixelSize: cam.bufferPx[0] / scene.width,
                maxLayers: clampInt(p.maxLayers, 1, MAX_LAYERS, d.maxLayers),
                time: t,
                wobbleAmp: r.wobbleAmp,
                wobbleSpeed: Math.max(finite(p.speed, d.speed), 0),
                seed: clampInt(p.seed, 0, 0x7fffffff, d.seed),
                cellSize: r.cellSize,
                latCell: [r.cellSize, r.cellSize, r.zCell],
                latOrigin: [0, 0, -r.halfDepth],
                latLayers: r.layers,
                jitter: clamp(p.jitter, 0, JITTER_MAX, d.jitter),
                pullDepth: PULL_DEPTH * r.cellSize,
                pullMax: PULL_MAX * r.cellSize,
                sphereR: r.radius,
                radiusVar: clamp(
                    p.cellSizeRandomness,
                    0,
                    1,
                    d.cellSizeRandomness,
                ),
                protrude: r.protrude,
                bulgeZ: r.bulgeZ,
                reachMax: r.reach,
                filmLut: lutTex,
                iridescence: clamp(p.iridescence, 0, 1, d.iridescence),
                thickness: Math.max(finite(p.thickness, d.thickness), 0),
                thicknessVariation: clamp(
                    p.thicknessVariation,
                    0,
                    1,
                    d.thicknessVariation,
                ),
                drain: clamp(p.drain, 0, 1, d.drain),
                swirlScale: Math.max(finite(p.swirlScale, d.swirlScale), 0),
                swirlOffset: t * finite(p.swirlSpeed, d.swirlSpeed),
                reflection: Math.max(finite(p.reflection, d.reflection), 0),
                tint: colorOf(p.tint, d.tint),
                tintStrength: clamp(p.tintStrength, 0, 1, d.tintStrength),
                opacity: clamp(p.opacity, 0, 1, d.opacity),
                bodyColor: colorOf(p.color, d.color),
                ...this.#backdrop.uniforms(p, t, r.halfDepth + r.reach, sdfTex),
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
                ? BUBBLE_MASK_LONG
                : Math.round(BUBBLE_MASK_LONG * aspect);
        const mh =
            aspect >= 1
                ? Math.round(BUBBLE_MASK_LONG / aspect)
                : BUBBLE_MASK_LONG;
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
        for (const tex of this.#raw) {
            gl.deleteTexture(tex);
        }
        this.#raw = [];
        this.#sdfTex = null;
        this.#lutTex = null;
        const sdf = uploadFloatTexture(gl, shape.sdfW, shape.sdfH, shape.sdf);
        const lut = uploadFloatTexture(
            gl,
            THIN_FILM_LUT_W,
            THIN_FILM_LUT_H,
            thinFilmLut(),
        );
        ctx.resetState();
        if (sdf) {
            this.#raw.push(sdf);
            this.#sdfTex = ctx.wrapTexture(sdf, {
                size: [shape.sdfW, shape.sdfH],
                filter: "linear",
                wrap: "clamp",
            });
        }
        if (lut) {
            this.#raw.push(lut);
            this.#lutTex = ctx.wrapTexture(lut, {
                size: [THIN_FILM_LUT_W, THIN_FILM_LUT_H],
                filter: "linear",
                wrap: "clamp",
            });
        }
    }

    dispose(): void {
        this.#drag.dispose();
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        if (this.#gl) {
            for (const tex of this.#raw) {
                this.#gl.deleteTexture(tex);
            }
        }
        this.#raw = [];
        this.#sdfTex = null;
        this.#lutTex = null;
        this.#backdrop.dispose(this.#gl);
        this.#gl = null;
        this.#mask?.dispose();
        this.#mask = null;
        this.#passes.dispose();
        this.#shape = null;
        this.#pending = null;
        this.#phase = "capture";
        this.#srcFrames = 0;
    }
}
