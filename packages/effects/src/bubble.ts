// A foam of soap bubbles filling an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// - The silhouette is read back from the element (`ctx.src` alpha) and
//   turned into a 2D signed distance field; the 3D volume is its
//   extrusion (see `_silhouette.ts`).
// - The bubbles are placed on the CPU (`_bubble-fill.ts`): spheres
//   spread through the volume by Poisson disk sampling, sized by `cellSize`,
//   `roundness` and `cellSizeRandomness`, then smaller spheres in the
//   gaps left between them and along the outline, down to `minSize`.
//   Where spheres overlap, they are cut by their radical plane and share
//   one flat film there (a power diagram); where a sphere is exposed,
//   its own round surface is the film.
// - A soap film is thin, so it does not bend light: each camera ray is
//   straight. Along it, the power of every sphere is t² + b t + k, and
//   t² is the same for all of them, so the cell that owns a point is the
//   lower envelope of the lines b t + k. The films are found exactly,
//   with no marching inside the foam (see `_sphere-foam.ts`, which
//   mirrors the solver in TypeScript, and `sphereSegment` below). The
//   ray walks a uniform grid over the spheres; each grid cell lists
//   every sphere that can reach into it.
// - A film's colour is thin-film interference: a LUT of reflectance by
//   thickness and angle, baked once from the CIE colour matching
//   functions (`_thin-film.ts`). It reflects the same backdrop and box
//   lights as GlassEffect, softened. The films are composited front to
//   back.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";
import {
    BUBBLE_LIST_MAX,
    BUBBLE_TEX_W,
    bubbleKernel,
    type FillOptions,
    type FoamData,
} from "./_bubble-fill.js";
import { BUBBLE_KERNEL_SOURCE } from "./_bubble-kernel-source.js";
import { KernelWorker } from "./_kernel-worker.js";
import {
    OrbitCamera,
    type OrbitCameraParams,
    type OrbitCameraView,
} from "./_orbit-camera.js";
import { padOutputRect } from "./_pad.js";
import {
    backdropKind,
    clampInt,
    GLSL_HEAT,
    GLSL_SCENE,
    hexToRgb,
    SceneBackdrop,
    ScenePasses,
    uploadFloatTexture,
} from "./_scene3d.js";
import { buildShape, GLSL_SDF, type ShapeData } from "./_silhouette.js";
import { GLSL_SIMPLEX3, GLSL_SIMPLEX3_GRAD } from "./_simplex3.js";
import {
    SourceCapture,
    type SourceChannel,
    sourceChannelOf,
} from "./_source.js";
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

/** What the pointer does to a {@link BubbleEffect}. */
export type BubblePointer = "none" | "tilt";

/**
 * Params of {@link BubbleEffect}: the foam's own, and the camera's
 * ({@link OrbitCameraParams}). All are read every frame. The placement
 * params (`depth`, `bevel`, `cellSize`, `cellSizeRandomness`,
 * `roundness`, `seed`, `minSize`) place the bubbles
 * again on the CPU when they change, which takes a few to a few tens of
 * milliseconds.
 */
