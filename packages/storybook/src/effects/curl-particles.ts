// Mouse-spawned GPU particles advected through a 3D curl-noise field,
// rendered as the xy slice of true 3D motion. Persistent trail buffer
// composited over ctx.src.
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
    outColor = vec4(-1.0, -1.0, -1.0, 0.0);
}
`;

const FRAG_INIT_SPAWN = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
void main() {
    // Random initial age stagger first respawns across the lifespan.
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

// 4D simplex noise (Ashima Arts / Ian McEwan, MIT).
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

// 3D curl of a vector noise potential field. Time enters as the 4th
// simplex axis so the field morphs in place.
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
    float age = texture(spawn, uv).w;
    bool justRespawned = age >= 1.0;

    float shortAxis = min(elementPixel.x, elementPixel.y);

    if (justRespawned) {
        // Uniform 3D ball: cbrt(radius hash), isotropic direction.
        float r = pow(
            hash21(uv + vec2(time * 0.317, 0.123)), 1.0 / 3.0
        ) * radius;
        float theta = hash21(uv + vec2(0.0, time * 0.413)) * 6.28318530718;
        float cosPhi = hash21(uv + vec2(time * 0.521, 0.789)) * 2.0 - 1.0;
        float sinPhi = sqrt(max(0.0, 1.0 - cosPhi * cosPhi));
        vec3 dir = vec3(cos(theta) * sinPhi, sin(theta) * sinPhi, cosPhi);
        vec3 offsetPx = dir * r;
        // z normalized by shortAxis so the ball stays isotropic.
        pos = vec3(
            mouseUv + offsetPx.xy / elementPixel,
            offsetPx.z / shortAxis
        );
    } else {
        // Stretch xy so noise cells are pixel-isotropic.
        vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
        vec3 noiseInput = pos * stretch * noiseScale;
        vec3 vIn = curl3D(noiseInput, time * noiseAnimation);
        vec3 v = vIn / stretch;
        float speedFactor = texture(spawn, uv).z;
        pos += v * speed * dt * speedFactor;
    }

    outColor = vec4(pos, justRespawned ? 1.0 : 0.0);
}
`;

// Spawn snapshot + speedFactor low-pass + age advance. Idle particles
// (far from mouse) age faster via (1 - speedFactor) * idleKill.
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
        prevSpeed = 1.0;
        // Negative age = pre-spawn delay so siblings desync.
        age = -hash21(uv + vec2(time * 0.123, 0.456)) * 0.7;
    }

    // xy-only mouse distance (cursor is 2D).
    vec2 dPx = (spawnPos - mouseUv) * elementPixel;
    float distPx = length(dPx);
    float target = 1.0 - smoothstep(radius, radius * 3.0, distPx);
    // Frame-rate independent low-pass.
    float a = 1.0 - exp(-speedDecay * dt);
    float newSpeed = mix(prevSpeed, target, clamp(a, 0.0, 1.0));

    if (!justRespawned) {
        // Per-particle lifespan jitter to permanently desync particles.
        float lifespanScale = 0.6 + hash21(uv * 91.7 + 1.234) * 0.8;
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
        vec2 spawnUv = clamp(s.xy, 0.0, 1.0);
        outColor = texture(src, spawnUv);
    } else {
        outColor = texture(prevColor, uv);
    }
}
`;

// Particle render. gl_InstanceID drives state lookup; unit quad
// expands into a pointSize billboard.
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
uniform float fog;  // 0 = none, 1 = full depth fade

uniform vec4 contentRectUv;

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

    // Sin envelope on age.
    // age < 0: pre-spawn (queued)
    // alivePhase > 1: dead
    float alivePhase = age / max(aliveFraction, 1e-3);
    float lifeAlpha = (age >= 0.0 && alivePhase < 1.0)
        ? sin(alivePhase * 3.14159)
        : 0.0;

    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    // Depth fog
    float fogFactor = mix(1.0, smoothstep(1.0, -0.5, s.z), fog);

    // Map pos to buffer-uv
    vec2 bufferUv = contentRectUv.xy + pos * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    // Calculate position from pointSize
    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
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

// Premultiplied particle color into per-frame stamp buffer.
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

// Trail = prev * trailFade + particle stamp. Fullscreen so dead-
// particle pixels also decay.
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
    // Mask src to [0,1] — trail buffer is canvas-sized.
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = inside.x * inside.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0))
              * backgroundOpacity * srcMask;
    vec4 t = texture(trail, uv);
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

// Mouse-driven curl-noise GPU particles. Mutate `params` at runtime;
// `count` is locked at construction.
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
        this.#particleStamp = ctx.createRenderTarget({
            float: false,
            wrap: "clamp",
            filter: "linear",
        });
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
        // Cap dt so tab-switch pauses don't teleport particles.
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

        // State update.
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

        // Spawn snapshot + speedFactor low-pass.
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

        // Saved color per particle.
        ctx.draw({
            frag: FRAG_UPDATE_COLOR,
            uniforms: {
                state: this.#statePos,
                prevColor: this.#stateColor,
                src: ctx.src,
            },
            target: this.#stateColor,
        });

        // Clear stamp, then additive instanced quads so overlaps brighten.
        ctx.draw({ frag: FRAG_CLEAR, target: this.#particleStamp });
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

        // Trail composite (fullscreen, decays everywhere).
        ctx.draw({
            frag: FRAG_TRAIL_COMPOSITE,
            uniforms: {
                trailPrev: this.#trail,
                particleStamp: this.#particleStamp,
                trailFade: this.params.trailFade,
            },
            target: this.#trail,
        });

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

    // Particles and trails extend past the element bounds.
    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        return dims.canvasRect;
    }
}
