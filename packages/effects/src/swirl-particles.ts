// Particles that crawl and curl over an extruded silhouette.
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
//
// 1. The silhouette is read back from the element (`ctx.src` alpha), and a
//    2D signed distance field is built on the CPU. The 3D shape is the
//    analytic extrusion of that field, so its SDF and normal are cheap to
//    evaluate anywhere in the shaders.
// 2. Spawn points are scattered over the extruded surface (both caps and
//    the side walls), weighted by area.
// 3. A fragment-shader simulation (MRT: position + age, velocity +
//    generation) moves each particle with a flow tangent to the surface,
//    `cross(normal, noiseVector)`, plus curl noise, plus an attraction back
//    to the surface that weakens with age, so old particles peel off.
// 4. The particles are drawn as opaque fibres with a depth buffer,
//    shaded from the SDF, coloured by a gradient (optionally mixed with the
//    source colour at the spawn point). A few "fireflies" are drawn again
//    additively in HDR, then bloomed. The output is premultiplied over
//    transparency.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectGeometry,
    EffectRenderTarget,
    EffectTexture,
    EffectUniforms,
} from "@vfx-js/core";
import {
    type BloomPyramid,
    createBloomPyramid,
    disposeBloomPyramid,
    GLSL_BLOOM_KNEE,
    upsampleBloomPyramid,
} from "./_bloom-common.js";
import { captureContent } from "./_capture.js";
import { parseHexColor } from "./_figma-common.js";
import { padOutputRect } from "./_pad.js";
import { clampDt, QUAD_VERTS, stateSizeFromCount } from "./_particle-common.js";

/**
 * One stop of a {@link SwirlParticlesParams.palette} gradient, like a
 * stop in a CSS `linear-gradient`.
 */
export type SwirlParticlesColorStop = {
    /** Position on the gradient, in [0, 1]. */
    offset: number;
    /** CSS hex colour (`"#rrggbb"` or `"#rgb"`). */
    color: string;
};

/** Name of a built-in {@link SWIRL_PARTICLES_PALETTES} gradient. */
export type SwirlParticlesPaletteName =
    | "nebula"
    | "ember"
    | "aurora"
    | "mono"
    | "sakura"
    | "ocean";

// Frozen, so a preset can't be edited in place by accident.
function stops(
    list: SwirlParticlesColorStop[],
): readonly SwirlParticlesColorStop[] {
    return Object.freeze(list.map((s) => Object.freeze(s)));
}

/**
 * Built-in particle gradients. Low offsets colour the shaded body, high
 * offsets the fast, glinting and peeled-off particles. Frozen: copy the
 * stops to edit them.
 */
export const SWIRL_PARTICLES_PALETTES: Readonly<
    Record<SwirlParticlesPaletteName, readonly SwirlParticlesColorStop[]>
> = Object.freeze({
    // Deep navy → blue → violet-pink → near white.
    nebula: stops([
        { offset: 0, color: "#0e1554" },
        { offset: 0.45, color: "#3a50d4" },
        { offset: 0.8, color: "#c478e0" },
        { offset: 1, color: "#f4e6ff" },
    ]),
    ember: stops([
        { offset: 0, color: "#2a0603" },
        { offset: 0.45, color: "#b0260c" },
        { offset: 0.8, color: "#ff9a2e" },
        { offset: 1, color: "#fff3cf" },
    ]),
    aurora: stops([
        { offset: 0, color: "#03262a" },
        { offset: 0.45, color: "#0d8f72" },
        { offset: 0.8, color: "#5cf2b0" },
        { offset: 1, color: "#e4fffb" },
    ]),
    mono: stops([
        { offset: 0, color: "#141519" },
        { offset: 0.45, color: "#4b4f58" },
        { offset: 0.8, color: "#b4b8c0" },
        { offset: 1, color: "#ffffff" },
    ]),
    sakura: stops([
        { offset: 0, color: "#3b0d2f" },
        { offset: 0.45, color: "#a8357a" },
        { offset: 0.8, color: "#f5a3c7" },
        { offset: 1, color: "#fff2f7" },
    ]),
    ocean: stops([
        { offset: 0, color: "#021a35" },
        { offset: 0.45, color: "#0a61a3" },
        { offset: 0.8, color: "#2fc6da" },
        { offset: 1, color: "#e9fcff" },
    ]),
});

export type SwirlParticlesParams = {
    /**
     * Number of particles, at most 1,048,576 (2^20). Live: lowering it
     * draws fewer particles without freeing memory; raising it past what
     * is allocated reallocates the particle state (the trails regrow).
     */
    count: number;
    /** Extrusion depth, relative to the long side of the element (= 2). */
    depth: number;
    /** Strength of the flow tangent to the surface. */
    swirl: number;
    /** Strength of the curl noise that makes the wisps. */
    curl: number;
    /** Spatial frequency of the curl noise. */
    curlScale: number;
    /** Overall flow speed, in world units per second (the long side is 2). */
    speed: number;
    /** How strongly particles are pulled back onto the surface. */
    attract: number;
    /** How much the pull fades with age, in [0, 1]. Old particles peel off. */
    peel: number;
    /** Mean particle lifetime in seconds (randomised ±40%). */
    life: number;
    /** Particle width in CSS px at the z = 0 plane. */
    pointSize: number;
    /**
     * Trail length, in seconds of travel. Each particle draws a curved
     * fibre through its recent positions, tapering towards the tail.
     * 0 draws dots. Fast particles are capped on screen at 14 particle
     * widths per 0.3 s of streak.
     */
    streak: number;
    /** Fraction of particles drawn as bright sparkles, in [0, 1]. */
    fireflyRatio: number;
    /** HDR intensity of the sparkles. */
    fireflyIntensity: number;
    /** Sparkle colour, CSS hex. */
    fireflyColor: string;
    /** Bloom intensity. 0 turns the bloom passes off. */
    bloom: number;
    /**
     * Particle colour gradient: a preset name or your own stops. Stops are
     * sorted by offset, the ends clamp, and colours blend linearly. Read
     * every frame; edits to the stops in place are picked up too.
     */
    palette: SwirlParticlesPaletteName | readonly SwirlParticlesColorStop[];
    /**
     * Mix from the palette colour (0) to the source element's colour at
     * each particle's spawn point (1). Lighting still applies on top.
     */
    sourceColor: number;
    /**
     * Direction towards the light, in view space: +x right, +y up, +z
     * towards the viewer. It stays fixed to the screen while the camera
     * orbits. Normalised internally.
     */
    lightDirection: readonly [number, number, number];
    /** Light colour, CSS hex. Tints the diffuse light and the glints. */
    lightColor: string;
    /** Strength of the diffuse light. 1 is the default look. */
    lightIntensity: number;
    /** Light on the side facing away from the light, in [0, 1]. */
    ambient: number;
    /**
     * How much the creases of the shape darken, in [0, 1]. At 0.7 (the
     * default) a fibre deep in a crease keeps 30% of its light; 0 turns
     * the darkening off.
     */
    occlusion: number;
    /** Strength of the glints on the fibres that face the light. */
    glint: number;
    /**
     * Cast a soft shadow onto the page behind the shape. The page is a
     * plane parallel to the screen, {@link shadowDistance} behind the
     * shape's centre, lit by {@link lightDirection}. A light from behind
     * (z ≤ 0) casts no shadow. The shadow is clipped to the output rect
     * (see {@link pad}). Fireflies cast none.
     */
    shadow: boolean;
    /** Opacity of the shadow, in [0, 1]. */
    shadowOpacity: number;
    /** Blur radius of the shadow (gaussian sigma), in CSS px. */
    shadowSoftness: number;
    /**
     * Distance from the shape's centre to the page behind it, in world
     * units (the long side of the element is 2). Further means a larger
     * offset.
     */
    shadowDistance: number;
    /** Shadow colour, CSS hex. */
    shadowColor: string;
    /** Camera yaw in radians. 0 looks straight at the front cap. */
    yaw: number;
    /** Camera pitch in radians. 0 looks straight at the front cap. */
    pitch: number;
    /**
     * Amplitude of the slow camera wobble, in radians. 0 keeps the camera
     * still (pointer drags still orbit it when {@link drag} is on).
     */
    orbit: number;
    /**
     * Field of view in degrees, measured across the element's long side.
     * The camera moves so the z = 0 plane keeps the element's size, so this
     * only changes the strength of the perspective (like a dolly zoom).
     */
    fov: number;
    /** Camera zoom. 1 = the z = 0 plane matches the element size. */
    zoom: number;
    /**
     * Orbit the camera by dragging the pointer. A drag starts on the
     * element's box and can then leave it. While on, it listens for
     * pointer events on `window`; UI on top of the element that should
     * not orbit can stop `pointerdown` propagation.
     */
    drag: boolean;
    /**
     * How the particles react to the pointer hovering over the page:
     *
     * - `"none"` (default): they don't.
     * - `"repel"`: particles near the cursor on screen (within
     *   {@link mouseRadius}) are pushed away from it, opening a hole the
     *   flow goes around. The hole stays while the pointer rests and
     *   refills once it leaves the page.
     * - `"tilt"`: hover parallax. The shape turns to face the cursor,
     *   up to about 0.35 rad × {@link mouseStrength} when the cursor is
     *   half a viewport away from the element's centre, and back to
     *   front-on once the pointer leaves the page. Adds to
     *   {@link yaw} / {@link pitch}, the {@link orbit} wobble and drags.
     *
     * Both ease in and out. Ignored by still frames. While not `"none"`,
     * it listens for pointer events on `window` to tell when the pointer
     * leaves the page.
     */
    mouse: "none" | "repel" | "tilt";
    /** Radius of the `"repel"` hole, in CSS px on screen. */
    mouseRadius: number;
    /**
     * Strength of the pointer interaction. `"repel"`: scales the push;
     * at 1 the hole opens to about {@link mouseRadius} at the default
     * `speed`. `"tilt"`: scales the largest tilt angle (about 0.35 rad
     * at 1).
     */
    mouseStrength: number;
    /**
     * Extra pad around the element in CSS px for the particles, bloom and
     * shadow to draw into, or `"fullscreen"` to draw over the whole
     * canvas. The default, 200, holds the wisps and the drop shadow of
     * the default look on elements up to about 1000 px wide. A smaller
     * pad, a larger element, `zoom`, strong tilts or a long
     * `shadowDistance` clip them.
     */
    pad: number | "fullscreen";
    /**
     * Smooth the edges of the fibres with 4× multisampling (MSAA).
     * Off by default: the particle buffer then takes about 5 times the
     * memory, 10 times with its depth buffer, which adds up fast with a
     * large pad or `"fullscreen"` on a high-DPR screen. Falls back to no
     * multisampling, with a warning, on GPUs that can't do it.
     */
    antialias: boolean;
};

/** Options for {@link SwirlParticlesEffect}'s constructor. */
export type SwirlParticlesEffectOptions = {
    /**
     * Render a still frame: simulate a fixed number of steps once, then
     * stop. The frame is drawn again only when params or the element's
     * size change, so a video source's colours stay as they were. For
     * visual tests and `prefers-reduced-motion`.
     */
    still?: boolean;
};

const DEFAULT_PARAMS: SwirlParticlesParams = {
    count: 65536,
    depth: 0.22,
    swirl: 1.0,
    curl: 0.8,
    curlScale: 2.2,
    speed: 0.14,
    attract: 10.0,
    peel: 0.8,
    life: 4.0,
    pointSize: 1.4,
    streak: 0.3,
    fireflyRatio: 0.01,
    fireflyIntensity: 6.0,
    fireflyColor: "#ffd2ec",
    bloom: 0.9,
    palette: "nebula",
    sourceColor: 0,
    lightDirection: [-0.45, 0.75, 0.55],
    lightColor: "#ffffff",
    lightIntensity: 1,
    ambient: 0.25,
    occlusion: 0.7,
    glint: 0.7,
    shadow: false,
    shadowOpacity: 0.35,
    shadowSoftness: 14,
    shadowDistance: 0.15,
    shadowColor: "#1c2233",
    yaw: 0,
    pitch: 0,
    orbit: 0.4,
    fov: 35,
    zoom: 1.0,
    drag: false,
    mouse: "none",
    mouseRadius: 120,
    mouseStrength: 1,
    pad: 200,
    antialias: false,
};

