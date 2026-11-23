// Soap bubbles filling an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// 1. The silhouette is read back from the element (`ctx.src` alpha) and
//    turned into a 2D signed distance field; the 3D volume is its
//    extrusion (see `_silhouette.ts`).
// 2. The volume is filled with spheres, either in the shader from a
//    jittered lattice ("grid"), or on the CPU by greedy packing, with a
//    uniform grid over them that the shader walks ("packed").
// 3. A soap film is thin, so it does not bend light: each camera ray is
//    straight, and meets the sphere surfaces analytically. The films it
//    crosses are composited front to back; overlapping bubbles are cut
//    by their shared wall ("clip").
// 4. Each film's colour is thin-film interference: a LUT of reflectance
//    by thickness and angle, baked once from the CIE colour matching
//    functions (`_thin-film.ts`). It reflects the same backdrop and box
//    lights as GlassEffect.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import {
    type BubblePack,
    PACK_MAX_COUNT,
    PACK_SLOTS,
    PACK_TEX_W,
    packBubbles,
} from "./_bubble-pack.js";
import { captureContent } from "./_capture.js";
import { padOutputRect } from "./_pad.js";
import {
    cameraUniforms,
    clampInt,
    GLSL_HEAT,
    GLSL_SCENE,
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
 * How {@link BubbleParams.packing} places the bubbles. `"grid"`: one per
 * cell of a jittered lattice, made in the shader, so nothing is computed
 * up front and the volume can be any size. `"packed"`: placed on the CPU
 * when the effect starts, largest first, each as big as the room left
 * allows, so they fill the shape snugly, small ones in the gaps.
 */
export type BubblePacking = "grid" | "packed";

/**
 * What happens where two bubbles meet ({@link BubbleParams.contact}).
 * `"clip"`: they share a flat wall, like a double bubble in foam.
 * `"separate"`: the spheres pass through each other.
 */
export type BubbleContact = "clip" | "separate";

/**
 * A {@link BubbleParams.debug} view: the texture lookups spent per pixel
 * on finding the bubbles (`"cost"`), or the films shaded (`"layers"`).
 */
export type BubbleDebugView = "off" | "cost" | "layers";

export type BubbleParams = {
    /** Extrusion depth, relative to the long side of the element (= 2). */
    depth: number;

    /** How the bubbles are placed. */
    packing: BubblePacking;
    /**
     * Diameter of the largest bubbles, in the same units as `depth`.
     * With `"grid"` it is also the lattice's cell size.
     */
    bubbleSize: number;
    /**
     * Spread of the sizes, 0 to 1: radii range from
     * `bubbleSize / 2 * (1 - sizeVariation)` to `bubbleSize / 2`. Near the
     * edge of the shape bubbles also shrink to fit.
     */
    sizeVariation: number;
    /**
     * How far neighbours may reach into each other, 0.5 to 1.6. 1 just
     * touches with `"packed"`; with `"grid"` it scales the bubbles in
     * their cells, and jittered neighbours may meet below 1 too.
     */
    overlap: number;
    /** What happens where bubbles meet. */
    contact: BubbleContact;
    /**
     * Most bubbles placed by `"packed"`, up to 1024. Packing stops
     * earlier when no room is left.
     */
    count: number;
    /** Seed of the random placement and sizes. */
    seed: number;
    /**
     * `"grid"` only: how far each bubble wanders from its cell's centre,
     * 0 (a regular lattice) to 1.
     */
    jitter: number;
    /**
     * Amplitude of the bubbles' slow drift, relative to `bubbleSize`, 0
     * to 0.2.
     */
    wobble: number;
    /** Speed of the drift, in cycles per second. */
    speed: number;
    /**
     * Films composited per pixel, front to back, 1 to 16. Each bubble
     * has two (front and back); more is costlier and shows deeper.
     */
    maxLayers: number;

    /** Mean thickness of the films, in nm. The colours cycle with it. */
    thickness: number;
    /**
     * Swirls in the thickness, 0 to 1, as a share of `thickness`: the
     * marbled bands of a real bubble.
     */
    thicknessVariation: number;
    /**
     * Drainage, 0 to 1: films are thinner at the top of each bubble and
     * thicker at the bottom, by this share of `thickness`.
     */
    drain: number;
    /** Size of the swirls: noise frequency per bubble radius. */
    swirlScale: number;
    /** Speed at which the swirls flow down and change, per second. */
    swirlSpeed: number;
    /**
     * Multiplies the films' reflectance, which is a few percent for
     * real soap. More makes the colours stronger, and the films less
     * transparent.
     */
    filmGain: number;
    /** Strength of the reflected light, without changing transparency. */
    reflection: number;

    /**
     * The backdrop: a pattern name, or an image (an element, an
     * `ImageBitmap` or a URL). Films reflect it and, with
     * `backdropVisible`, it is drawn behind the bubbles; otherwise the
     * page shows through them.
     */
    backdrop: GlassPatternName | GlassImageSource;
    /** Draw the backdrop behind and around the bubbles. */
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
     * Show a heat map instead of the bubbles: black 0, blue 64, green
     * 128, yellow 192, red 256, white 320 or more texture lookups
     * (`"cost"`); or the films shaded, 1.6 per step (`"layers"`: blue 1.6,
     * white 8).
     */
    debug: BubbleDebugView;
};

export type BubbleEffectOptions = {
    /** Freeze time, for deterministic screenshots. */
    still?: boolean;
};

const DEFAULT_PARAMS: BubbleParams = {
    depth: 0.4,
    packing: "grid",
    bubbleSize: 0.12,
    sizeVariation: 0.5,
    overlap: 1.2,
    contact: "clip",
    count: 400,
    seed: 1,
    jitter: 0.8,
    wobble: 0.04,
    speed: 0.15,
    maxLayers: 8,
    thickness: 420,
    thicknessVariation: 0.35,
    drain: 0.5,
    swirlScale: 1.4,
    swirlSpeed: 0.12,
    filmGain: 1.5,
    reflection: 3,
    backdrop: "none",
    backdropVisible: false,
    backdropScale: 0.25,
    backdropDistance: 0.6,
    backdropSpeed: 0.15,
    backdropColors: "mono",
    backdropRatio: 0.5,
    backdropSoftness: 0.03,
    lightIntensity: 1.5,
    lightSoftness: 0.15,
    yaw: 0.45,
    pitch: 0.2,
    orbit: 0.3,
    fov: 30,
    zoom: 0.7,
    drag: false,
    resolution: 1,
    fxaa: true,
    pad: "fullscreen",
    debug: "off",
};

const PACKINGS: Record<BubblePacking, number> = { grid: 0, packed: 1 };
const DEBUG_VIEWS: Record<BubbleDebugView, number> = {
    off: 0,
    cost: 1,
    layers: 2,
};
// Spheres kept per ray (the nearest), and films composited at most.
const MAX_SPHERES = 12;
const MAX_LAYERS = 16;
// A bubble's radius is at most its centre's depth inside the shape plus
// this share of the largest radius, so the ones at the edge bulge out a
// little and thin parts of the shape still get bubbles.
const EDGE_BULGE = 0.4;
// "grid": seeds near or outside the shape's surface are pulled in to
// this depth, relative to the cell size.
const PULL_DEPTH = 0.2;
// Bounds of the params that keep a grid bubble within one cell of its
// own, so each ray only tests the cells next to the ones it crosses.
const OVERLAP_MIN = 0.5;
const OVERLAP_MAX = 1.6;
const WOBBLE_MAX = 0.2;
// Long side of the silhouette read back from the element, in px. The
// field only places bubbles, so it can be coarse and lightly smoothed.
const BUBBLE_MASK_LONG = 512;
const SMOOTH_RADIUS = 2;
const SMOOTH_PASSES = 2;

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

uniform int packing;
uniform int contactClip;
uniform int maxLayers;
uniform float time;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform uint seed;

// "grid": the lattice's cell size and origin, and the cells that can
// hold a bubble.
uniform float cellSize;
uniform vec3 cellOrigin;
uniform ivec3 cellLo;
uniform ivec3 cellHi;
uniform float jitter;
uniform float radiusScale;
uniform float sizeVariation;
// How far a bubble may bulge out of the shape.
uniform float edgeBulge;
// How far a seed may be pulled into the shape.
uniform float pullMax;
// How far a seed may be from its cell's centre, pulled in or not.
uniform float seedReach;

// "packed": the spheres (x, y, z, r) and the grid over them, PACK_SLOTS
// sphere indices per cell (-1 empty), both in rows of PACK_TEX_W.
uniform sampler2D sphereTex;
uniform sampler2D gridTex;
uniform vec3 gridOrigin;
uniform float gridCell;
uniform ivec3 gridDims;

uniform sampler2D filmLut;
uniform float thickness;
uniform float thicknessVariation;
uniform float drain;
uniform float swirlScale;
uniform float swirlOffset;
uniform float filmGain;
uniform float reflection;
uniform int debugView;

const int MAX_SPHERES = ${MAX_SPHERES};
const int MAX_LAYERS = ${MAX_LAYERS};
const int MAX_EVENTS = 24;
const int GRID_STEPS = 48;
const int PACK_STEPS = 96;
const int PACK_SLOTS = ${PACK_SLOTS};
const int PACK_TEX_W = ${PACK_TEX_W};
const float THICKNESS_MAX = ${THIN_FILM_THICKNESS_MAX.toFixed(1)};
const float TAU = 6.2831853;
const float PULL_DEPTH = ${PULL_DEPTH.toFixed(2)};

${GLSL_SIMPLEX3}
${GLSL_SIMPLEX3_GRAD}
${GLSL_SCENE}
${GLSL_HEAT}

// The spheres the ray meets, nearest first by entry: centre and radius,
// entry / exit / pixel coverage, and an id for their film's pattern.
vec4 sphC[MAX_SPHERES];
vec3 sphT[MAX_SPHERES];
float sphId[MAX_SPHERES];
int nSph = 0;
int sphCap = MAX_SPHERES;
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

// Ray against sphere (c, r), widened by the pixel's cone so a ray that
// grazes it covers part of the pixel. x = entry, y = exit, z = coverage
// (0 for a miss). A grazing ray meets it at its closest approach.
vec3 hitSphere(vec3 ro, vec3 rd, vec3 c, float r, float cone) {
    vec3 oc = ro - c;
    float tc = -dot(oc, rd);
    if (tc <= 0.0) {
        return vec3(0.0);
    }
    float h2 = max(dot(oc, oc) - tc * tc, 0.0);
    float w = tc * cone;
    float dc = sqrt(h2);
    if (dc >= r + w) {
        return vec3(0.0);
    }
    float cov = clamp((r - dc) / (2.0 * w) + 0.5, 0.0, 1.0);
    float k = sqrt(max(r * r - h2, 0.0));
    return vec3(tc - k, tc + k, cov);
}

void addSphere(vec4 c, float id, vec3 h) {
    if (nSph >= sphCap && h.x >= sphT[sphCap - 1].x) {
        return;
    }
    int i = min(nSph, sphCap - 1);
    for (int k = MAX_SPHERES - 1; k > 0; k--) {
        if (k == i && sphT[k - 1].x > h.x) {
            sphC[k] = sphC[k - 1];
            sphT[k] = sphT[k - 1];
            sphId[k] = sphId[k - 1];
            i = k - 1;
        }
    }
    sphC[i] = c;
    sphT[i] = h;
    sphId[i] = id;
    nSph = min(nSph + 1, sphCap);
}

// True once the list is full and nothing from entry t on can be nearer:
// a sphere the ray meets at t0 reaches into the cell the ray is in at
// t0, so it is found there or earlier.
bool done(float t) {
    return nSph >= sphCap && t >= sphT[sphCap - 1].x;
}

// "grid": the bubble of lattice cell c, if any.
void latticeCell(ivec3 c, vec3 ro, vec3 rd, float cone) {
    if (any(lessThan(c, cellLo)) || any(greaterThan(c, cellHi))) {
        return;
    }
    vec4 h = hash4(uvec3(c + 4096));
    vec3 p = cellOrigin + (vec3(c) + 0.5 + jitter * (h.xyz - 0.5)) * cellSize;
    p += drift(h);
    vec4 s = sdf3(p);
    cost += 1.0;
    // A seed outside the shape, or just inside, is pulled in along the
    // field's gradient towards a fixed depth, as far as the cell allows: thin
    // parts of the shape get bubbles, and its outline a skin of them.
    float depth = PULL_DEPTH * cellSize;
    if (s.x > -depth) {
        float move = min(s.x + depth, pullMax);
        if (s.x - move >= 0.0) {
            return;
        }
        if (move > 0.0) {
            p -= s.yzw * move;
            s = sdf3(p);
            cost += 1.0;
            if (s.x >= 0.0) {
                return;
            }
        }
    }
    float r = cellSize * radiusScale * (1.0 - sizeVariation * h.w);
    // It may bulge out of the shape, but less near the surface, so a
    // seed that drifts in grows from nothing instead of popping in.
    r = min(r, -s.x + edgeBulge * min(-s.x / depth, 1.0));
    if (r < cellSize * 0.04) {
        return;
    }
    vec3 hit = hitSphere(ro, rd, p, r, cone);
    if (hit.z <= 0.0) {
        return;
    }
    // After a skip the lattice walk restarts, and may meet it again.
    float id = h.w * 61.0 + h.x * 17.0;
    for (int k = 0; k < MAX_SPHERES; k++) {
        if (k >= nSph) {
            break;
        }
        if (sphId[k] == id) {
            return;
        }
    }
    addSphere(vec4(p, r), id, hit);
}

// True when no cell within \`cells\` cell sizes (centre to centre) of
// cell c can hold a bubble: the shape is farther than any of their
// seeds can be moved.
bool farFrom(ivec3 c, float cells) {
    if (any(lessThan(c + 1, cellLo)) || any(greaterThan(c - 1, cellHi))) {
        return true;
    }
    cost += 1.0;
    vec3 p = cellOrigin + (vec3(c) + 0.5) * cellSize;
    return sdf3(p).x > cells * cellSize + seedReach;
}

// Every point a bubble covers is within this of the shape (a bubble
// bulges out by edgeBulge at most), widened by the pixel's cone at t.
float bubbleReach(float t, float cone) {
    return edgeBulge + 2.0 * t * cone + 0.002;
}

// 3D DDA through the lattice from t, while the ray is near the shape.
// A bubble stays within one cell of its own, so the cells next to the
// ones the ray crosses are tested too: all 27 round the first, then the
// 9 that each step adds. Returns where the ray left the shape's
// neighbourhood, or 1e9 when it is done.
float gridRun(vec3 ro, vec3 rd, float t, float tEnd, float cone, inout int steps) {
    vec3 q = (ro + rd * t - cellOrigin) / cellSize;
    ivec3 c = ivec3(floor(q));
    vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
    vec3 inv = 1.0 / d;
    vec3 sg = sign(d);
    vec3 tMax = t + (floor(q) + step(0.0, d) - q) * cellSize * inv;
    vec3 tDelta = cellSize * abs(inv);
    // One lookup skips a block of cells too far from the shape for any
    // of their seeds to be pulled into it.
    if (!farFrom(c, 1.732)) {
        for (int z = -1; z <= 1; z++) {
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    latticeCell(c + ivec3(x, y, z), ro, rd, cone);
                }
            }
        }
    }
    for (int i = 0; i < GRID_STEPS; i++) {
        float te = min(tMax.x, min(tMax.y, tMax.z));
        if (te > tEnd || done(te) || ++steps > GRID_STEPS) {
            return 1e9;
        }
        // One axis per step, also on ties, so each step adds one slab.
        vec3 m = tMax.x <= tMax.y && tMax.x <= tMax.z
            ? vec3(1.0, 0.0, 0.0)
            : tMax.y <= tMax.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
        ivec3 st = ivec3(m * sg);
        c += st;
        tMax += m * tDelta;
        ivec3 u = ivec3(m.yzx);
        ivec3 v = ivec3(m.zxy);
        ivec3 base = c + st;
        if (farFrom(base, 1.415)) {
            // An empty slab: once the ray is out of reach of every
            // bubble, skip ahead by the distance field instead.
            float D = sdf3(ro + rd * te).x;
            cost += 1.0;
            if (D > bubbleReach(te, cone) + cellSize) {
                return te;
            }
            continue;
        }
        for (int a = -1; a <= 1; a++) {
            for (int b = -1; b <= 1; b++) {
                latticeCell(base + a * u + b * v, ro, rd, cone);
            }
        }
    }
    return 1e9;
}

