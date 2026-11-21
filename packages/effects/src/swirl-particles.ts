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
import { captureContent } from "./_capture.js";
import { parseHexColor } from "./_figma-common.js";
import { padOutputRect } from "./_pad.js";
import {
    QUAD_VERTS,
    sanitizeCount,
    stateSizeFromCount,
} from "./_particle-common.js";
import {
    buildShape,
    GLSL_SDF,
    MASK_LONG,
    type ShapeData,
    SPAWN_SIZE,
    viewMatrix,
} from "./_silhouette.js";

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

/**
 * Built-in particle gradients. Low offsets colour the shaded body, high
 * offsets the fast, glinting and peeled-off particles.
 */
export const SWIRL_PARTICLES_PALETTES: Record<
    SwirlParticlesPaletteName,
    readonly SwirlParticlesColorStop[]
> = {
    // Deep navy → blue → violet-pink → near white.
    nebula: [
        { offset: 0, color: "#0e1554" },
        { offset: 0.45, color: "#3a50d4" },
        { offset: 0.8, color: "#c478e0" },
        { offset: 1, color: "#f4e6ff" },
    ],
    ember: [
        { offset: 0, color: "#2a0603" },
        { offset: 0.45, color: "#b0260c" },
        { offset: 0.8, color: "#ff9a2e" },
        { offset: 1, color: "#fff3cf" },
    ],
    aurora: [
        { offset: 0, color: "#03262a" },
        { offset: 0.45, color: "#0d8f72" },
        { offset: 0.8, color: "#5cf2b0" },
        { offset: 1, color: "#e4fffb" },
    ],
    mono: [
        { offset: 0, color: "#141519" },
        { offset: 0.45, color: "#4b4f58" },
        { offset: 0.8, color: "#b4b8c0" },
        { offset: 1, color: "#ffffff" },
    ],
    sakura: [
        { offset: 0, color: "#3b0d2f" },
        { offset: 0.45, color: "#a8357a" },
        { offset: 0.8, color: "#f5a3c7" },
        { offset: 1, color: "#fff2f7" },
    ],
    ocean: [
        { offset: 0, color: "#021a35" },
        { offset: 0.45, color: "#0a61a3" },
        { offset: 0.8, color: "#2fc6da" },
        { offset: 1, color: "#e9fcff" },
    ],
};

export type SwirlParticlesParams = {
    /**
     * Number of particles. Construction-time only: changing it later has
     * no effect until the effect is re-added.
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
    /**
     * Fraction of particles drawn as bright sparkles, in [0, 1].
     * Construction-time only (see {@link count}).
     */
    fireflyRatio: number;
    /** HDR intensity of the sparkles. */
    fireflyIntensity: number;
    /** Sparkle colour, CSS hex. */
    fireflyColor: string;
    /** Bloom intensity. */
    bloom: number;
    /** Brightness above which pixels bloom. */
    bloomThreshold: number;
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
     * Orbit the camera by dragging the pointer anywhere on the page.
     * Off by default: it listens on `window`. UI that should not orbit
     * can stop `pointerdown` propagation.
     */
    drag: boolean;
    /**
     * Extra pad around the element in CSS px for the particles and bloom
     * to draw into, or `"fullscreen"` to draw over the whole canvas. Wisps
     * and a tilted shape reach well outside the element, so a small pad
     * clips them.
     */
    pad: number | "fullscreen";
    /**
     * Smooth the edges of the fibres with 4× multisampling (MSAA).
     * Off by default: the particle buffer then takes about 5 times the
     * memory, 10 times with its depth buffer, which adds up fast at
     * `pad: "fullscreen"` on a high-DPR screen. Falls back to no
     * multisampling, with a warning, on GPUs that can't do it.
     */
    antialias: boolean;
};

/** Options for {@link SwirlParticlesEffect}'s constructor. */
export type SwirlParticlesEffectOptions = {
    /**
     * Render a still frame: simulate a fixed number of steps once, then
     * stop. For visual tests and `prefers-reduced-motion`.
     */
    still?: boolean;
};

