// GPU particles spawned from a mouse cursor, advected through a 2D
// curl-noise field. Three sim/render passes:
//
//   pass 1 — state (pos + epoch + isRespawn) in a 256² float ping-pong.
//            Per-particle life offset hashed from particle id staggers
//            spawn/reset timing across particles. On respawn, position
//            is the mouse + a random offset within `radius` px. On
//            non-respawn frames, position advects via curl-noise scaled
//            by a smooth speed falloff that drops to zero outside the
//            mouse radius.
//   pass 2 — saved spawn color in a 256² ping-pong: when the state
//            pass marks a particle as just-respawned, sample ctx.src
//            at the spawn uv and freeze that color until next respawn.
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
in vec2 uv;
out vec4 outColor;

void main() {
    // Sentinel state: pos offscreen, epoch = -2 (any real epoch
    // differs → triggers a real respawn on the first valid frame).
    outColor = vec4(-1.0, -1.0, -2.0, 0.0);
}
`;

const FRAG_UPDATE_STATE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform sampler2D spawn;     // spawn pos snapshot from previous frame
uniform vec2 mouseUv;
uniform float radius;        // radius in element px
uniform vec2 elementPixel;
uniform float time;          // sec
uniform float dt;            // sec
uniform float lifespan;      // sec
uniform float speed;         // uv per sec at full strength
uniform float noiseScale;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 3D simplex noise (Ashima Arts / Ian McEwan, MIT). Smooth, isotropic.
// Time goes on the z-axis — the field morphs in place instead of
// drifting (which the 2D + diagonal-time version did).
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
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
    vec4 p = permute(
        permute(
            permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0)
        )
        + i.x + vec4(0.0, i1.x, i2.x, 1.0)
    );
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
    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(
        0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)),
        0.0
    );
    m = m * m;
    return 42.0 * dot(
        m * m,
        vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))
    );
}

vec2 curl2D(vec2 p, float t) {
    float eps = 0.01;
    float z = t * 0.3;
    float ny0 = snoise(vec3(p + vec2(0.0, eps), z));
    float ny1 = snoise(vec3(p - vec2(0.0, eps), z));
    float nx0 = snoise(vec3(p + vec2(eps, 0.0), z));
    float nx1 = snoise(vec3(p - vec2(eps, 0.0), z));
    return vec2(ny0 - ny1, -(nx0 - nx1)) / (2.0 * eps);
}

void main() {
    vec4 s = texture(state, uv);
    vec2 pos = s.xy;
    float storedEpoch = s.z;

    // Per-particle life offset (stable across frames, hashed from id).
    float offset = hash21(uv * 137.0 + 0.5) * lifespan;
    float realEpoch = floor((time + offset) / lifespan);

    bool justRespawned = realEpoch != storedEpoch;

    if (justRespawned) {
        // Spawn within mouse radius — uniform-area distribution via
        // sqrt() on the radial hash.
        float r = sqrt(hash21(uv + vec2(time * 0.317, 0.123))) * radius;
        float theta = hash21(uv + vec2(0.0, time * 0.413)) * 6.28318530718;
        vec2 offsetPx = vec2(cos(theta) * r, sin(theta) * r);
        pos = mouseUv + offsetPx / elementPixel;
        storedEpoch = realEpoch;
    } else {
        // Curl-driven motion, attenuated by mouse distance.
        // Sample noise in uv stretched so its cells are isotropic in
        // pixel space (otherwise non-square elements squash features).
        // noiseScale is cells across the shorter axis.
        vec2 stretch = elementPixel / min(elementPixel.x, elementPixel.y);
        vec2 noiseInput = pos * stretch * noiseScale;
        vec2 vIn = curl2D(noiseInput, time);
        // Velocity from noise-input space → pos-uv space: divide by
        // stretch so per-axis pixel speeds stay equal.
        vec2 v = vIn / stretch;
        // speedFactor is computed in FRAG_UPDATE_SPAWN as a smoothed
        // value driven by spawn-to-mouse distance — using the spawn
        // pos (not current pos) so the particle doesn't drift its own
        // attenuation, and time-smoothed so the cursor leaving the
        // radius decelerates the particle gradually.
        float speedFactor = texture(spawn, uv).z;
        pos += v * speed * dt * speedFactor;
    }

    outColor = vec4(pos, storedEpoch, justRespawned ? 1.0 : 0.0);
}
`;