// Largest `count`: 2^20, a 1024² state texture.
const MAX_COUNT = 1 << 20;
// Long side of the silhouette read back from the element, in px.
const MASK_LONG = 400;
// Frames to wait before reading the silhouette back, and the most frames
// between retries while it is empty (the gap doubles from the first).
const CAPTURE_DELAY = 3;
const CAPTURE_RETRY_MAX = 120;
// Recapture when the element's aspect ratio drifts this far (relative)
// from the one the shape was built with, once the size has held still
// for RESIZE_SETTLE frames.
const ASPECT_TOLERANCE = 0.01;
const RESIZE_SETTLE = 5;
// Padding of the SDF grid around the silhouette, relative to MASK_LONG.
const SDF_PAD = 0.3;
// Spawn points on the surface: SPAWN_SIZE² of them.
const SPAWN_SIZE = 256;
const BLOOM_LEVELS = 6;
// How much of each coarser bloom level adds into the next finer one.
const BLOOM_SCATTER = 0.85;
// Brightness above which pixels bloom: only the HDR sparkles reach it.
const BLOOM_THRESHOLD = 1.0;
// Texels of the baked palette gradient.
const PALETTE_SIZE = 256;
// Longest simulation step. A frame's dt (capped at 0.1 s by clampDt) is
// split into ceil(dt / SIM_STEP) equal steps, so the flow keeps real time
// down to 10 fps and stays as stable as at 30 fps. Below 30 fps each frame
// then runs up to MAX_SUBSTEPS sim passes (and trail pushes), the price of
// not slowing down.
const SIM_STEP = 1 / 30;
// = clampDt's 0.1 s cap / SIM_STEP.
const MAX_SUBSTEPS = 3;
const STILL_STEPS = 90;
// Pitch wobble relative to the yaw wobble.
const PITCH_WOBBLE = 0.3;
// Near / far planes relative to the camera distance.
const NEAR_K = 0.05 / 3.2;
const FAR_K = 1 + 6 / 3.2;
// Past positions kept per particle. The trail is TRAIL_SAMPLES segments:
// current position → newest sample → … → oldest sample, cut at `streak`.
const TRAIL_SAMPLES = 6;
// The history slots are tiled in one atlas render target.
const HIST_COLS = Math.ceil(Math.sqrt(TRAIL_SAMPLES));
const HIST_ROWS = Math.ceil(TRAIL_SAMPLES / HIST_COLS);
// Ago of a slot that holds no sample.
const HIST_NEVER = 1e9;
// Generations wrap at this, so they stay exact in a 16-bit float
// (integers up to 2048 are) and fit the trail's respawn check.
const GEN_WRAP = 1024;
// Shadow coverage levels, from 1/2 to 1/16 of the scene resolution. The
// blur runs on the coarsest level it still needs, so wide blurs stay cheap.
const SHADOW_LEVELS = 4;
// Largest blur sigma, in texels of a shadow level, before moving down one.
const SHADOW_MAX_SIGMA = 6;
// Time constant of the shadow coverage's running average, in seconds of
// simulation. The binary coverage has holes that move every frame; the
// average hides them, at the cost of the shadow trailing a fast move.
const SHADOW_TAU = 0.1;
// Pointer interaction (`mouse`). Seconds for the force to fade in / out.
const MOUSE_FADE = 0.15;
// Time constant of the smoothed cursor that "repel" pushes from, seconds.
const REPEL_POS_TAU = 0.06;
// Push speed at the cursor, in radii (at the particle's depth) per second,
// at mouseStrength 1.
const REPEL_K = 4;
// Largest tilt at mouseStrength 1, radians, and its time constant.
const TILT_MAX = 0.35;
const TILT_TAU = 0.25;

// ---------------------------------------------------------------------------
// GLSL
// ---------------------------------------------------------------------------

// Ashima / Stefan Gustavson 3D simplex noise with analytic gradient (MIT).
const GLSL_NOISE = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoiseGrad(vec3 v, out vec3 gradient) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;
    vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
    vec4 temp = m2 * m * pdotx;
    gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
    gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
    gradient *= 105.0;
    return 105.0 * dot(m4, pdotx);
}
`;

const GLSL_HASH = `
uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
float rnd(uint v) {
    return float(pcg(v)) * (1.0 / 4294967296.0);
}
`;

// sdfTex: r = 2D signed distance (world units), gb = its gradient.
// The 3D shape is that silhouette extruded to [-halfDepth, halfDepth],
// with edges rounded by \`rounding\`.
const GLSL_SDF = `
uniform sampler2D sdfTex;
uniform vec4 sdfRect;
uniform float halfDepth;
uniform float rounding;

vec3 sd2(vec2 p) {
    vec2 uv = (p - sdfRect.xy) / sdfRect.zw;
    vec2 cuv = clamp(uv, 0.0, 1.0);
    vec4 s = texture(sdfTex, cuv);
    vec2 outside = (uv - cuv) * sdfRect.zw;
    float lo = length(outside);
    vec2 g = lo > 0.0 ? normalize(outside + s.gb * 0.05) : s.gb;
    float gl = length(g);
    return vec3(s.r + lo, gl > 1e-5 ? g / gl : vec2(0.0, 1.0));
}

// x = distance, yzw = unit gradient.
vec4 sdf3(vec3 p) {
    vec3 s = sd2(p.xy);
    float sz = p.z >= 0.0 ? 1.0 : -1.0;
    vec2 w = vec2(s.x + rounding, abs(p.z) - halfDepth + rounding);
    if (w.x > 0.0 && w.y > 0.0) {
        float l = length(w);
        return vec4(l - rounding, vec3(s.yz * w.x, sz * w.y) / l);
    }
    if (w.x > w.y) {
        return vec4(w.x - rounding, s.yz, 0.0);
    }
    return vec4(w.y - rounding, 0.0, 0.0, sz);
}
`;

// Spawn points are a pure function of (id, generation), so the colour
// pass can find where a particle was born without storing it.
const GLSL_SPAWN = `
uniform sampler2D spawnTex;
uniform int spawnSize;

uint spawnKey(uint id, float gen) {
    return pcg(id ^ (uint(gen) * 2654435769u));
}

// xy = world position, z = position along the depth / halfDepth (-1..1).
vec4 spawnPoint(uint key) {
    int idx = int(key % uint(spawnSize * spawnSize));
    return texelFetch(spawnTex, ivec2(idx % spawnSize, idx / spawnSize), 0);
}
`;

const FRAG_SIM = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

// State: pos = xyz + age / life (0..1), vel = xyz + generation (wraps at
// GEN_WRAP). Both stay meaningful in 16-bit float targets.
uniform sampler2D posTex;
uniform sampler2D velTex;
uniform int stateWidth;
// Ids at or past \`count\` are not drawn and keep their state.
uniform int count;
// 1: respawn every particle. 2: the state grew; copy the first
// \`oldCount\` particles from the old, \`oldWidth\` wide state, respawn the rest.
uniform int reset;
uniform sampler2D oldPosTex;
uniform sampler2D oldVelTex;
uniform int oldWidth;
uniform int oldCount;
// 1: the state targets are 16-bit floats.
uniform int halfState;
uniform int frameSeed;
uniform float lifeMean;
uniform float time;
uniform float dt;
uniform float swirl;
uniform float curl;
uniform float curlScale;
uniform float speed;
uniform float attract;
uniform float peel;
// Pointer repel: strength × fade (0 = off), the smoothed cursor and the
// radius in buffer px, and the camera that draws the particles.
uniform float mouseForce;
uniform vec2 mousePx;
uniform float mouseRadiusPx;
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
uniform vec2 centerPx;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;

${GLSL_HASH}
${GLSL_NOISE}
${GLSL_SDF}
${GLSL_SPAWN}

float lifeOf(uint id, float gen) {
    return lifeMean * mix(0.6, 1.4, rnd(id * 1664525u + uint(gen) * 1013904223u + 7u));
}

// Round onto the 16-bit float grid, up or down at random. In 16-bit
// state targets, an age step smaller than half a step of the grid would
// otherwise round away every frame and the particle would never die;
// this way the steps add up on average.
float roundHalf(float x, float r) {
    float e = exp2(floor(log2(max(x, 6.2e-5))) - 10.0);
    return floor(x / e + r) * e;
}

vec3 spawn(uint id, float gen) {
    uint key = spawnKey(id, gen);
    vec4 s = spawnPoint(key);
    vec3 p = vec3(s.xy, s.z * halfDepth);
    // A thin fuzzy layer instead of an exact shell.
    vec4 d = sdf3(p);
    return p + d.yzw * (rnd(key + 11u) * 0.012 - d.x);
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int i = texel.y * stateWidth + texel.x;
    uint id = uint(i);

    if (reset == 2 && i < oldCount) {
        ivec2 o = ivec2(i % oldWidth, i / oldWidth);
        outPos = texelFetch(oldPosTex, o, 0);
        outVel = texelFetch(oldVelTex, o, 0);
        return;
    }
    if (reset != 0) {
        // Random ages, so the particles don't all respawn together.
        outPos = vec4(spawn(id, 0.0), rnd(id * 7919u + 3u));
        outVel = vec4(0.0);
        return;
    }

    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    if (i >= count) {
        outPos = P;
        outVel = V;
        return;
    }

    float gen = V.w;
    float life = lifeOf(id, gen);
    float ageN = P.w + dt / life;
    if (halfState == 1) {
        ageN = roundHalf(ageN, rnd(id * 2654435761u + uint(frameSeed) * 2246822519u + 29u));
    }
    if (ageN >= 1.0) {
        gen = mod(gen + 1.0, ${GEN_WRAP.toFixed(1)});
        outPos = vec4(spawn(id, gen), 0.0);
        outVel = vec4(0.0, 0.0, 0.0, gen);
        return;
    }

    vec3 p = P.xyz;
    vec3 v = V.xyz;
    vec4 s = sdf3(p);
    vec3 n = s.yzw;
    float d = s.x;

    // How firmly this particle still holds on to the surface.
    float peeler = smoothstep(0.5, 0.9, rnd(id * 31u + uint(gen) * 17u + 5u));
    float hold = 1.0 - peel * peeler * smoothstep(0.2, 0.9, ageN);

    // Tangential flow: cross(normal, A), with A a slow, low-frequency
    // vector field around a drifting main axis.
    vec3 ga;
    snoiseGrad(p * 0.55 + vec3(0.0, 0.0, time * 0.05), ga);
    vec3 axis = normalize(vec3(0.35 * sin(time * 0.11), 1.0, 0.45 * cos(time * 0.07)));
    vec3 A = normalize(axis + ga * 0.35);
    vec3 sw = cross(n, A);

    // Divergence-free noise: cross of two noise gradients.
    vec3 g1;
    vec3 g2;
    vec3 q = p * curlScale;
    snoiseGrad(q + vec3(time * 0.09, 0.0, 0.0), g1);
    snoiseGrad(q + vec3(31.4, 17.7, 9.2) - vec3(0.0, time * 0.08, 0.0), g2);
    vec3 cu = cross(g1, g2) * 0.12;
    // Attached particles stay tangent; peeled ones may lift off.
    vec3 cuT = cu - n * dot(cu, n) * hold;

    float near = exp(-max(d, 0.0) * 5.0);
    vec3 target = speed * (sw * swirl * mix(0.5, 1.0, near) + cuT * curl)
                - n * d * attract * hold
                + n * speed * 0.8 * (1.0 - hold);

    // Repel: measured on screen, with the camera that draws the particle,
    // pushed in the view plane. The push is in radii (at the particle's
    // depth) per second, so the hole is the same on any element size.
    if (mouseForce > 0.0) {
        vec3 qv = viewRot * p;
        float depth = camDist - qv.z;
        if (depth > 1e-3) {
            vec2 dd = centerPx + qv.xy * focalPx / depth - mousePx;
            float r = length(dd) / mouseRadiusPx;
            if (r < 1.0) {
                float f = 1.0 - r * r;
                f *= f;
                float a = rnd(id * 97u + 1u) * 6.2831853;
                vec2 dir = r > 1e-3 ? dd / (r * mouseRadiusPx) : vec2(cos(a), sin(a));
                float radiusW = mouseRadiusPx * depth / focalPx;
                // Inverse rotation: view plane → world.
                target += (vec3(dir, 0.0) * viewRot) * (mouseForce * ${REPEL_K.toFixed(1)} * radiusW * f);
            }
        }
    }

    v = mix(v, target, 1.0 - exp(-dt * 5.0));
    p += v * dt;

    outPos = vec4(p, ageN);
    outVel = vec4(v, gen);
}
`;

// Per particle, once a frame: the colour the body and every segment of
// its trail share. A = base colour + how far the particle is off the
// surface (0..1), B = highlight colour.
const FRAG_ATTR = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform sampler2D paletteTex;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 shapeHalf;
uniform float sourceColor;
uniform float time;
uniform float speed;
uniform int stateWidth;
uniform int count;

layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;

${GLSL_HASH}
${GLSL_NOISE}
${GLSL_SDF}
${GLSL_SPAWN}

vec3 ramp(float t) {
    float u = (clamp(t, 0.0, 1.0) * ${(PALETTE_SIZE - 1).toFixed(1)} + 0.5) / ${PALETTE_SIZE.toFixed(1)};
    return textureLod(paletteTex, vec2(u, 0.5), 0.0).rgb;
}