export type BubbleParams = OrbitCameraParams & {
    /**
     * Which channel of the element is read as the silhouette: `"alpha"`
     * (where it is opaque; default), `"luminance"` (where it is bright,
     * so the text or the light parts of an opaque image) or `"none"` (the
     * whole element rect). A change reads the element back again, like
     * {@link BubbleEffect.refresh | refresh()}.
     */
    sourceChannel: SourceChannel;
    /**
     * Extrusion depth, relative to the long side of the element (= 2),
     * up to 2. Placement param.
     */
    depth: number;
    /**
     * Radius of the rounded edges of the extruded shape, in the same units
     * as `depth`, up to half of it. The bubbles fill the rounded shape,
     * and a container (`containment`) rounds them off along its edges.
     * Placement param.
     */
    bevel: number;

    /**
     * Size of the big bubbles: their radius is 0.86 of it, in the same
     * units as `depth`. Smaller bubbles fill the gaps between
     * them (see `minSize`). Placement param.
     */
    cellSize: number;
    /**
     * How much the big bubbles' radii vary, 0 (all alike) to 1 (each
     * shrunk by a random share, up to all of it). Placement param.
     */
    cellSizeRandomness: number;
    /**
     * How round the bubbles are, 0 to 1, at the same size: how far apart
     * the big bubbles sit. At 0 they overlap heavily (more of them, cut
     * by flat walls into a polyhedral foam with shallow caps); at 1 their
     * centres are a diameter apart, so they are whole spheres that just
     * touch, with smaller bubbles in the gaps. The filling bubbles cut
     * into their neighbours alike. Placement param.
     */
    roundness: number;
    /** Seed of the random placement. Placement param. */
    seed: number;
    /**
     * The smallest bubbles, as a share of `cellSize`, 0.05 to 1: gaps
     * between the big bubbles, and along the outline, are filled with
     * smaller ones while an empty ball of this size fits. Smaller gives
     * more, smaller bubbles; 1 turns the fill off. Placement param.
     */
    minSize: number;
    /**
     * How much the shape acts as a container, 0 to 1. 0 lets the bubbles
     * poke out of the silhouette (by 0.3 `cellSize` at most) and bulge out of its front
     * and back. Above 0, what pokes out is squashed towards the shape,
     * keeping its roundness: a cap that stood h above the shape stands
     * (1 - containment) h. At 1 the bubbles are pressed flat against the
     * shape, like a foam blown up inside a mould. They are also blown up
     * a little, which closes the smallest gaps and leaves creases
     * between them. Values between 0 and 1 cost a little more than
     * either end.
     */
    containment: number;
    /**
     * Amplitude of the bubbles' slow drift, relative to each bubble's
     * radius, 0 to 0.15: the walls breathe. Changing it rebuilds the
     * grid the shader walks (cheap).
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
     * The bright white rim of a bubble, 0 to 1. A film seen at a grazing
     * angle reflects much more, in white. 1 is the real film; 0 keeps the
     * interference colours all the way to the edge.
     */
    rim: number;
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
     * Width of the borders on the foam's outside, where two bubbles meet,
     * as a share of `cellSize`, 0 (off) to 0.5: the water gathered there.
     * The film thickens over this width, by 100 nm per 0.01 at the
     * border, so wider borders show more bands of colour. The white line
     * (see `borderHighlight`) is a sharp core about half as wide in all.
     * Walls inside the foam get no border.
     */
    borderWidth: number;
    /**
     * Brightness of the white line along the borders: the light the water
     * gathered there scatters, 0 (off) to 2.
     */
    borderHighlight: number;

    /**
     * The backdrop: a pattern name, or an image (an element, an
     * `ImageBitmap` or a URL). Films reflect it and, with
     * `backdropVisible`, it is drawn behind the foam; otherwise the page
     * shows through it.
     */
    backdrop: GlassPatternName | GlassImageSource;
    /** Draw the backdrop behind and around the foam. */
    backdropVisible: boolean;
    /**
     * Reflect the backdrop all around, not only behind: the films facing
     * the viewer reflect it too, in place of the even sky. The lights
     * still add their highlights.
     */
    backdropAround: boolean;
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

    /** Render scale, 0.25 to 2. Below 1 is cheaper and softer. */
    resolution: number;
    /** Smooth the remaining stair steps with FXAA. */
    antialias: boolean;
    /**
     * How the foam reacts to the pointer hovering over the page:
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
    pointer: BubblePointer;
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

// How much thicker the film gets at a border, in nm per unit of
// borderWidth.
const BORDER_NM_PER_WIDTH = 10000;

const DEFAULT_PARAMS: BubbleParams = {
    sourceChannel: "alpha",
    depth: 0.1,
    bevel: 0.02,
    cellSize: 0.1,
    cellSizeRandomness: 0.25,
    roundness: 0.3,
    seed: 1,
    minSize: 0.25,
    containment: 0,
    wobble: 0.06,
    speed: 0.15,
    maxLayers: 6,
    iridescence: 0.5,
    thickness: 420,
    thicknessVariation: 0.35,
    drain: 0.5,
    swirlScale: 1.2,
    swirlSpeed: 0.12,
    reflection: 1.4,
    rim: 1,
    tint: "#6d8ee8",
    tintStrength: 0.3,
    opacity: 0,
    color: "#2f7fe0",
    borderWidth: 0.06,
    borderHighlight: 0.35,
    backdrop: "none",
    backdropVisible: false,
    backdropAround: false,
    backdropScale: 0.25,
    backdropDistance: 0.6,
    backdropSpeed: 0.15,
    backdropColors: "mono",
    backdropRatio: 0.5,
    backdropSoftness: 0.03,
    lightIntensity: 1.2,
    lightSoftness: 0.8,
    yaw: 20,
    pitch: 11.5,
    orbitAnimation: 11.5,
    orbitSpeed: 3.3,
    fov: 30,
    zoom: 0.75,
    drag: false,
    cameraOrigin: "element",
    pointer: "none",
    pointerStrength: 1,
    resolution: 1,
    antialias: true,
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
// The depth the fill inside the shape takes to reach its full size, per
// cell size.
const FILL_DEPTH = 0.5;
const WOBBLE_MAX = 0.15;
// The cosine the films' angle is held at with `rim` 0.
const RIM_COS = 0.6;
// Long side of the silhouette read back from the element, in px, and
// the smoothing of its field. The field only places the bubbles, so it
// can be coarser than GlassEffect's.
const BUBBLE_MASK_LONG = 512;
const SMOOTH_RADIUS = 2;
const SMOOTH_PASSES = 2;

// The shader per containment mode: 0 none, 1 the shape cuts the foam
// flat, 2 the foam out of the shape is squashed. Each mode compiles only
// its own path, which keeps the others light on registers.
// It also compiles only the kind of backdrop in use (see GLSL_SCENE): a
// change of either compiles a new shader on its first frame.
const fragBubble = (mode: 0 | 1 | 2, kind: number) => `#version 300 es
#define CONTAIN ${mode}
#define BACKDROP_KIND ${kind}
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
// The camera (see _orbit-camera.ts): the eye in view space is
// (eye, camDist), and its axis meets the output at principalPx.
uniform vec2 eye;
uniform vec2 principalPx;
uniform vec2 bufferPx;
uniform float pixelSize;

uniform int maxLayers;
uniform uint seed;
uniform float cellSize;

// The spheres (x, y, z, r per texel, drifted for this frame) and the grid
// over them: per cell an offset into the index list and a count; the
// index list holds four sphere indices per texel. All in rows of
// BUBBLE_TEX_W texels.
uniform highp sampler2D sphereTex;
uniform highp sampler2D cellTex;
uniform highp sampler2D indexTex;
uniform vec3 gridOrigin;
uniform float gridCell;
uniform ivec3 gridDims;
// The grid the borders are found with: the spheres listed by their own
// radii. In a container the grid above lists them as far as the fill
// blows them up, which the foam's outside does not need.
uniform highp sampler2D edgeCellTex;
uniform highp sampler2D edgeIndexTex;
uniform vec3 edgeOrigin;
uniform float edgeCell;
uniform ivec3 edgeDims;
// How far any sphere can reach out of the shape, drift included.
uniform float reachMax;
// The container: the foam ends where the shape's field reaches clipOff
// (0: the shape itself).
uniform float clipOff;
// Below containment 1 the part of the foam outside the shape is not cut
// but squashed towards it: a point at distance S from the shape shows
// the foam at S / (1 - containment). warpK = containment / (1 -
// containment). At 1 (WALL_ON) it is cut flat instead.
uniform float warpK;
// In a container the bubbles inside the shape are blown up with depth,
// by up to fillG on r², reached fillDepth in: the gaps left between them
// deep inside close, and the shape reads as full of foam.
uniform float fillG;
uniform float fillDepth;
#define WALL_ON (CONTAIN == 1)

uniform sampler2D filmLut;
uniform float iridescence;
uniform float thickness;
uniform float thicknessVariation;
uniform float drain;
uniform float swirlScale;
uniform float swirlOffset;
uniform float reflection;
// The films reflect as if seen no more grazing than this cosine.
uniform float rimCos;
// The backdrop is reflected all around (1), or only behind (0).
uniform float backdropAround;
uniform vec3 tint;
uniform float tintStrength;
uniform float opacity;
uniform vec3 bodyColor;
// The borders on the foam's outside: their width in world units (0: off,
// none of their work is done), the white line, the film's thickening.
uniform float borderWidth;
uniform float borderHighlight;
uniform float borderThickness;
uniform int debugView;

// Spheres a grid cell lists, at most: the ray passes through some of them.
const int MAX_CAND = ${BUBBLE_LIST_MAX};
const int TEX_W = ${BUBBLE_TEX_W};
const int MAX_LAYERS = ${MAX_LAYERS};
const float THICKNESS_MAX = ${THIN_FILM_THICKNESS_MAX.toFixed(1)};
const float TAU = 6.2831853;
// Brightness of the lights in reflections, the most a film reflects, and
// how much of that the walls inside the foam keep.
const float LIGHT_GAIN = 8.0;
const float RIM_MAX = 0.2;
const float WALL_DIM = 0.35;
// Half the white line's core, as a share of the border's width.
const float BORDER_LINE = 0.22;
const float NO_EDGE = 1e30;

${GLSL_SIMPLEX3}
${GLSL_SIMPLEX3_GRAD}
${GLSL_SCENE}
${GLSL_HEAT}

vec3 ro;
vec3 rd;
// Radius of the pixel's cone per unit of distance.
float pixCone;
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

// The id of sphere i, which seeds its film's swirls.
float sphereId(int i) {
    return hash4(uvec3(uint(i), 977u, 31u)).w * 251.0;
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
    // The backdrop is behind, and with backdropAround on a plane as far
    // in front too: towards the side both planes blur to its mean.
    // It is sampled in one place: each call site is compiled apart, and
    // the patterns are the largest part of the shader.
    bool behind = backdropMode != 0 && dV.z < -1e-4;
    bool front = backdropAround > 0.5 && backdropMode != 0 && !behind;
    float t = behind
        ? (-backdropDistance - pV.z) / dV.z
        : (backdropDistance - pV.z) / max(dV.z, 1e-4);
    vec2 q = pV.xy + dV.xy * t;
    bool hit = front || (behind && t > 0.0);
    vec3 env = vec3(0.0);
    if (hit) {
        env = backdrop(q, length(fwidth(q)));
    }
    vec3 lit = lights(dV, lightSoftness);
    vec3 glint = min(R, vec3(0.05)) * LIGHT_GAIN * lit;
    if (front) {
        return R * env + glint;
    }
    float sky = lightIntensity * 0.35 * (0.3 + 0.7 * smoothstep(-0.7, 0.9, dV.y));
    if (behind) {
        return R * (hit ? env : lit) + R * sky;
    }
    return glint + R * sky;
}

// The white line across a border, at distance e from it: a flat core
// with a short falloff, spread over the pixel's footprint fp when it is
// thinner, so it keeps its brightness per length instead of breaking up.
float borderLine(float e, float fp) {
    float c = borderWidth * BORDER_LINE;
    float w = max(c, 0.5 * fp);
    float s = max(0.4 * c, 0.5 * fp);
    return c / w * (1.0 - smoothstep(w - s, w + s, e));
}

// The shell's warp along a piece of the ray, where it is linear: with
// warpOn, ro and rd are the piece in the unsquashed foam (t scaled by
// warpL), roReal and rdReal the ray seen. The push is along warpG (out of
// the side walls) and warpZ (out of the front or back), each when active.
// The outline is taken as straight: its field is warpA0 + warpGrad . xy.
bool warpOn = false;
vec3 roReal;
vec3 rdReal;
float warpL;
vec3 warpG;
vec3 warpZ;
vec2 warpGrad;
float warpA0;
// A flat film the first cell of the next walk starts with (a bubble cut
// at the middle of a gap), and its normal.
bool capOn = false;
vec3 capN;

// A film found along the ray, kept to be shaded a little later: the
// point and normal as seen, the point in its cell (per cell size), and
// the rest as addFilm takes them.
struct Film {
    vec3 p;
    vec3 n;
    vec3 l;
    float id;
    float outer;
    float cover;
    float edge;
    bool entering;
};
// The films not shaded yet. A few are enough: segmentFilms shades them
// on every step, and at most FOUND_MAX are found between two. The list is
// kept short, since every pixel pays for its size.
const int FOUND_MAX = 4;
Film found[FOUND_MAX];
int nFound = 0;
// The share of light that passes the opaque bodies found so far: the
// walk stops when none is left.
float through = 1.0;

// Keep a film at p with normal n, of the cell round \`center\` with id
// \`id\`: \`outer\` is 1 on the foam's outside, 0 on a wall inside it;
// \`cover\` is how much of the pixel it covers; \`edge\` the distance to
// the nearest border on the outside (NO_EDGE: none).
// The films are shaded apart, in as few places as can be (shadeFilms):
// each call site of the shading is compiled apart, and it is most of
// the shader.
void addFilm(vec3 p, vec3 n, vec3 center, float id, float outer, bool entering, float cover, float edge) {
    vec3 l = (p - center) / cellSize;
    if (warpOn) {
        // In the warped shell, keep the point and normal as seen.
        p = roReal + rdReal * (dot(p - ro, rd) / warpL);
        n = normalize(n + warpK * (warpG * dot(warpG, n) + warpZ * dot(warpZ, n)));
    }
    if (nFound < FOUND_MAX) {
        found[nFound] = Film(p, n, l, id, outer, cover, edge, entering);
        nFound++;
    }
    if (films == 0) {
        firstId = id;
    }
    if (entering) {
        through *= 1.0 - opacity * cover;
    }
    films++;
}

// Shade a film, in front of those shaded before.
void shadeFilm(Film film) {
    vec3 p = film.p;
    vec3 n = film.n;
    float cover = film.cover;
    float edge = film.edge;
    float th = filmThickness(film.l, film.id);
    vec3 nf = dot(n, rd) > 0.0 ? -n : n;
    float cosI = clamp(-dot(rd, nf), 0.0, 1.0);
    // White light scattered by the water along the borders.
    float white = 0.0;
    if (edge < borderWidth) {
        // The border: the water gathered where two bubbles meet. The
        // film thickens towards it, and a narrow line of it scatters.
        // The pixel's footprint on the film is longer at a grazing angle.
        float fp = pixCone * length(p - ro) / max(cosI, 0.25);
        float f = 1.0 - edge / borderWidth;
        th = min(th + borderThickness * f * f, THICKNESS_MAX);
        white = borderHighlight * borderLine(edge, fp);
    }
    float cosR = max(cosI, rimCos);
    vec3 R = mix(
        vec3(plainFilm(cosR)),
        textureLod(filmLut, vec2(th / THICKNESS_MAX, cosR), 0.0).rgb,
        iridescence
    );
    // Grazing films reflect most, but a foam is mostly grazing films:
    // their reflectance is held down, more for the walls inside it.
    R = min(R, vec3(RIM_MAX)) * mix(WALL_DIM, 1.0, film.outer) * cover;
    vec3 rv = viewRot * reflect(rd, nf);
    vec3 refl = reflected(R, viewRot * p, rv) * reflection;
    col += remain * refl / (1.0 + refl);
    // The light that passes: some of it scattered in the tint, more at a
    // grazing angle, where the path through the film is longer.
    vec3 T = 1.0 - R;
    float k = (1.0 - exp(-tintStrength * 0.03 / max(cosI * cosI, 0.1))) * cover;
    col += remain * T * k * tint;
    remain *= T * (1.0 - k);
    if (white > 0.0) {
        // An even white, lit like the sky the films reflect: it takes
        // from what passes, and shows on the body too.
        float a = clamp(white, 0.0, 1.0) * cover;
        col += remain * a * (0.3 + 0.55 * lightIntensity);
        remain *= 1.0 - a;
    }
    if (film.entering && opacity > 0.0) {
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
}

// Shade the films found since the last call, front to back.
void shadeFilms() {
    // The films are kept as seen: shade them along the ray seen, also
    // from inside the warped shell.
    vec3 roWalk = ro;
    vec3 rdWalk = rd;
    if (warpOn) {
        ro = roReal;
        rd = rdReal;
    }
    for (int i = 0; i < FOUND_MAX; i++) {
        if (i >= nFound) {
            break;
        }
        shadeFilm(found[i]);
    }
    nFound = 0;
    ro = roWalk;
    rd = rdWalk;
}

// ---- the foam: a power diagram of spheres, found through a grid ----

// The spheres of the grid cell the ray is in that it passes through on
// the segment: centre (drifted) and radius, id, and the ray's power line
// b t + k for each.
vec4 cand[MAX_CAND];
float candId[MAX_CAND];
vec2 candBK[MAX_CAND];
int nCand = 0;

// The fill along the current stretch inside the shape: the outline's
// field and gradient there, sampled at even steps of fillDt from fillT0
// and taken as straight between them.
#define FILL_STEPS 8
bool fillOn = false;
float fillT0;
float fillDt;
vec3 fillKnot[FILL_STEPS + 1];

vec3 fillOutline(float t) {
    float u = clamp((t - fillT0) / fillDt, 0.0, float(FILL_STEPS));
    int i = min(int(u), FILL_STEPS - 1);
    return mix(fillKnot[i], fillKnot[i + 1], u - float(i));
}

ivec2 texel(int i) {
    return ivec2(i % TEX_W, i / TEX_W);
}

// Load the spheres of grid cell C that the ray passes through on
// [t0, t1]. The cell's list holds every sphere that can reach into it,
// drift included, so none that owns a point of the segment is missed.
// With \`all\`, every sphere of the list is loaded instead.
void loadCell(ivec3 C, float t0, float t1, bool all) {
    nCand = 0;
    if (any(lessThan(C, ivec3(0))) || any(greaterThanEqual(C, gridDims))) {
        return;
    }
    vec4 head = texelFetch(cellTex, texel(C.x + gridDims.x * (C.y + gridDims.y * C.z)), 0);
    cost += 1.0;
    int off = int(head.x);
    int count = min(int(head.y), MAX_CAND);
    vec4 idx = vec4(0.0);
    for (int j = 0; j < MAX_CAND; j++) {
        if (j >= count) {
            break;
        }
        int e = off + j;
        if (j == 0 || (e & 3) == 0) {
            idx = texelFetch(indexTex, texel(e >> 2), 0);
            cost += 1.0;
        }
        int i = int(idx[e & 3]);
        vec4 sph = texelFetch(sphereTex, texel(i), 0);
        cost += 1.0;
        // In the shell, only the bubbles poking out through this side.
        if (warpOn && warpA0 + dot(warpGrad, sph.xy) > 0.5 * sph.w) {
            continue;
        }
        vec3 oc = ro - sph.xyz;
        vec2 bk = vec2(2.0 * dot(rd, oc), dot(oc, oc) - sph.w * sph.w);
        if (all) {
            cand[nCand] = sph;
            candId[nCand] = sphereId(i);
            candBK[nCand] = bk;
            nCand++;
            continue;
        }
        // With the fill a sphere owns points beyond its radius: keep it
        // as far as it reaches with the fill.
        float disc = bk.x * bk.x - 4.0 * (bk.y - (fillOn ? fillG : 0.0));
        if (disc <= 0.0) {
            continue;
        }
        vec2 hit = 0.5 * (-bk.x + vec2(-1.0, 1.0) * sqrt(disc));
        // Only spheres the ray passes through on the segment can own a
        // point inside the foam; the others are left out of the envelope.
        if (hit.x < t1 && hit.y > t0) {
            cand[nCand] = sph;
            candId[nCand] = sphereId(i);
            candBK[nCand] = bk;
            nCand++;
        }
    }
}

// ---- borders: where two bubbles meet ----

// The distance from q, in the cell of sphere \`own\` (whose power at q is
// powI), to the wall it shares with sphere s: walls lie on radical
// planes, so it is exact. Keeps the nearer of it and e; the owner itself
// is skipped.
void nearWall(inout float e, vec3 q, vec4 own, float powI, vec4 s) {
    vec3 dc = s.xyz - own.xyz;
    float d2 = dot(dc, dc);
    if (d2 < 1e-12) {
        return;
    }
    vec3 m = q - s.xyz;
    float ri = inversesqrt(d2);
    e = min(e, (dot(m, m) - s.w * s.w - powI) * 0.5 * ri);
}

// The distance from q to the nearest wall of its owner's cell, over
// every sphere the border grid's cell of q lists (as
// \`_sphere-foam.ts\`'s borderDist). A sphere that could bound the cell at q contains q or is
// close to it, so it reaches into that grid cell and is listed. The list
// is read again here: the one loaded for the ray keeps only the spheres
// the ray passes through.
float borderDist(vec3 q, vec4 own) {
    ivec3 C = ivec3(floor((q - edgeOrigin) / edgeCell));
    if (any(lessThan(C, ivec3(0))) || any(greaterThanEqual(C, edgeDims))) {
        return NO_EDGE;
    }
    vec4 head = texelFetch(edgeCellTex, texel(C.x + edgeDims.x * (C.y + edgeDims.y * C.z)), 0);
    cost += 1.0;
    int off = int(head.x);
    int count = min(int(head.y), MAX_CAND);
    vec3 mo = q - own.xyz;
    float powI = dot(mo, mo) - own.w * own.w;
    float e = NO_EDGE;
    vec4 idx = vec4(0.0);
    for (int j = 0; j < MAX_CAND; j++) {
        if (j >= count) {
            break;
        }
        int k = off + j;
        if (j == 0 || (k & 3) == 0) {
            idx = texelFetch(edgeIndexTex, texel(k >> 2), 0);
            cost += 1.0;
        }
        int i = int(idx[k & 3]);
        vec4 sph = texelFetch(sphereTex, texel(i), 0);
        cost += 1.0;
        if (warpOn && warpA0 + dot(warpGrad, sph.xy) > 0.5 * sph.w) {
            continue;
        }
        nearWall(e, q, own, powI, sph);
    }
    return max(e, 0.0);
}

bool sphereInside = false;

// The shape's field at t on the stretch, and its gradient.
float fillField(float t, out vec3 grad) {
    float zt = ro.z + rd.z * t;
    float dz = abs(zt) - halfDepth;
    vec3 o = fillOutline(t);
    grad = o.x > dz ? vec3(o.yz, 0.0) : vec3(0.0, 0.0, zt >= 0.0 ? 1.0 : -1.0);
    return max(o.x, dz);
}

// What the fill adds to r² at t.
float fillAt(float t) {
    vec3 grad;
    return fillG * smoothstep(0.0, 1.0, -fillField(t, grad) / fillDepth);
}
// The cell that owns the end of the last segment (an index into cand).
int segOwn = 0;
// Whether the last grid walk ended inside a bubble, and that bubble.
bool endInside = false;
vec4 endSph;
float endId;

// The film on the container's wall at t, where it cuts the cell of sphere i.
void wallFilm(int i, float t, bool entering) {
    vec3 p = ro + rd * t;
    vec4 s = sdf3(p);
    cost += 1.0;
    float edge = NO_EDGE;
    if (borderWidth > 0.0) {
        edge = borderDist(p, cand[i]);
    }
    addFilm(p, s.yzw, cand[i].xyz, candId[i], 1.0, entering, 1.0, edge);
}

// The film on a sphere's own surface at t.
void sphereFilm(int i, float t, bool entering, float cover) {
    vec3 p = ro + rd * t;
    vec3 n = (p - cand[i].xyz) / cand[i].w;
    if (fillOn) {
        // The surface is |p - c|² - r² = fill: its gradient bends with
        // the fill's.
        vec3 grad;
        float sf = fillField(t, grad);
        if (sf < 0.0 && sf > -fillDepth) {
            float q = -sf / fillDepth;
            n = normalize(p - cand[i].xyz + 3.0 * q * (1.0 - q) * fillG / fillDepth * grad);
        }
    }
    float edge = NO_EDGE;
    if (borderWidth > 0.0) {
        edge = borderDist(p, cand[i]);
    }
    addFilm(p, n, cand[i].xyz, candId[i], 1.0, entering, cover, edge);
}

// The films of the foam on [t0, t1] with the spheres loaded: the lower
// envelope of the power lines, as in \`_sphere-foam.ts\`.
// \`first\`: t0 is where the ray enters the container, so a cell that
// holds that point starts with a film on the container's wall.
void segmentFilms(float t0, float t1, float cone, int layers, bool first) {
    int n = nCand;
    int own = 0;
    float lo = candBK[0].x * t0 + candBK[0].y;
    for (int i = 1; i < MAX_CAND; i++) {
        if (i >= n) {
            break;
        }
        float l = candBK[i].x * t0 + candBK[i].y;
        if (l < lo || (l == lo && candBK[i].x < candBK[own].x)) {
            lo = l;
            own = i;
        }
    }
    segOwn = own;
    // The fill over the segment, a line there: g0 + gB (t - t0).
    float g0 = 0.0;
    float gB = 0.0;
    if (fillOn && n > 0) {
        g0 = fillAt(t0);
        gB = (fillAt(t1) - g0) / max(t1 - t0, 1e-6);
    }
    float ta = t0;
    for (int guard = 0; guard <= MAX_CAND; guard++) {
        // The one place in the walk where films are shaded, in every
        // cell, empty ones too. A step finds two films at most, and the
        // walkers add two more between calls.
        shadeFilms();
        if (n == 0) {
            sphereInside = false;
            return;
        }
        if (first && guard == 0) {
            sphereInside = t0 * t0 + lo - g0 < 0.0;
            if (sphereInside && WALL_ON) {
                wallFilm(own, t0, true);
            } else if (sphereInside && capOn) {
                addFilm(ro + rd * t0, capN, cand[own].xyz, candId[own], 1.0, true, 1.0, NO_EDGE);
            }
        }
        if (films >= layers) {
            return;
        }
        vec2 bo = candBK[own];
        float ts = 1e30;
        int next = -1;
        for (int j = 0; j < MAX_CAND; j++) {
            if (j >= n) {
                break;
            }
            vec2 bj = candBK[j];
            if (bj.x < bo.x) {
                float tj = max((bj.y - bo.y) / (bo.x - bj.x), ta);
                if (tj < ts) {
                    ts = tj;
                    next = j;
                }
            }
        }
        float tb = min(ts, t1);
        // The owner's power less the fill: t² + bf.x t + bf.y.
        vec2 bf = bo - vec2(gB, g0 - gB * t0);
        float disc = bf.x * bf.x - 4.0 * bf.y;
        if (disc > 0.0) {
            float hh = sqrt(disc);
            float tIn = 0.5 * (-bf.x - hh);
            float tOut = 0.5 * (-bf.x + hh);
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
            vec3 c = 0.5 * (cand[own].xyz + cand[next].xyz);
            addFilm(p, normalize(cand[next].xyz - cand[own].xyz), c, candId[own] + candId[next], 0.0, false, 1.0, NO_EDGE);
        }
        own = next;
        segOwn = own;
        ta = ts;
    }
}

float fillCut(float num, float den) {
    return abs(den) > 1e-7 ? num / den : 1e30;
}

// The films on [t0, t1]. With the fill, the stretch is split where the
// fill bends along the ray, so it is close to a line on each part.
void sphereSegment(float t0, float t1, float cone, int layers, bool first) {
    // Without the fill, the whole stretch in one part.
    bool split = fillOn && nCand > 0;
    // The middle plane, and where the fill is full along z.
    float zFull = halfDepth - fillDepth;
    vec3 cut = vec3(
        fillCut(-ro.z, rd.z),
        fillCut(zFull - ro.z, rd.z),
        fillCut(-zFull - ro.z, rd.z)
    );
    float ta = t0;
    for (int k = 0; k < FILL_STEPS + 4; k++) {
        // The next sample of the outline's field.
        float tn = t1;
        if (split) {
            tn = min(t1, fillT0 + fillDt * (floor((ta - fillT0) / fillDt + 1e-3) + 1.0));
            for (int c = 0; c < 3; c++) {
                if (cut[c] > ta + 1e-5 && cut[c] < tn) {
                    tn = cut[c];
                }
            }
        }
        segmentFilms(ta, tn, cone, layers, first && k == 0);
        if (tn >= t1 || films >= layers) {
            return;
        }
        ta = tn;
    }
}

// The container's field along the ray (negative inside).
float clipField(float t) {
    cost += 1.0;
    return sdf3(ro + rd * t).x - clipOff;
}

// Walk the grid on [a, b], a stretch of the ray inside the shape (or,
// with WALL_ON, inside the container): the foam's films there. With
// WALL_ON, a cell cut by the container gets a film on its wall.
void walkGrid(float a, float b, float cone, int layers) {
    vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
    vec3 inv = 1.0 / d;
    ivec3 stp = ivec3(sign(d));
    vec3 tDelta = gridCell * abs(inv);
    vec3 q = (ro + rd * a - gridOrigin) / gridCell;
    ivec3 C = clamp(ivec3(floor(q)), ivec3(0), gridDims - 1);
    vec3 tMax = a + (vec3(C) + step(0.0, d) - q) * gridCell * inv;
    float tw = a;
    bool first = true;
    sphereInside = false;
    for (int i = 0; i < 128; i++) {
        if (films >= layers || through < 0.02) {
            return;
        }
        float tn = min(tMax.x, min(tMax.y, tMax.z));
        float te = min(tn, b);
        loadCell(C, tw, te, false);
        sphereSegment(tw, te, cone, layers, first);
        first = false;
        if (tn >= b) {
            if (sphereInside && films < layers && nCand > 0 && WALL_ON) {
                wallFilm(segOwn, b, false);
            }
            break;
        }
        tw = tn;
        int axis = tMax.x <= tMax.y && tMax.x <= tMax.z ? 0 : (tMax.y <= tMax.z ? 1 : 2);
        C[axis] += stp[axis];
        tMax[axis] += tDelta[axis];
        if (C[axis] < 0 || C[axis] >= gridDims[axis]) {
            break;
        }
    }
    endInside = sphereInside && nCand > 0;
    if (endInside) {
        endSph = cand[segOwn];
        endId = candId[segOwn];
    }
    sphereInside = false;
}

// Walk [ta, tb] of the shell. Out of an extruded shape the push along
// its field splits into one out of the side walls (by the outline's
// field) and one out of the front or back (by |z| - halfDepth), even
// round its edges. With the outline taken as straight near the ray, both
// are linear in t between the points where each starts, so the ray is
// straight in the unsquashed foam on each piece, and the pieces join.
void shellWalk(float ta, float tb, float cone, int layers) {
    roReal = ro;
    rdReal = rd;
    vec3 pm = ro + rd * (0.5 * (ta + tb));
    vec3 s2 = sd2(pm.xy);
    cost += 1.0;
    vec2 g = s2.yz;
    warpGrad = g;
    warpA0 = s2.x - dot(g, pm.xy);
    // The outline's field along the ray, a + b t.
    float a = warpA0 + dot(g, ro.xy);
    float b = dot(g, rd.xy);
    float bp[3];
    bp[0] = abs(b) > 1e-6 ? -a / b : 1e30;
    bp[1] = abs(rd.z) > 1e-6 ? (halfDepth - ro.z) / rd.z : 1e30;
    bp[2] = abs(rd.z) > 1e-6 ? (-halfDepth - ro.z) / rd.z : 1e30;
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2 - i; j++) {
            if (bp[j] > bp[j + 1]) {
                float x = bp[j];
                bp[j] = bp[j + 1];
                bp[j + 1] = x;
            }
        }
    }
    float t0 = ta;
    for (int i = 0; i <= 3; i++) {
        float t1 = i < 3 ? clamp(bp[i], ta, tb) : tb;
        if (t1 > t0 + 1e-6) {
            float tc = 0.5 * (t0 + t1);
            float zc = roReal.z + rdReal.z * tc;
            float sz = zc >= 0.0 ? 1.0 : -1.0;
            float xy = a + b * tc > 0.0 ? 1.0 : 0.0;
            float zz = abs(zc) > halfDepth ? 1.0 : 0.0;
            vec3 G = vec3(g, 0.0) * xy;
            vec3 Z = vec3(0.0, 0.0, sz) * zz;
            vec3 q0 = roReal + warpK * (a * G + (sz * roReal.z - halfDepth) * Z);
            vec3 dq = rdReal + warpK * (b * G + sz * rdReal.z * Z);
            float L = length(dq);
            ro = q0;
            rd = dq / L;
            warpL = L;
            warpG = G;
            warpZ = Z;
            warpOn = true;
            walkGrid(t0 * L, t1 * L, cone / L, layers);
            warpOn = false;
            capOn = false;
            ro = roReal;
            rd = rdReal;
            if (films >= layers) {
                return;
            }
        }
        t0 = max(t0, t1);
    }
}


// ---- the squashed shell outside the shape ----

// The squashed shell from t, where the ray is outside the shape and in
// the container. Its stretch is found by tracing the shape's field, then
// walked by shellWalk. True when the ray enters the shape (t there).
bool shellStretch(inout float t, float tEnd, float cone, int layers) {
    float stepMin = max(clipOff / 16.0, 2e-4);
    for (int part = 0; part < 3; part++) {
        float ta = t;
        vec4 s = sdf3(ro + rd * t);
        cost += 1.0;
        if (s.x < 0.0) {
            return true;
        }
        vec3 n0 = s.yzw;
        int how = 0;
        for (int i = 0; i < 48; i++) {
            float tp = t;
            float sp = s.x;
            t += max(s.x, stepMin);
            if (t >= tEnd) {
                t = tEnd;
                break;
            }
            s = sdf3(ro + rd * t);
            cost += 1.0;
            if (s.x < 0.0) {
                // Into the shape.
                t = tp + (t - tp) * sp / (sp - s.x);
                how = 1;
                break;
            }
            if (s.x > clipOff) {
                // Out of the container.
                t = tp + (t - tp) * (clipOff - sp) / (s.x - sp);
                break;
            }
            if (dot(s.yzw, n0) < 0.0) {
                // A crease: the middle of a gap, the nearest side changes.
                t = 0.5 * (tp + t);
                how = 2;
                break;
            }
        }
        if (t > ta) {
            shellWalk(ta, t, cone, layers);
        }
        if (how == 1) {
            return true;
        }
        if (how != 2 || films >= layers) {
            return false;
        }
        // The near bubble ends flat at the crease; the far side starts
        // with one.
        vec3 nc = normalize(n0 - s.yzw + 1e-5 * rd);
        if (endInside) {
            addFilm(ro + rd * t, nc, endSph.xyz, endId, 1.0, false, 1.0, NO_EDGE);
        }
        capOn = true;
        capN = nc;
        t += 1e-4;
    }
    return false;
}

// The foam inside the container. The ray's stretches inside it are
// found by tracing the shape's field. With WALL_ON each is walked through
// the grid and cut flat by the container. Otherwise the stretches inside
// the shape are walked the same way, and those between the shape and the
// container, where the foam is squashed, by shellStretch.
void traceContained(vec2 tb, float cone, int layers) {
    float t = max(tb.x, 0.0);
    float eps = 1e-3;
    for (int iv = 0; iv < 6; iv++) {
        // Into the container. A ray that only grazes it is not in it: it
        // goes on, so a run of grazing points does not use up the stretches.
        float g = clipField(t);
        for (int i = 0; i < 64 && g > 0.0 && t <= tb.y; i++) {
            t += max(g, eps);
            g = clipField(t);
        }
        if (t > tb.y || films >= layers) {
            return;
        }
        if (g > 0.0) {
            // Out of steps: go on from here.
            continue;
        }
        for (int k = 0; k < 4; k++) {
#if CONTAIN == 2
            if (!shellStretch(t, tb.y, cone, layers)) {
                break;
            }
#endif
            // Through the container (WALL_ON) or the shape, to where the
            // ray leaves it.
            float off = WALL_ON ? clipOff : 0.0;
            float a = t;
            float tp = t;
            float gp = 0.0;
            g = sdf3(ro + rd * t).x - off;
            float b = tb.y;
            for (int i = 0; i < 96; i++) {
                tp = t;
                gp = g;
                t += max(-g, 2.0 * eps);
                if (t >= tb.y) {
                    break;
                }
                g = sdf3(ro + rd * t).x - off;
                cost += 1.0;
                if (g > 0.0) {
                    b = gp < 0.0 ? tp + (t - tp) * gp / (gp - g) : tp;
                    break;
                }
            }
            // Inside the shape: the fill.
            fillOn = fillG > 0.0;
            if (fillOn) {
                fillT0 = a;
                fillDt = max(b - a, 1e-5) / float(FILL_STEPS);
                for (int i = 0; i <= FILL_STEPS; i++) {
                    fillKnot[i] = sd2((ro + rd * (a + fillDt * float(i))).xy);
                }
                cost += float(FILL_STEPS + 1);
            }
            walkGrid(a, b, cone, layers);
            fillOn = false;
            t = b + (WALL_ON ? 4.0 * eps : 1e-4);
            if (WALL_ON || films >= layers || t >= tb.y) {
                break;
            }
        }
        if (films >= layers || t >= tb.y) {
            return;
        }
        t += 4.0 * eps;
    }
}

void traceSpheres(vec2 tb, float cone, int layers) {
    float t = max(tb.x, 0.0);
    bool walking = false;
    ivec3 C = ivec3(0);
    vec3 tMax = vec3(0.0);
    vec3 tDelta = vec3(0.0);
    ivec3 stp = ivec3(0);
    for (int i = 0; i < 256; i++) {
        if (t > tb.y || films >= layers || through < 0.02) {
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
            vec3 q = (ro + rd * t - gridOrigin) / gridCell;
            C = clamp(ivec3(floor(q)), ivec3(0), gridDims - 1);
            vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
            vec3 inv = 1.0 / d;
            stp = ivec3(sign(d));
            tMax = t + (vec3(C) + step(0.0, d) - q) * gridCell * inv;
            tDelta = gridCell * abs(inv);
            sphereInside = false;
            walking = true;
        }
        float tn = min(tMax.x, min(tMax.y, tMax.z));
        float te = min(tn, tb.y);
        loadCell(C, t, te, false);
        sphereSegment(t, te, cone, layers, false);
        t = tn;
        int axis = tMax.x <= tMax.y && tMax.x <= tMax.z ? 0 : (tMax.y <= tMax.z ? 1 : 2);
        C[axis] += stp[axis];
        tMax[axis] += tDelta[axis];
        if (C[axis] < 0 || C[axis] >= gridDims[axis]) {
            // Out of the grid: no sphere is left ahead.
            break;
        }
        // Out of every sphere and well away from the shape: back to
        // tracing, which skips the empty cells faster than stepping.
        if (!sphereInside) {
            float s = sdf3(ro + rd * t).x;
            cost += 1.0;
            if (s > reachMax + 2.0 * gridCell) {
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
    vec3 rdV = normalize(vec3((px - principalPx) / focalPx, -1.0));
    vec3 roV = vec3(eye, camDist);
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
    // Every sphere, drift included, is inside the grid's box.
    vec3 gInv = 1.0 / mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
    vec3 g0 = (gridOrigin - ro) * gInv;
    vec3 g1 = (gridOrigin + vec3(gridDims) * gridCell - ro) * gInv;
    vec3 gLo = min(g0, g1);
    vec3 gHi = max(g0, g1);
    tb.x = max(tb.x, max(max(gLo.x, gLo.y), gLo.z));
    tb.y = min(tb.y, min(min(gHi.x, gHi.y), gHi.z));
    if (tb.x > tb.y || tb.y < 0.0) {
        outColor = debugView != 0 ? (debugView == 3 ? vec4(0.0, 0.0, 0.0, 1.0) : heat(0.0)) : vec4(miss, missA);
        return;
    }
    // Radius of the pixel's cone per unit of distance.
    float cone = pixelSize / focalPx;
    pixCone = cone;
#if CONTAIN == 0
    traceSpheres(tb, cone, clamp(maxLayers, 1, MAX_LAYERS));
#else
    traceContained(tb, cone, clamp(maxLayers, 1, MAX_LAYERS));
#endif
    shadeFilms();

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
// The shaders made so far, by containment mode and kind of backdrop.
const FRAG_BUBBLES = new Map<string, string>();
function fragBubbleFor(mode: 0 | 1 | 2, kind: number): string {
    const key = `${mode}:${kind}`;
    let frag = FRAG_BUBBLES.get(key);
    if (!frag) {
        frag = fragBubble(mode, kind);
        FRAG_BUBBLES.set(key, frag);
    }
    return frag;
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

// The bubbles and the grid over them, as uploaded.
type Foam = FoamData & {
    key: string;
    raw: WebGLTexture[];
    sphereTex: EffectTexture;
    cellTex: EffectTexture;
    indexTex: EffectTexture;
    edgeCellTex: EffectTexture;
    edgeIndexTex: EffectTexture;
    /** The params it was built for: it is drawn with these. */
    params: FoamParams;
    /** The spheres as drifted for the frame, and when it was. */
    moved: Float32Array;
    movedKey: string;
};