// Snapshots the spawn pos on respawn frames, plus low-pass-filters
// the per-particle speedFactor toward its mouse-distance target. The
// filtered value lives in spawn.z so FRAG_UPDATE_STATE can apply it
// without recomputing — particles decelerate smoothly when the mouse
// leaves the active radius instead of stopping in one frame.
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

void main() {
    vec4 prev = texture(prevSpawn, uv);
    vec2 spawnPos = prev.xy;
    float prevSpeed = prev.z;

    vec4 s = texture(state, uv);
    bool justRespawned = s.w > 0.5;
    if (justRespawned) {
        spawnPos = s.xy;
        // Newborn particles start at full speed (they spawn inside the
        // radius by construction, so there's no transient to smooth).
        prevSpeed = 1.0;
    }

    vec2 dPx = (spawnPos - mouseUv) * elementPixel;
    float distPx = length(dPx);
    float target = 1.0 - smoothstep(radius, radius * 3.0, distPx);
    // Frame-rate independent low-pass: alpha = 1 - exp(-rate * dt).
    float a = 1.0 - exp(-speedDecay * dt);
    float newSpeed = mix(prevSpeed, target, clamp(a, 0.0, 1.0));

    outColor = vec4(spawnPos, newSpeed, 0.0);
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
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float time;
uniform float lifespan;
uniform float aliveFraction;
uniform float alpha;

out vec2 vCorner;
out vec4 vColor;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

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

    vec2 pos = s.xy;
    bool offscreen = pos.x < 0.0 || pos.x > 1.0
                  || pos.y < 0.0 || pos.y > 1.0;

    // Lifecycle alpha — particle is alive for the first aliveFraction
    // of its cycle and dead (invisible) for the rest. Within the alive
    // window we apply a sin envelope so spawn/despawn are smooth and
    // the epoch-boundary teleport is hidden.
    float lifeOffset = hash21(stateUv * 137.0 + 0.5) * lifespan;
    float phase = mod(time + lifeOffset, lifespan) / lifespan;  // 0..1
    float alivePhase = phase / max(aliveFraction, 1e-3);
    float lifeAlpha = alivePhase < 1.0
        ? sin(alivePhase * 3.14159)
        : 0.0;

    if (offscreen || lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    vec2 ndcPos = pos * 2.0 - 1.0;
    vec2 ndcOffset = position * pointSize * 2.0 / elementPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);
    vCorner = position;
    vColor = vec4(c.rgb, c.a * lifeAlpha * alpha);
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
    /** Background image opacity 0..1. */
    backgroundOpacity: number;
    /**
     * Per-frame trail decay (0..1). Higher = longer trails. The
     * fullscreen composite multiplies the prev trail buffer by this
     * before stamping new particles on top, so dead-particle pixels
     * fade at the same rate as everything else.
     */
    trailFade: number;
};

const DEFAULT_PARAMS: CurlParticlesParams = {
    count: STATE_SIZE * STATE_SIZE,
    lifespan: 3,
    aliveFraction: 0.7,
    speed: 0.15,
    noiseScale: 5,
    pointSize: 3,
    alpha: 1.0,
    radius: 200,
    speedDecay: 1.5,
    backgroundOpacity: 0.4,
    trailFade: 0.9,
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
                lifespan,
                speed,
                noiseScale,
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
                stateSize: [STATE_SIZE, STATE_SIZE],
                pointSize,
                elementPixel,
                particleCount: Math.min(
                    STATE_SIZE * STATE_SIZE,
                    Math.max(1, Math.floor(this.params.count)),
                ),
                time,
                lifespan,
                aliveFraction: this.params.aliveFraction,
                alpha: this.params.alpha,
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
