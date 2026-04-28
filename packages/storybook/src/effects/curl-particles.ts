// GPU particles spawned from a mouse cursor, advected through a 3D
// curl-noise field, rendered with parallel (orthographic) projection
// onto xy. Particles have a true z coordinate and move in 3D — what
// you see is the xy slice. Three sim/render passes:
//
//   pass 1 — state (pos.xyz + isRespawn) in a 256² float ping-pong.
//            Per-particle life offset hashed from particle id staggers
//            spawn/reset timing across particles. On respawn, position
//            is sampled uniformly inside a 3D ball around the mouse.
//            On non-respawn frames, position advects via curl3D scaled
//            by a smooth speed falloff that drops to zero outside the
//            mouse radius (xy-only distance — mouse is 2D).
//   pass 1b — spawn buffer (xy + speedFactor + age). Snapshots pos.xy
//             on respawn, low-pass-filters the speedFactor, and
//             advances the per-particle age. Aging rate is base
//             1/lifespan accelerated by (1 - speedFactor) * idleKill,
//             so particles outside the active radius age (and respawn)
//             faster — alpha is a single sin envelope on age, no
//             separate distance fade in the vert shader.
//   pass 2 — saved spawn color in a 256² ping-pong: when the state
//            pass marks a particle as just-respawned, sample ctx.src
//            at the spawn xy uv and freeze that color until next respawn.
//   pass 3 — instanced 1×1 quads rendered into a `persistent: true`
//            trail RT. The fragment mixes the new particle color with
//            the trail's previous-frame value via
//                outColor = mix(newColor, prevColor, 0.1)
//            so the persistent buffer accumulates fading streaks.
//
// A final pass composites the trail over ctx.src into ctx.target.
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";

const STATE_SIZE = 256;

const FRAG_INIT_STATE = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    // Pos sentinel offscreen; respawn flag clear. The real respawn
    // trigger lives in the spawn buffer's epoch (see FRAG_INIT_SPAWN).
    outColor = vec4(-1.0, -1.0, -1.0, 0.0);
}
`;

const FRAG_INIT_SPAWN = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
void main() {
    // Per-particle random initial age in [0, 1). Each particle reaches
    // age=1 at a different time → first respawns are spread across the
    // full lifespan instead of arriving in one wave. SpeedFactor is
    // seeded at 1 so initial aging isn't accelerated by idleKill while
    // the spawn-pos low-pass converges.
    float h = fract(sin(dot(uv, vec2(127.1, 311.7))) * 43758.5453);
    outColor = vec4(0.0, 0.0, 1.0, h);
}
`;

const FRAG_UPDATE_STATE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D spawn;     // .xy: spawn pos, .z: speedFactor, .w: age
uniform vec2 mouseUv;
uniform float radius;        // radius in element px
uniform vec2 elementPixel;
uniform float time;          // sec
uniform float dt;            // sec
uniform float speed;         // uv per sec at full strength
uniform float noiseScale;
uniform float noiseAnimation;  // morph rate on the 4th (time) axis

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 4D simplex noise (Ashima Arts / Ian McEwan, MIT). Time becomes a
// real 4th dimension — the field morphs in place rather than drifting
// through space.
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}

float snoise(vec4 v) {
    const vec2 C = vec2(0.138196601125010504,    // (5 - sqrt(5))/20  G4
                        0.309016994374947451);   // (sqrt(5) - 1)/4   F4
    vec4 i = floor(v + dot(v, C.yyyy));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
    vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
    vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
    vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
    i = mod289(i);
    float j0 = permute(
        permute(permute(permute(i.w) + i.z) + i.y) + i.x
    );
    vec4 j1 = permute(
        permute(
            permute(
                permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0))
                + i.z + vec4(i1.z, i2.z, i3.z, 1.0)
            )
            + i.y + vec4(i1.y, i2.y, i3.y, 1.0)
        )
        + i.x + vec4(i1.x, i2.x, i3.x, 1.0)
    );
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (
        dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
        + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4)))
    );
}