// Empty space is skipped by sphere tracing the shape's field: no bubble
// reaches more than bubbleReach out of it. Near it, the lattice is
// walked cell by cell.
void traceGrid(vec3 ro, vec3 rd, vec2 tb, float cone) {
    float t = max(tb.x, 0.0);
    int steps = 0;
    for (int run = 0; run < 8; run++) {
        for (int k = 0; k < 24; k++) {
            float D = sdf3(ro + rd * t).x;
            cost += 1.0;
            float m = bubbleReach(t, cone);
            if (D <= m + cellSize) {
                break;
            }
            t += D - m;
            if (t > tb.y) {
                return;
            }
        }
        if (done(t)) {
            return;
        }
        t = gridRun(ro, rd, t, tb.y, cone, steps);
        if (t > tb.y) {
            return;
        }
    }
}

// "packed": sphere i, unless the ray has met it already.
void packedSphere(int i, vec3 ro, vec3 rd, float cone) {
    float id = float(i);
    for (int k = 0; k < MAX_SPHERES; k++) {
        if (k >= nSph) {
            break;
        }
        if (sphId[k] == id) {
            return;
        }
    }
    vec4 s = texelFetch(sphereTex, ivec2(i % PACK_TEX_W, i / PACK_TEX_W), 0);
    cost += 1.0;
    vec3 p = s.xyz + drift(hash4(uvec3(i, 77u, 5u)));
    vec3 hit = hitSphere(ro, rd, p, s.w, cone);
    if (hit.z > 0.0) {
        addSphere(vec4(p, s.w), id, hit);
    }
}