const DEFAULT_PARAMS: SwirlParticlesParams = {
    count: 512 * 512,
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
    bloomThreshold: 1.0,
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
    pad: "fullscreen",
    antialias: false,
};

const BLOOM_LEVELS = 6;
// Texels of the baked palette gradient.
const PALETTE_SIZE = 256;
const MAX_DT = 1 / 30;
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
// Shadow coverage levels, from 1/2 to 1/16 of the scene resolution. The
// blur runs on the coarsest level it still needs, so wide blurs stay cheap.
const SHADOW_LEVELS = 4;
// Largest blur sigma, in texels of a shadow level, before moving down one.
const SHADOW_MAX_SIGMA = 6;
// Time constant of the shadow coverage's running average, in seconds of
// simulation. The binary coverage has holes that move every frame; the
// average hides them, at the cost of the shadow trailing a fast move.
const SHADOW_TAU = 0.1;
const DEFAULT_LIGHT: readonly [number, number, number] = [-0.45, 0.75, 0.55];

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

// Spawn points are a pure function of (id, generation), so the draw pass
// can find where a particle was born without storing it.
const GLSL_PARTICLE_COMMON = `
uniform int stateWidth;
uniform float lifeMean;
uniform sampler2D spawnTex;
uniform int spawnSize;

float lifeOf(uint id, float gen) {
    return lifeMean * mix(0.6, 1.4, rnd(id * 1664525u + uint(gen) * 1013904223u + 7u));
}

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

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform int count;
uniform int reset;
uniform float time;
uniform float dt;
uniform float swirl;
uniform float curl;
uniform float curlScale;
uniform float speed;
uniform float attract;
uniform float peel;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;

${GLSL_HASH}
${GLSL_NOISE}
${GLSL_SDF}
${GLSL_PARTICLE_COMMON}

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
    uint id = uint(texel.y * stateWidth + texel.x);
    if (int(id) >= count) {
        outPos = vec4(0.0);
        outVel = vec4(0.0);
        return;
    }

    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);

    if (reset == 1) {
        float life = lifeOf(id, 0.0);
        outPos = vec4(spawn(id, 0.0), rnd(id * 7919u + 3u) * life);
        outVel = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float gen = V.w;
    float age = P.w + dt;
    float life = lifeOf(id, gen);
    if (age >= life) {
        gen += 1.0;
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
    float ageN = age / life;
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

    v = mix(v, target, 1.0 - exp(-dt * 5.0));
    p += v * dt;

    outPos = vec4(p, age);
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
uniform int count;

layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;

${GLSL_HASH}
${GLSL_NOISE}
${GLSL_SDF}
${GLSL_PARTICLE_COMMON}

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

#ifdef FIREFLY
in float pid;
uniform float fireflyIntensity;
uniform vec3 fireflyColor;
#else
in vec2 position;
uniform int idOffset;
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
uniform sampler2D velTex;
uniform mat3 viewRot;
uniform float camDist;
uniform float camNear;
uniform float camFar;
uniform float focalPx;
uniform vec2 centerPx;
uniform vec2 bufferPx;
uniform float pointPx;
uniform float time;

out vec3 vColor;
out vec2 vLocal;
out vec2 vShape;

${GLSL_HASH}
${GLSL_SDF}
${GLSL_PARTICLE_COMMON}

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
#ifdef FIREFLY
    int i = int(pid);
#else
    int i = gl_InstanceID + idOffset;
#endif
    ivec2 texel = ivec2(i % stateWidth, i / stateWidth);
    uint id = uint(i);
    vec4 P = texelFetch(posTex, texel, 0);
    vec4 V = texelFetch(velTex, texel, 0);
    vec3 p = P.xyz;
    float life = lifeOf(id, V.w);
    float ageN = P.w / life;

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
    // sample j. A sample written before the particle's last respawn (or
    // never written) doesn't have the age this one had then: the trail
    // ends before it, so a respawn never draws a line back. The trail is
    // cut at \`streak\` seconds and, like a speed cap, at 14 widths on
    // screen per 0.3 s of streak (the default), never fewer than 14.
    float age = P.w;
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
            && abs(age - ago - h.w) < 1e-3;
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
in vec3 vColor;
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

const FRAG_HIST_PUSH = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D posTex;
uniform vec2 slotOrigin;
out vec4 outColor;
void main() {
    outColor = texelFetch(posTex, ivec2(gl_FragCoord.xy - slotOrigin), 0);
}
`;