// 3D curl of a vector noise potential field. Three decorrelated
// potential components (Pa, Pb, Pc) sampled with finite differences;
// 12 snoise calls total. Time is the 4th coordinate of the 4D simplex
// input — the field morphs in place at a rate set by noiseAnimation.
vec3 curl3D(vec3 p, float t) {
    float eps = 0.01;
    vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
    vec4 dy = vec4(0.0, eps, 0.0, 0.0);
    vec4 dz = vec4(0.0, 0.0, eps, 0.0);
    vec4 pa = vec4(p,                                          t);
    vec4 pb = vec4(p + vec3(31.341, 47.853, 19.287),           t);
    vec4 pc = vec4(p + vec3(83.519, 71.523, 53.819),           t);
    float dPzdy = snoise(pc + dy) - snoise(pc - dy);
    float dPydz = snoise(pb + dz) - snoise(pb - dz);
    float dPxdz = snoise(pa + dz) - snoise(pa - dz);
    float dPzdx = snoise(pc + dx) - snoise(pc - dx);
    float dPydx = snoise(pb + dx) - snoise(pb - dx);
    float dPxdy = snoise(pa + dy) - snoise(pa - dy);
    return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * eps);
}

void main() {
    vec4 s = texture(state, uv);
    vec3 pos = s.xyz;
    // age >= 1 → particle has died; trigger a respawn this frame.
    // age advancement (and the aging-rate multiplier) lives in the
    // spawn pass; here we only read the value.
    float age = texture(spawn, uv).w;
    bool justRespawned = age >= 1.0;

    float shortAxis = min(elementPixel.x, elementPixel.y);

    if (justRespawned) {
        // Uniform-volume distribution in a 3D ball: cbrt of a hash on
        // the radius, isotropic direction from azimuth + cos(polar).
        float r = pow(
            hash21(uv + vec2(time * 0.317, 0.123)), 1.0 / 3.0
        ) * radius;
        float theta = hash21(uv + vec2(0.0, time * 0.413)) * 6.28318530718;
        float cosPhi = hash21(uv + vec2(time * 0.521, 0.789)) * 2.0 - 1.0;
        float sinPhi = sqrt(max(0.0, 1.0 - cosPhi * cosPhi));
        vec3 dir = vec3(cos(theta) * sinPhi, sin(theta) * sinPhi, cosPhi);
        vec3 offsetPx = dir * r;
        // xy in element-uv, z normalized by the shorter axis so the
        // ball is isotropic in pixel space.
        pos = vec3(
            mouseUv + offsetPx.xy / elementPixel,
            offsetPx.z / shortAxis
        );
    } else {
        // Stretch xy so noise cells are isotropic in pixel space; z is
        // already normalized to shortAxis (stretch = 1).
        vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
        vec3 noiseInput = pos * stretch * noiseScale;
        vec3 vIn = curl3D(noiseInput, time * noiseAnimation);
        vec3 v = vIn / stretch;
        // speedFactor: time-smoothed value driven by spawn-xy-to-mouse
        // distance (FRAG_UPDATE_SPAWN). Using the spawn pos avoids the
        // particle drifting out of its own attenuation.
        float speedFactor = texture(spawn, uv).z;
        pos += v * speed * dt * speedFactor;
    }

    outColor = vec4(pos, justRespawned ? 1.0 : 0.0);
}
`;

// Snapshots spawn xy on respawn frames, low-pass-filters the per-
// particle speedFactor toward its mouse-distance target, and advances
// the particle's age. Aging rate is base 1/lifespan accelerated by
// (1 - speedFactor) * idleKill — particles outside the active radius
// age (and therefore die + respawn) faster.
const FRAG_UPDATE_SPAWN = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D prevSpawn;
uniform vec2 mouseUv;
uniform float radius;
uniform vec2 elementPixel;
uniform float speedDecay;  // per-second rate of convergence to target
uniform float dt;
uniform float time;
uniform float lifespan;
uniform float idleKill;    // extra aging multiplier when speedFactor=0

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec4 prev = texture(prevSpawn, uv);
    vec2 spawnPos = prev.xy;
    float prevSpeed = prev.z;
    float age = prev.w;

    vec4 s = texture(state, uv);
    bool justRespawned = s.w > 0.5;
    if (justRespawned) {
        spawnPos = s.xy;
        // Newborn particles start at full speed (they spawn inside the
        // radius by construction, so there's no transient to smooth).
        prevSpeed = 1.0;
        // Negative initial age = a per-particle pre-spawn delay, so
        // siblings don't all reach age=1 at the same instant. Hashed
        // with time so subsequent respawns re-stagger.
        age = -hash21(uv + vec2(time * 0.123, 0.456)) * 0.7;
    }

    // Mouse attenuation is xy-only — the cursor lives on the screen
    // plane, so z distance shouldn't gate the speedFactor.
    vec2 dPx = (spawnPos - mouseUv) * elementPixel;
    float distPx = length(dPx);
    float target = 1.0 - smoothstep(radius, radius * 3.0, distPx);
    // Frame-rate independent low-pass: alpha = 1 - exp(-rate * dt).
    float a = 1.0 - exp(-speedDecay * dt);
    float newSpeed = mix(prevSpeed, target, clamp(a, 0.0, 1.0));

    if (!justRespawned) {
        // Per-particle lifespan multiplier (stable, uv-hashed) — gives
        // each particle a different cycle length so they desynchronize
        // permanently rather than snapping back to a shared phase.
        float lifespanScale = 0.6 + hash21(uv * 91.7 + 1.234) * 0.8;
        // Faster aging when the particle is far from the mouse.
        float agingRate = 1.0 + idleKill * (1.0 - newSpeed);
        age += dt * agingRate / (lifespan * lifespanScale);
    }

    outColor = vec4(spawnPos, newSpeed, age);
}
`;