void packedCell(ivec3 c, vec3 ro, vec3 rd, float cone) {
    int id = c.x + gridDims.x * (c.y + gridDims.y * c.z);
    for (int k = 0; k < PACK_SLOTS / 4; k++) {
        int tx = id * (PACK_SLOTS / 4) + k;
        vec4 e = texelFetch(gridTex, ivec2(tx % PACK_TEX_W, tx / PACK_TEX_W), 0);
        cost += 1.0;
        for (int j = 0; j < 4; j++) {
            if (e[j] < 0.0) {
                return;
            }
            packedSphere(int(e[j]), ro, rd, cone);
        }
    }
}

// 3D DDA through the packed spheres' grid.
void tracePacked(vec3 ro, vec3 rd, vec2 tb, float cone) {
    vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
    vec3 inv = 1.0 / d;
    vec3 hiB = gridOrigin + vec3(gridDims) * gridCell;
    vec3 a = (gridOrigin - ro) * inv;
    vec3 b = (hiB - ro) * inv;
    vec3 lo = min(a, b);
    vec3 hi = max(a, b);
    float t0 = max(max(max(lo.x, lo.y), lo.z), max(tb.x, 0.0));
    float t1 = min(min(min(hi.x, hi.y), hi.z), tb.y);
    if (t0 > t1) {
        return;
    }
    vec3 q = (ro + rd * t0 - gridOrigin) / gridCell;
    ivec3 c = clamp(ivec3(floor(q)), ivec3(0), gridDims - 1);
    vec3 sg = sign(d);
    vec3 tMax = t0 + (vec3(c) + step(0.0, d) - q) * gridCell * inv;
    vec3 tDelta = gridCell * abs(inv);
    for (int i = 0; i < PACK_STEPS; i++) {
        packedCell(c, ro, rd, cone);
        float te = min(tMax.x, min(tMax.y, tMax.z));
        if (te > t1 || done(te)) {
            break;
        }
        vec3 m = tMax.x <= tMax.y && tMax.x <= tMax.z
            ? vec3(1.0, 0.0, 0.0)
            : tMax.y <= tMax.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
        c += ivec3(m * sg);
        tMax += m * tDelta;
        if (any(lessThan(c, ivec3(0))) || any(greaterThanEqual(c, gridDims))) {
            break;
        }
    }
}