// An age no particle can have, so every sample reads as stale.
const FRAG_HIST_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, -1.0e9);
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
uniform float threshold;
out vec4 outColor;

void main() {
    vec3 c = texture(scene, uv + texel * vec2(-0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, -0.5)).rgb
           + texture(scene, uv + texel * vec2(-0.5, 0.5)).rgb
           + texture(scene, uv + texel * vec2(0.5, 0.5)).rgb;
    c *= 0.25;
    float br = max(c.r, max(c.g, c.b));
    float soft = clamp(br - threshold + 0.5, 0.0, 1.0);
    soft = soft * soft * 0.5;
    float k = max(soft, br - threshold) / max(br, 1e-4);
    outColor = vec4(c * k, 1.0);
}
`;

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

const FRAG_BLOOM_UP = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D lowTex;
uniform sampler2D highTex;
uniform vec2 texel;
uniform float scatter;
out vec4 outColor;

void main() {
    vec3 c = texture(lowTex, uv).rgb * 4.0;
    c += texture(lowTex, uv + texel * vec2(-1.0, 0.0)).rgb * 2.0;
    c += texture(lowTex, uv + texel * vec2(1.0, 0.0)).rgb * 2.0;
    c += texture(lowTex, uv + texel * vec2(0.0, -1.0)).rgb * 2.0;
    c += texture(lowTex, uv + texel * vec2(0.0, 1.0)).rgb * 2.0;
    c += texture(lowTex, uv + texel * vec2(-1.0, -1.0)).rgb;
    c += texture(lowTex, uv + texel * vec2(1.0, -1.0)).rgb;
    c += texture(lowTex, uv + texel * vec2(-1.0, 1.0)).rgb;
    c += texture(lowTex, uv + texel * vec2(1.0, 1.0)).rgb;
    c /= 16.0;
    outColor = vec4(texture(highTex, uv).rgb + c * scatter, 1.0);
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

function resolvePalette(
    palette: SwirlParticlesParams["palette"],
): readonly SwirlParticlesColorStop[] {
    const stops =
        typeof palette === "string"
            ? SWIRL_PARTICLES_PALETTES[palette]
            : palette;
    return stops && stops.length > 0 ? stops : SWIRL_PARTICLES_PALETTES.nebula;
}

// Bake the stops into PALETTE_SIZE RGBA8 texels, like a CSS gradient:
// sorted by offset, flat beyond the ends, linear in between.
function bakePalette(palette: SwirlParticlesParams["palette"]): Uint8Array {
    const stops = resolvePalette(palette)
        .map((s) => ({
            offset: Number.isFinite(s.offset)
                ? Math.min(Math.max(s.offset, 0), 1)
                : 0,
            rgb: parseHexColor(s.color),
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

function hexToRgb(hex: string): [number, number, number] {
    const [r, g, b] = parseHexColor(hex);
    return [r, g, b];
}

// Unit vector towards the light. Falls back to the default for a zero
// or broken direction.
function lightUnit(
    dir: SwirlParticlesParams["lightDirection"] | undefined,
): [number, number, number] {
    const [x, y, z] = dir ?? DEFAULT_LIGHT;
    const len = Math.hypot(x, y, z);
    if (!Number.isFinite(len) || len < 1e-6) {
        return lightUnit(DEFAULT_LIGHT);
    }
    return [x / len, y / len, z / len];
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
    const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
    return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

type Phase = "capture" | "reading" | "ready";

type BloomLevel = {
    down: EffectRenderTarget;
    up: EffectRenderTarget;
};

type ShadowLevel = {
    a: EffectRenderTarget;
    b: EffectRenderTarget;
};

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
 * The silhouette is the element's alpha, read once when the effect starts.
 * An opaque photo becomes an extruded slab. The output is premultiplied
 * over transparency, so set the page background yourself.
 *
 * All params except `count` and `fireflyRatio` are read every frame, so
 * you can mutate `params` live. Set `drag: true` to orbit the camera
 * with pointer drags, `shadow: true` to cast a drop shadow onto the
 * page behind, and `antialias: true` to smooth the fibres' edges.
 */
export class SwirlParticlesEffect implements Effect {
    params: SwirlParticlesParams;
    readonly #still: boolean;
    readonly #count: number;
    readonly #stateWidth: number;

    #phase: Phase = "capture";
    #srcFrames = 0;
    #pending: ShapeData | null = null;
    #shape: ShapeData | null = null;
    #needsReset = true;
    #simTime = 0;
    #stillDone = false;

    #mask: EffectRenderTarget | null = null;
    #pos: EffectRenderTarget | null = null;
    #vel: EffectRenderTarget | null = null;
    #scene: EffectRenderTarget | null = null;
    // Samples #scene was created with: 4 with `antialias`.
    #sceneSamples: 1 | 4 = 1;
    #bloom: BloomLevel[] = [];
    #bloomBase: [number, number] = [0, 0];
    #shadow: ShadowLevel[] = [];
    #shadowBase: [number, number] = [0, 0];
    // Running average of the level 0 coverage (persistent: ping-pong).
    #shadowHist: EffectRenderTarget | null = null;
    // False restarts the average on the next shadow frame.
    #shadowHistValid = false;
    // Seconds the simulation advanced this frame.
    #frameDt = 0;
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
    #paletteKey = "";

    readonly #nFire: number;
    #trails: EffectGeometry;
    #heads: EffectGeometry;
    #fireflies: EffectGeometry;
    #slotQuad: EffectGeometry = {
        attributes: { position: { data: QUAD_VERTS, itemSize: 2 } },
    };

    // Pointer drag.
    #dragYaw = 0;
    #dragPitch = 0;
    #dragging = false;
    #lastPointer: [number, number] = [0, 0];
    #unlisten: (() => void) | null = null;
    #unsubRestored: (() => void) | null = null;

    constructor(
        initial: Partial<SwirlParticlesParams> = {},
        opts: SwirlParticlesEffectOptions = {},
    ) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
        this.#still = opts.still ?? false;
        this.#count = sanitizeCount(this.params.count);
        this.#stateWidth = stateSizeFromCount(this.#count);

        // Fireflies take the first ids. Particles are statistically
        // identical, so that is as random as any other choice.
        const ratio = Number.isFinite(this.params.fireflyRatio)
            ? Math.min(Math.max(this.params.fireflyRatio, 0), 1)
            : 0;
        const nFire = Math.min(this.#count, Math.round(this.#count * ratio));
        this.#nFire = nFire;
        const ids = new Float32Array(Math.max(nFire, 1));
        for (let i = 0; i < ids.length; i++) {
            ids[i] = i;
        }
        this.#trails = trailGeometry(this.#count - nFire);
        this.#heads = {
            attributes: { position: { data: QUAD_VERTS, itemSize: 2 } },
            instanceCount: this.#count - nFire,
        };
        this.#fireflies = {
            mode: "points",
            attributes: { pid: { data: ids, itemSize: 1 } },
            drawRange: { start: 0, count: nFire },
        };
    }

    setParams(updates: Partial<SwirlParticlesParams>): void {
        Object.assign(this.params, updates);
    }

    init(ctx: EffectContext): void {
        this.#gl = ctx.gl;
        const stateOpts = {
            size: [this.#stateWidth, this.#stateWidth] as const,
            float: true,
            persistent: true,
            filter: "nearest" as const,
        };
        this.#pos = ctx.createRenderTarget(stateOpts);
        this.#vel = ctx.createRenderTarget(stateOpts);
        const attrOpts = { ...stateOpts, persistent: false };
        this.#attrA = ctx.createRenderTarget(attrOpts);
        this.#attrB = ctx.createRenderTarget(attrOpts);
        this.#hist = ctx.createRenderTarget({
            ...attrOpts,
            size: [this.#stateWidth * HIST_COLS, this.#stateWidth * HIST_ROWS],
        });
        this.#createScene(ctx);

        this.#unsubRestored = ctx.onContextRestored(() => {
            // Raw textures are gone; upload them again.
            this.#gl = ctx.gl;
            this.#sdfRaw = null;
            this.#spawnRaw = null;
            this.#paletteRaw = null;
            this.#sdfTex = null;
            this.#spawnTex = null;
            this.#paletteTex = null;
            this.#paletteKey = "";
            this.#pending = this.#shape;
            // The state and trail history targets come back empty:
            // respawn and mark every history slot stale.
            this.#needsReset = true;
            this.#stillDone = false;
            this.#shadowHistValid = false;
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

    // The particle buffer: HDR colour + depth, multisampled with
    // `antialias`.
    #createScene(ctx: EffectContext): EffectRenderTarget {
        const samples = this.params.antialias ? 4 : 1;
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

    render(ctx: EffectContext): void {
        if (!this.#scene || !this.#pos || !this.#vel) {
            return;
        }
        // `antialias` changed: a new buffer with the other sample count.
        const scene =
            (this.params.antialias ? 4 : 1) === this.#sceneSamples
                ? this.#scene
                : this.#createScene(ctx);

        if (this.#phase === "capture") {
            this.#capture(ctx);
        }
        if (this.#pending) {
            this.#upload(ctx, this.#pending);
            this.#shape = this.#pending;
            this.#pending = null;
            this.#phase = "ready";
            this.#needsReset = true;
        }
        this.#updatePalette(ctx);

        const ready =
            this.#phase === "ready" &&
            this.#sdfTex &&
            this.#spawnTex &&
            this.#paletteTex;
        let shadow: { tex: EffectRenderTarget; amount: number } | null = null;
        if (ready) {
            this.#simulate(ctx);
            shadow = this.#drawParticles(ctx, scene);
            this.#drawBloom(ctx, scene);
        }
        const top = this.#bloom[0];
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                scene,
                bloomTex: top ? top.up : scene,
                shadowTex: shadow ? shadow.tex : scene,
                hasScene: ready && top ? 1 : 0,
                bloom: this.params.bloom,
                shadowAmount: shadow ? shadow.amount : 0,
                shadowColor: hexToRgb(this.params.shadowColor),
            },
            target: ctx.target,
        });
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
        const mw = aspect >= 1 ? MASK_LONG : Math.round(MASK_LONG * aspect);
        const mh = aspect >= 1 ? Math.round(MASK_LONG / aspect) : MASK_LONG;
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
        const halfDepth = this.params.depth / 2;
        ctx.readPixels(this.#mask).then(
            (px) => {
                const shape = buildShape(px, mw, mh, halfDepth);
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
        if (this.#spawnRaw) {
            gl.deleteTexture(this.#spawnRaw);
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

        const spawn = gl.createTexture();
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

        if (!sdf || !spawn) {
            return;
        }
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
    }

    // Re-bake the gradient texture when the palette changes.
    #updatePalette(ctx: EffectContext): void {
        const palette = this.params.palette;
        const key =
            typeof palette === "string" ? palette : JSON.stringify(palette);
        if (this.#paletteTex && key === this.#paletteKey) {
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
        this.#paletteKey = key;
    }

    #shapeUniforms(): Record<
        string,
        number | EffectTexture | [number, number, number, number]
    > {
        const halfDepth = Math.max(this.params.depth / 2, 0.005);
        const uniforms: Record<
            string,
            number | EffectTexture | [number, number, number, number]
        > = {
            sdfRect: this.#shape?.sdfRect ?? [0, 0, 1, 1],
            halfDepth,
            rounding: Math.min(0.025, halfDepth * 0.5),
            stateWidth: this.#stateWidth,
            lifeMean: Math.max(this.params.life, 0.1),
            spawnSize: SPAWN_SIZE,
        };
        if (this.#sdfTex && this.#spawnTex) {
            uniforms.sdfTex = this.#sdfTex;
            uniforms.spawnTex = this.#spawnTex;
        }
        return uniforms;
    }

    #simulate(ctx: EffectContext): void {
        const pos = this.#pos;
        const vel = this.#vel;
        if (!pos || !vel || !this.#sdfTex || !this.#spawnTex) {
            return;
        }
        let steps = 1;
        let dt = Math.min(Math.max(ctx.deltaTime, 0), MAX_DT);
        this.#frameDt = dt;
        if (this.#still) {
            this.#frameDt = 0;
            if (this.#stillDone && !this.#needsReset) {
                return;
            }
            steps = STILL_STEPS;
            dt = 1 / 60;
        }
        const p = this.params;
        const base = {
            ...this.#shapeUniforms(),
            count: this.#count,
            swirl: p.swirl,
            curl: p.curl,
            curlScale: p.curlScale,
            speed: p.speed,
            attract: p.attract,
            peel: p.peel,
        };
        if (this.#needsReset) {
            ctx.draw({
                frag: FRAG_SIM,
                uniforms: {
                    ...base,
                    posTex: pos,
                    velTex: vel,
                    reset: 1,
                    time: this.#simTime,
                    dt: 0,
                },
                target: [pos, vel],
            });
            this.#resetHistory(ctx);
            this.#needsReset = false;
            this.#shadowHistValid = false;
        }
        for (let i = 0; i < steps; i++) {
            this.#simTime += dt;
            ctx.draw({
                frag: FRAG_SIM,
                uniforms: {
                    ...base,
                    posTex: pos,
                    velTex: vel,
                    reset: 0,
                    time: this.#simTime,
                    dt,
                },
                target: [pos, vel],
            });
            this.#pushHistory(ctx, pos);
        }
        this.#stillDone = true;
    }

    // Mark every history slot stale: an age no particle can have.
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
    #pushHistory(ctx: EffectContext, pos: EffectRenderTarget): void {
        const hist = this.#hist;
        const streak = this.params.streak;
        if (!hist || !(streak > 0)) {
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
    ): { tex: EffectRenderTarget; amount: number } | null {
        const pos = this.#pos;
        const vel = this.#vel;
        const shape = this.#shape;
        const attrA = this.#attrA;
        const attrB = this.#attrB;
        const hist = this.#hist;
        if (
            !pos ||
            !vel ||
            !shape ||
            !this.#paletteTex ||
            !attrA ||
            !attrB ||
            !hist
        ) {
            return null;
        }
        const p = this.params;
        const t = this.#simTime;

        // Camera: base angles, a slow wobble, and pointer drag.
        const orbit = Number.isFinite(p.orbit) ? p.orbit : 0;
        const yaw = p.yaw + orbit * Math.sin(t * 0.13) + this.#dragYaw;
        const pitch =
            p.pitch +
            orbit * PITCH_WOBBLE * Math.sin(t * 0.09 + 1.3) +
            this.#dragPitch;

        // Distance so that the long side (2 world units) spans `fov`.
        const fov = Math.min(Math.max(p.fov, 1), 150);
        const camDist = 1 / Math.tan((fov * Math.PI) / 360);

        const dims = ctx.dims;
        const [ew, eh] = dims.elementPixel;
        const [ox, oy] = padOutputRect(p.pad, dims);
        const unitPx = (Math.max(ew, eh) / 2) * p.zoom;
        const uniforms = {
            ...this.#shapeUniforms(),
            posTex: pos,
            velTex: vel,
            viewRot: viewMatrix(yaw, pitch),
            camDist,
            camNear: camDist * NEAR_K,
            camFar: camDist * FAR_K,
            focalPx: camDist * unitPx,
            centerPx: [ew / 2 - ox, eh / 2 - oy] as [number, number],
            bufferPx: [scene.width, scene.height] as [number, number],
            pointPx: p.pointSize * ctx.pixelRatio,
            time: t,
        };

        // Colour per particle, shared by all segments of its trail.
        ctx.draw({
            frag: FRAG_ATTR,
            uniforms: {
                ...uniforms,
                count: this.#count,
                speed: p.speed,
                paletteTex: this.#paletteTex,
                src: ctx.src,
                shapeHalf: shape.shapeHalf,
                sourceColor: Math.min(Math.max(p.sourceColor, 0), 1),
            },
            target: [attrA, attrB],
        });

        const trail = {
            ...uniforms,
            ...this.#historyUniforms(),
            histTex: hist,
            attrA,
            idOffset: this.#nFire,
            streak: Math.max(p.streak, 0),
        };
        const light = lightUnit(p.lightDirection);
        ctx.clear(scene);
        ctx.draw({
            vert: VERT_BODY,
            frag: FRAG_BODY,
            geometry: this.#trails,
            uniforms: {
                ...trail,
                attrB,
                lightDir: light,
                lightColor: hexToRgb(p.lightColor),
                lightIntensity: p.lightIntensity,
                ambient: p.ambient,
                occlusion: p.occlusion,
                glintAmount: p.glint,
            },
            target: scene,
            depthTest: true,
            blend: "none",
        });
        if (this.#nFire > 0) {
            ctx.draw({
                vert: VERT_FIREFLY,
                frag: FRAG_FIREFLY,
                geometry: this.#fireflies,
                uniforms: {
                    ...uniforms,
                    fireflyIntensity: p.fireflyIntensity,
                    fireflyColor: hexToRgb(p.fireflyColor),
                },
                target: scene,
                depthTest: true,
                depthWrite: false,
                blend: "additive",
            });
        }

        // A light from behind the page casts no shadow; fade it out as
        // the light grazes the page.
        const amount =
            Math.min(Math.max(p.shadowOpacity, 0), 1) *
            smoothstep(0, 0.25, light[2]);
        if (!p.shadow || !(amount > 0)) {
            // Start the average afresh when the shadow comes back.
            this.#shadowHistValid = false;
            return null;
        }
        const tex = this.#drawShadow(ctx, scene, {
            ...trail,
            shadowLight: [light[0], light[1], Math.max(light[2], 0.02)],
            shadowDepth: Math.max(p.shadowDistance, 0),
        });
        return { tex, amount };
    }

    // Planar projected shadow: the head capsule of each body particle,
    // flattened onto the page along the light, into a 1/2-res coverage
    // target. The coverage is averaged over the last frames, then
    // blurred on the coarsest level that holds the blur. Float targets
    // keep the soft falloff free of banding.
    #drawShadow(
        ctx: EffectContext,
        scene: EffectRenderTarget,
        uniforms: EffectUniforms,
    ): EffectRenderTarget {
        const bw = Math.max(1, Math.floor(scene.width / 2));
        const bh = Math.max(1, Math.floor(scene.height / 2));
        if (bw !== this.#shadowBase[0] || bh !== this.#shadowBase[1]) {
            this.#disposeShadow();
            let w = bw;
            let h = bh;
            for (let i = 0; i < SHADOW_LEVELS; i++) {
                const opts = {
                    size: [w, h] as const,
                    float: true,
                    filter: "linear" as const,
                };
                this.#shadow.push({
                    a: ctx.createRenderTarget(opts),
                    b: ctx.createRenderTarget(opts),
                });
                w = Math.max(1, Math.floor(w / 2));
                h = Math.max(1, Math.floor(h / 2));
            }
            this.#shadowHist = ctx.createRenderTarget({
                size: [bw, bh],
                float: true,
                persistent: true,
                filter: "linear",
            });
            this.#shadowBase = [bw, bh];
        }
        const levels = this.#shadow;
        const hist = this.#shadowHist;
        if (!hist) {
            return levels[0].a;
        }

        // The vertex shader works in scene px; NDC maps them onto this
        // smaller target as is.
        ctx.clear(levels[0].a);
        ctx.draw({
            vert: VERT_SHADOW,
            frag: FRAG_SHADOW_COVER,
            geometry: this.#heads,
            uniforms,
            target: levels[0].a,
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
            uniforms: { curTex: levels[0].a, histTex: hist, amount },
            target: hist,
        });
        this.#shadowHistValid = true;

        // Blur sigma in scene px, then in texels of the chosen level.
        const soft = Number.isFinite(this.params.shadowSoftness)
            ? Math.max(this.params.shadowSoftness, 0)
            : 0;
        const sigmaPx = soft * ctx.pixelRatio;
        let level = 0;
        while (
            level < levels.length - 1 &&
            sigmaPx / 2 ** (level + 1) > SHADOW_MAX_SIGMA
        ) {
            level++;
        }
        // Level 0 of the chain is the average; levels[0].a only holds this
        // frame's coverage.
        const levelSrc = (i: number) => (i === 0 ? hist : levels[i].a);
        for (let i = 1; i <= level; i++) {
            const src = levelSrc(i - 1);
            ctx.draw({
                frag: FRAG_BLOOM_DOWN,
                uniforms: {
                    srcTex: src,
                    texel: [1 / src.width, 1 / src.height],
                },
                target: levels[i].a,
            });
        }
        const { a, b } = levels[level];
        const src = levelSrc(level);
        const sigma = sigmaPx / 2 ** (level + 1);
        if (sigma < 0.3) {
            return src;
        }
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

    #drawBloom(ctx: EffectContext, scene: EffectRenderTarget): void {
        const bw = Math.max(1, Math.floor(scene.width / 2));
        const bh = Math.max(1, Math.floor(scene.height / 2));
        if (bw !== this.#bloomBase[0] || bh !== this.#bloomBase[1]) {
            for (const l of this.#bloom) {
                l.down.dispose();
                l.up.dispose();
            }
            this.#bloom = [];
            let w = bw;
            let h = bh;
            for (let i = 0; i < BLOOM_LEVELS; i++) {
                const opts = {
                    size: [w, h] as const,
                    float: true,
                    filter: "linear" as const,
                };
                this.#bloom.push({
                    down: ctx.createRenderTarget(opts),
                    up: ctx.createRenderTarget(opts),
                });
                w = Math.max(1, Math.floor(w / 2));
                h = Math.max(1, Math.floor(h / 2));
            }
            this.#bloomBase = [bw, bh];
        }
        const levels = this.#bloom;
        ctx.draw({
            frag: FRAG_BLOOM_PREFILTER,
            uniforms: {
                scene,
                texel: [1 / scene.width, 1 / scene.height],
                threshold: this.params.bloomThreshold,
            },
            target: levels[0].down,
        });
        for (let i = 1; i < levels.length; i++) {
            const src = levels[i - 1].down;
            ctx.draw({
                frag: FRAG_BLOOM_DOWN,
                uniforms: {
                    srcTex: src,
                    texel: [1 / src.width, 1 / src.height],
                },
                target: levels[i].down,
            });
        }
        const last = levels.length - 1;
        ctx.draw({
            frag: FRAG_COPY,
            uniforms: { srcTex: levels[last].down },
            target: levels[last].up,
        });
        for (let i = last - 1; i >= 0; i--) {
            const low = levels[i + 1].up;
            ctx.draw({
                frag: FRAG_BLOOM_UP,
                uniforms: {
                    lowTex: low,
                    highTex: levels[i].down,
                    texel: [1 / low.width, 1 / low.height],
                    scatter: 0.85,
                },
                target: levels[i].up,
            });
        }
    }

    dispose(): void {
        this.#unlisten?.();
        this.#unlisten = null;
        if (this.#gl) {
            for (const tex of [
                this.#sdfRaw,
                this.#spawnRaw,
                this.#paletteRaw,
            ]) {
                if (tex) {
                    this.#gl.deleteTexture(tex);
                }
            }
        }
        this.#sdfRaw = null;
        this.#spawnRaw = null;
        this.#paletteRaw = null;
        this.#sdfTex = null;
        this.#spawnTex = null;
        this.#paletteTex = null;
        this.#paletteKey = "";
        this.#gl = null;
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        this.#mask?.dispose();
        this.#pos?.dispose();
        this.#vel?.dispose();
        this.#attrA?.dispose();
        this.#attrB?.dispose();
        this.#hist?.dispose();
        this.#scene?.dispose();
        this.#disposeShadow();
        for (const l of this.#bloom) {
            l.down.dispose();
            l.up.dispose();
        }
        this.#mask = null;
        this.#pos = null;
        this.#vel = null;
        this.#attrA = null;
        this.#attrB = null;
        this.#hist = null;
        this.#scene = null;
        this.#bloom = [];
        this.#bloomBase = [0, 0];
    }
}