const FRAG_UPDATE_COLOR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D prevColor;
uniform sampler2D src;

void main() {
    vec4 s = texture(state, uv);
    bool justRespawned = s.w > 0.5;
    if (justRespawned) {
        // Sample input image at the spawn uv (clamped — particles can
        // spawn slightly outside [0,1] when the mouse is near edges).
        vec2 spawnUv = clamp(s.xy, 0.0, 1.0);
        outColor = texture(src, spawnUv);
    } else {
        outColor = texture(prevColor, uv);
    }
}
`;

// Particle render. gl_InstanceID drives state-texture lookup; the unit
// quad's per-vertex `position ∈ [-0.5, 0.5]²` expands into a pointSize
// billboard centered on the particle's element-uv position.
const VERT_PARTICLE = `#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D state;
uniform sampler2D color;
uniform sampler2D spawn;  // .w: per-particle age (sin envelope drives alpha)
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float aliveFraction;
uniform float alpha;
uniform float fog;       // 0 = none, 1 = full depth fade

out vec2 vCorner;
out vec4 vColor;

void main() {
    int id = gl_InstanceID;
    if (id >= particleCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }
    int sx = id % int(stateSize.x);
    int sy = id / int(stateSize.x);
    vec2 stateUv = (vec2(float(sx), float(sy)) + 0.5) / stateSize;
    vec4 s = texture(state, stateUv);
    vec4 c = texture(color, stateUv);
    float age = texture(spawn, stateUv).w;

    vec2 pos = s.xy;
    bool offscreen = pos.x < 0.0 || pos.x > 1.0
                  || pos.y < 0.0 || pos.y > 1.0;

    // Sin envelope on age. age < 0 = pre-spawn (queued), invisible.
    // alivePhase > 1 = past the visible window, invisible (the rest
    // of the age cycle is dead time before respawn).
    float alivePhase = age / max(aliveFraction, 1e-3);
    float lifeAlpha = (age >= 0.0 && alivePhase < 1.0)
        ? sin(alivePhase * 3.14159)
        : 0.0;

    if (offscreen || lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    // Depth fog — particles fade as pos.z increases (deeper into the
    // scene). At fog=0 the multiplier is 1 everywhere; at fog=1, the
    // alpha smoothly drops between z=-0.5 (front) and z=1 (back).
    float fogFactor = mix(1.0, smoothstep(1.0, -0.5, s.z), fog);

    vec2 ndcPos = pos * 2.0 - 1.0;
    vec2 ndcOffset = position * pointSize * 2.0 / elementPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);
    vCorner = position;
    vColor = vec4(c.rgb, c.a * lifeAlpha * alpha * fogFactor);
}
`;

const FRAG_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// Particle render: writes premultiplied particle color into a per-frame
// stamp buffer. The trail composite (next pass) is what creates the
// fading-trail effect — it's a fullscreen pass so non-covered pixels
// also decay each frame, which is what makes dead particles disappear.
const FRAG_PARTICLE = `#version 300 es
precision highp float;
in vec2 vCorner;
in vec4 vColor;
out vec4 outColor;

void main() {
    float d = length(vCorner) * 2.0;
    float fall = 1.0 - smoothstep(0.6, 1.0, d);
    if (fall <= 0.0) discard;
    float a = vColor.a * fall;
    outColor = vec4(vColor.rgb * a, a);
}
`;

// Trail composite: persistent prev * trailFade (decays everywhere)
// plus per-frame additive particle stamp. The stamp is built up
// additively in the previous pass so overlapping particles can
// brighten beyond a single particle's intensity.
const FRAG_TRAIL_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trailPrev;
uniform sampler2D particleStamp;
uniform float trailFade;

void main() {
    vec4 prev = texture(trailPrev, uv);
    vec4 stamp = texture(particleStamp, uv);
    vec4 faded = prev * trailFade;
    outColor = vec4(
        faded.rgb + stamp.rgb,
        clamp(faded.a + stamp.a, 0.0, 1.0)
    );
}
`;