// The films along the ray, nearest first: t, and a code. Sphere k's
// front is 2k, its back 2k + 1; the wall between spheres j < k is
// 64 + 16j + k.
float evT[MAX_EVENTS];
int evCode[MAX_EVENTS];
int nEv = 0;

void addEvent(float t, int code) {
    if (nEv >= MAX_EVENTS && t >= evT[MAX_EVENTS - 1]) {
        return;
    }
    int i = min(nEv, MAX_EVENTS - 1);
    for (int k = MAX_EVENTS - 1; k > 0; k--) {
        if (k == i && evT[k - 1] > t) {
            evT[k] = evT[k - 1];
            evCode[k] = evCode[k - 1];
            i = k - 1;
        }
    }
    evT[i] = t;
    evCode[i] = code;
    nEv = min(nEv + 1, MAX_EVENTS);
}

// Is the ray's point at t inside a sphere other than a and b?
bool insideOther(float t, int a, int b) {
    for (int m = 0; m < MAX_SPHERES; m++) {
        if (m >= nSph) {
            break;
        }
        if (m != a && m != b && t > sphT[m].x && t < sphT[m].y) {
            return true;
        }
    }
    return false;
}

void collectFilms(vec3 ro, vec3 rd) {
    bool clip = contactClip != 0;
    for (int k = 0; k < MAX_SPHERES; k++) {
        if (k >= nSph) {
            break;
        }
        // A sphere's surface inside another bubble is gone: the two
        // share the wall on their radical plane instead.
        if (!clip || !insideOther(sphT[k].x, k, k)) {
            addEvent(sphT[k].x, 2 * k);
        }
        if (!clip || !insideOther(sphT[k].y, k, k)) {
            addEvent(sphT[k].y, 2 * k + 1);
        }
        if (!clip) {
            continue;
        }
        for (int j = 0; j < MAX_SPHERES; j++) {
            if (j >= k) {
                break;
            }
            float lo = max(sphT[j].x, sphT[k].x);
            float hi = min(sphT[j].y, sphT[k].y);
            if (lo >= hi) {
                continue;
            }
            // |p - cj|^2 - rj^2 = |p - ck|^2 - rk^2, along the ray.
            vec3 cj = sphC[j].xyz;
            vec3 ck = sphC[k].xyz;
            vec3 n = ck - cj;
            float f1 = 2.0 * dot(rd, n);
            if (abs(f1) < 1e-6) {
                continue;
            }
            float f0 = 2.0 * dot(ro, n) + dot(cj, cj) - dot(ck, ck)
                - sphC[j].w * sphC[j].w + sphC[k].w * sphC[k].w;
            float tp = -f0 / f1;
            if (tp > lo && tp < hi && !insideOther(tp, j, k)) {
                addEvent(tp, 64 + 16 * j + k);
            }
        }
    }
}

