// A foam of soap bubbles filling an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// 1. The silhouette is read back from the element (`ctx.src` alpha) and
//    turned into a 2D signed distance field S; the 3D volume is its
//    extrusion (see `_silhouette.ts`).
// 2. The volume is split into 3D Voronoi cells. Their seeds are placed on
//    the CPU, evenly, inside the shape ("packed", see `_bubble-pack.ts`),
//    or in the shader on a jittered lattice ("grid").
// 3. Each cell is a rounded bubble: the smooth maximum (log-sum-exp) of
//    the bisector planes to its neighbours, pushed back by half the gap
//    between the two films of a wall, of the shape's field, and of a
//    sphere round its seed. Neighbouring cells share flat double walls;
//    the outer ones follow the shape and bulge.
// 4. A soap film is thin, so it does not bend light: each camera ray is
//    straight. It walks from cell to cell (the exit of a Voronoi region
//    is a ray / plane hit), sphere traces the cell's field in each, and
//    composites the films it crosses front to back.
// 5. A film's colour is thin-film interference: a LUT of reflectance by
//    thickness and angle, baked once from the CIE colour matching
//    functions (`_thin-film.ts`). It reflects the same backdrop and box
//    lights as GlassEffect, softened.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import {
    buildFoam,
    FOAM_NEIGHBOURS,
    FOAM_OWNER_TEX_W,
    FOAM_SEED_TEXELS,
    type Foam,
    foamSeedRows,
} from "./_bubble-pack.js";
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
 * Where {@link BubbleParams.packing} puts the seeds of the cells.
 * `"packed"`: on the CPU when the effect starts (and when a seed param
 * changes), evenly inside the shape, so the cells are alike in size and
 * thin parts get cells along their middle. `"grid"`: one per cell of a
 * jittered lattice, made in the shader; seeds near the shape are pulled
 * into it, so thin strokes may get uneven cells.
 */
export type BubblePacking = "packed" | "grid";

/**
 * A {@link BubbleParams.debug} view: texture lookups per pixel
 * (`"cost"`), films shaded (`"layers"`), or each cell in a flat colour
 * where the ray first meets it (`"cells"`).
 */
export type BubbleDebugView = "off" | "cost" | "layers" | "cells";

export type BubbleParams = {
    /** Extrusion depth, relative to the long side of the element (= 2). */
    depth: number;

    /** Where the seeds of the cells come from. */
    packing: BubblePacking;
    /**
     * Size of the cells: the distance between neighbouring seeds, in the
     * same units as `depth`. `"packed"` makes at most 256 cells and
     * spaces them wider when the shape needs more.
     */
    cellSize: number;
    /**
     * `"packed"` only: how evenly sized the cells are, 0 (random) to 1
     * (rounds of Lloyd relaxation).
     */
    regularity: number;
    /**
     * `"grid"` only: how far each seed wanders from its lattice cell's
     * centre, 0 (a regular lattice) to 0.9.
     */
    jitter: number;
    /** Seed of the random placement. */
    seed: number;
    /**
     * Distance between the two films of a wall, world units: the double
     * line where two cells meet.
     */
    gap: number;
    /** Radius of the rounded edges and junctions, world units. */
    rounding: number;
    /**
     * How much the cells bulge, 0 to 1: each is also cut by a sphere round
     * its seed, so the outer ones are domed instead of following the flat
     * faces of the extrusion. 0 turns it off.
     */
    roundness: number;
    /**
     * Moves the foam's outside in (positive) or out (negative) from the
     * silhouette, world units.
     */
    skin: number;
    /**
     * Amplitude of the seeds' slow drift, relative to `cellSize`, 0 to
     * 0.15: the walls breathe.
     */
    wobble: number;
    /** Speed of the drift, in cycles per second. */
    speed: number;
    /**
     * Films composited per pixel, front to back, 1 to 16. Each cell the
     * ray passes has two.
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
     * Drainage, 0 to 1: films are thinner at the top of each cell and
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
     * 0 to 1: the cells' first faces turn into a matte, softly lit body
     * of `color`. 1 gives opaque pillows.
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
     * the cells in flat colours (`"cells"`).
     */
    debug: BubbleDebugView;
};