// The params the foam depends on, clamped.
type FoamParams = {
    halfDepth: number;
    cellSize: number;
    fill: FillOptions;
    wobble: number;
    containment: number;
};

/**
 * Fills the element's silhouette, extruded into 3D, with a foam of
 * transparent soap bubbles in thin-film colours.
 *
 * ```ts
 * vfx.add(img, { effect: new BubbleEffect({ roundness: 0.7 }) });
 * ```
 *
 * The volume is filled with big spheres spread at random but evenly
 * (`cellSize`), and the gaps they leave, between them and along the
 * outline, with smaller ones down to `minSize`. Where spheres overlap,
 * they are cut by a flat wall they share (a power diagram); where they
 * are exposed, they keep their round outside. `roundness` goes from a
 * flat-walled foam to nearly separate spheres. The films are found
 * exactly along each ray.
 *
 * The silhouette is the element's alpha (or the channel
 * {@link BubbleParams.sourceChannel | sourceChannel} picks), read back
 * when the effect starts and again when the element's aspect ratio
 * changes. Call {@link BubbleEffect.refresh | refresh()} after its
 * content changes. Films do not bend
 * light, so the page shows through the foam, dimmed by what the films
 * reflect; the output is premultiplied over it. With `backdropVisible`,
 * a backdrop is drawn behind the foam instead.
 *
 * The camera ({@link OrbitCameraParams}: `yaw`, `pitch`,
 * `orbitAnimation`, `fov`, …) works as in {@link GlassEffect}, with
 * angles in degrees. Set `drag: true` to orbit it with pointer drags that
 * start on the element, and `pointer: "tilt"` to turn it towards the
 * pointer.
 *
 * All params are read every frame, so you can mutate `params` live. The
 * bubbles are placed on the CPU, again whenever a placement param
 * changes (see {@link BubbleParams}).
 */