const FRAG_OUTPUT = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;

uniform sampler2D src;
uniform sampler2D trail;
uniform float backgroundOpacity;

void main() {
    vec4 base = texture(src, uvSrc) * backgroundOpacity;
    vec4 t = texture(trail, uv);
    // Trail premultiplied-over base.
    outColor = vec4(base.rgb * (1.0 - t.a) + t.rgb, max(base.a, t.a));
}
`;

export type CurlParticlesParams = {
    /** Particle count. Locked at construction. */
    count: number;
    /** Total cycle duration (sec) — same for all, with per-particle phase offsets. */
    lifespan: number;
    /** Fraction of `lifespan` during which the particle is visible. */
    aliveFraction: number;
    /** uv-displacement-per-second at full speed. */
    speed: number;
    /** Curl-noise frequency (cells per uv unit). */
    noiseScale: number;
    /** Morph rate of the noise field along the 4th simplex axis
     * (units per second). 0 = frozen field. */
    noiseAnimation: number;
    /** Particle quad size in element px. */
    pointSize: number;
    /** Global alpha multiplier on each particle (0..1). */
    alpha: number;
    /** Mouse spawn / activity radius in element px. */
    radius: number;
    /**
     * How quickly per-particle speedFactor catches up to its target
     * (per second). Lower values = particles take longer to spin up
     * when the mouse arrives or wind down when it leaves.
     */
    speedDecay: number;
    /**
     * Extra aging multiplier applied when a particle is far from the
     * mouse (speedFactor → 0). 0 disables the early kill (particles
     * just live their full lifespan); higher values make idle
     * particles die and respawn sooner.
     */
    idleKill: number;
    /** Background image opacity 0..1. */
    backgroundOpacity: number;
    /**
     * Per-frame trail decay (0..1). Higher = longer trails. The
     * fullscreen composite multiplies the prev trail buffer by this
     * before stamping new particles on top, so dead-particle pixels
     * fade at the same rate as everything else.
     */
    trailFade: number;
    /** Depth fog 0..1. 0 = none; 1 = particles fade between z=-0.5
     * (front, fully visible) and z=1 (back, invisible). */
    fog: number;
};

const DEFAULT_PARAMS: CurlParticlesParams = {
    count: STATE_SIZE * STATE_SIZE,
    lifespan: 3,
    aliveFraction: 0.7,
    speed: 0.15,
    noiseScale: 2.0,
    noiseAnimation: 0.3,
    pointSize: 2.0,
    alpha: 0.5,
    radius: 200,
    speedDecay: 1.5,
    idleKill: 2.0,
    backgroundOpacity: 1.0,
    trailFade: 0.9,
    fog: 0.5,
};

const QUAD_VERTS = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
]);

/**
 * Mouse-driven curl-noise GPU particles. Mutate
 * `params.lifespan` / `speed` / `noiseScale` / `pointSize` / `radius`
 * / `backgroundOpacity` at runtime. `count` is locked at construction.
 */
export class CurlParticlesEffect implements Effect {
    params: CurlParticlesParams;

    #statePos: EffectRenderTarget | null = null;
    #stateSpawn: EffectRenderTarget | null = null;
    #stateColor: EffectRenderTarget | null = null;
    #particleStamp: EffectRenderTarget | null = null;
    #trail: EffectRenderTarget | null = null;
    #initialized = false;
    #geometry: EffectGeometry | null = null;

    constructor(initial: Partial<CurlParticlesParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(ctx: EffectContext): void {
        const stateOpts = {
            size: [STATE_SIZE, STATE_SIZE] as [number, number],
            float: true,
            persistent: true,
            wrap: "clamp" as const,
            filter: "nearest" as const,
        };
        this.#statePos = ctx.createRenderTarget(stateOpts);
        this.#stateSpawn = ctx.createRenderTarget(stateOpts);
        this.#stateColor = ctx.createRenderTarget(stateOpts);
        // Per-frame particle stamp (cleared and rewritten each frame).
        this.#particleStamp = ctx.createRenderTarget({
            float: false,
            wrap: "clamp",
            filter: "linear",
        });
        // Trail auto-resizes to dst buffer (= element); persistent so
        // the fullscreen composite has a real previous frame to fade.
        this.#trail = ctx.createRenderTarget({
            float: false,
            persistent: true,
            wrap: "clamp",
            filter: "linear",
        });
        const cap = Math.max(
            1,
            Math.min(STATE_SIZE * STATE_SIZE, Math.floor(this.params.count)),
        );
        this.#geometry = {
            attributes: { position: QUAD_VERTS },
            instanceCount: cap,
        };
    }

    render(ctx: EffectContext): void {
        if (
            !this.#statePos ||
            !this.#stateSpawn ||
            !this.#stateColor ||
            !this.#particleStamp ||
            !this.#trail ||
            !this.#geometry
        ) {
            return;
        }
        const { lifespan, speed, noiseScale, pointSize, radius } = this.params;
        // ctx.time / ctx.deltaTime are in seconds (vfx-player builds
        // them off Date.now() / 1000). Cap dt to keep big tab-switch
        // pauses from teleporting particles.
        const dt = Math.min(0.1, Math.max(0, ctx.deltaTime));
        const time = ctx.time;
        const elementPixel: [number, number] = [
            ctx.dims.elementPixel[0],
            ctx.dims.elementPixel[1],
        ];
        const mouseUv: [number, number] = [
            ctx.mouse[0] / Math.max(1, elementPixel[0]),
            ctx.mouse[1] / Math.max(1, elementPixel[1]),
        ];

        if (!this.#initialized) {
            ctx.draw({ frag: FRAG_INIT_STATE, target: this.#statePos });
            ctx.draw({ frag: FRAG_INIT_SPAWN, target: this.#stateSpawn });
            this.#initialized = true;
        }

        // Pass 1: state update — reads prev spawn pos for the speedFactor.
        ctx.draw({
            frag: FRAG_UPDATE_STATE,
            uniforms: {
                state: this.#statePos,
                spawn: this.#stateSpawn,
                mouseUv,
                radius,
                elementPixel,
                time,
                dt,
                speed,
                noiseScale,
                noiseAnimation: this.params.noiseAnimation,
            },
            target: this.#statePos,
        });

        // Pass 1b: snapshot pos as new spawn on respawn frames + low-
        // pass-filter the speedFactor so particles decelerate smoothly.
        ctx.draw({
            frag: FRAG_UPDATE_SPAWN,
            uniforms: {
                state: this.#statePos,
                prevSpawn: this.#stateSpawn,
                mouseUv,
                radius,
                elementPixel,
                speedDecay: this.params.speedDecay,
                dt,
                time,
                lifespan,
                idleKill: this.params.idleKill,
            },
            target: this.#stateSpawn,
        });

        // Pass 2: per-particle saved color.
        ctx.draw({
            frag: FRAG_UPDATE_COLOR,
            uniforms: {
                state: this.#statePos,
                prevColor: this.#stateColor,
                src: ctx.src,
            },
            target: this.#stateColor,
        });

        // Pass 3a: clear the per-frame particle stamp buffer.
        ctx.draw({ frag: FRAG_CLEAR, target: this.#particleStamp });

        // Pass 3b: instanced quads → particleStamp with additive
        // blending so overlapping particles brighten instead of
        // overwriting each other.
        ctx.draw({
            vert: VERT_PARTICLE,
            frag: FRAG_PARTICLE,
            uniforms: {
                state: this.#statePos,
                color: this.#stateColor,
                spawn: this.#stateSpawn,
                stateSize: [STATE_SIZE, STATE_SIZE],
                pointSize,
                elementPixel,
                particleCount: Math.min(
                    STATE_SIZE * STATE_SIZE,
                    Math.max(1, Math.floor(this.params.count)),
                ),
                aliveFraction: this.params.aliveFraction,
                alpha: this.params.alpha,
                fog: this.params.fog,
            },
            geometry: this.#geometry,
            target: this.#particleStamp,
            blend: "additive",
        });

        // Pass 3c: trail = prev * trailFade composited with stamp.
        // Fullscreen pass — every pixel decays each frame, so dead
        // particles' last positions can't linger.
        ctx.draw({
            frag: FRAG_TRAIL_COMPOSITE,
            uniforms: {
                trailPrev: this.#trail,
                particleStamp: this.#particleStamp,
                trailFade: this.params.trailFade,
            },
            target: this.#trail,
        });

        // Output composite.
        ctx.draw({
            frag: FRAG_OUTPUT,
            uniforms: {
                src: ctx.src,
                trail: this.#trail,
                backgroundOpacity: this.params.backgroundOpacity,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#statePos = null;
        this.#stateSpawn = null;
        this.#stateColor = null;
        this.#particleStamp = null;
        this.#trail = null;
        this.#initialized = false;
        this.#geometry = null;
    }
}