export type BubbleEffectOptions = {
    /** Freeze time, for deterministic screenshots. */
    still?: boolean;
};

const DEFAULT_PARAMS: BubbleParams = {
    depth: 0.3,
    packing: "packed",
    cellSize: 0.3,
    regularity: 0.6,
    jitter: 0.6,
    seed: 1,
    gap: 0.012,
    rounding: 0.03,
    roundness: 0.5,
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

const PACKINGS: Record<BubblePacking, number> = { packed: 0, grid: 1 };
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
// the smoothing of its field.
const BUBBLE_MASK_LONG = 512;
const SMOOTH_RADIUS = 2;
const SMOOTH_PASSES = 2;
// The smooth maximum's rho per world unit of `rounding`: log-sum-exp of
// two perpendicular planes rounds their edge like a circle of ~2.4 rho.
const ROUNDING_PER_RHO = 2.4;
// "grid": seeds near the shape are pulled in to this depth, and at most
// this far, relative to the cell size.
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

uniform int packing;
uniform int maxLayers;
uniform float time;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform uint seed;

// The cells.
uniform float cellSize;
uniform float halfGap;
uniform float rho;
uniform float roundness;
uniform float skin;

// "packed": per cell a row of the seed texture (x, y, z, radius, then
// the neighbours' indices), and the owner grid: the nearest seed of each
// voxel, four voxels per texel.
uniform sampler2D seedTex;
uniform sampler2D ownerTex;
uniform int cellCount;
uniform vec3 ownerOrigin;
uniform float ownerCell;
uniform ivec3 ownerDims;

// "grid": the lattice (cell size per axis, origin, layers in z).
uniform vec3 latCell;
uniform vec3 latOrigin;
uniform int latLayers;
uniform float jitter;
uniform float pullDepth;
uniform float pullMax;
uniform float gridRadius;

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

const int MAX_NB = 26;
const int MAX_STEPS = 96;
// Field evaluations per pixel, at most.
const int MAX_EVALS = 200;
// Sphere tracing outside a cell steps this much past the safe distance.
const float RELAX = 1.4;
const int MAX_LAYERS = ${MAX_LAYERS};
const int NEIGHBOURS = ${FOAM_NEIGHBOURS};
const int OWNER_TEX_W = ${FOAM_OWNER_TEX_W};
const float THICKNESS_MAX = ${THIN_FILM_THICKNESS_MAX.toFixed(1)};
const float TAU = 6.2831853;
// Operands this many rho below the max add nothing to the smooth max.
const float CUT = 6.0;

${GLSL_SIMPLEX3}
${GLSL_SIMPLEX3_GRAD}
${GLSL_SCENE}
${GLSL_HEAT}

vec3 ro;
vec3 rd;
float cost = 0.0;
int evals = 0;

// The current cell: its seed, the radius of its sphere (0 for none), an
// id for its film pattern and key, and its neighbours' seeds and keys.
// A key is a seed index ("packed") or a lattice cell ("grid").
vec3 regC;
float regR;
float regId;
ivec3 regKey;
bool regValid;
vec3 nbC[MAX_NB];
ivec3 nbKey[MAX_NB];
int nNb = 0;

// The walls that matter along the current segment of the ray: each as
// a + b t along the ray (already pushed back by half the gap), and its
// neighbour.
vec2 plAB[MAX_NB];
int plNb[MAX_NB];
int nPl = 0;
bool useS;
bool useR;

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

// ---- "packed" seeds ----

// A row of the seed texture: the cell's seed (drifted on the CPU) and
// radius, then its neighbours' seeds and indices.
void loadPacked(int i) {
    regKey = ivec3(i, 0, 0);
    vec4 s = texelFetch(seedTex, ivec2(0, i), 0);
    cost += 1.0;
    regC = s.xyz;
    regR = s.w * roundness;
    regId = float(i);
    regValid = true;
    nNb = 0;
    for (int k = 0; k < NEIGHBOURS; k++) {
        vec4 e = texelFetch(seedTex, ivec2(1 + k, i), 0);
        cost += 1.0;
        if (e.w < 0.0) {
            return;
        }
        nbC[nNb] = e.xyz;
        nbKey[nNb] = ivec3(int(e.w), 0, 0);
        nNb++;
    }
}

int ownerAt(vec3 p) {
    ivec3 v = clamp(
        ivec3(floor((p - ownerOrigin) / ownerCell)),
        ivec3(0),
        ownerDims - 1
    );
    int id = v.x + ownerDims.x * (v.y + ownerDims.y * v.z);
    int tx = id / 4;
    vec4 e = texelFetch(ownerTex, ivec2(tx % OWNER_TEX_W, tx / OWNER_TEX_W), 0);
    cost += 1.0;
    return int(e[id - tx * 4]);
}

// ---- "grid" seeds ----

// The seed of lattice cell L, false when it has none. A seed near or
// just outside the shape is pulled into it along the field; one still
// outside is dropped, so no sliver of a cell is left at the outline.
// Both are decided at rest, so the drift never makes a seed pop.
bool gridSeed(ivec3 L, out vec3 c, out vec4 h) {
    h = hash4(uvec3(L + 4096));
    c = latOrigin
        + (vec3(L) + 0.5 + jitter * (h.xyz - 0.5) * vec3(1.0, 1.0, 0.5)) * latCell;
    vec3 s = sd2(c.xy);
    cost += 1.0;
    if (s.x > -pullDepth) {
        float move = s.x + pullDepth;
        if (move > pullMax) {
            return false;
        }
        c.xy -= s.yz * move;
        vec3 s2 = sd2(c.xy);
        cost += 1.0;
        if (s2.x > -0.2 * pullDepth) {
            return false;
        }
    }
    c += drift(h);
    return true;
}

// The cells round lattice cell L: 5 x 5 (bar the corners) when the
// lattice is one layer deep, as dropped seeds leave room to find, else
// 3 x 3 x 3.
void loadGrid(ivec3 L) {
    regKey = L;
    regValid = false;
    regR = gridRadius;
    nNb = 0;
    int span = latLayers == 1 ? 2 : 1;
    for (int z = -1; z <= 1; z++) {
        int lz = L.z + z;
        if (lz < 0 || lz >= latLayers) {
            continue;
        }
        for (int y = -2; y <= 2; y++) {
            for (int x = -2; x <= 2; x++) {
                if (max(abs(x), abs(y)) > span || (abs(x) == 2 && abs(y) == 2)) {
                    continue;
                }
                ivec3 K = ivec3(L.x + x, L.y + y, lz);
                vec3 c;
                vec4 h;
                if (!gridSeed(K, c, h)) {
                    continue;
                }
                if (x == 0 && y == 0 && z == 0) {
                    regC = c;
                    regId = h.w * 251.0;
                    regValid = true;
                } else if (nNb < MAX_NB) {
                    nbC[nNb] = c;
                    nbKey[nNb] = K;
                    nNb++;
                }
            }
        }
    }
}

void loadCell(ivec3 key) {
    if (packing == 0) {
        loadPacked(key.x);
    } else {
        loadGrid(key);
    }
}

// Load the cell that owns p, starting from a guess: while a neighbour's
// seed is nearer, move to it. False when no seed is near.
bool locate(ivec3 key, vec3 p) {
    loadCell(key);
    for (int it = 0; it < 4; it++) {
        int best = -1;
        float bd = regValid ? dot(p - regC, p - regC) : 1e9;
        for (int k = 0; k < MAX_NB; k++) {
            if (k >= nNb) {
                break;
            }
            vec3 d = p - nbC[k];
            float d2 = dot(d, d);
            if (d2 < bd) {
                bd = d2;
                best = k;
            }
        }
        if (best < 0) {
            return regValid;
        }
        loadCell(nbKey[best]);
    }
    return regValid;
}

bool locateAt(vec3 p) {
    if (packing == 0) {
        if (cellCount <= 0) {
            return false;
        }
        return locate(ivec3(ownerAt(p), 0, 0), p);
    }
    ivec3 L = ivec3(floor((p - latOrigin) / latCell));
    L.z = clamp(L.z, 0, latLayers - 1);
    return locate(L, p);
}

// ---- the cell's field ----

// Set up the segment of the ray in the current cell's Voronoi region,
// from t: returns where it leaves it (tEnd at most), and which neighbour
// it enters there (-1 for none). Keeps only the walls and operands that
// can matter on the way.
float setupSegment(float t, float tEnd, float s0, out int exitK) {
    float tOut = tEnd;
    exitK = -1;
    for (int k = 0; k < MAX_NB; k++) {
        if (k >= nNb) {
            break;
        }
        vec3 n = nbC[k] - regC;
        float len = length(n);
        n /= max(len, 1e-6);
        vec3 mid = 0.5 * (nbC[k] + regC);
        float a = dot(ro - mid, n);
        float b = dot(rd, n);
        plAB[k] = vec2(a + halfGap, b);
        if (b > 1e-6) {
            float tk = max(-a / b, t);
            if (tk < tOut) {
                tOut = tk;
                exitK = k;
            }
        }
    }
    // Compact: the planes are linear along the ray, so their largest
    // value on the segment is at one of its ends.
    float lim = -CUT * rho;
    nPl = 0;
    for (int k = 0; k < MAX_NB; k++) {
        if (k >= nNb) {
            break;
        }
        vec2 ab = plAB[k];
        if (max(ab.x + ab.y * t, ab.x + ab.y * tOut) > lim) {
            plAB[nPl] = ab;
            plNb[nPl] = k;
            nPl++;
        }
    }
    // The shape's field and the sphere are 1-Lipschitz: from their value
    // at t, they cannot climb more than the segment's length.
    float len = tOut - t;
    useS = s0 + len > lim;
    useR = false;
    if (regR > 0.0) {
        float r0 = length(ro + rd * t - regC) - regR;
        useR = r0 + len > lim;
    }
    return tOut;
}

// The cell's field at t (negative inside): the smooth maximum of its
// walls, the shape and the sphere. x = the field, y = its derivative
// along the ray (the softmax-weighted sum of theirs); fieldS = the
// shape's weight. With \`normal\`, cellNormal is its gradient.
float fieldS;
vec3 cellNormal;

vec2 cellField(float t, bool normal) {
    evals++;
    vec3 p = ro + rd * t;
    float m = -1e9;
    for (int k = 0; k < MAX_NB; k++) {
        if (k >= nPl) {
            break;
        }
        m = max(m, plAB[k].x + plAB[k].y * t);
    }
    vec4 s = vec4(-1e9, 0.0, 0.0, 0.0);
    if (useS) {
        s = sdf3(p);
        s.x += skin;
        cost += 1.0;
        m = max(m, s.x);
    }
    vec3 dr = p - regC;
    float lr = length(dr);
    vec3 nr = dr / max(lr, 1e-6);
    float xr = useR ? lr - regR : -1e9;
    m = max(m, xr);
    float lim = m - CUT * rho;
    float sum = 0.0;
    float slope = 0.0;
    vec3 g = vec3(0.0);
    for (int k = 0; k < MAX_NB; k++) {
        if (k >= nPl) {
            break;
        }
        vec2 ab = plAB[k];
        float x = ab.x + ab.y * t;
        if (x > lim) {
            float w = exp((x - m) / rho);
            sum += w;
            slope += w * ab.y;
            if (normal) {
                g += w * normalize(nbC[plNb[k]] - regC);
            }
        }
    }
    float ws = 0.0;
    if (s.x > lim) {
        ws = exp((s.x - m) / rho);
        sum += ws;
        slope += ws * dot(s.yzw, rd);
        g += ws * s.yzw;
    }
    if (xr > lim) {
        float w = exp((xr - m) / rho);
        sum += w;
        slope += w * dot(nr, rd);
        g += w * nr;
    }
    fieldS = ws / sum;
    cellNormal = g / sum;
    return vec2(m + rho * log(sum), slope / sum);
}

// A root of the cell's field between a and b, where it has opposite
// signs: false position, Illinois style.
float refineRoot(float a, float fa, float b, float fb, float eps) {
    for (int k = 0; k < 6; k++) {
        float m = b - fb * (b - a) / (fb - fa);
        float fm = cellField(m, false).x;
        if (abs(fm) < eps || abs(b - a) < eps) {
            return m;
        }
        if (fm * fb < 0.0) {
            a = b;
            fa = fb;
        } else {
            fa *= 0.5;
        }
        b = m;
        fb = fm;
    }
    return b - fb * (b - a) / (fb - fa);
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

// The light a film reflects: the scene's lights and backdrop, squeezed
// so a light box never burns a rim white, over a soft studio sky.
vec3 environment(vec3 pV, vec3 dV) {
    vec3 L = radiance(pV, dV, 0.0);
    L = L / (1.0 + 0.6 * L);
    float sky = 0.3 + 0.7 * smoothstep(-0.7, 0.9, dV.y);
    return 0.6 * L + vec3(lightIntensity * 0.4 * sky);
}

void film(float t, bool entering) {
    cellField(t, true);
    vec3 p = ro + rd * t;
    vec3 n = normalize(cellNormal);
    vec3 nf = dot(n, rd) > 0.0 ? -n : n;
    float cosI = clamp(-dot(rd, nf), 0.0, 1.0);
    float th = filmThickness((p - regC) / cellSize, regId);
    vec3 R = mix(
        vec3(plainFilm(cosI)),
        textureLod(filmLut, vec2(th / THICKNESS_MAX, cosI), 0.0).rgb,
        iridescence
    );
    vec3 rv = viewRot * reflect(rd, nf);
    col += remain * R * environment(viewRot * p, rv) * reflection;
    // The light that passes: some of it scattered in the tint, more at a
    // grazing angle, where the path through the film is longer.
    vec3 T = 1.0 - R;
    float k = 1.0 - exp(-tintStrength * 0.03 / max(cosI * cosI, 0.01));
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
        col += remain * opacity * body;
        remain *= 1.0 - opacity;
    }
    if (films == 0) {
        firstId = regId;
    }
    films++;
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
    int layers = clamp(maxLayers, 1, MAX_LAYERS);

    float t = max(tb.x, 0.0);
    // In empty space the ray traces the shape; in a cell's Voronoi
    // region, the cell's field.
    bool inRegion = false;
    float tOut = 0.0;
    int exitK = -1;
    for (int i = 0; i < MAX_STEPS; i++) {
        if (t > tb.y || films >= layers || evals > MAX_EVALS
            || max(remain.r, max(remain.g, remain.b)) < 0.02) {
            break;
        }
        float eps = 0.5 * t * cone + 1e-4;
        if (!inRegion) {
            // Cells only lie where the shape's field (+ skin) is <= 0.
            vec3 p = ro + rd * t;
            float s = sdf3(p).x + skin;
            cost += 1.0;
            evals++;
            if (s > eps) {
                t += s;
                continue;
            }
            if (!locateAt(p)) {
                t += 0.25 * cellSize;
                continue;
            }
            tOut = setupSegment(t, tb.y, s, exitK);
            inRegion = true;
        }

        // The entry: Newton steps along the ray. Where the field is
        // convex (bar the shape's concave parts), they never pass the
        // film, and once it rises the cell is behind.
        float tIn = -1.0;
        float tp = t;
        float dp = -1.0;
        for (int k = 0; k < 24; k++) {
            vec2 f = cellField(t, false);
            if (f.x < 0.0 && dp > 0.0) {
                tIn = refineRoot(tp, dp, t, f.x, eps);
                break;
            }
            if (f.x < eps) {
                tIn = t;
                break;
            }
            float step;
            if (f.y < -1e-3) {
                step = f.x / -f.y;
            } else if (fieldS < 0.2) {
                t = tOut;
                break;
            } else {
                step = f.x;
            }
            tp = t;
            dp = f.x;
            t = min(t + max(step, eps), tOut);
            if (t >= tOut) {
                break;
            }
        }
        if (tIn >= 0.0) {
            film(tIn, true);
            // The exit: Newton steps back from the region's far end, where
            // the field is at least half the gap. From that side they never
            // pass the last film either.
            float th = tOut;
            vec2 f = cellField(th, false);
            float tEx = -1.0;
            for (int k = 0; k < 16; k++) {
                if (f.x < eps) {
                    tEx = th;
                    break;
                }
                if (f.y < 1e-3) {
                    break;
                }
                float tn = th - f.x / f.y;
                if (tn <= tIn) {
                    tEx = tIn;
                    break;
                }
                vec2 fn = cellField(tn, false);
                if (fn.x < 0.0) {
                    tEx = refineRoot(tn, fn.x, th, f.x, eps);
                    break;
                }
                th = tn;
                f = fn;
            }
            if (films < layers) {
                film(tEx < 0.0 ? th : tEx, false);
            }
            t = tOut;
        }
        if (t >= tOut) {
            // Into the next cell's region.
            t = tOut + 1e-5;
            if (exitK < 0) {
                break;
            }
            vec3 q = ro + rd * t;
            float s = sdf3(q).x + skin;
            cost += 1.0;
            evals++;
            if (s > 2.0 * rho + 4.0 * eps || !locate(nbKey[exitK], q)) {
                inRegion = false;
                continue;
            }
            tOut = setupSegment(t, tb.y, s, exitK);
        }
    }

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

// The "packed" seeds' slow drift: per seed, a sine of random phase and
// frequency on each axis, of length wobbleAmp at most.
function seedDrift(
    count: number,
    seed: number,
    time: number,
    amp: number,
    speed: number,
    out: Float32Array,
): void {
    const tau = Math.PI * 2;
    const k = amp * 0.5774;
    for (let i = 0; i < count; i++) {
        // A small integer hash per seed and axis.
        for (let a = 0; a < 3; a++) {
            let h =
                Math.imul(i * 3 + a + 1, 0x9e3779b1) ^
                Math.imul(seed + 7, 0x85ebca77);
            h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
            h ^= h >>> 13;
            const u = (h >>> 8) / 16777216;
            const v = ((h & 0xff) + 0.5) / 256;
            out[i * 3 + a] =
                k * Math.sin(time * (0.6 + 0.8 * v) * speed * tau + u * tau);
        }
    }
}

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
 * vfx.add(img, { effect: new BubbleEffect({ cellSize: 0.25 }) });
 * ```
 *
 * The silhouette is read once when the effect starts. Its volume is
 * split into 3D Voronoi cells, each a rounded bubble: neighbours share
 * flat double walls, and the outer cells bulge out along the shape. The
 * seeds are placed evenly inside the shape on the CPU (`packing:
 * "packed"`), or on a jittered lattice in the shader (`"grid"`). Films
 * do not bend light, so the page shows through the foam, dimmed by what
 * the films reflect; the output is premultiplied over it.
 *
 * All params are read every frame, so you can mutate `params` live; a
 * change to `depth`, `cellSize`, `regularity`, `seed` or `skin` places
 * the `"packed"` seeds again on the CPU.
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
    // The packed foam, the params it was built with, and its textures.
    #foam: Foam | null = null;
    #foamKey: string | null = null;
    #foamRaw: WebGLTexture[] = [];
    // The seed texture's rows and the drift they were last filled with.
    #seedRows: Float32Array | null = null;
    #seedOffsets: Float32Array | null = null;
    #driftKey: string | null = null;
    #seedRaw: WebGLTexture | null = null;
    #seedTex: EffectTexture | null = null;
    #ownerTex: EffectTexture | null = null;
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
            this.#foamRaw = [];
            this.#seedRaw = null;
            this.#seedTex = null;
            this.#ownerTex = null;
            this.#foamKey = null;
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
            this.#foamKey = null;
            this.#phase = "ready";
        }
        this.#updateFoam(ctx);
        this.#updateDrift(ctx);
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

    // The params, clamped to what the shader and the seeding can take.
    #resolved() {
        const p = this.params;
        const d = DEFAULT_PARAMS;
        const halfDepth = Math.max(finite(p.depth, d.depth) / 2, 0.005);
        const cellSize = Math.max(finite(p.cellSize, d.cellSize), 0.02);
        const rounding = clamp(p.rounding, 0, cellSize / 2, d.rounding);
        const skin = clamp(p.skin, -cellSize / 2, cellSize / 2, d.skin);
        return {
            halfDepth,
            cellSize,
            rounding,
            rho: Math.max(rounding / ROUNDING_PER_RHO, 1e-4),
            gap: clamp(p.gap, 0, cellSize / 2, d.gap),
            skin,
            regularity: clamp(p.regularity, 0, 1, d.regularity),
            jitter: clamp(p.jitter, 0, JITTER_MAX, d.jitter),
            wobbleAmp: clamp(p.wobble, 0, WOBBLE_MAX, d.wobble) * cellSize,
            seed: clampInt(p.seed, 0, 0x7fffffff, d.seed),
            // How far a cell can reach out of the shape.
            margin: Math.max(-skin, 0) + 0.02,
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
        const packing = this.#packing();
        const foam = packing === 0 ? this.#foam : null;
        if (packing === 0 && (!foam || !this.#seedTex || !this.#ownerTex)) {
            return null;
        }
        const scene = this.#passes.scene(ctx, p.pad, p.resolution);
        if (!scene) {
            return null;
        }
        const t = this.#time;
        const cam = cameraUniforms(p, t, this.#drag, ctx.dims);
        const r = this.#resolved();

        // The grid's lattice: whole layers through the depth, each about
        // a cell size thick.
        const layers = Math.max(1, Math.round((2 * r.halfDepth) / r.cellSize));
        const zCell = (2 * r.halfDepth) / layers;
        const roundness = clamp(p.roundness, 0, 1, d.roundness);
        // The sphere: 0.65 of the cell's radius at roundness 1, wider below.
        const sphere = roundness > 0 ? 0.65 + 0.65 * (1 - roundness) : 0;
        const gridRadius = Math.hypot(0.62 * r.cellSize, zCell / 2) * sphere;

        ctx.draw({
            frag: FRAG_BUBBLE,
            uniforms: {
                sdfTex,
                sdfRect: shape.sdfRect,
                halfDepth: r.halfDepth,
                // The shape's own edges, rounded like the cells'.
                rounding: Math.min(r.rounding, r.halfDepth * 0.9),
                shapeHalf: shape.shapeHalf,
                boxMargin: r.margin + r.wobbleAmp,
                ...cam,
                pixelSize: cam.bufferPx[0] / scene.width,
                packing,
                maxLayers: clampInt(p.maxLayers, 1, MAX_LAYERS, d.maxLayers),
                time: t,
                wobbleAmp: r.wobbleAmp,
                wobbleSpeed: Math.max(finite(p.speed, d.speed), 0),
                seed: r.seed,
                cellSize: r.cellSize,
                halfGap: r.gap / 2,
                rho: r.rho,
                roundness: sphere,
                skin: r.skin,
                seedTex: this.#seedTex ?? sdfTex,
                ownerTex: this.#ownerTex ?? sdfTex,
                cellCount: foam?.count ?? 0,
                ownerOrigin: foam?.ownerOrigin ?? [0, 0, 0],
                ownerCell: foam?.ownerCell ?? 1,
                ownerDims: foam?.ownerDims ?? [1, 1, 1],
                latCell: [r.cellSize, r.cellSize, zCell],
                latOrigin: [0, 0, -r.halfDepth],
                latLayers: layers,
                jitter: r.jitter,
                pullDepth: PULL_DEPTH * r.cellSize,
                pullMax: PULL_MAX * r.cellSize,
                gridRadius,
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
                ...this.#backdrop.uniforms(
                    p,
                    t,
                    r.halfDepth + r.margin,
                    sdfTex,
                ),
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

    // Place the "packed" seeds when that packing is on and a seed param
    // changes.
    #updateFoam(ctx: EffectContext): void {
        const shape = this.#shape;
        if (!shape || this.#packing() !== 0) {
            return;
        }
        const r = this.#resolved();
        const key = [
            r.halfDepth,
            r.cellSize,
            r.regularity,
            r.seed,
            r.margin,
        ].join("|");
        if (key === this.#foamKey) {
            return;
        }
        this.#foamKey = key;
        const foam = buildFoam(shape, {
            halfDepth: r.halfDepth,
            cellSize: r.cellSize,
            regularity: r.regularity,
            seed: r.seed,
            margin: r.margin,
        });
        this.#foam = foam;
        const gl = ctx.gl;
        for (const tex of this.#foamRaw) {
            gl.deleteTexture(tex);
        }
        this.#foamRaw = [];
        this.#seedTex?.dispose();
        this.#ownerTex?.dispose();
        this.#seedTex = null;
        this.#ownerTex = null;
        const seeds = uploadDataTexture(
            gl,
            FOAM_SEED_TEXELS,
            foam.seedTexH,
            foam.seedData,
        );
        const owner = uploadDataTexture(
            gl,
            FOAM_OWNER_TEX_W,
            foam.ownerTexH,
            foam.ownerData,
        );
        ctx.resetState();
        const wrap = (tex: WebGLTexture | null, w: number, h: number) => {
            if (!tex) {
                return null;
            }
            this.#foamRaw.push(tex);
            return ctx.wrapTexture(tex, {
                size: [w, h],
                filter: "nearest",
                wrap: "clamp",
            });
        };
        this.#seedTex = wrap(seeds, FOAM_SEED_TEXELS, foam.seedTexH);
        this.#seedRaw = seeds;
        this.#seedRows = new Float32Array(foam.seedData.length);
        this.#seedOffsets = new Float32Array(foam.count * 3);
        this.#driftKey = null;
        this.#ownerTex = wrap(owner, FOAM_OWNER_TEX_W, foam.ownerTexH);
    }

    // Move the "packed" seeds along their drift: their rows are filled
    // again on the CPU, so the shader reads them as they are.
    #updateDrift(ctx: EffectContext): void {
        const foam = this.#foam;
        const rows = this.#seedRows;
        const offsets = this.#seedOffsets;
        const tex = this.#seedRaw;
        if (this.#packing() !== 0 || !foam || !rows || !offsets || !tex) {
            return;
        }
        const r = this.#resolved();
        const speed = Math.max(
            finite(this.params.speed, DEFAULT_PARAMS.speed),
            0,
        );
        const time = r.wobbleAmp > 0 ? this.#time : 0;
        const key = [time, r.wobbleAmp, speed, r.seed].join("|");
        if (key === this.#driftKey) {
            return;
        }
        this.#driftKey = key;
        seedDrift(foam.count, r.seed, time, r.wobbleAmp, speed, offsets);
        foamSeedRows(foam.seeds, foam.neighbours, offsets, rows);
        const gl = ctx.gl;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            FOAM_SEED_TEXELS,
            foam.seedTexH,
            gl.RGBA,
            gl.FLOAT,
            rows,
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
        ctx.resetState();
    }

    dispose(): void {
        this.#drag.dispose();
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        if (this.#gl) {
            for (const tex of [...this.#raw, ...this.#foamRaw]) {
                this.#gl.deleteTexture(tex);
            }
        }
        this.#raw = [];
        this.#foamRaw = [];
        this.#sdfTex = null;
        this.#lutTex = null;
        this.#seedTex = null;
        this.#ownerTex = null;
        this.#foam = null;
        this.#foamKey = null;
        this.#seedRows = null;
        this.#seedOffsets = null;
        this.#driftKey = null;
        this.#seedRaw = null;
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