// Straight colour of the source where this particle was born.
vec3 spawnColor(uint id, float gen) {
    vec2 xy = spawnPoint(spawnKey(id, gen)).xy;
    // Side-wall points sit on the contour; step inside to skip the AA edge.
    vec3 s = sd2(xy);
    xy -= s.yz * max(s.x + 0.01, 0.0);
    vec2 uv = clamp(xy / (2.0 * shapeHalf) + 0.5, 0.0, 1.0);
    vec4 c = textureLod(src, srcRectUv.xy + uv * srcRectUv.zw, 0.0);
    return c.a > 1e-3 ? c.rgb / c.a : vec3(0.0);
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int i = texel.y * stateWidth + texel.x;
    if (i >= count) {
        outA = vec4(0.0);
        outB = vec4(0.0);
        return;
    }
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    vec3 p = P.xyz;
    float off = clamp(sdf3(p).x / 0.08, 0.0, 1.0);
    float r = rnd(id * 2246822519u + 13u);

    // Colour attribute: slow noise over the surface + speed + per particle.
    vec3 gn;
    float nz = snoiseGrad(p * 1.6 + vec3(0.0, time * 0.05, 0.0), gn);
    float spd = length(V.xyz) / max(speed, 1e-4);
    float t = 0.3 + 0.35 * nz + 0.3 * clamp(spd - 0.5, 0.0, 1.5) + 0.3 * (r - 0.5);
    t += 0.4 * off;
    vec3 base = ramp(t);
    vec3 highlight = ramp(1.0);
    if (sourceColor > 0.0) {
        // Carried from the spawn point like paint; t keeps some texture.
        vec3 sc = spawnColor(id, V.w);
        base = mix(base, sc * mix(0.85, 1.15, clamp(t, 0.0, 1.0)), sourceColor);
        highlight = mix(highlight, mix(sc, vec3(1.0), 0.5), sourceColor);
    }
    outA = vec4(base, off);
    outB = vec4(highlight, 0.0);
}
`;

type ParticlePass = "body" | "shadow" | "firefly";

// - body: instanced trails. Each instance is TRAIL_SAMPLES quads, one per
//   segment of the particle's recent path, so the fibres curve. A quad
//   runs half its width past both ends of its segment, so consecutive
//   segments overlap at bends.
// - shadow: the head segment of each body particle, flattened onto the
//   page along the light, into the shadow coverage target.
// - firefly: points.
function makeParticleVert(pass: ParticlePass): string {
    return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define ${pass.toUpperCase()}
#define TRAIL_SAMPLES ${TRAIL_SAMPLES}
#define HIST_COLS ${HIST_COLS}

uniform int idOffset;
#ifdef FIREFLY
uniform float fireflyIntensity;
uniform vec3 fireflyColor;
uniform float time;
#else
in vec2 position;
uniform sampler2D velTex;
uniform float streak;
uniform sampler2D histTex;
// Newest first: slot in the history atlas, and seconds since it was written.
uniform float histSlot[TRAIL_SAMPLES];
uniform float histAgo[TRAIL_SAMPLES];
uniform sampler2D attrA;
#endif
#ifdef BODY
in float seg;
uniform sampler2D attrB;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform float ambient;
uniform float occlusion;
uniform float glintAmount;
#endif
#ifdef SHADOW
// Towards the light, z > 0; the page is at view z = -shadowDepth.
uniform vec3 shadowLight;
uniform float shadowDepth;
#endif

uniform sampler2D posTex;
uniform int stateWidth;
uniform mat3 viewRot;
uniform float camDist;
uniform float camNear;
uniform float camFar;
uniform float focalPx;
uniform vec2 centerPx;
uniform vec2 bufferPx;
uniform float pointPx;

out vec3 vColor;
out vec2 vLocal;
out vec2 vShape;

${GLSL_HASH}
${pass === "body" ? GLSL_SDF : ""}

void cull() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vColor = vec3(0.0);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
}

// Camera space: xy in buffer px, z = distance from the camera.
vec3 project(vec3 p) {
    vec3 q = viewRot * p;
#ifdef SHADOW
    // Flatten onto the page along the light. Points behind the page
    // (the page cuts the shape when shadowDepth is small) lie on it.
    q -= shadowLight * (max(q.z + shadowDepth, 0.0) / shadowLight.z);
#endif
    float depth = camDist - q.z;
    return vec3(centerPx + q.xy * focalPx / max(depth, 1e-3), depth);
}

#ifndef FIREFLY
vec4 histAt(int k, ivec2 texel) {
    int slot = int(histSlot[k]);
    ivec2 o = ivec2(slot % HIST_COLS, slot / HIST_COLS) * stateWidth;
    return texelFetch(histTex, o + texel, 0);
}
#endif

void main() {
    int i = gl_InstanceID + idOffset;
    ivec2 texel = ivec2(i % stateWidth, i / stateWidth);
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec3 p = P.xyz;
    float ageN = P.w;

    // Grow in, shrink out: opaque particles can't fade.
    float lifeScale = smoothstep(0.0, 0.08, ageN) * (1.0 - smoothstep(0.85, 1.0, ageN));
    vec3 c = project(p);
    if (lifeScale <= 0.01 || c.z < camNear) {
        cull();
        return;
    }
    float persp = camDist / c.z;
    float r = rnd(id * 2246822519u + 13u);

#ifdef FIREFLY
    float zLin = (c.z - camNear) / (camFar - camNear);
    float flick = pow(0.5 + 0.5 * sin(time * (3.0 + r * 5.0) + r * 40.0), 6.0);
    // Nudge towards the camera so the fibres don't bury every sparkle.
    zLin -= 0.03 / (camFar - camNear);
    gl_Position = vec4(c.xy / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    gl_PointSize = pointPx * persp * (1.4 + 1.6 * flick) * lifeScale;
    vColor = fireflyColor * fireflyIntensity * (0.25 + 1.75 * flick);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
#else
    vec4 A = texelFetch(attrA, texel, 0);
    float off = A.w;
    float w = max(pointPx * persp * lifeScale * mix(1.0, 0.6, off), 1.0);
#ifdef BODY
    int sg = int(seg + 0.5);
#else
    int sg = 0;
#endif

    // Walk the trail from the head to segment sg. Point j + 1 is history
    // sample j. A sample from another generation (written before the
    // particle's last respawn, or never written: -1) ends the trail, so a
    // respawn never draws a line back. The trail is cut at \`streak\`
    // seconds and, like a speed cap, at 14 widths on screen per 0.3 s of
    // streak (the default), never fewer than 14.
    float gen = texelFetch(velTex, texel, 0).w;
    float capLen = w * 14.0 * max(streak / 0.3, 1.0);
    float used = 0.0;
    vec3 pa = p;
    vec3 ca = c;
    float agoA = 0.0;
    vec3 cb = c;
    bool reached = false;
    for (int j = 0; j < TRAIL_SAMPLES; j++) {
        vec4 h = histAt(j, texel);
        float ago = histAgo[j];
        // ago == agoA: the newest sample was written this frame.
        bool valid = agoA < streak && used < capLen && ago >= agoA
            && abs(h.w - gen) < 0.5;
        vec3 cn = ca;
        vec3 pn = pa;
        if (valid) {
            float f = ago > agoA ? min((streak - agoA) / (ago - agoA), 1.0) : 1.0;
            pn = mix(pa, h.xyz, f);
            cn = project(pn);
            float l = length(cn.xy - ca.xy);
            float room = capLen - used;
            if (l > room) {
                float k = room / l;
                cn = mix(ca, cn, k);
                pn = mix(pa, pn, k);
                l = room;
            }
            used += l;
        }
        if (j == sg) {
            cb = cn;
            // The head segment always draws, as a dot if need be.
            reached = valid || sg == 0;
            break;
        }
        if (!valid) {
            break;
        }
        pa = pn;
        ca = cn;
        agoA = ago;
    }
    if (!reached) {
        cull();
        return;
    }

    // Quad from the segment's start (ca, towards the head) to its end,
    // ws wide and ws / 2 longer at each end. The body draws it whole, the
    // shadow cuts a capsule out of it.
    float ws = w * mix(1.0, 0.55, clamp(agoA / max(streak, 1e-4), 0.0, 1.0));
#ifdef SHADOW
    // The coverage target is half-res: twice as wide (at least one of its
    // texels), so the dense body reads as solid rather than speckled.
    ws = max(ws * 2.0, 2.0);
#endif
    vec2 d = ca.xy - cb.xy;
    float len = length(d);
    vec2 ax = len > 1e-3 ? d / len : vec2(1.0, 0.0);
    vec2 pe = vec2(-ax.y, ax.x);
    vec2 mid = ca.xy - ax * len * 0.5;
    vec2 local = position * vec2(len + ws, ws);
    vec2 px = mid + ax * local.x + pe * local.y;
    float zA = clamp((ca.z - camNear) / (camFar - camNear), 0.0, 1.0);
    float zB = clamp((cb.z - camNear) / (camFar - camNear), 0.0, 1.0);
    float zLin = mix(zB, zA, position.x + 0.5);
    gl_Position = vec4(px / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    vLocal = local;
    vShape = vec2(len * 0.5, ws * 0.5);

#ifdef BODY
    // Shade from the SDF normal at the segment's start, in view space.
    vec3 base = A.rgb;
    vec3 highlight = texelFetch(attrB, texel, 0).rgb;
    vec4 s = sdf3(pa);
    vec3 nv = viewRot * s.yzw;
    float ndl = dot(nv, lightDir);
    float wrap = 0.5 + 0.5 * ndl;
    // Cheap occlusion: how far the field is clear along the normal.
    float aoDist = sdf3(pa + s.yzw * 0.07).x;
    float ao = mix(1.0 - occlusion, 1.0, clamp(aoDist / 0.07, 0.0, 1.0));
    vec3 col = base * (ambient + 0.9 * lightIntensity * wrap * lightColor) * ao;
    // Some fibres catch the light.
    float glint = pow(max(ndl, 0.0), 3.0) * step(0.65, fract(r * 7.13));
    col += highlight * lightColor * glint * glintAmount * ao;
    // Peeled-off wisps get lighter.
    col = mix(col, highlight * 0.85, off * 0.5);
    vColor = col;
#else
    vColor = vec3(1.0);
#endif
#endif
}
`;
}

const VERT_BODY = makeParticleVert("body");
const VERT_SHADOW = makeParticleVert("shadow");
const VERT_FIREFLY = makeParticleVert("firefly");

const FRAG_BODY = `#version 300 es
precision highp float;
in vec3 vColor;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

// No discard: the quad's sides are the fibre's edges, so multisampling
// (antialias) smooths them. Round caps would be invisible at fibre
// widths anyway.
void main() {
    // Rounded shading across the width (vShape.y = half width).
    float r = vLocal.y / max(vShape.y, 1e-3);
    outColor = vec4(vColor * (1.0 - 0.3 * r * r), 1.0);
}
`;

// Shadow coverage: 1 inside the flattened capsule.
const FRAG_SHADOW_COVER = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

void main() {
    vec2 q = vec2(max(abs(vLocal.x) - vShape.x, 0.0), vLocal.y);
    if (length(q) > max(vShape.y, 1e-3)) discard;
    outColor = vec4(1.0);
}
`;

// Running average of the coverage: hist = mix(hist, cur, amount).
const FRAG_SHADOW_ACCUM = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D curTex;
uniform sampler2D histTex;
uniform float amount;
out vec4 outColor;

void main() {
    float c = texture(curTex, uv).r;
    // amount 1 restarts the average; skip whatever the history holds.
    float v = amount >= 1.0 ? c : mix(texture(histTex, uv).r, c, amount);
    outColor = vec4(v, 0.0, 0.0, 1.0);
}
`;

// One direction of a separable gaussian on the coverage (red channel).
const FRAG_SHADOW_BLUR = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 dir;
uniform float sigma;
uniform int radius;
out vec4 outColor;

void main() {
    float k = -0.5 / (sigma * sigma);
    float sum = texture(srcTex, uv).r;
    float wsum = 1.0;
    for (int i = 1; i <= 24; i++) {
        if (i > radius) break;
        float w = exp(float(i * i) * k);
        sum += (texture(srcTex, uv + dir * float(i)).r
              + texture(srcTex, uv - dir * float(i)).r) * w;
        wsum += 2.0 * w;
    }
    outColor = vec4(sum / wsum, 0.0, 0.0, 1.0);
}
`;

// Trail history: copy the position texture into one slot of the atlas.
const VERT_HIST = `#version 300 es
in vec2 position;
uniform vec4 slotRect;
void main() {
    gl_Position = vec4(mix(slotRect.xy, slotRect.zw, position + 0.5), 0.0, 1.0);
}
`;

// A sample is the position and the generation it was written in.
const FRAG_HIST_PUSH = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D posTex;
uniform sampler2D velTex;
uniform vec2 slotOrigin;
out vec4 outColor;
void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy - slotOrigin);
    outColor = vec4(texelFetch(posTex, texel, 0).xyz, texelFetch(velTex, texel, 0).w);
}
`;

