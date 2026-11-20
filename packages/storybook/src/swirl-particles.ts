// Particles that crawl and curl over an extruded silhouette.
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
// 4. The particles are drawn as opaque points with a depth buffer,
//    shaded from the SDF, coloured by a ramp. A few "fireflies" are drawn
//    again additively in HDR, then bloomed.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectGeometry,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";

export type SwirlParticlesParams = {
    /** Number of particles. Fixed at construction. */
    count: number;
    /** Extrusion depth, relative to the long side of the element (= 2). */
    depth: number;
    /** Strength of the flow tangent to the surface. */
    swirl: number;
    /** Strength of the curl noise that makes the wisps. */
    curl: number;
    /** Spatial frequency of the curl noise. */
    curlScale: number;
    /** Overall flow speed (world units / sec). */
    speed: number;
    /** How strongly particles are pulled back onto the surface. */
    attract: number;
    /** 0..1: how much the pull fades with age (old particles peel off). */
    peel: number;
    /** Mean particle lifetime in seconds (randomised ±40%). */
    life: number;
    /** Particle width in CSS px at the focal distance. */
    pointSize: number;
    /** Motion streak length, in seconds of travel. */
    streak: number;
    /** Fraction of particles drawn as bright sparkles. */
    fireflyRatio: number;
    /** HDR intensity of the sparkles. */
    fireflyIntensity: number;
    /** Bloom intensity. */
    bloom: number;
    /** Brightness above which pixels bloom. */
    bloomThreshold: number;
    /** Camera orbit amplitude in radians. */
    orbit: number;
    /** Camera zoom. 1 = the shape matches the element size. */
    zoom: number;
    deepColor: string;
    midColor: string;
    hotColor: string;
    highlightColor: string;
    fireflyColor: string;
    skyColor: string;
    groundColor: string;
};

export const SWIRL_PARTICLES_DEFAULTS: SwirlParticlesParams = {
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
    bloom: 0.9,
    bloomThreshold: 1.0,
    orbit: 0.4,
    zoom: 1.0,
    deepColor: "#0e1554",
    midColor: "#3a50d4",
    hotColor: "#c478e0",
    highlightColor: "#f4e6ff",
    fireflyColor: "#ffd2ec",
    skyColor: "#5f6b80",
    groundColor: "#a9b2bf",
};

export type SwirlParticlesOpts = {
    /**
     * Render a still frame: simulate a fixed number of steps once, then stop.
     * For visual tests.
     */
    still?: boolean;
};

// Long side of the silhouette read back from the element, in px.
const MASK_LONG = 400;
// Padding of the SDF grid around the silhouette, relative to MASK_LONG.
const SDF_PAD = 0.3;
// Spawn points on the surface: SPAWN_SIZE² of them.
const SPAWN_SIZE = 256;
const BLOOM_LEVELS = 6;
// One quad per particle, stretched into a capsule in the vertex shader.
const QUAD = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
const QUAD_INDICES = new Uint16Array([0, 1, 2, 0, 2, 3]);
const MAX_DT = 1 / 30;
const STILL_STEPS = 90;
const CAM_DIST = 3.2;
const NEAR = 0.05;
const FAR = CAM_DIST + 6;

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

const GLSL_PARTICLE_COMMON = `
uniform int stateWidth;
uniform float lifeMean;

float lifeOf(uint id, float gen) {
    return lifeMean * mix(0.6, 1.4, rnd(id * 1664525u + uint(gen) * 1013904223u + 7u));
}
`;

const FRAG_MASK = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D src;
uniform vec4 srcRectUv;
out vec4 outColor;
void main() {
    outColor = texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}