export class BubbleEffect implements Effect {
    params: BubbleParams;
    readonly #still: boolean;

    // Reads the silhouette back: when the effect starts, on refresh(),
    // and when the element's aspect ratio changes.
    readonly #source = new SourceCapture({
        longSide: BUBBLE_MASK_LONG,
        onRead: (r) => this.#onRead(r.pixels, r.width, r.height, r.aspect),
    });
    // `sourceChannel` of the last shape read; a change reads it again.
    #channel: SourceChannel | null = null;
    #pending: ShapeData | null = null;
    #shape: ShapeData | null = null;
    // The latest shape read. It takes over once its foam is placed.
    #next: ShapeData | null = null;
    readonly #passes = new ScenePasses();

    #gl: WebGL2RenderingContext | null = null;
    #sdfRaw: WebGLTexture | null = null;
    #lutRaw: WebGLTexture | null = null;
    #sdfTex: EffectTexture | null = null;
    #lutTex: EffectTexture | null = null;
    #foamData: Foam | null = null;
    // Places the bubbles off the page's thread, where it can. Made when
    // first needed (again after dispose()).
    #kernel: KernelWorker | null = null;
    // One job at a time: while it runs, param changes wait, and when it
    // comes back the next frame asks for the foam of the params then. A
    // reply is drawn even if the params moved on (a step closer), unless
    // the shape changed under it. The token drops replies after dispose().
    #foamBusy = false;
    #foamReady: {
        key: string;
        version: number;
        data: FoamData;
        params: FoamParams;
    } | null = null;
    // The key whose job or upload failed, so it is not asked again every
    // frame.
    #foamFailed: string | null = null;
    #foamToken = 0;
    // Bumped by each new shape, so its foam is placed again.
    #shapeVersion = 0;
    readonly #backdrop = new SceneBackdrop(GLASS_PALETTES);

    #time = 0;
    // The drift and the swirl so far: a change of speed only changes
    // their rate from then on.
    #driftTurns = 0;
    #swirlOffset = 0;
    // Drags, the "tilt", and the window listeners while `drag` is on or
    // `pointer` is "tilt".
    readonly #camera = new OrbitCamera(DEFAULT_PARAMS);
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
            // The raw textures are gone; upload them again. A readback in
            // flight was rejected; start it over.
            this.#source.contextRestored();
            this.#gl = ctx.gl;
            this.#sdfRaw = null;
            this.#lutRaw = null;
            this.#sdfTex = null;
            this.#lutTex = null;
            this.#foamData = null;
            this.#foamFailed = null;
            this.#backdrop.contextRestored();
            this.#pending = this.#pending ?? this.#next ?? this.#shape;
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
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
        // A new shape waits for its foam, then replaces the current one.
        if (this.#pending) {
            this.#next = this.#pending;
            this.#pending = null;
            this.#shapeVersion++;
        }
        this.#backdrop.update(ctx, this.params);
        if (!this.#still) {
            const dt = Math.min(ctx.deltaTime, 0.1);
            const p = this.params;
            const d = DEFAULT_PARAMS;
            this.#time += dt;
            this.#driftTurns += dt * Math.max(finite(p.speed, d.speed), 0);
            this.#swirlOffset += dt * finite(p.swirlSpeed, d.swirlSpeed);
        }
        const cam = this.#camera.update(this.params, {
            time: this.#time,
            dt: this.#still ? 0 : ctx.deltaTime,
            dims: ctx.dims,
            outputRect: padOutputRect(this.params.pad, ctx.dims),
            mouse: ctx.mouse,
            mouseViewport: ctx.mouseViewport,
            pixelRatio: ctx.pixelRatio,
            live: !this.#still,
            tilt: this.params.pointer === "tilt",
        });
        const scene = this.#draw(ctx, cam);
        this.#passes.output(ctx, scene, {
            pad: this.params.pad,
            antialias: this.params.antialias,
            raw: this.#debugView() !== 0,
        });
    }

    #debugView(): number {
        return DEBUG_VIEWS[this.params.debug] ?? 0;
    }

    // The params, clamped to what the shader can take, and what follows
    // from them.
    #resolved(): FoamParams {
        const p = this.params;
        const d = DEFAULT_PARAMS;
        const halfDepth = clamp(p.depth / 2, 0.005, 1, d.depth / 2);
        const cellSize = Math.max(finite(p.cellSize, d.cellSize), 0.02);
        const fill: FillOptions = {
            halfDepth,
            bevel: clamp(p.bevel, 0, halfDepth, Math.min(d.bevel, halfDepth)),
            cellSize,
            roundness: clamp(p.roundness, 0, 1, d.roundness),
            cellSizeRandomness: clamp(
                p.cellSizeRandomness,
                0,
                1,
                d.cellSizeRandomness,
            ),
            seed: clampInt(p.seed, 0, 0x7fffffff, d.seed),
            minSize: clamp(p.minSize, 0.05, 1, d.minSize),
        };
        const wobble = clamp(p.wobble, 0, WOBBLE_MAX, d.wobble);
        return {
            halfDepth,
            cellSize,
            fill,
            wobble,
            containment: clamp(p.containment, 0, 1, d.containment),
        };
    }

    // The borders, in world units; a width of 0 skips them in the shader.
    #borderUniforms(cellSize: number) {
        const p = this.params;
        const d = DEFAULT_PARAMS;
        const highlight = clamp(p.borderHighlight, 0, 2, d.borderHighlight);
        const share = clamp(p.borderWidth, 0, 0.5, d.borderWidth);
        return {
            borderWidth: share * cellSize,
            borderHighlight: highlight,
            // More water: a wider border and a thicker film at it.
            borderThickness: share * BORDER_NM_PER_WIDTH,
        };
    }

    // The bubbles for the params, placed by the kernel (in a worker where
    // it can) whenever the shape or a param it depends on changes. Until
    // the new foam comes back, the last one is drawn.
    #foam(ctx: EffectContext): Foam | null {
        const ready = this.#foamReady;
        if (ready) {
            this.#foamReady = null;
            if (
                ready.version === this.#shapeVersion &&
                !this.#adopt(ctx, ready)
            ) {
                this.#foamFailed = ready.key;
            }
        }
        const shape = this.#next ?? this.#shape;
        if (!shape) {
            return null;
        }
        const r = this.#resolved();
        const version = this.#shapeVersion;
        const key = `${version}|${JSON.stringify(r.fill)}|${r.wobble}|${r.containment}`;
        if (
            !this.#foamBusy &&
            this.#foamData?.key !== key &&
            this.#foamFailed !== key
        ) {
            this.#foamBusy = true;
            const token = this.#foamToken;
            this.#kernel ??= new KernelWorker(
                bubbleKernel as never,
                BUBBLE_KERNEL_SOURCE,
            );
            this.#kernel
                .run<FoamData>("buildFoam", {
                    shape: {
                        sdf: shape.sdf,
                        sdfW: shape.sdfW,
                        sdfH: shape.sdfH,
                        sdfRect: shape.sdfRect,
                    },
                    shapeKey: version,
                    fill: r.fill,
                    wobble: r.wobble,
                    containment: r.containment,
                })
                .then(
                    (data) => {
                        if (token === this.#foamToken) {
                            this.#foamBusy = false;
                            this.#foamReady = { key, version, data, params: r };
                        }
                    },
                    (e) => {
                        if (token === this.#foamToken) {
                            this.#foamBusy = false;
                            this.#foamFailed = key;
                            console.warn(
                                "[VFX-JS] BubbleEffect could not place its bubbles:",
                                e,
                            );
                        }
                    },
                );
        }
        return this.#foamData;
    }

    // Switch to a foam that came back, and to the shape it was placed in.
    // False when a texture could not be made; the last foam stays.
    #adopt(
        ctx: EffectContext,
        ready: { key: string; data: FoamData; params: FoamParams },
    ): boolean {
        const gl = ctx.gl;
        const next = this.#next;
        let sdf: WebGLTexture | null = null;
        if (next) {
            sdf = uploadFloatTexture(gl, next.sdfW, next.sdfH, next.sdf);
            ctx.resetState();
            if (!sdf) {
                return false;
            }
        }
        const foam = this.#uploadFoam(ctx, ready.key, ready.data, ready.params);
        if (!foam) {
            gl.deleteTexture(sdf);
            return false;
        }
        this.#freeFoam();
        this.#foamData = foam;
        if (next && sdf) {
            gl.deleteTexture(this.#sdfRaw);
            this.#sdfRaw = sdf;
            this.#sdfTex = ctx.wrapTexture(sdf, {
                size: [next.sdfW, next.sdfH],
                filter: "linear",
                wrap: "clamp",
            });
            this.#shape = next;
            this.#next = null;
        }
        return true;
    }

    #uploadFoam(
        ctx: EffectContext,
        key: string,
        data: FoamData,
        params: FoamParams,
    ): Foam | null {
        const { grid } = data;
        const edgeGrid = data.edgeGrid ?? grid;
        const gl = ctx.gl;
        const raw: WebGLTexture[] = [];
        const textures: EffectTexture[] = [];
        const layers: [Float32Array, number][] = [
            [grid.sphereData, grid.sphereTexH],
            [grid.cellData, grid.cellTexH],
            [grid.index, grid.indexTexH],
        ];
        if (edgeGrid !== grid) {
            layers.push(
                [edgeGrid.cellData, edgeGrid.cellTexH],
                [edgeGrid.index, edgeGrid.indexTexH],
            );
        }
        for (const [data, h] of layers) {
            const tex = uploadDataTexture(gl, BUBBLE_TEX_W, h, data);
            if (!tex) {
                break;
            }
            raw.push(tex);
            textures.push(
                ctx.wrapTexture(tex, {
                    size: [BUBBLE_TEX_W, h],
                    filter: "nearest",
                    wrap: "clamp",
                }),
            );
        }
        ctx.resetState();
        if (textures.length < layers.length) {
            for (const tex of raw) {
                gl.deleteTexture(tex);
            }
            return null;
        }
        return {
            ...data,
            key,
            raw,
            sphereTex: textures[0],
            cellTex: textures[1],
            indexTex: textures[2],
            edgeCellTex: textures[edgeGrid === grid ? 1 : 3],
            edgeIndexTex: textures[edgeGrid === grid ? 2 : 4],
            params,
            moved: grid.sphereData.slice(),
            movedKey: "",
        };
    }

    // Drift the spheres and upload them: a slow wander of length <= wobble
    // times the radius, from a random phase per sphere.
    #move(ctx: EffectContext, foam: Foam): void {
        const wobble = foam.params.wobble;
        const key = `${this.#driftTurns}`;
        if (foam.movedKey === key) {
            return;
        }
        foam.movedKey = key;
        const src = foam.grid.sphereData;
        const out = foam.moved;
        const f = foam.drift;
        const w = Math.PI * 2 * this.#driftTurns;
        for (let i = 0; i < foam.grid.count; i++) {
            const amp = wobble * src[i * 4 + 3] * 0.5774;
            for (let a = 0; a < 3; a++) {
                const phase = w * f[i * 6 + a] + Math.PI * 2 * f[i * 6 + 3 + a];
                out[i * 4 + a] = src[i * 4 + a] + amp * Math.sin(phase);
            }
        }
        const gl = ctx.gl;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.bindTexture(gl.TEXTURE_2D, foam.raw[0]);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            BUBBLE_TEX_W,
            foam.grid.sphereTexH,
            gl.RGBA,
            gl.FLOAT,
            out,
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
        ctx.resetState();
    }

    // The thin-film colours, uploaded when first needed.
    #lut(ctx: EffectContext): EffectTexture | null {
        if (!this.#lutTex) {
            const lut = uploadFloatTexture(
                ctx.gl,
                THIN_FILM_LUT_W,
                THIN_FILM_LUT_H,
                thinFilmLut(),
            );
            ctx.resetState();
            if (lut) {
                this.#lutRaw = lut;
                this.#lutTex = ctx.wrapTexture(lut, {
                    size: [THIN_FILM_LUT_W, THIN_FILM_LUT_H],
                    filter: "linear",
                    wrap: "clamp",
                });
            }
        }
        return this.#lutTex;
    }

    #freeFoam(): void {
        const f = this.#foamData;
        if (f && this.#gl) {
            for (const tex of f.raw) {
                this.#gl.deleteTexture(tex);
            }
        }
        this.#foamData = null;
    }

    #draw(ctx: EffectContext, cam: OrbitCameraView): EffectRenderTarget | null {
        const foam = this.#foam(ctx);
        const shape = this.#shape;
        const sdfTex = this.#sdfTex;
        const lutTex = this.#lut(ctx);
        if (!foam || !shape || !sdfTex || !lutTex) {
            return null;
        }
        const p = this.params;
        const d = DEFAULT_PARAMS;
        const scene = this.#passes.scene(ctx, p.pad, p.resolution);
        const [, , ow, oh] = padOutputRect(p.pad, ctx.dims);
        if (!scene || ow <= 0 || oh <= 0) {
            return null;
        }
        const t = this.#time;
        const r = foam.params;
        // The cells may be larger than asked, to fit the shape.
        const cellSize = foam.fill.cellSize;
        const grid = foam.grid;
        let maxR = 0;
        for (let i = 0; i < grid.count; i++) {
            maxR = Math.max(maxR, grid.spheres[i * 4 + 3]);
        }
        // How far any sphere reaches out of the shape, drift included,
        // with a margin for the field's filtering.
        const reach =
            foam.fill.reach + foam.grow + r.wobble * maxR + 0.02 * cellSize;
        this.#move(ctx, foam);
        const containment = r.containment;
        const mode = containment <= 0 ? 0 : containment >= 0.995 ? 1 : 2;
        const backdrop = this.#backdrop.uniforms(
            p,
            t,
            r.halfDepth + reach,
            sdfTex,
        );

        ctx.draw({
            frag: fragBubbleFor(mode, backdropKind(p.backdrop)),
            uniforms: {
                sdfTex,
                sdfRect: shape.sdfRect,
                halfDepth: r.halfDepth,
                rounding: r.fill.bevel ?? 0,
                shapeHalf: shape.shapeHalf,
                boxMargin: reach,
                viewRot: cam.viewRot,
                camDist: cam.camDist,
                focalPx: cam.focalPx,
                eye: [cam.eye[0], cam.eye[1]],
                principalPx: cam.principalPx,
                bufferPx: [ow, oh],
                pixelSize: ow / scene.width,
                maxLayers: clampInt(p.maxLayers, 1, MAX_LAYERS, d.maxLayers),
                seed: r.fill.seed,
                cellSize,
                sphereTex: foam.sphereTex,
                cellTex: foam.cellTex,
                indexTex: foam.indexTex,
                gridOrigin: grid.origin,
                gridCell: grid.cell,
                gridDims: grid.dims,
                edgeCellTex: foam.edgeCellTex,
                edgeIndexTex: foam.edgeIndexTex,
                edgeOrigin: (foam.edgeGrid ?? grid).origin,
                edgeCell: (foam.edgeGrid ?? grid).cell,
                edgeDims: (foam.edgeGrid ?? grid).dims,
                reachMax: reach,
                clipOff: (1 - containment) * reach,
                warpK: containment / Math.max(1 - containment, 1e-3),
                fillG: foam.fillG,
                fillDepth: FILL_DEPTH * cellSize,
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
                swirlOffset: this.#swirlOffset,
                reflection: Math.max(finite(p.reflection, d.reflection), 0),
                backdropAround: p.backdropAround ? 1 : 0,
                rimCos: RIM_COS * (1 - clamp(p.rim, 0, 1, d.rim)),
                tint: colorOf(p.tint, d.tint),
                tintStrength: clamp(p.tintStrength, 0, 1, d.tintStrength),
                opacity: clamp(p.opacity, 0, 1, d.opacity),
                bodyColor: colorOf(p.color, d.color),
                ...this.#borderUniforms(cellSize),
                ...backdrop,
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
     * The foam keeps the current shape until the new one has been read
     * back (a few frames later), then switches to it and places its
     * bubbles again. A change of the element's aspect ratio is
     * recaptured automatically once its size settles; a change of size
     * alone needs none.
     *
     * Safe to call at any time and any number of times; a call while a
     * capture is pending restarts it, so the latest content wins.
     */
    refresh(): void {
        this.#source.refresh();
    }

    // Build the shape from the element read back. False when the
    // silhouette is empty, to try again later.
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
        this.#pending = shape;
        this.#channel = channel;
        return true;
    }

    dispose(): void {
        this.#camera.dispose();
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        this.#gl?.deleteTexture(this.#sdfRaw);
        this.#gl?.deleteTexture(this.#lutRaw);
        this.#sdfRaw = null;
        this.#lutRaw = null;
        this.#sdfTex = null;
        this.#lutTex = null;
        this.#freeFoam();
        this.#kernel?.dispose();
        this.#kernel = null;
        this.#foamToken++;
        this.#foamBusy = false;
        this.#foamReady = null;
        this.#foamFailed = null;
        this.#backdrop.dispose(this.#gl);
        this.#gl = null;
        this.#passes.dispose();
        this.#shape = null;
        this.#next = null;
        this.#pending = null;
        // Start over like a new instance if it is added again.
        this.#source.reset();
        this.#channel = null;
    }
}