// A generation no particle has, so every sample reads as stale.
const FRAG_HIST_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, -1.0);
}
`;

const FRAG_FIREFLY = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;

void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    // A hot core with a small 4-point star.
    float core = exp(-r2 * 10.0);
    float star = exp(-abs(c.x) * 14.0) * exp(-abs(c.y) * 2.5)
               + exp(-abs(c.y) * 14.0) * exp(-abs(c.x) * 2.5);
    float a = core + star * 0.45;
    if (a < 0.003) discard;
    outColor = vec4(vColor * a, 0.0);
}
`;

const FRAG_BLOOM_PREFILTER = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform vec2 texel;
out vec4 outColor;

const float threshold = ${BLOOM_THRESHOLD.toFixed(1)};
${GLSL_BLOOM_KNEE}
void main() {
    vec3 c = texture(scene, uv + texel * vec2(-0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(-0.5, 0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, 0.5)).rgb;
    c *= 0.25;
    float br = max(c.r, max(c.g, c.b));
    outColor = vec4(c * bloomKnee(br, threshold, 0.5), 1.0);
}
`;

// 5-tap downsample of the bloom and the shadow chains.
const FRAG_BLOOM_DOWN = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D srcTex;
uniform vec2 texel;
out vec4 outColor;

void main() {
    vec3 c = texture(srcTex, uv).rgb * 0.5;
    c += texture(srcTex, uv + texel * vec2(-1.0, -1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(1.0, -1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(-1.0, 1.0)).rgb * 0.125;
    c += texture(srcTex, uv + texel * vec2(1.0, 1.0)).rgb * 0.125;
    outColor = vec4(c, 1.0);
}
`;

// Premultiplied particles + bloom over transparency, over the shadow.
// Alpha covers the bloom and the shadow too, so both composite over any
// page background.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform sampler2D bloomTex;
uniform sampler2D shadowTex;
uniform int hasScene;
uniform float bloom;
// shadowOpacity, or 0 with the shadow off.
uniform float shadowAmount;
uniform vec3 shadowColor;
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
    vec3 col = s.rgb + texture(bloomTex, uv).rgb * bloom;
    col = softClip(max(col, 0.0));
    float a = clamp(max(s.a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    if (shadowAmount > 0.0) {
        float sh = shadowAmount * clamp(texture(shadowTex, uv).r, 0.0, 1.0);
        col += shadowColor * sh * (1.0 - a);
        a += sh * (1.0 - a);
    }
    // Noise dither against banding in the faint glow.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col = clamp(col + dither / 255.0 * step(1.0 / 255.0, a), 0.0, a);
    outColor = vec4(col, a);
}
`;

// ---------------------------------------------------------------------------
// CPU: silhouette -> SDF + surface spawn points
// ---------------------------------------------------------------------------

type ShapeData = {
    /** RGBA: sd (world), gradient xy, 0. */
    sdf: Float32Array;
    sdfW: number;
    sdfH: number;
    /** [minX, minY, sizeX, sizeY] in world units. */
    sdfRect: [number, number, number, number];
    /** Half size of the element in world units (the long side is 1). */
    shapeHalf: [number, number];
    /** RGBA: x, y, z / halfDepth (-1..1), 0. */
    spawn: Float32Array;
    /** Width / height of the element when it was captured. */
    aspect: number;
};

const INF = 1e20;

// Felzenszwalb & Huttenlocher 1D squared distance transform.
function edt1d(
    f: Float64Array,
    n: number,
    d: Float64Array,
    v: Int32Array,
    z: Float64Array,
): void {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
            k--;
            s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) {
            k++;
        }
        const dq = q - v[k];
        d[q] = dq * dq + f[v[k]];
    }
}

// In-place 2D squared EDT. `grid` holds 0 on features and INF elsewhere.
function edt2d(grid: Float64Array, w: number, h: number): void {
    const n = Math.max(w, h);
    const f = new Float64Array(n);
    const d = new Float64Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            f[y] = grid[y * w + x];
        }
        edt1d(f, h, d, v, z);
        for (let y = 0; y < h; y++) {
            grid[y * w + x] = d[y];
        }
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            f[x] = grid[y * w + x];
        }
        edt1d(f, w, d, v, z);
        for (let x = 0; x < w; x++) {
            grid[y * w + x] = d[x];
        }
    }
}

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Build the SDF and spawn points from RGBA pixels (bottom-up rows).
 * Returns null when the silhouette is empty.
 */
function buildShape(
    pixels: Uint8Array | Float32Array,
    mw: number,
    mh: number,
    halfDepthHint: number,
    aspect: number,
): ShapeData | null {
    const alphaScale = pixels instanceof Float32Array ? 1 : 1 / 255;
    const mLong = Math.max(mw, mh);
    const pad = Math.round(mLong * SDF_PAD);
    const W = mw + pad * 2;
    const H = mh + pad * 2;
    const inside = new Uint8Array(W * H);
    let insideCount = 0;
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const a = pixels[(y * mw + x) * 4 + 3] * alphaScale;
            if (a >= 0.5) {
                inside[(y + pad) * W + x + pad] = 1;
                insideCount++;
            }
        }
    }
    if (insideCount < 16) {
        return null;
    }

    const toOut = new Float64Array(W * H);
    const toIn = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) {
        toOut[i] = inside[i] ? 0 : INF;
        toIn[i] = inside[i] ? INF : 0;
    }
    edt2d(toOut, W, H);
    edt2d(toIn, W, H);

    // Signed distance in px, then one 3x3 blur to soften the staircase.
    const sdRaw = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
        sdRaw[i] = inside[i]
            ? -(Math.sqrt(toIn[i]) - 0.5)
            : Math.sqrt(toOut[i]) - 0.5;
    }
    const sd = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let sum = 0;
            let cnt = 0;
            for (let dy = -1; dy <= 1; dy++) {
                const yy = y + dy;
                if (yy < 0 || yy >= H) {
                    continue;
                }
                for (let dx = -1; dx <= 1; dx++) {
                    const xx = x + dx;
                    if (xx < 0 || xx >= W) {
                        continue;
                    }
                    sum += sdRaw[yy * W + xx];
                    cnt++;
                }
            }
            sd[y * W + x] = sum / cnt;
        }
    }

    const px = 2 / mLong; // world units per px
    const minX = -(mw / 2 + pad) * px;
    const minY = -(mh / 2 + pad) * px;
    const sdf = new Float32Array(W * H * 4);
    const gradX = new Float32Array(W * H);
    const gradY = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const l = sd[y * W + Math.max(x - 1, 0)];
            const r = sd[y * W + Math.min(x + 1, W - 1)];
            const b = sd[Math.max(y - 1, 0) * W + x];
            const t = sd[Math.min(y + 1, H - 1) * W + x];
            let gx = r - l;
            let gy = t - b;
            const gl = Math.hypot(gx, gy);
            if (gl > 1e-6) {
                gx /= gl;
                gy /= gl;
            } else {
                gx = 0;
                gy = 0;
            }
            gradX[i] = gx;
            gradY[i] = gy;
            sdf[i * 4] = sd[i] * px;
            sdf[i * 4 + 1] = gx;
            sdf[i * 4 + 2] = gy;
        }
    }

    // Spawn points, area-weighted between the two caps and the side wall.
    const insideIdx: number[] = [];
    const edgeIdx: number[] = [];
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            if (!inside[i]) {
                continue;
            }
            insideIdx.push(i);
            if (
                !inside[i - 1] ||
                !inside[i + 1] ||
                !inside[i - W] ||
                !inside[i + W]
            ) {
                edgeIdx.push(i);
            }
        }
    }
    const capArea = insideIdx.length * px * px * 2;
    // 4-neighbour edge pixels undercount diagonal edges; ~1.15 on average.
    const sideArea = edgeIdx.length * 1.15 * px * (2 * halfDepthHint);
    const pSide = sideArea / (sideArea + capArea);

    const rand = mulberry32(0x5eed1234);
    const total = SPAWN_SIZE * SPAWN_SIZE;
    const spawn = new Float32Array(total * 4);
    for (let k = 0; k < total; k++) {
        const o = k * 4;
        if (rand() < pSide && edgeIdx.length > 0) {
            const i = edgeIdx[Math.floor(rand() * edgeIdx.length)];
            const x = i % W;
            const y = (i - x) / W;
            // Slide the pixel centre onto the zero contour.
            const d = sd[i];
            const wx = minX + (x + 0.5 + (rand() - 0.5) * 0.5) * px;
            const wy = minY + (y + 0.5 + (rand() - 0.5) * 0.5) * px;
            spawn[o] = wx - gradX[i] * d * px;
            spawn[o + 1] = wy - gradY[i] * d * px;
            spawn[o + 2] = rand() * 2 - 1;
        } else {
            const i = insideIdx[Math.floor(rand() * insideIdx.length)];
            const x = i % W;
            const y = (i - x) / W;
            spawn[o] = minX + (x + rand()) * px;
            spawn[o + 1] = minY + (y + rand()) * px;
            spawn[o + 2] = rand() < 0.5 ? -1 : 1;
        }
    }

    return {
        sdf,
        sdfW: W,
        sdfH: H,
        sdfRect: [minX, minY, W * px, H * px],
        shapeHalf: [mw / mLong, mh / mLong],
        spawn,
        aspect,
    };
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

type NumKey = {
    [K in keyof SwirlParticlesParams]-?: SwirlParticlesParams[K] extends number
        ? K
        : never;
}[keyof SwirlParticlesParams];

// [min, max] of every numeric param. A finite value is clamped into it,
// anything else (NaN, ±Infinity, not a number) falls back to the default.
const NUM_RANGE: Readonly<Record<NumKey, readonly [number, number]>> = {
    count: [1, MAX_COUNT],
    depth: [0.01, 4],
    swirl: [-10, 10],
    curl: [-10, 10],
    curlScale: [0.01, 50],
    speed: [0, 10],
    attract: [0, 100],
    peel: [0, 1],
    life: [0.1, 120],
    pointSize: [0, 64],
    streak: [0, 10],
    fireflyRatio: [0, 1],
    fireflyIntensity: [0, 1000],
    bloom: [0, 100],
    sourceColor: [0, 1],
    lightIntensity: [0, 100],
    ambient: [0, 1],
    occlusion: [0, 1],
    glint: [0, 100],
    shadowOpacity: [0, 1],
    shadowSoftness: [0, 500],
    shadowDistance: [0, 100],
    yaw: [-1000, 1000],
    pitch: [-1000, 1000],
    orbit: [-10, 10],
    fov: [1, 150],
    zoom: [0.01, 100],
    mouseRadius: [0, 10000],
    mouseStrength: [0, 100],
};
const NUM_KEYS = Object.keys(NUM_RANGE) as NumKey[];
const MAX_PAD = 10000;

/** Params as the frame uses them: valid, clamped, colours parsed. */
type Resolved = Record<NumKey, number> & {
    pad: number | "fullscreen";
    shadow: boolean;
    drag: boolean;
    antialias: boolean;
    mouse: SwirlParticlesParams["mouse"];
    /** Unit vector towards the light. */
    light: Rgb;
    lightColor: Rgb;
    fireflyColor: Rgb;
    shadowColor: Rgb;
};

function clamp(x: number, lo: number, hi: number): number {
    return Math.min(Math.max(x, lo), hi);
}

function padOf(pad: unknown): number | "fullscreen" {
    if (pad === "fullscreen") {
        return pad;
    }
    return typeof pad === "number" && Number.isFinite(pad)
        ? clamp(pad, 0, MAX_PAD)
        : (DEFAULT_PARAMS.pad as number);
}

const HEX_RE = /^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Parsed colours by string, so a frame doesn't parse them again.
const rgbCache = new Map<string, Rgb>();

// RGB in [0, 1] of a CSS hex colour, or of `fallback` when it isn't one.
// The result is shared: don't mutate it.
function rgbOf(hex: unknown, fallback: string): Rgb {
    const key = typeof hex === "string" && HEX_RE.test(hex) ? hex : fallback;
    let rgb = rgbCache.get(key);
    if (!rgb) {
        if (rgbCache.size >= 64) {
            rgbCache.clear();
        }
        const [r, g, b] = parseHexColor(key);
        rgb = [r, g, b];
        rgbCache.set(key, rgb);
    }
    return rgb;
}

// Unit vector towards the light, into `out`. Falls back to the default
// for a zero or broken direction.
function lightUnit(dir: unknown, out: Rgb): void {
    const d = Array.isArray(dir) ? dir : [];
    const [x, y, z] = [Number(d[0]), Number(d[1]), Number(d[2])];
    const len = Math.hypot(x, y, z);
    if (!Number.isFinite(len) || len < 1e-6) {
        lightUnit(DEFAULT_PARAMS.lightDirection, out);
        return;
    }
    out[0] = x / len;
    out[1] = y / len;
    out[2] = z / len;
}

// The one place params are checked: once a frame, into `out`.
function resolveParams(p: SwirlParticlesParams, out?: Resolved): Resolved {
    const r = out ?? ({ light: [0, 0, 1] } as unknown as Resolved);
    for (const k of NUM_KEYS) {
        const v = p[k];
        const [lo, hi] = NUM_RANGE[k];
        r[k] =
            typeof v === "number" && Number.isFinite(v)
                ? clamp(v, lo, hi)
                : DEFAULT_PARAMS[k];
    }
    r.count = Math.floor(r.count);
    r.pad = padOf(p.pad);
    r.shadow = !!p.shadow;
    r.drag = !!p.drag;
    r.antialias = !!p.antialias;
    r.mouse = p.mouse === "repel" || p.mouse === "tilt" ? p.mouse : "none";
    lightUnit(p.lightDirection, r.light);
    r.lightColor = rgbOf(p.lightColor, DEFAULT_PARAMS.lightColor);
    r.fireflyColor = rgbOf(p.fireflyColor, DEFAULT_PARAMS.fireflyColor);
    r.shadowColor = rgbOf(p.shadowColor, DEFAULT_PARAMS.shadowColor);
    return r;
}

function resolvePalette(
    palette: SwirlParticlesParams["palette"],
): readonly SwirlParticlesColorStop[] {
    const stops = (
        typeof palette === "string"
            ? SWIRL_PARTICLES_PALETTES[palette]
            : Array.isArray(palette)
              ? palette.filter((s) => s && typeof s === "object")
              : null
    ) as readonly SwirlParticlesColorStop[] | null | undefined;
    return stops && stops.length > 0 ? stops : SWIRL_PARTICLES_PALETTES.nebula;
}

// Bake the stops into PALETTE_SIZE RGBA8 texels, like a CSS gradient:
// sorted by offset, flat beyond the ends, linear in between.
function bakePalette(palette: SwirlParticlesParams["palette"]): Uint8Array {
    const stops = resolvePalette(palette)
        .map((s) => ({
            offset: Number.isFinite(s.offset) ? clamp(s.offset, 0, 1) : 0,
            rgb: rgbOf(s.color, "#000000"),
        }))
        .sort((a, b) => a.offset - b.offset);
    const out = new Uint8Array(PALETTE_SIZE * 4);
    let k = 0;
    for (let i = 0; i < PALETTE_SIZE; i++) {
        const t = i / (PALETTE_SIZE - 1);
        while (k < stops.length - 1 && stops[k + 1].offset < t) {
            k++;
        }
        const a = stops[k];
        const b = stops[Math.min(k + 1, stops.length - 1)];
        let f = 0;
        if (t <= a.offset) {
            f = 0;
        } else if (t >= b.offset) {
            f = 1;
        } else {
            f = (t - a.offset) / Math.max(b.offset - a.offset, 1e-6);
        }
        for (let c = 0; c < 3; c++) {
            const v = a.rgb[c] + (b.rgb[c] - a.rgb[c]) * f;
            out[i * 4 + c] = Math.round(v * 255);
        }
        out[i * 4 + 3] = 255;
    }
    return out;
}

// TRAIL_SAMPLES quads, one per trail segment: corner + segment index.
function trailGeometry(instanceCount: number): EffectGeometry {
    const corners = [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5];
    const position = new Float32Array(TRAIL_SAMPLES * 8);
    const seg = new Float32Array(TRAIL_SAMPLES * 4);
    const indices = new Uint16Array(TRAIL_SAMPLES * 6);
    for (let s = 0; s < TRAIL_SAMPLES; s++) {
        position.set(corners, s * 8);
        seg.fill(s, s * 4, s * 4 + 4);
        const v = s * 4;
        indices.set([v, v + 1, v + 2, v, v + 2, v + 3], s * 6);
    }
    return {
        attributes: {
            position: { data: position, itemSize: 2 },
            seg: { data: seg, itemSize: 1 },
        },
        indices,
        instanceCount,
    };
}

function smoothstep(e0: number, e1: number, x: number): number {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
}

// Column-major rotation: pitch (around X) after yaw (around Y).
function viewMatrix(yaw: number, pitch: number): number[] {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    // R = Rx(pitch) * Ry(yaw)
    // Ry = [cy 0 sy; 0 1 0; -sy 0 cy], Rx = [1 0 0; 0 cp -sp; 0 sp cp]
    const r00 = cy;
    const r01 = 0;
    const r02 = sy;
    const r10 = sp * sy;
    const r11 = cp;
    const r12 = -sp * cy;
    const r20 = -cp * sy;
    const r21 = sp;
    const r22 = cp * cy;
    return [r00, r10, r20, r01, r11, r21, r02, r12, r22];
}

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

// Silhouette capture: waiting to capture, a readback in flight, or
// nothing to do. Drawing only needs a shape, so a recapture keeps the
// current one on screen.
type Phase = "capture" | "reading" | "idle";

type ShadowLevel = {
    a: EffectRenderTarget;
    b: EffectRenderTarget;
};

type Camera = {
    viewRot: number[];
    camDist: number;
    focalPx: number;
    centerPx: [number, number];
    origin: readonly [number, number];
};

// What the composite reads: the bloom and the blurred shadow coverage,
// null when off.
type Layers = {
    bloom: EffectRenderTarget | null;
    shadow: EffectRenderTarget | null;
    shadowAmount: number;
};

const NO_LAYERS: Layers = { bloom: null, shadow: null, shadowAmount: 0 };

/**
 * Particles that flow over the surface of the element's silhouette,
 * extruded into 3D, and peel off it in curling wisps. Fibres are shaded
 * from the shape's SDF, coloured by a gradient {@link SwirlParticlesParams.palette}
 * (or the source colours, with `sourceColor`), with HDR sparkles and bloom.
 *
 * ```ts
 * vfx.add(img, { effect: new SwirlParticlesEffect({ palette: "ember" }) });
 * ```
 *
 * The silhouette is the element's alpha, read back when the effect starts
 * and again when the element's aspect ratio changes. Call
 * {@link SwirlParticlesEffect.refresh | refresh()} after its content
 * changes. An opaque photo becomes an extruded slab. The output is
 * premultiplied over transparency, so set the page background yourself.
 *
 * All params, `count` and `fireflyRatio` included, are read every frame,
 * so you can mutate `params` live. Numbers that are not finite fall back
 * to their defaults. Set `drag: true` to orbit the camera by dragging
 * the element, `shadow: true` to cast a drop shadow onto the page
 * behind, and `antialias: true` to smooth the fibres' edges.
 */
export class SwirlParticlesEffect implements Effect {
    params: SwirlParticlesParams;
    readonly #still: boolean;
    // Whether float targets are 16-bit: the core falls back to RGBA16F
    // without OES_texture_float_linear.
    #halfState = false;
    // This frame's params, checked (see resolveParams).
    readonly #r: Resolved;

    // Bumped by dispose and context restore, so a silhouette readback
    // started before them is dropped.
    #token = 0;
    #phase: Phase = "capture";
    #srcFrames = 0;
    // Frames to wait before the next capture; doubles while it's empty.
    #captureGap = CAPTURE_DELAY;
    // Element size last frame, and frames it has held still: a changed
    // aspect is recaptured once it settles.
    #lastSize: [number, number] = [0, 0];
    #settled = 0;
    #pending: ShapeData | null = null;
    #shape: ShapeData | null = null;
    #needsReset = true;
    #simTime = 0;
    // Sim steps so far, a seed for the age rounding.
    #steps = 0;
    #stillDone = false;
    // Count the still frame was simulated with.
    #stillCount = 0;
    // Inputs of the drawn still frame; a change draws it again.
    #stillKey: unknown[] = [];

    // Particle state, stateWidth² particles. Grows with `count`.
    #stateWidth = 0;
    #pos: EffectRenderTarget | null = null;
    #vel: EffectRenderTarget | null = null;
    #scene: EffectRenderTarget | null = null;
    // Samples #scene was created with: 4 with `antialias`.
    #sceneSamples: 1 | 4 = 1;
    #bloom: BloomPyramid | null = null;
    // Scene size the bloom pyramid was made for.
    #bloomBase: [number, number] = [0, 0];
    #shadow: ShadowLevel[] = [];
    #shadowBase: [number, number] = [0, 0];
    // Running average of the level 0 coverage (persistent: ping-pong).
    #shadowHist: EffectRenderTarget | null = null;
    // False restarts the average on the next shadow frame.
    #shadowHistValid = false;
    #layers: Layers = NO_LAYERS;
    // Seconds the simulation advanced this frame.
    #frameDt = 0;
    // Camera of the last drawn frame; "repel" pushes in its view.
    #cam: Camera | null = null;
    // Per particle colour, written once a frame (see FRAG_ATTR).
    #attrA: EffectRenderTarget | null = null;
    #attrB: EffectRenderTarget | null = null;

    // Trail history: TRAIL_SAMPLES copies of the position texture, tiled in
    // one atlas, written round-robin. #histTime holds the sim time each
    // slot was written (-Infinity: never).
    #hist: EffectRenderTarget | null = null;
    #histTime: number[] = new Array(TRAIL_SAMPLES).fill(-Infinity);
    #histHead = TRAIL_SAMPLES - 1;
    #lastPush = -Infinity;

    #gl: WebGL2RenderingContext | null = null;
    #sdfRaw: WebGLTexture | null = null;
    #spawnRaw: WebGLTexture | null = null;
    #paletteRaw: WebGLTexture | null = null;
    #sdfTex: EffectTexture | null = null;
    #spawnTex: EffectTexture | null = null;
    #paletteTex: EffectTexture | null = null;
    // The palette last baked: the value, and for stops, a flat copy of
    // their offsets and colours to catch edits in place.
    #paletteSrc: SwirlParticlesParams["palette"] | null = null;
    #paletteSnap: unknown[] = [];
    #paletteVersion = 0;

    // Draw geometry for the current body / firefly split (fireflies take
    // the first ids), rebuilt when it changes.
    #trails: EffectGeometry | null = null;
    #heads: EffectGeometry | null = null;
    #fireflies: EffectGeometry | null = null;
    #nBody = -1;
    #nFire = -1;
    #slotQuad: EffectGeometry = {
        attributes: { position: { data: QUAD_VERTS, itemSize: 2 } },
    };

    // Pointer drag. Window listeners while `drag` is on.
    #dragYaw = 0;
    #dragPitch = 0;
    #dragging = false;
    #lastPointer: [number, number] = [0, 0];
    #unlistenDrag: (() => void) | null = null;
    #unsubRestored: (() => void) | null = null;
    // Last frame's map from viewport to element-local px (bottom-left
    // origin, physical): add to (clientX, innerHeight - clientY) × pr.
    #toElement: [number, number] = [0, 0];
    #pixelRatio = 1;
    #elementPx: [number, number] = [0, 0];

    // Pointer interaction (`mouse`). The core has no "pointer left"
    // signal, so #pointerIn comes from window listeners, there while
    // `mouse` is not "none".
    #pointerIn = false;
    #unlistenHover: (() => void) | null = null;
    // Smoothed repel cursor, element-local physical px, and the fade.
    #repelPos: [number, number] = [0, 0];
    #repelAmount = 0;
    // Smoothed tilt offsets, radians.
    #tiltYaw = 0;
    #tiltPitch = 0;

    constructor(
        initial: Partial<SwirlParticlesParams> = {},
        opts: SwirlParticlesEffectOptions = {},
    ) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
        this.#still = opts.still ?? false;
        this.#r = resolveParams(this.params);
    }

    setParams(updates: Partial<SwirlParticlesParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        this.#gl = ctx.gl;
        this.#halfState = !ctx.gl.getExtension("OES_texture_float_linear");
        const r = resolveParams(this.params, this.#r);
        this.#allocState(ctx, stateSizeFromCount(r.count), false);
        this.#createScene(ctx);

        this.#unsubRestored = ctx.onContextRestored(() => {
            // Raw textures are gone; upload them again. A readback in
            // flight was rejected; start over if it was the first.
            this.#token++;
            this.#gl = ctx.gl;
            this.#halfState = !ctx.gl.getExtension("OES_texture_float_linear");
            this.#sdfRaw = null;
            this.#spawnRaw = null;
            this.#paletteRaw = null;
            this.#sdfTex = null;
            this.#spawnTex = null;
            this.#paletteTex = null;
            this.#paletteSrc = null;
            this.#pending = this.#pending ?? this.#shape;
            if (this.#phase === "reading") {
                this.#phase = "capture";
                this.#srcFrames = 0;
            }
            // The state and trail history targets come back empty:
            // respawn and mark every history slot stale.
            this.#needsReset = true;
            this.#stillDone = false;
            this.#shadowHistValid = false;
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(padOf(this.params.pad), dims);
    }

    // The particle buffer: HDR colour + depth, multisampled with
    // `antialias`.
    #createScene(ctx: EffectContext): EffectRenderTarget {
        const samples = this.#r.antialias ? 4 : 1;
        this.#scene?.dispose();
        const scene = ctx.createRenderTarget({
            float: true,
            depth: true,
            samples,
        });
        this.#scene = scene;
        this.#sceneSamples = samples;
        return scene;
    }

    // (Re)allocate the per-particle targets, stateWidth² particles. With
    // `migrate`, the particles that exist carry over and the new ones
    // spawn; the trails regrow. Needs `render()` for the migration.
    #allocState(ctx: EffectContext, width: number, migrate: boolean): void {
        const oldPos = this.#pos;
        const oldVel = this.#vel;
        const oldWidth = this.#stateWidth;
        const stateOpts = {
            size: [width, width] as const,
            float: true,
            persistent: true,
            filter: "nearest" as const,
        };
        const pos = ctx.createRenderTarget(stateOpts);
        const vel = ctx.createRenderTarget(stateOpts);
        this.#stateWidth = width;
        if (
            migrate &&
            oldPos &&
            oldVel &&
            !this.#needsReset &&
            this.#sdfTex &&
            this.#spawnTex
        ) {
            ctx.draw({
                frag: FRAG_SIM,
                uniforms: {
                    ...this.#simUniforms(ctx),
                    posTex: oldPos,
                    velTex: oldVel,
                    oldPosTex: oldPos,
                    oldVelTex: oldVel,
                    oldWidth,
                    oldCount: oldWidth * oldWidth,
                    reset: 2,
                    dt: 0,
                },
                target: [pos, vel],
            });
        } else {
            this.#needsReset = true;
        }
        oldPos?.dispose();
        oldVel?.dispose();
        this.#attrA?.dispose();
        this.#attrB?.dispose();
        this.#hist?.dispose();
        this.#pos = pos;
        this.#vel = vel;
        const attrOpts = { ...stateOpts, persistent: false };
        this.#attrA = ctx.createRenderTarget(attrOpts);
        this.#attrB = ctx.createRenderTarget(attrOpts);
        this.#hist = ctx.createRenderTarget({
            ...attrOpts,
            size: [width * HIST_COLS, width * HIST_ROWS],
        });
        // The new atlas reads as generation 0 everywhere; mark it stale.
        if (!this.#needsReset) {
            this.#resetHistory(ctx);
        }
    }

    render(ctx: EffectContext): void {
        if (!this.#scene || !this.#pos || !this.#vel) {
            return;
        }
        const r = resolveParams(this.params, this.#r);
        this.#syncListeners();
        this.#toElement[0] = ctx.mouse[0] - ctx.mouseViewport[0];
        this.#toElement[1] = ctx.mouse[1] - ctx.mouseViewport[1];
        this.#pixelRatio = ctx.pixelRatio;
        this.#elementPx[0] = ctx.dims.elementPixel[0];
        this.#elementPx[1] = ctx.dims.elementPixel[1];

        // `antialias` changed: a new buffer with the other sample count.
        const scene =
            (r.antialias ? 4 : 1) === this.#sceneSamples
                ? this.#scene
                : this.#createScene(ctx);

        if (this.#phase === "idle" && !this.#pending) {
            this.#watchAspect(ctx);
        }
        if (this.#phase === "capture") {
            this.#capture(ctx);
        }
        if (this.#pending && this.#upload(ctx, this.#pending)) {
            // The first shape spawns every particle. A new one takes over
            // without a reset: the particles flow onto it and respawn on
            // it. A still frame is simulated again from scratch.
            if (!this.#shape || this.#still) {
                this.#needsReset = true;
            }
            this.#shape = this.#pending;
            this.#pending = null;
        }
        this.#updatePalette(ctx);

        const ready = !!(
            this.#shape &&
            this.#sdfTex &&
            this.#spawnTex &&
            this.#paletteTex
        );
        if (!ready) {
            this.#layers = NO_LAYERS;
        } else {
            // `count` grew past the state: reallocate it.
            if (r.count > this.#stateWidth ** 2) {
                this.#allocState(ctx, stateSizeFromCount(r.count), true);
            }
            this.#syncGeometry(ctx);
            if (this.#still && r.count !== this.#stillCount) {
                this.#needsReset = true;
            }
            // A still frame that's done is drawn again only when what it
            // shows changed.
            const keyChanged = this.#still && this.#updateStillKey(ctx, scene);
            if (
                !this.#still ||
                !this.#stillDone ||
                this.#needsReset ||
                keyChanged
            ) {
                // Capped like the sim, so a stall doesn't teleport the
                // particles; the camera wobble and fireflies follow the
                // sim time.
                const dt = clampDt(ctx.deltaTime) || 0;
                this.#updateMouse(ctx, dt);
                this.#simulate(ctx, dt);
                this.#cam = this.#camera(ctx);
                const shadow = this.#drawParticles(ctx, scene, this.#cam);
                this.#layers = {
                    bloom: this.#drawBloom(ctx, scene),
                    shadow: shadow ? shadow.tex : null,
                    shadowAmount: shadow ? shadow.amount : 0,
                };
            }
        }
        const layers = this.#layers;
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                scene,
                bloomTex: layers.bloom ?? scene,
                shadowTex: layers.shadow ?? scene,
                hasScene: ready ? 1 : 0,
                bloom: layers.bloom ? r.bloom : 0,
                shadowAmount: layers.shadow ? layers.shadowAmount : 0,
                shadowColor: r.shadowColor,
            },
            target: ctx.target,
        });
    }

    // Writes what the still frame depends on into #stillKey; true when
    // something changed.
    #updateStillKey(ctx: EffectContext, scene: EffectRenderTarget): boolean {
        const r = this.#r;
        const key = this.#stillKey;
        let n = 0;
        let changed = false;
        const put = (v: unknown) => {
            if (key[n] !== v) {
                key[n] = v;
                changed = true;
            }
            n++;
        };
        for (const k of NUM_KEYS) {
            put(r[k]);
        }
        put(r.pad);
        put(r.shadow);
        put(r.light[0]);
        put(r.light[1]);
        put(r.light[2]);
        put(r.lightColor);
        put(r.fireflyColor);
        put(r.shadowColor);
        put(this.#paletteVersion);
        put(this.#stateWidth);
        put(scene.width);
        put(scene.height);
        put(this.#sceneSamples);
        // The camera frames the element in the output rect: with
        // "fullscreen" the scene keeps its size when the element doesn't.
        const dims = ctx.dims;
        const [ox, oy] = padOutputRect(r.pad, dims);
        put(dims.elementPixel[0]);
        put(dims.elementPixel[1]);
        put(ox);
        put(oy);
        return changed;
    }

    // Add or remove the window listeners `drag` and `mouse` need.
    #syncListeners(): void {
        const r = this.#r;
        const live = !this.#still && typeof window !== "undefined";
        if (live && r.drag) {
            this.#listenDrag();
        } else if (this.#unlistenDrag) {
            this.#unlistenDrag();
            this.#unlistenDrag = null;
            this.#dragging = false;
        }
        if (live && r.mouse !== "none") {
            this.#listenHover();
        } else if (this.#unlistenHover) {
            this.#unlistenHover();
            this.#unlistenHover = null;
            this.#pointerIn = false;
        }
    }

    #listenDrag(): void {
        if (this.#unlistenDrag) {
            return;
        }
        const down = (e: PointerEvent) => {
            if (!this.#onElement(e.clientX, e.clientY)) {
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
            this.#dragPitch = clamp(this.#dragPitch + dy * 0.006, -1.2, 1.2);
        };
        const up = () => {
            this.#dragging = false;
        };
        window.addEventListener("pointerdown", down);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        this.#unlistenDrag = () => {
            window.removeEventListener("pointerdown", down);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
    }

    // Whether a client point is on the element's box, as of the last
    // frame. Same mapping as `ctx.mouse`.
    #onElement(clientX: number, clientY: number): boolean {
        const pr = this.#pixelRatio;
        const x = clientX * pr + this.#toElement[0];
        const y = (window.innerHeight - clientY) * pr + this.#toElement[1];
        const [ew, eh] = this.#elementPx;
        return x >= 0 && y >= 0 && x <= ew && y <= eh;
    }

    /**
     * Capture the element's silhouette again, for when its content
     * changed: an image's `src` swapped, a text edit. For an `<img>`,
     * call it after `vfx.update(img)` has reloaded the image.
     *
     * The particles keep flowing over the current shape until the new
     * one has been read back (a few frames later), then flow onto it, and
     * respawn on it. A change of the element's aspect ratio is
     * recaptured automatically once its size settles; a change of size
     * alone needs none.
     *
     * Safe to call at any time and any number of times; a call while a
     * capture is pending restarts it, so the latest content wins.
     */
    refresh(): void {
        this.#recapture();
    }

    // Start a new capture in CAPTURE_DELAY frames, dropping a readback in
    // flight.
    #recapture(): void {
        if (this.#phase === "reading") {
            this.#token++;
        }
        this.#phase = "capture";
        this.#srcFrames = 0;
        this.#captureGap = CAPTURE_DELAY;
    }

    // Recapture once the element's aspect ratio has drifted from the
    // shape's and its size has held still for RESIZE_SETTLE frames, so a
    // resize animation reads back once, at the end. The shape is in units
    // of the element's long side, so a change of scale alone keeps it.
    #watchAspect(ctx: EffectContext): void {
        const shape = this.#shape;
        const [ew, eh] = ctx.dims.elementPixel;
        if (!shape || !(ew >= 1 && eh >= 1)) {
            return;
        }
        const moved = ew !== this.#lastSize[0] || eh !== this.#lastSize[1];
        this.#lastSize[0] = ew;
        this.#lastSize[1] = eh;
        this.#settled = moved ? 0 : this.#settled + 1;
        if (
            this.#settled >= RESIZE_SETTLE &&
            Math.abs(ew / eh / shape.aspect - 1) > ASPECT_TOLERANCE
        ) {
            this.#recapture();
        }
    }

    // Read the element's alpha back to build the shape.
    #capture(ctx: EffectContext): void {
        const [ew, eh] = ctx.dims.elementPixel;
        if (
            ctx.src.width === 0 ||
            ctx.src.height === 0 ||
            !(ew >= 1 && eh >= 1)
        ) {
            return;
        }
        // Give the source a few frames to upload.
        if (++this.#srcFrames < this.#captureGap) {
            return;
        }
        const aspect = ew / eh;
        const mw = Math.max(
            1,
            aspect >= 1 ? MASK_LONG : Math.round(MASK_LONG * aspect),
        );
        const mh = Math.max(
            1,
            aspect >= 1 ? Math.round(MASK_LONG / aspect) : MASK_LONG,
        );
        const mask = ctx.createRenderTarget({ size: [mw, mh] });
        captureContent(ctx, mask);
        this.#phase = "reading";
        const token = this.#token;
        const halfDepth = this.#r.depth / 2;
        // The read copies the pixels now, so the mask can go.
        const read = ctx.readPixels(mask);
        mask.dispose();
        const retry = (backoff: boolean) => {
            this.#srcFrames = 0;
            if (backoff) {
                this.#captureGap = Math.min(
                    this.#captureGap * 2,
                    CAPTURE_RETRY_MAX,
                );
            }
            this.#phase = "capture";
        };
        read.then(
            (px) => {
                if (token !== this.#token) {
                    return;
                }
                const shape = buildShape(px, mw, mh, halfDepth, aspect);
                if (shape) {
                    this.#pending = shape;
                    this.#phase = "idle";
                } else {
                    // Nothing drawn yet: try again later, less often, in
                    // case it's a late-loading image.
                    retry(true);
                }
            },
            () => {
                // Disposed or context lost.
                if (token === this.#token) {
                    retry(false);
                }
            },
        );
    }

    // Upload the SDF and spawn textures, replacing the current ones.
    // False (and the current ones kept) when the GPU can't make them; the
    // caller tries again next frame.
    #upload(ctx: EffectContext, shape: ShapeData): boolean {
        const gl = ctx.gl;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

        // Half float so it can be filtered linearly everywhere.
        const sdf = gl.createTexture();
        const spawn = gl.createTexture();
        if (!sdf || !spawn) {
            gl.deleteTexture(sdf);
            gl.deleteTexture(spawn);
            ctx.resetState();
            return false;
        }
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

        gl.bindTexture(gl.TEXTURE_2D, spawn);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            SPAWN_SIZE,
            SPAWN_SIZE,
            0,
            gl.RGBA,
            gl.FLOAT,
            shape.spawn,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        ctx.resetState();

        this.#deleteShapeTextures();
        this.#sdfRaw = sdf;
        this.#spawnRaw = spawn;
        this.#sdfTex = ctx.wrapTexture(sdf, {
            size: [shape.sdfW, shape.sdfH],
            filter: "linear",
            wrap: "clamp",
        });
        this.#spawnTex = ctx.wrapTexture(spawn, {
            size: [SPAWN_SIZE, SPAWN_SIZE],
            filter: "nearest",
            wrap: "clamp",
        });
        return true;
    }

    #deleteShapeTextures(): void {
        if (this.#gl) {
            for (const tex of [this.#sdfRaw, this.#spawnRaw]) {
                if (tex) {
                    this.#gl.deleteTexture(tex);
                }
            }
        }
        this.#sdfRaw = null;
        this.#spawnRaw = null;
        this.#sdfTex = null;
        this.#spawnTex = null;
    }

    // Whether the palette is the one last baked, stops edited in place
    // included. No allocation when it is.
    #paletteUnchanged(palette: SwirlParticlesParams["palette"]): boolean {
        if (palette !== this.#paletteSrc) {
            return false;
        }
        if (!Array.isArray(palette)) {
            return true;
        }
        const snap = this.#paletteSnap;
        if (snap.length !== palette.length * 2) {
            return false;
        }
        for (let i = 0; i < palette.length; i++) {
            const s = palette[i];
            if (snap[i * 2] !== s?.offset || snap[i * 2 + 1] !== s?.color) {
                return false;
            }
        }
        return true;
    }

    // Re-bake the gradient texture when the palette changes.
    #updatePalette(ctx: EffectContext): void {
        const palette = this.params.palette;
        if (this.#paletteTex && this.#paletteUnchanged(palette)) {
            return;
        }
        const gl = ctx.gl;
        const texels = bakePalette(palette);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        let tex = this.#paletteRaw;
        if (tex) {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                PALETTE_SIZE,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                texels,
            );
        } else {
            tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA8,
                PALETTE_SIZE,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                texels,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl.CLAMP_TO_EDGE,
            );
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        ctx.resetState();
        if (!tex) {
            return;
        }
        if (!this.#paletteTex) {
            this.#paletteRaw = tex;
            this.#paletteTex = ctx.wrapTexture(tex, {
                size: [PALETTE_SIZE, 1],
                filter: "linear",
                wrap: "clamp",
            });
        }
        this.#paletteSrc = palette;
        this.#paletteSnap = Array.isArray(palette)
            ? palette.flatMap((s) => [s?.offset, s?.color])
            : [];
        this.#paletteVersion++;
    }

    // Body and firefly geometry for this frame's count and ratio.
    // Instance counts are fixed when a geometry is compiled, so a new
    // split gets new (small) geometries.
    #syncGeometry(ctx: EffectContext): void {
        const r = this.#r;
        const nFire = Math.min(r.count, Math.round(r.count * r.fireflyRatio));
        const nBody = r.count - nFire;
        if (nBody !== this.#nBody) {
            if (this.#trails) {
                ctx.releaseGeometry(this.#trails);
            }
            if (this.#heads) {
                ctx.releaseGeometry(this.#heads);
            }
            this.#trails = trailGeometry(nBody);
            this.#heads = {
                attributes: { position: { data: QUAD_VERTS, itemSize: 2 } },
                instanceCount: nBody,
            };
            this.#nBody = nBody;
        }
        if (nFire !== this.#nFire) {
            if (this.#fireflies) {
                ctx.releaseGeometry(this.#fireflies);
            }
            // One point per instance; the id is gl_InstanceID.
            this.#fireflies = {
                mode: "points",
                attributes: {},
                drawRange: { start: 0, count: 1 },
                instanceCount: nFire,
            };
            this.#nFire = nFire;
        }
    }

    #shapeUniforms(): EffectUniforms {
        const halfDepth = this.#r.depth / 2;
        const uniforms: EffectUniforms = {
            sdfRect: this.#shape?.sdfRect ?? [0, 0, 1, 1],
            halfDepth,
            rounding: Math.min(0.025, halfDepth * 0.5),
            stateWidth: this.#stateWidth,
            spawnSize: SPAWN_SIZE,
        };
        if (this.#sdfTex && this.#spawnTex) {
            uniforms.sdfTex = this.#sdfTex;
            uniforms.spawnTex = this.#spawnTex;
        }
        return uniforms;
    }

    #listenHover(): void {
        if (this.#unlistenHover) {
            return;
        }
        // A move inside the viewport means the pointer is over the page;
        // leaving the document (relatedTarget null: out of the window,
        // or a touch that ended) or losing focus means it is gone.
        const move = (e: PointerEvent) => {
            this.#pointerIn =
                e.clientX >= 0 &&
                e.clientY >= 0 &&
                e.clientX < window.innerWidth &&
                e.clientY < window.innerHeight;
        };
        const out = (e: PointerEvent) => {
            if (!e.relatedTarget) {
                this.#pointerIn = false;
            }
        };
        const blur = () => {
            this.#pointerIn = false;
        };
        window.addEventListener("pointermove", move, { passive: true });
        window.addEventListener("pointerout", out, { passive: true });
        window.addEventListener("blur", blur);
        this.#unlistenHover = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerout", out);
            window.removeEventListener("blur", blur);
        };
    }

    // Once a frame: ease the repel force and the tilt towards what the
    // pointer asks for, over the frame's dt (the one the sim advances by).
    // Frame-rate independent.
    #updateMouse(ctx: EffectContext, dt: number): void {
        const r = this.#r;
        const mode = this.#still ? "none" : r.mouse;
        const hover = this.#pointerIn && !this.#still;
        const [mx, my] = ctx.mouse;

        const repel = hover && mode === "repel";
        if (repel) {
            if (this.#repelAmount <= 0) {
                // Appear under the cursor, not sweep in from where it left.
                this.#repelPos = [mx, my];
            } else {
                const k = 1 - Math.exp(-dt / REPEL_POS_TAU);
                this.#repelPos[0] += (mx - this.#repelPos[0]) * k;
                this.#repelPos[1] += (my - this.#repelPos[1]) * k;
            }
        }
        const step = dt / MOUSE_FADE;
        this.#repelAmount = repel
            ? Math.min(this.#repelAmount + step, 1)
            : Math.max(this.#repelAmount - step, 0);

        // Tilt: the cursor relative to the element's centre, over half the
        // viewport. Positive yaw turns the front cap to the right,
        // positive pitch down, so the shape faces the cursor.
        let yawT = 0;
        let pitchT = 0;
        if (hover && mode === "tilt") {
            const [ew, eh] = ctx.dims.elementPixel;
            const pr = ctx.pixelRatio;
            const vw =
                typeof window !== "undefined"
                    ? window.innerWidth * pr
                    : ctx.dims.canvasPixel[0];
            const vh =
                typeof window !== "undefined"
                    ? window.innerHeight * pr
                    : ctx.dims.canvasPixel[1];
            const nx = clamp((mx - ew / 2) / Math.max(vw / 2, 1), -1, 1);
            const ny = clamp((my - eh / 2) / Math.max(vh / 2, 1), -1, 1);
            const max = TILT_MAX * r.mouseStrength;
            yawT = max * nx;
            pitchT = -max * ny;
        }
        const k = 1 - Math.exp(-dt / TILT_TAU);
        this.#tiltYaw += (yawT - this.#tiltYaw) * k;
        this.#tiltPitch += (pitchT - this.#tiltPitch) * k;
    }

    // Camera: base angles, a slow wobble, pointer drag and tilt.
    #camera(ctx: EffectContext): Camera {
        const r = this.#r;
        const t = this.#simTime;
        const yaw =
            r.yaw +
            r.orbit * Math.sin(t * 0.13) +
            this.#dragYaw +
            this.#tiltYaw;
        const pitch =
            r.pitch +
            r.orbit * PITCH_WOBBLE * Math.sin(t * 0.09 + 1.3) +
            this.#dragPitch +
            this.#tiltPitch;

        // Distance so that the long side (2 world units) spans `fov`.
        const camDist = 1 / Math.tan((r.fov * Math.PI) / 360);

        const dims = ctx.dims;
        const [ew, eh] = dims.elementPixel;
        const [ox, oy] = padOutputRect(r.pad, dims);
        const unitPx = (Math.max(ew, eh) / 2) * r.zoom;
        return {
            viewRot: viewMatrix(yaw, pitch),
            camDist,
            focalPx: camDist * unitPx,
            centerPx: [ew / 2 - ox, eh / 2 - oy],
            origin: [ox, oy],
        };
    }

    // Uniforms of every FRAG_SIM draw but the state and the step.
    #simUniforms(ctx: EffectContext): EffectUniforms {
        const r = this.#r;
        const spawn = this.#spawnTex;
        return {
            ...this.#shapeUniforms(),
            count: r.count,
            lifeMean: r.life,
            swirl: r.swirl,
            curl: r.curl,
            curlScale: r.curlScale,
            speed: r.speed,
            attract: r.attract,
            peel: r.peel,
            time: this.#simTime,
            halfState: this.#halfState ? 1 : 0,
            frameSeed: this.#steps,
            // Only read when the state grows; bound to something that is
            // never the target.
            ...(spawn ? { oldPosTex: spawn, oldVelTex: spawn } : {}),
            oldWidth: 1,
            oldCount: 0,
            ...this.#repelUniforms(ctx),
        };
    }

    // Advance the simulation by `frameDt` seconds (already clamped), in
    // steps of at most SIM_STEP.
    #simulate(ctx: EffectContext, frameDt: number): void {
        const pos = this.#pos;
        const vel = this.#vel;
        if (!pos || !vel || !this.#sdfTex || !this.#spawnTex) {
            return;
        }
        let steps: number;
        let dt: number;
        if (this.#still) {
            this.#frameDt = 0;
            if (this.#stillDone && !this.#needsReset) {
                return;
            }
            steps = STILL_STEPS;
            dt = 1 / 60;
        } else {
            this.#frameDt = frameDt;
            // At least one pass, as a frame with dt 0 always ran one.
            steps = clamp(Math.ceil(frameDt / SIM_STEP), 1, MAX_SUBSTEPS);
            dt = frameDt / steps;
        }
        const base = this.#simUniforms(ctx);
        if (this.#needsReset) {
            ctx.draw({
                frag: FRAG_SIM,
                uniforms: {
                    ...base,
                    posTex: pos,
                    velTex: vel,
                    reset: 1,
                    dt: 0,
                },
                target: [pos, vel],
            });
            this.#resetHistory(ctx);
            this.#needsReset = false;
            this.#shadowHistValid = false;
        }
        // The trail history is pushed per step: it is spaced by sim time,
        // so trails look the same whatever the frame rate.
        for (let i = 0; i < steps; i++) {
            this.#simTime += dt;
            this.#steps = (this.#steps + 1) % 0x100000;
            ctx.draw({
                frag: FRAG_SIM,
                uniforms: {
                    ...base,
                    posTex: pos,
                    velTex: vel,
                    reset: 0,
                    time: this.#simTime,
                    frameSeed: this.#steps,
                    dt,
                },
                target: [pos, vel],
            });
            this.#pushHistory(ctx);
        }
        this.#stillDone = true;
        this.#stillCount = this.#r.count;
    }

    // Sim uniforms for "repel": the cursor in buffer px and the camera
    // of the last drawn frame, which is where the user sees the particles.
    #repelUniforms(ctx: EffectContext): EffectUniforms {
        const r = this.#r;
        const cam = this.#cam ?? this.#camera(ctx);
        return {
            mouseForce:
                r.mouseRadius > 0 ? this.#repelAmount * r.mouseStrength : 0,
            mousePx: [
                this.#repelPos[0] - cam.origin[0],
                this.#repelPos[1] - cam.origin[1],
            ],
            mouseRadiusPx: Math.max(r.mouseRadius * ctx.pixelRatio, 1),
            viewRot: cam.viewRot,
            camDist: cam.camDist,
            focalPx: cam.focalPx,
            centerPx: cam.centerPx,
        };
    }

    // Mark every history slot stale: a generation no particle has.
    #resetHistory(ctx: EffectContext): void {
        if (this.#hist) {
            ctx.draw({ frag: FRAG_HIST_CLEAR, target: this.#hist });
        }
        this.#histTime.fill(-Infinity);
        this.#histHead = TRAIL_SAMPLES - 1;
        this.#lastPush = -Infinity;
    }

    // Copy the positions into the next history slot once the sim has run
    // streak / (TRAIL_SAMPLES - 1) seconds since the last copy. Then the
    // history always spans at least `streak`, and the trail can be cut
    // at exactly `streak` seconds, frame-rate independent.
    #pushHistory(ctx: EffectContext): void {
        const hist = this.#hist;
        const pos = this.#pos;
        const vel = this.#vel;
        const streak = this.#r.streak;
        if (!hist || !pos || !vel || !(streak > 0)) {
            return;
        }
        const interval = streak / (TRAIL_SAMPLES - 1);
        if (this.#simTime - this.#lastPush < interval) {
            return;
        }
        const slot = (this.#histHead + 1) % TRAIL_SAMPLES;
        const col = slot % HIST_COLS;
        const row = Math.floor(slot / HIST_COLS);
        const ndcX = (2 * col) / HIST_COLS - 1;
        const ndcY = (2 * row) / HIST_ROWS - 1;
        const sw = this.#stateWidth;
        ctx.draw({
            vert: VERT_HIST,
            frag: FRAG_HIST_PUSH,
            geometry: this.#slotQuad,
            uniforms: {
                posTex: pos,
                velTex: vel,
                slotRect: [
                    ndcX,
                    ndcY,
                    ndcX + 2 / HIST_COLS,
                    ndcY + 2 / HIST_ROWS,
                ],
                slotOrigin: [col * sw, row * sw],
            },
            target: hist,
        });
        this.#histHead = slot;
        this.#histTime[slot] = this.#simTime;
        this.#lastPush = this.#simTime;
    }

    // Uniforms that let a vertex walk the history, newest sample first.
    #historyUniforms(): { histSlot: number[]; histAgo: number[] } {
        const histSlot: number[] = [];
        const histAgo: number[] = [];
        for (let j = 0; j < TRAIL_SAMPLES; j++) {
            const slot =
                (this.#histHead - j + TRAIL_SAMPLES * 2) % TRAIL_SAMPLES;
            const written = this.#histTime[slot];
            histSlot.push(slot);
            histAgo.push(
                Number.isFinite(written) ? this.#simTime - written : HIST_NEVER,
            );
        }
        return { histSlot, histAgo };
    }

    // Draws the particles into `scene`, and the shadow coverage when the
    // shadow is on. Returns the blurred coverage and its opacity.
    #drawParticles(
        ctx: EffectContext,
        scene: EffectRenderTarget,
        cam: Camera,
    ): { tex: EffectRenderTarget; amount: number } | null {
        const pos = this.#pos;
        const vel = this.#vel;
        const shape = this.#shape;
        const attrA = this.#attrA;
        const attrB = this.#attrB;
        const hist = this.#hist;
        const trails = this.#trails;
        const heads = this.#heads;
        const fireflies = this.#fireflies;
        if (
            !pos ||
            !vel ||
            !shape ||
            !this.#paletteTex ||
            !attrA ||
            !attrB ||
            !hist ||
            !trails ||
            !heads ||
            !fireflies
        ) {
            return null;
        }
        const r = this.#r;
        const camDist = cam.camDist;
        const uniforms = {
            ...this.#shapeUniforms(),
            posTex: pos,
            viewRot: cam.viewRot,
            camDist,
            camNear: camDist * NEAR_K,
            camFar: camDist * FAR_K,
            focalPx: cam.focalPx,
            centerPx: cam.centerPx,
            bufferPx: [scene.width, scene.height] as [number, number],
            pointPx: r.pointSize * ctx.pixelRatio,
        };

        ctx.clear(scene);
        if (this.#nBody > 0) {
            // Colour per particle, shared by all segments of its trail.
            ctx.draw({
                frag: FRAG_ATTR,
                uniforms: {
                    ...uniforms,
                    velTex: vel,
                    count: r.count,
                    time: this.#simTime,
                    speed: r.speed,
                    paletteTex: this.#paletteTex,
                    src: ctx.src,
                    shapeHalf: shape.shapeHalf,
                    sourceColor: r.sourceColor,
                },
                target: [attrA, attrB],
            });
        }
        const trail = {
            ...uniforms,
            ...this.#historyUniforms(),
            velTex: vel,
            histTex: hist,
            attrA,
            idOffset: this.#nFire,
            streak: r.streak,
        };
        if (this.#nBody > 0) {
            ctx.draw({
                vert: VERT_BODY,
                frag: FRAG_BODY,
                geometry: trails,
                uniforms: {
                    ...trail,
                    attrB,
                    lightDir: r.light,
                    lightColor: r.lightColor,
                    lightIntensity: r.lightIntensity,
                    ambient: r.ambient,
                    occlusion: r.occlusion,
                    glintAmount: r.glint,
                },
                target: scene,
                depthTest: true,
                blend: "none",
            });
        }
        if (this.#nFire > 0) {
            ctx.draw({
                vert: VERT_FIREFLY,
                frag: FRAG_FIREFLY,
                geometry: fireflies,
                uniforms: {
                    ...uniforms,
                    idOffset: 0,
                    time: this.#simTime,
                    fireflyIntensity: r.fireflyIntensity,
                    fireflyColor: r.fireflyColor,
                },
                target: scene,
                depthTest: true,
                depthWrite: false,
                blend: "additive",
            });
        }

        // A light from behind the page casts no shadow; fade it out as
        // the light grazes the page.
        const light = r.light;
        const amount = r.shadowOpacity * smoothstep(0, 0.25, light[2]);
        if (!r.shadow || !(amount > 0) || this.#nBody === 0) {
            // Free the targets; the average starts afresh when the
            // shadow comes back.
            this.#disposeShadow();
            return null;
        }
        const tex = this.#drawShadow(ctx, scene, heads, {
            ...trail,
            shadowLight: [light[0], light[1], Math.max(light[2], 0.02)],
            shadowDepth: r.shadowDistance,
        });
        return tex ? { tex, amount } : null;
    }

    // Level `i` of the shadow chain, allocated on first use.
    #shadowLevel(ctx: EffectContext, i: number): ShadowLevel {
        const levels = this.#shadow;
        while (levels.length <= i) {
            const k = 2 ** levels.length;
            const opts = {
                size: [
                    Math.max(1, Math.floor(this.#shadowBase[0] / k)),
                    Math.max(1, Math.floor(this.#shadowBase[1] / k)),
                ] as const,
                float: true,
                filter: "linear" as const,
            };
            levels.push({
                a: ctx.createRenderTarget(opts),
                b: ctx.createRenderTarget(opts),
            });
        }
        return levels[i];
    }

    // Planar projected shadow: the head capsule of each body particle,
    // flattened onto the page along the light, into a 1/2-res coverage
    // target. The coverage is averaged over the last frames, then
    // blurred on the coarsest level that holds the blur. Float targets
    // keep the soft falloff free of banding.
    #drawShadow(
        ctx: EffectContext,
        scene: EffectRenderTarget,
        heads: EffectGeometry,
        uniforms: EffectUniforms,
    ): EffectRenderTarget | null {
        const bw = Math.max(1, Math.floor(scene.width / 2));
        const bh = Math.max(1, Math.floor(scene.height / 2));
        if (bw !== this.#shadowBase[0] || bh !== this.#shadowBase[1]) {
            this.#disposeShadow();
            this.#shadowBase = [bw, bh];
        }
        if (!this.#shadowHist) {
            this.#shadowHist = ctx.createRenderTarget({
                size: [bw, bh],
                float: true,
                persistent: true,
                filter: "linear",
            });
        }
        const hist = this.#shadowHist;
        const cover = this.#shadowLevel(ctx, 0).a;

        // The vertex shader works in scene px; NDC maps them onto this
        // smaller target as is.
        ctx.clear(cover);
        ctx.draw({
            vert: VERT_SHADOW,
            frag: FRAG_SHADOW_COVER,
            geometry: heads,
            uniforms,
            target: cover,
            blend: "none",
        });

        // Average out the holes that move from frame to frame. Frame-rate
        // independent; a still frame has nothing to average.
        const amount =
            this.#shadowHistValid && !this.#still
                ? 1 - Math.exp(-this.#frameDt / SHADOW_TAU)
                : 1;
        ctx.draw({
            frag: FRAG_SHADOW_ACCUM,
            uniforms: { curTex: cover, histTex: hist, amount },
            target: hist,
        });
        this.#shadowHistValid = true;

        // Blur sigma in scene px, then in texels of the chosen level.
        const sigmaPx = this.#r.shadowSoftness * ctx.pixelRatio;
        let level = 0;
        while (
            level < SHADOW_LEVELS - 1 &&
            sigmaPx / 2 ** (level + 1) > SHADOW_MAX_SIGMA
        ) {
            level++;
        }
        // Level 0 of the chain is the average; level 0's `a` only holds
        // this frame's coverage.
        const levelSrc = (i: number) =>
            i === 0 ? hist : this.#shadowLevel(ctx, i).a;
        for (let i = 1; i <= level; i++) {
            const src = levelSrc(i - 1);
            ctx.draw({
                frag: FRAG_BLOOM_DOWN,
                uniforms: {
                    srcTex: src,
                    texel: [1 / src.width, 1 / src.height],
                },
                target: this.#shadowLevel(ctx, i).a,
            });
        }
        const src = levelSrc(level);
        const sigma = sigmaPx / 2 ** (level + 1);
        if (sigma < 0.3) {
            return src;
        }
        const { a, b } = this.#shadowLevel(ctx, level);
        const radius = Math.min(Math.ceil(sigma * 3), 24);
        ctx.draw({
            frag: FRAG_SHADOW_BLUR,
            uniforms: { srcTex: src, dir: [1 / src.width, 0], sigma, radius },
            target: b,
        });
        ctx.draw({
            frag: FRAG_SHADOW_BLUR,
            uniforms: { srcTex: b, dir: [0, 1 / b.height], sigma, radius },
            target: a,
        });
        return a;
    }

    #disposeShadow(): void {
        for (const l of this.#shadow) {
            l.a.dispose();
            l.b.dispose();
        }
        this.#shadowHist?.dispose();
        this.#shadowHist = null;
        this.#shadowHistValid = false;
        this.#shadow = [];
        this.#shadowBase = [0, 0];
    }

    #disposeBloom(): void {
        if (this.#bloom) {
            disposeBloomPyramid(this.#bloom);
        }
        this.#bloom = null;
        this.#bloomBase = [0, 0];
    }

    // The bloom of the sparkles: prefilter, a downsample chain, then
    // upsample and add back. Null, and no targets kept, at `bloom` 0.
    // It has to happen here, not in a chained BloomEffect: the composite
    // soft-clips the HDR sparkles, so a later effect never sees them.
    #drawBloom(
        ctx: EffectContext,
        scene: EffectRenderTarget,
    ): EffectRenderTarget | null {
        if (!(this.#r.bloom > 0)) {
            this.#disposeBloom();
            return null;
        }
        if (
            !this.#bloom ||
            scene.width !== this.#bloomBase[0] ||
            scene.height !== this.#bloomBase[1]
        ) {
            this.#disposeBloom();
            this.#bloom = createBloomPyramid(
                ctx,
                scene.width,
                scene.height,
                BLOOM_LEVELS,
            );
            this.#bloomBase = [scene.width, scene.height];
        }
        const down = this.#bloom.down;
        ctx.draw({
            frag: FRAG_BLOOM_PREFILTER,
            uniforms: {
                scene,
                texel: [1 / scene.width, 1 / scene.height],
            },
            target: down[0],
        });
        for (let i = 1; i < down.length; i++) {
            const src = down[i - 1];
            ctx.draw({
                frag: FRAG_BLOOM_DOWN,
                uniforms: {
                    srcTex: src,
                    texel: [1 / src.width, 1 / src.height],
                },
                target: down[i],
            });
        }
        return upsampleBloomPyramid(ctx, this.#bloom, (_i, small) => ({
            texelSize: [1 / small.width, 1 / small.height],
            weightLarge: 1,
            weightSmall: BLOOM_SCATTER,
        }));
    }

    dispose(): void {
        this.#unlistenDrag?.();
        this.#unlistenDrag = null;
        this.#unlistenHover?.();
        this.#unlistenHover = null;
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        this.#deleteShapeTextures();
        if (this.#gl && this.#paletteRaw) {
            this.#gl.deleteTexture(this.#paletteRaw);
        }
        this.#paletteRaw = null;
        this.#paletteTex = null;
        this.#gl = null;
        this.#pos?.dispose();
        this.#vel?.dispose();
        this.#attrA?.dispose();
        this.#attrB?.dispose();
        this.#hist?.dispose();
        this.#scene?.dispose();
        this.#disposeShadow();
        this.#disposeBloom();
        this.#pos = null;
        this.#vel = null;
        this.#attrA = null;
        this.#attrB = null;
        this.#hist = null;
        this.#scene = null;
        this.#stateWidth = 0;
        // The core frees the compiled geometry with the chain.
        this.#trails = null;
        this.#heads = null;
        this.#fireflies = null;
        this.#nBody = -1;
        this.#nFire = -1;

        // Start over like a new instance if it is added again.
        this.#token++;
        this.#phase = "capture";
        this.#srcFrames = 0;
        this.#captureGap = CAPTURE_DELAY;
        this.#lastSize.fill(0);
        this.#settled = 0;
        this.#pending = null;
        this.#shape = null;
        this.#needsReset = true;
        this.#simTime = 0;
        this.#steps = 0;
        this.#stillDone = false;
        this.#stillCount = 0;
        this.#stillKey = [];
        this.#layers = NO_LAYERS;
        this.#frameDt = 0;
        this.#cam = null;
        this.#histTime.fill(-Infinity);
        this.#histHead = TRAIL_SAMPLES - 1;
        this.#lastPush = -Infinity;
        this.#paletteSrc = null;
        this.#paletteSnap = [];
        this.#dragYaw = 0;
        this.#dragPitch = 0;
        this.#dragging = false;
        this.#toElement.fill(0);
        this.#elementPx.fill(0);
        this.#pointerIn = false;
        this.#repelPos = [0, 0];
        this.#repelAmount = 0;
        this.#tiltYaw = 0;
        this.#tiltPitch = 0;
    }
}