`;

const FRAG_SIM = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform sampler2D spawnTex;
uniform int spawnSize;
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
    uint key = pcg(id ^ (uint(gen) * 2654435769u));
    int total = spawnSize * spawnSize;
    int idx = int(key % uint(total));
    vec4 s = texelFetch(spawnTex, ivec2(idx % spawnSize, idx / spawnSize), 0);
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

// Shared by the body (instanced capsules stretched along the motion, so
// the particles read as fibres) and the fireflies (points).
function makeParticleVert(firefly: boolean): string {
    return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${firefly ? "#define FIREFLY" : ""}

#ifdef FIREFLY
in float pid;
#else
in vec2 position;
uniform int idOffset;
uniform float streak;
#endif

uniform sampler2D posTex;
uniform sampler2D velTex;
uniform mat3 viewRot;
uniform float focalPx;
uniform vec2 centerPx;
uniform vec2 bufferPx;
uniform float pointPx;
uniform float time;
uniform float speed;
uniform float fireflyIntensity;
uniform vec3 deepColor;
uniform vec3 midColor;
uniform vec3 hotColor;
uniform vec3 highlightColor;
uniform vec3 fireflyColor;

out vec3 vColor;
out vec2 vLocal;
out vec2 vShape;

${GLSL_HASH}
${GLSL_NOISE}
${GLSL_SDF}
${GLSL_PARTICLE_COMMON}

vec3 ramp(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.45) return mix(deepColor, midColor, t / 0.45);
    if (t < 0.8) return mix(midColor, hotColor, (t - 0.45) / 0.35);
    return mix(hotColor, highlightColor, (t - 0.8) / 0.2);
}

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
    float depth = ${CAM_DIST.toFixed(2)} - q.z;
    return vec3(centerPx + q.xy * focalPx / max(depth, 1e-3), depth);
}

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
    if (lifeScale <= 0.01 || c.z < ${NEAR.toFixed(3)}) {
        cull();
        return;
    }
    float zLin = (c.z - ${NEAR.toFixed(3)}) / ${(FAR - NEAR).toFixed(3)};
    float persp = ${CAM_DIST.toFixed(2)} / c.z;
    vec4 s = sdf3(p);
    float off = clamp(s.x / 0.08, 0.0, 1.0);
    float r = rnd(id * 2246822519u + 13u);

#ifdef FIREFLY
    float flick = pow(0.5 + 0.5 * sin(time * (3.0 + r * 5.0) + r * 40.0), 6.0);
    // Nudge towards the camera so the fibres don't bury every sparkle.
    zLin -= 0.03 / ${(FAR - NEAR).toFixed(3)};
    gl_Position = vec4(c.xy / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    gl_PointSize = pointPx * persp * (1.4 + 1.6 * flick) * lifeScale;
    vColor = fireflyColor * fireflyIntensity * (0.25 + 1.75 * flick);
    vLocal = vec2(0.0);
    vShape = vec2(0.0);
#else
    // Shade from the SDF normal, in view space.
    vec3 nv = viewRot * s.yzw;
    vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
    float ndl = dot(nv, L);
    float wrap = 0.5 + 0.5 * ndl;
    // Cheap occlusion: how far the field is clear along the normal.
    float aoDist = sdf3(p + s.yzw * 0.07).x;
    float ao = mix(0.3, 1.0, clamp(aoDist / 0.07, 0.0, 1.0));

    // Colour attribute: slow noise over the surface + speed + per particle.
    vec3 gn;
    float nz = snoiseGrad(p * 1.6 + vec3(0.0, time * 0.05, 0.0), gn);
    float spd = length(V.xyz) / max(speed, 1e-4);
    float t = 0.3 + 0.35 * nz + 0.3 * clamp(spd - 0.5, 0.0, 1.5) + 0.3 * (r - 0.5);
    t += 0.4 * off;
    vec3 col = ramp(t) * mix(0.25, 1.15, wrap) * ao;
    // Some fibres catch the light.
    float glint = pow(max(ndl, 0.0), 3.0) * step(0.65, fract(r * 7.13));
    col += highlightColor * glint * 0.7 * ao;
    // Peeled-off wisps get lighter.
    col = mix(col, highlightColor * 0.85, off * 0.5);

    // Capsule from the previous position to the current one, on screen.
    float w = max(pointPx * persp * lifeScale * mix(1.0, 0.6, off), 1.0);
    vec3 b = project(p - V.xyz * streak);
    vec2 d = c.xy - b.xy;
    float len = min(length(d), w * 14.0);
    vec2 ax = len > 1e-3 ? normalize(d) : vec2(1.0, 0.0);
    vec2 pe = vec2(-ax.y, ax.x);
    vec2 mid = c.xy - ax * len * 0.5;
    vec2 local = position * vec2(len + w, w);
    vec2 px = mid + ax * local.x + pe * local.y;
    gl_Position = vec4(px / bufferPx * 2.0 - 1.0, zLin * 2.0 - 1.0, 1.0);
    vColor = col;
    vLocal = local;
    vShape = vec2(len * 0.5, w * 0.5);
#endif
}
`;
}

const VERT_BODY = makeParticleVert(false);
const VERT_FIREFLY = makeParticleVert(true);