// Film thickness in nm at point l of a bubble (in units of its radius,
// from its centre): thinner at the top, with slow swirls flowing down.
float filmThickness(vec3 l, float id) {
    float g = max(1.0 - drain * l.y, 0.05);
    vec3 q = l * swirlScale + vec3(id * 1.37, id * 0.71 - swirlOffset, id * 2.13);
    float n = 0.7 * snoise(q + vec3(0.0, 0.0, swirlOffset * 0.5))
        + 0.3 * snoise(q * 2.3 + 11.7);
    return thickness * g * max(1.0 + thicknessVariation * n, 0.05);
}

// A soft studio sky over the shape, brighter above, so films show
// colour where no light box is reflected: interference needs a white
// light to show in.
vec3 sky(vec3 d) {
    return vec3(lightIntensity * 0.3 * (0.3 + 0.7 * smoothstep(-0.7, 0.9, d.y)));
}

// Slab test against the shape's bounding box. x = near, y = far.
vec2 boundsHit(vec3 ro, vec3 rd) {
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
    vec3 ro = roV * viewRot;
    vec3 rd = rdV * viewRot;

    vec3 miss = vec3(0.0);
    float missA = 0.0;
    if (backdropVisible > 0.5 && backdropMode != 0) {
        miss = radiance(roV, rdV, 0.0);
        missA = 1.0;
    }

    vec2 tb = boundsHit(ro, rd);
    if (tb.x > tb.y || tb.y < 0.0) {
        outColor = debugView != 0 ? heat(0.0) : vec4(miss, missA);
        return;
    }
    // Radius of the pixel's cone per unit of distance.
    float cone = pixelSize / focalPx;
    int layers = clamp(maxLayers, 1, MAX_LAYERS);
    // Each bubble gives two films, so this many of the nearest are
    // enough; the walk stops early once it has them.
    sphCap = clamp(layers / 2 + 1, 1, MAX_SPHERES);
    if (packing == 1) {
        tracePacked(ro, rd, tb, cone);
    } else {
        traceGrid(ro, rd, tb, cone);
    }
    collectFilms(ro, rd);

    // Front to back: each film reflects its share of the light around
    // it, and passes the rest on.
    vec3 col = vec3(0.0);
    vec3 remain = vec3(1.0);
    int shaded = 0;
    for (int i = 0; i < MAX_EVENTS; i++) {
        if (i >= nEv || i >= layers) {
            break;
        }
        float t = evT[i];
        int code = evCode[i];
        vec3 p = ro + rd * t;
        vec3 n;
        vec3 l;
        float id;
        float cov;
        if (code < 64) {
            int k = code / 2;
            vec4 s = sphC[k];
            n = normalize(p - s.xyz);
            l = (p - s.xyz) / s.w;
            id = sphId[k];
            cov = sphT[k].z;
        } else {
            int j = (code - 64) / 16;
            int k = code - 64 - 16 * j;
            n = normalize(sphC[k].xyz - sphC[j].xyz);
            l = (p - sphC[j].xyz) / sphC[j].w;
            id = sphId[j] + sphId[k];
            cov = min(sphT[j].z, sphT[k].z);
        }
        // Either face of a film reflects alike.
        n = dot(n, rd) > 0.0 ? -n : n;
        float cosI = clamp(-dot(rd, n), 0.0, 1.0);
        float d = filmThickness(l, id);
        vec3 R = textureLod(filmLut, vec2(d / THICKNESS_MAX, cosI), 0.0).rgb;
        R = min(R * filmGain, vec3(1.0)) * cov;
        vec3 rv = viewRot * reflect(rd, n);
        vec3 L = radiance(viewRot * p, rv, 0.0) + sky(rv);
        col += remain * R * L * reflection;
        remain *= 1.0 - R;
        shaded++;
        if (max(remain.r, max(remain.g, remain.b)) < 0.02) {
            break;
        }
    }

    if (debugView != 0) {
        outColor = heat(debugView == 1 ? cost : float(shaded) * 40.0);
        return;
    }
    // What is behind: the backdrop when it is drawn, otherwise the page,
    // dimmed by what the films reflect away.
    if (missA > 0.0) {
        outColor = vec4(col + remain * miss, 1.0);
    } else {
        float a = 1.0 - (remain.r + remain.g + remain.b) / 3.0;
        outColor = vec4(col, a);
    }
}
`;

type Phase = "capture" | "reading" | "ready";

// A data texture read with texelFetch: RGBA32F, nearest.
function uploadDataTexture(
    gl: WebGL2RenderingContext,
    w: number,
    h: number,
    data: Float32Array,
): WebGLTexture | null {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        w,
        h,
        0,
        gl.RGBA,
        gl.FLOAT,
        data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
}

function finite(v: number, fallback: number): number {
    return Number.isFinite(v) ? v : fallback;
}

function clamp01(v: number, fallback: number): number {
    return Math.min(Math.max(finite(v, fallback), 0), 1);
}

/**
 * Fills the element's silhouette, extruded into 3D, with transparent
 * soap bubbles in thin-film colours.
 *
 * ```ts
 * vfx.add(img, { effect: new BubbleEffect({ packing: "packed" }) });
 * ```
 *
 * The silhouette is read once when the effect starts. The bubbles are
 * placed in the shader on a jittered lattice (`packing: "grid"`), or
 * packed on the CPU, largest first (`"packed"`). Films do not bend
 * light, so the page shows through the bubbles, dimmed by what they
 * reflect; the output is premultiplied over it.
 *
 * All params are read every frame, so you can mutate `params` live; a
 * change to a `"packed"` param repacks on the CPU.
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
    // The packed spheres, the params they were packed with, and their
    // textures.
    #pack: BubblePack | null = null;
    #packKey: string | null = null;
    #packRaw: WebGLTexture[] = [];
    #sphereTex: EffectTexture | null = null;
    #gridTex: EffectTexture | null = null;
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
            this.#packRaw = [];
            this.#sphereTex = null;
            this.#gridTex = null;
            this.#packKey = null;
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
            this.#packKey = null;
            this.#phase = "ready";
        }
        this.#updatePack(ctx);
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

    #packing(): number {
        return PACKINGS[this.params.packing] ?? 0;
    }

    // The params, clamped to what the shader and the packing can take.
    #resolved() {
        const p = this.params;
        const halfDepth = Math.max(
            finite(p.depth, DEFAULT_PARAMS.depth) / 2,
            0.005,
        );
        const size = Math.max(
            finite(p.bubbleSize, DEFAULT_PARAMS.bubbleSize),
            0.01,
        );
        const jitter = clamp01(p.jitter, DEFAULT_PARAMS.jitter);
        const overlap = Math.min(
            Math.max(finite(p.overlap, DEFAULT_PARAMS.overlap), OVERLAP_MIN),
            OVERLAP_MAX,
        );
        let wobble = Math.min(
            Math.max(finite(p.wobble, DEFAULT_PARAMS.wobble), 0),
            WOBBLE_MAX,
        );
        // A grid bubble reaches out of its cell by this share of it,
        // before it drifts or is pulled into the shape: both together
        // must stay within the one cell around.
        const budget = Math.max(1 - (jitter + overlap - 1) / 2, 0);
        if (this.#packing() === 0) {
            wobble = Math.min(wobble, budget);
        }
        return {
            halfDepth,
            size,
            jitter,
            overlap,
            sizeVariation: clamp01(
                p.sizeVariation,
                DEFAULT_PARAMS.sizeVariation,
            ),
            wobbleAmp: wobble * size,
            pullMax: Math.max(budget - wobble, 0) * size,
            seed: clampInt(p.seed, 0, 0x7fffffff, DEFAULT_PARAMS.seed),
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
        const scene = this.#passes.scene(ctx, p.pad, p.resolution);
        if (!scene) {
            return null;
        }
        const t = this.#time;
        const cam = cameraUniforms(p, t, this.#drag, ctx.dims);
        const r = this.#resolved();
        const packing = this.#packing();
        const pack = packing === 1 ? this.#pack : null;
        if (packing === 1 && (!pack || !this.#sphereTex || !this.#gridTex)) {
            return null;
        }

        // The grid's lattice: one layer of cells centred on z = 0.
        const s = r.size;
        const origin = [0, 0, -s / 2];
        const lo = [-shape.shapeHalf[0], -shape.shapeHalf[1], -r.halfDepth];
        const cellLo = lo.map((v, a) => Math.floor((v - origin[a]) / s) - 1);
        const cellHi = lo.map((v, a) => Math.floor((-v - origin[a]) / s) + 1);
        const maxR =
            packing === 1 && pack ? pack.maxRadius : (s / 2) * r.overlap;
        const edgeBulge = (EDGE_BULGE * s) / 2;

        ctx.draw({
            frag: FRAG_BUBBLE,
            uniforms: {
                sdfTex,
                sdfRect: shape.sdfRect,
                halfDepth: r.halfDepth,
                rounding: 0,
                shapeHalf: shape.shapeHalf,
                boxMargin: edgeBulge + r.wobbleAmp,
                edgeBulge,
                pullMax: r.pullMax,
                // Jitter and drift move a seed, then the pull; a little
                // more for the field's smoothing.
                seedReach:
                    (r.jitter * 0.866 + 0.05) * s + r.wobbleAmp + r.pullMax,
                ...cam,
                pixelSize: cam.bufferPx[0] / scene.width,
                packing,
                contactClip: p.contact === "separate" ? 0 : 1,
                maxLayers: clampInt(
                    p.maxLayers,
                    1,
                    MAX_LAYERS,
                    DEFAULT_PARAMS.maxLayers,
                ),
                time: t,
                wobbleAmp: r.wobbleAmp,
                wobbleSpeed: Math.max(finite(p.speed, DEFAULT_PARAMS.speed), 0),
                seed: r.seed,
                cellSize: s,
                cellOrigin: origin as [number, number, number],
                cellLo: cellLo as [number, number, number],
                cellHi: cellHi as [number, number, number],
                jitter: r.jitter,
                radiusScale: r.overlap / 2,
                sizeVariation: r.sizeVariation,
                sphereTex: this.#sphereTex ?? sdfTex,
                gridTex: this.#gridTex ?? sdfTex,
                gridOrigin: pack?.gridOrigin ?? [0, 0, 0],
                gridCell: pack?.gridCell ?? 1,
                gridDims: pack?.gridDims ?? [1, 1, 1],
                filmLut: lutTex,
                thickness: Math.max(
                    finite(p.thickness, DEFAULT_PARAMS.thickness),
                    0,
                ),
                thicknessVariation: clamp01(
                    p.thicknessVariation,
                    DEFAULT_PARAMS.thicknessVariation,
                ),
                drain: clamp01(p.drain, DEFAULT_PARAMS.drain),
                swirlScale: Math.max(
                    finite(p.swirlScale, DEFAULT_PARAMS.swirlScale),
                    0,
                ),
                swirlOffset:
                    t * finite(p.swirlSpeed, DEFAULT_PARAMS.swirlSpeed),
                filmGain: Math.max(
                    finite(p.filmGain, DEFAULT_PARAMS.filmGain),
                    0,
                ),
                reflection: Math.max(
                    finite(p.reflection, DEFAULT_PARAMS.reflection),
                    0,
                ),
                ...this.#backdrop.uniforms(p, t, r.halfDepth + maxR, sdfTex),
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

    // Pack the spheres when "packed" is on and its params change.
    #updatePack(ctx: EffectContext): void {
        const shape = this.#shape;
        if (!shape || this.#packing() !== 1) {
            return;
        }
        const p = this.params;
        const r = this.#resolved();
        const count = clampInt(
            p.count,
            0,
            PACK_MAX_COUNT,
            DEFAULT_PARAMS.count,
        );
        const key = [
            r.halfDepth,
            r.size,
            r.sizeVariation,
            r.overlap,
            count,
            r.seed,
            r.wobbleAmp,
        ].join("|");
        if (key === this.#packKey) {
            return;
        }
        this.#packKey = key;
        const pack = packBubbles(shape, {
            halfDepth: r.halfDepth,
            maxRadius: r.size / 2,
            sizeVariation: r.sizeVariation,
            overlap: r.overlap,
            count,
            seed: r.seed,
            edgeBulge: (EDGE_BULGE * r.size) / 2,
            margin: r.wobbleAmp,
        });
        this.#pack = pack;
        const gl = ctx.gl;
        for (const tex of this.#packRaw) {
            gl.deleteTexture(tex);
        }
        this.#packRaw = [];
        this.#sphereTex?.dispose();
        this.#gridTex?.dispose();
        this.#sphereTex = null;
        this.#gridTex = null;
        const sph = uploadDataTexture(
            gl,
            PACK_TEX_W,
            pack.sphereTexH,
            pack.sphereData,
        );
        const grid = uploadDataTexture(
            gl,
            PACK_TEX_W,
            pack.gridTexH,
            pack.gridData,
        );
        ctx.resetState();
        const wrap = (tex: WebGLTexture | null, h: number) => {
            if (!tex) {
                return null;
            }
            this.#packRaw.push(tex);
            return ctx.wrapTexture(tex, {
                size: [PACK_TEX_W, h],
                filter: "nearest",
                wrap: "clamp",
            });
        };
        this.#sphereTex = wrap(sph, pack.sphereTexH);
        this.#gridTex = wrap(grid, pack.gridTexH);
    }

    dispose(): void {
        this.#drag.dispose();
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        if (this.#gl) {
            for (const tex of [...this.#raw, ...this.#packRaw]) {
                this.#gl.deleteTexture(tex);
            }
        }
        this.#raw = [];
        this.#packRaw = [];
        this.#sdfTex = null;
        this.#lutTex = null;
        this.#sphereTex = null;
        this.#gridTex = null;
        this.#pack = null;
        this.#packKey = null;
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