const FRAG_BODY = `#version 300 es
precision highp float;
in vec3 vColor;
in vec2 vLocal;
in vec2 vShape;
out vec4 outColor;

void main() {
    // Capsule: segment of half-length vShape.x, radius vShape.y.
    vec2 q = vec2(max(abs(vLocal.x) - vShape.x, 0.0), vLocal.y);
    float r = length(q) / max(vShape.y, 1e-3);
    if (r > 1.0) discard;
    outColor = vec4(vColor * (1.0 - 0.3 * r * r), 1.0);
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

const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform sampler2D bloomTex;
uniform int hasScene;
uniform float bloom;
uniform vec3 skyColor;
uniform vec3 groundColor;
uniform vec2 bufferPx;
out vec4 outColor;

vec3 softClip(vec3 x) {
    vec3 k = 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
    return mix(x, k, step(0.8, x));
}

void main() {
    // Soft grey-blue backdrop, lighter towards the bottom right.
    vec2 aspect = vec2(bufferPx.x / bufferPx.y, 1.0);
    vec2 g = (uv - vec2(0.7, 0.05)) * aspect;
    float glow = exp(-dot(g, g) * 0.9);
    vec3 bg = mix(skyColor, groundColor, clamp(glow * 0.9 + (1.0 - uv.y) * 0.25, 0.0, 1.0));
    vec2 vg = (uv - 0.5) * aspect;
    bg *= 1.0 - 0.18 * dot(vg, vg);

    vec3 col = bg;
    if (hasScene == 1) {
        vec4 s = texture(scene, uv);
        col = bg * (1.0 - clamp(s.a, 0.0, 1.0)) + s.rgb;
        col += texture(bloomTex, uv).rgb * bloom;
    }
    // Noise dither against banding in the backdrop.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col = softClip(max(col, 0.0)) + dither / 255.0;
    outColor = vec4(col, 1.0);
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
    /** RGBA: x, y, z / halfDepth (-1..1), 0. */
    spawn: Float32Array;
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
        spawn,
    };
}

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) {
        return [1, 1, 1];
    }
    const c = Number.parseInt(m[1], 16);
    return [
        ((c >> 16) & 0xff) / 255,
        ((c >> 8) & 0xff) / 255,
        (c & 0xff) / 255,
    ];
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

type Phase = "capture" | "reading" | "ready";

type BloomLevel = {
    down: EffectRenderTarget;
    up: EffectRenderTarget;
};

export class SwirlParticlesEffect implements Effect {
    readonly params: SwirlParticlesParams;
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
    #bloom: BloomLevel[] = [];
    #bloomBase: [number, number] = [0, 0];

    #gl: WebGL2RenderingContext | null = null;
    #sdfRaw: WebGLTexture | null = null;
    #spawnRaw: WebGLTexture | null = null;
    #sdfTex: EffectTexture | null = null;
    #spawnTex: EffectTexture | null = null;

    readonly #nFire: number;
    #body: EffectGeometry;
    #fireflies: EffectGeometry;

    // Pointer drag.
    #dragYaw = 0;
    #dragPitch = 0;
    #dragging = false;
    #lastPointer: [number, number] = [0, 0];
    #unlisten: (() => void) | null = null;
    #unsubRestored: (() => void) | null = null;

    constructor(
        params: Partial<SwirlParticlesParams> = {},
        opts: SwirlParticlesOpts = {},
    ) {
        this.params = { ...SWIRL_PARTICLES_DEFAULTS, ...params };
        this.#still = opts.still ?? false;
        this.#count = Math.max(1, Math.floor(this.params.count));
        this.#stateWidth = 2 ** Math.ceil(Math.log2(Math.sqrt(this.#count)));

        // Fireflies take the first ids. Particles are statistically
        // identical, so that is as random as any other choice.
        const nFire = Math.min(
            this.#count,
            Math.round(this.#count * Math.max(0, this.params.fireflyRatio)),
        );
        this.#nFire = nFire;
        const ids = new Float32Array(Math.max(nFire, 1));
        for (let i = 0; i < ids.length; i++) {
            ids[i] = i;
        }
        this.#body = {
            attributes: { position: { data: QUAD, itemSize: 2 } },
            indices: QUAD_INDICES,
            instanceCount: this.#count - nFire,
        };
        this.#fireflies = {
            mode: "points",
            attributes: { pid: { data: ids, itemSize: 1 } },
            drawRange: { start: 0, count: nFire },
        };
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
        this.#scene = ctx.createRenderTarget({ float: true, depth: true });

        this.#unsubRestored = ctx.onContextRestored(() => {
            // Raw textures are gone; read the silhouette again.
            this.#gl = ctx.gl;
            this.#sdfRaw = null;
            this.#spawnRaw = null;
            this.#sdfTex = null;
            this.#spawnTex = null;
            this.#pending = this.#shape;
            this.#needsReset = true;
            this.#stillDone = false;
        });

        if (!this.#still && typeof window !== "undefined") {
            const down = (e: PointerEvent) => {
                // Don't orbit while using a control panel (Tweakpane).
                if ((e.target as Element | null)?.closest?.(".tp-rotv")) {
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
        return dims.canvasRect;
    }

    render(ctx: EffectContext): void {
        const scene = this.#scene;
        if (!scene || !this.#pos || !this.#vel) {
            return;
        }

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

        const ready = this.#phase === "ready" && this.#sdfTex && this.#spawnTex;
        if (ready) {
            this.#simulate(ctx);
            this.#drawParticles(ctx, scene);
            this.#drawBloom(ctx, scene);
        }
        const top = this.#bloom[0];
        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                scene,
                bloomTex: top ? top.up : scene,
                hasScene: ready && top ? 1 : 0,
                bloom: this.params.bloom,
                skyColor: hexToRgb(this.params.skyColor),
                groundColor: hexToRgb(this.params.groundColor),
                bufferPx: [scene.width, scene.height],
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
        ctx.draw({
            frag: FRAG_MASK,
            uniforms: { src: ctx.src },
            target: this.#mask,
        });
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

    #sdfUniforms(): Record<string, number | [number, number, number, number]> {
        const halfDepth = Math.max(this.params.depth / 2, 0.005);
        return {
            sdfRect: this.#shape?.sdfRect ?? [0, 0, 1, 1],
            halfDepth,
            rounding: Math.min(0.025, halfDepth * 0.5),
            stateWidth: this.#stateWidth,
            lifeMean: Math.max(this.params.life, 0.1),
        };
    }

    #simulate(ctx: EffectContext): void {
        const pos = this.#pos;
        const vel = this.#vel;
        if (!pos || !vel || !this.#sdfTex || !this.#spawnTex) {
            return;
        }
        let steps = 1;
        let dt = Math.min(Math.max(ctx.deltaTime, 0), MAX_DT);
        if (this.#still) {
            if (this.#stillDone && !this.#needsReset) {
                return;
            }
            steps = STILL_STEPS;
            dt = 1 / 60;
        }
        const p = this.params;
        const base = {
            ...this.#sdfUniforms(),
            sdfTex: this.#sdfTex,
            spawnTex: this.#spawnTex,
            spawnSize: SPAWN_SIZE,
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
            this.#needsReset = false;
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
        }
        this.#stillDone = true;
    }

    #drawParticles(ctx: EffectContext, scene: EffectRenderTarget): void {
        const pos = this.#pos;
        const vel = this.#vel;
        if (!pos || !vel || !this.#sdfTex) {
            return;
        }
        const p = this.params;
        const t = this.#simTime;

        // Camera: slow orbit plus pointer drag.
        const yaw = 0.2 + p.orbit * Math.sin(t * 0.13) + this.#dragYaw;
        const pitch = 0.22 + 0.12 * Math.sin(t * 0.09 + 1.3) + this.#dragPitch;

        const dims = ctx.dims;
        const [ew, eh] = dims.elementPixel;
        const [cx, cy] = dims.canvasRect;
        const unitPx = (Math.max(ew, eh) / 2) * p.zoom;
        const uniforms = {
            ...this.#sdfUniforms(),
            sdfTex: this.#sdfTex,
            posTex: pos,
            velTex: vel,
            viewRot: viewMatrix(yaw, pitch),
            focalPx: CAM_DIST * unitPx,
            centerPx: [ew / 2 - cx, eh / 2 - cy] as [number, number],
            bufferPx: [scene.width, scene.height] as [number, number],
            pointPx: p.pointSize * ctx.pixelRatio,
            time: t,
            speed: p.speed,
            fireflyIntensity: p.fireflyIntensity,
            deepColor: hexToRgb(p.deepColor),
            midColor: hexToRgb(p.midColor),
            hotColor: hexToRgb(p.hotColor),
            highlightColor: hexToRgb(p.highlightColor),
            fireflyColor: hexToRgb(p.fireflyColor),
        };

        ctx.clear(scene);
        ctx.draw({
            vert: VERT_BODY,
            frag: FRAG_BODY,
            geometry: this.#body,
            uniforms: {
                ...uniforms,
                idOffset: this.#nFire,
                streak: p.streak,
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
                uniforms,
                target: scene,
                depthTest: true,
                depthWrite: false,
                blend: "additive",
            });
        }
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
            if (this.#sdfRaw) {
                this.#gl.deleteTexture(this.#sdfRaw);
            }
            if (this.#spawnRaw) {
                this.#gl.deleteTexture(this.#spawnRaw);
            }
        }
        this.#sdfRaw = null;
        this.#spawnRaw = null;
        this.#sdfTex = null;
        this.#spawnTex = null;
        this.#gl = null;
        this.#unsubRestored?.();
        this.#unsubRestored = null;
        this.#mask?.dispose();
        this.#pos?.dispose();
        this.#vel?.dispose();
        this.#scene?.dispose();
        for (const l of this.#bloom) {
            l.down.dispose();
            l.up.dispose();
        }
        this.#mask = null;
        this.#pos = null;
        this.#vel = null;
        this.#scene = null;
        this.#bloom = [];
        this.#bloomBase = [0, 0];
    }
}
