// Mouse-driven GPU particles. CPU spawn scheduler picks ring-buffer
// slots each frame; particles advect along a 3D curl-noise field and
// composite over a persistent trail buffer.
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";

const STATE_SIZE = 256;
// Per-frame uniform array budget for spawn data. 128 vec4 = 512 vertex
// uniform components, well under the WebGL2 1024-component minimum.
const MAX_SPAWNS_PER_FRAME = 128;
// Active mouse if it moved within this window (sec) — otherwise spawn
// only when `params.spawnOnIdle` is set.
const IDLE_THRESHOLD = 0.1;
// Per-particle lifespan multiplier range (centred on 1.0).
const LIFE_JITTER_MIN = 0.7;
const LIFE_JITTER_MAX = 1.3;

// age = 2.0 keeps every slot dead until the spawn pass writes a fresh
// particle in.
const FRAG_INIT_POS = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 2.0);
}
`;

const FRAG_INIT_COLOR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0);
}
`;

// 4D simplex noise (Ashima Arts / Ian McEwan, MIT) + 3D curl built on
// top. The 4th simplex axis carries time so the field morphs in place.
const GLSL_CURL_NOISE = `
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
    const vec2 C = vec2(0.138196601125010504,
                        0.309016994374947451);
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
`;

// Per-instance dummy vertex stream for the spawn point primitive. The
// framework computes vertex count from the `position` attribute, so we
// must declare and reference it in the vertex shader (see
// effect-geometry.ts).
const SPAWN_DUMMY_POSITION = new Float32Array([0, 0]);

// Spawn pass — writes new particles into specific texels of the state
// textures. One point per spawn, vertex shader maps slot → state-texel
// NDC position.
const VERT_SPAWN = `#version 300 es
precision highp float;
in vec2 position;
uniform vec4 uSpawn[${MAX_SPAWNS_PER_FRAME}];   // [slotIdx, spawnUv.x, spawnUv.y, lifeJitter]
uniform int uSpawnCount;
uniform vec2 stateSize;

out vec2 vSpawnUv;
out float vLifeJitter;

void main() {
    int id = gl_InstanceID;
    if (id >= uSpawnCount) {
        // Skip unused instance slots by emitting an off-screen vertex.
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vSpawnUv = vec2(0.0);
        vLifeJitter = 0.0;
        return;
    }
    vec4 d = uSpawn[id];
    float idx = d.x;
    float sx = mod(idx, stateSize.x);
    float sy = floor(idx / stateSize.x);
    vec2 stateUv = (vec2(sx, sy) + 0.5) / stateSize;
    // Adding the always-zero position attribute keeps it referenced
    // through compilation (the framework derives vertex count from it).
    gl_Position = vec4(stateUv * 2.0 - 1.0 + position, 0.0, 1.0);
    gl_PointSize = 1.0;
    vSpawnUv = d.yz;
    vLifeJitter = d.w;
}
`;

const FRAG_SPAWN_POS = `#version 300 es
precision highp float;
in vec2 vSpawnUv;
in float vLifeJitter;
out vec4 outColor;

uniform sampler2D src;
uniform float alphaThreshold;

void main() {
    // Reject spawns outside the element rect or where src is transparent.
    vec2 inside = step(vec2(0.0), vSpawnUv) * step(vSpawnUv, vec2(1.0));
    float visible = inside.x * inside.y;
    float a = texture(src, clamp(vSpawnUv, 0.0, 1.0)).a * visible;
    if (a < alphaThreshold) {
        outColor = vec4(0.0, 0.0, 0.0, 2.0);   // born dead
        return;
    }
    outColor = vec4(vSpawnUv, 0.0, 0.0);
}
`;

const FRAG_SPAWN_COLOR = `#version 300 es
precision highp float;
in vec2 vSpawnUv;
in float vLifeJitter;
out vec4 outColor;

uniform sampler2D src;

void main() {
    vec4 c = texture(src, clamp(vSpawnUv, 0.0, 1.0));
    outColor = vec4(c.rgb, vLifeJitter);
}
`;

// Pure advect + age. Dead slots (age >= 1) pass through unchanged so
// they stay invisible until the spawn pass overwrites them.
const FRAG_UPDATE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float speed;
uniform float noiseScale;
uniform float noiseAnimation;
uniform float speedDecay;
uniform float life;
${GLSL_CURL_NOISE}
void main() {
    vec4 s = texture(posTex, uv);
    float age = s.w;
    if (age >= 1.0) {
        outColor = s;
        return;
    }

    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
    vec3 noiseInput = s.xyz * stretch / max(noiseScale, 1e-4);
    vec3 v = curl3D(noiseInput, time * noiseAnimation) / stretch;

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + v * speed * dt * taper;

    float lifeMul = max(texture(colorTex, uv).w, 1e-3);
    age += dt / max(life * lifeMul, 1e-3);

    outColor = vec4(pos, age);
}
`;

export type MouseParticlesParams = {
    /** Max particles. Capped at construction by the state texture size. */
    count: number;
    /** Particles per second emitted while the mouse is active. */
    birthRate: number;
    /** Base lifespan (sec); actual life is jittered per-particle. */
    life: number;
    /** uv-displacement-per-second at full strength. */
    speed: number;
    /** Approximate swirl size in uv units (larger → bigger swirls). */
    noiseScale: number;
    /** Morph rate on the 4th simplex axis (units per second). */
    noiseAnimation: number;
    /** Particle quad size in element px. */
    pointSize: number;
    /** Global alpha multiplier on each particle (0..1). */
    alpha: number;
    /** Spawn radius around the cursor in element px. */
    radius: number;
    /** Life-taper curve exponent (>1 holds full speed longer). */
    speedDecay: number;
    /** Reject spawns where src.a is below this. */
    alphaThreshold: number;
    /** Emit even when the mouse is stationary. */
    spawnOnIdle: boolean;
    /** Background image opacity 0..1. */
    backgroundOpacity: number;
    /** Per-frame trail decay (0..1). Higher = longer trails. */
    trailFade: number;
    /** Depth fog 0..1. */
    fog: number;
};

const DEFAULT_PARAMS: MouseParticlesParams = {
    count: STATE_SIZE * STATE_SIZE,
    birthRate: 4000,
    life: 3,
    speed: 0.15,
    noiseScale: 0.5,
    noiseAnimation: 0.3,
    pointSize: 2.0,
    alpha: 0.5,
    radius: 30,
    speedDecay: 1.0,
    alphaThreshold: 0.05,
    spawnOnIdle: false,
    backgroundOpacity: 1.0,
    trailFade: 0.9,
    fog: 0.5,
};

export class MouseParticlesEffect implements Effect {
    params: MouseParticlesParams;

    // Manual posTex ping-pong: UPDATE writes the advanced state to the
    // write target, then SPAWN overlays a few texels with new particle
    // data. A persistent (auto-swapped) RT would alternate stale/fresh
    // for non-spawned slots — explicit alternation avoids that.
    #posA: EffectRenderTarget | null = null;
    #posB: EffectRenderTarget | null = null;
    #colorTex: EffectRenderTarget | null = null;
    #stampTex: EffectRenderTarget | null = null;
    #trail: EffectRenderTarget | null = null;
    #posReadIsA = false;
    #initialized = false;

    #spawnUniform = new Float32Array(MAX_SPAWNS_PER_FRAME * 4);
    #spawnGeometry: EffectGeometry = {
        mode: "points",
        attributes: { position: SPAWN_DUMMY_POSITION },
        instanceCount: MAX_SPAWNS_PER_FRAME,
    };
    #nextSlot = 0;
    #birthAccumulator = 0;
    #lastMouseUv: [number, number] | null = null;
    #lastMoveTime = -Infinity;

    constructor(initial: Partial<MouseParticlesParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(ctx: EffectContext): void {
        const stateOpts = {
            size: [STATE_SIZE, STATE_SIZE] as [number, number],
            float: true,
            wrap: "clamp" as const,
            filter: "nearest" as const,
        };
        this.#posA = ctx.createRenderTarget(stateOpts);
        this.#posB = ctx.createRenderTarget(stateOpts);
        this.#colorTex = ctx.createRenderTarget(stateOpts);
        this.#stampTex = ctx.createRenderTarget({
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
    }

    render(ctx: EffectContext): void {
        if (
            !this.#posA ||
            !this.#posB ||
            !this.#colorTex ||
            !this.#stampTex ||
            !this.#trail
        ) {
            return;
        }

        if (!this.#initialized) {
            // Init both ping-pong sides so the first UPDATE has a clean
            // read texture.
            ctx.draw({ frag: FRAG_INIT_POS, target: this.#posA });
            ctx.draw({ frag: FRAG_INIT_POS, target: this.#posB });
            ctx.draw({ frag: FRAG_INIT_COLOR, target: this.#colorTex });
            this.#initialized = true;
        }

        // Cap dt so tab-switch pauses don't teleport particles.
        const dt = Math.min(0.1, Math.max(0, ctx.deltaTime));
        const elementPixel: [number, number] = [
            ctx.dims.elementPixel[0],
            ctx.dims.elementPixel[1],
        ];

        const posRead = this.#posReadIsA ? this.#posA : this.#posB;
        const posWrite = this.#posReadIsA ? this.#posB : this.#posA;

        ctx.draw({
            frag: FRAG_UPDATE,
            uniforms: {
                posTex: posRead,
                colorTex: this.#colorTex,
                elementPixel,
                time: ctx.time,
                dt,
                speed: this.params.speed,
                noiseScale: this.params.noiseScale,
                noiseAnimation: this.params.noiseAnimation,
                speedDecay: this.params.speedDecay,
                life: this.params.life,
            },
            target: posWrite,
        });

        const nSpawn = this.#scheduleSpawns(ctx, dt, elementPixel);
        if (nSpawn > 0) {
            const spawnUniforms = {
                uSpawn: this.#spawnUniform,
                uSpawnCount: nSpawn,
                stateSize: [STATE_SIZE, STATE_SIZE] as [number, number],
                src: ctx.src,
                alphaThreshold: this.params.alphaThreshold,
            };
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_POS,
                uniforms: spawnUniforms,
                geometry: this.#spawnGeometry,
                target: posWrite,
            });
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_COLOR,
                uniforms: spawnUniforms,
                geometry: this.#spawnGeometry,
                target: this.#colorTex,
            });
        }

        this.#posReadIsA = !this.#posReadIsA;

        // Particle-stamp / trail / output passes follow in the next commit.
    }

    #scheduleSpawns(
        ctx: EffectContext,
        dt: number,
        elementPixel: readonly [number, number],
    ): number {
        const mouseUv: [number, number] = [
            ctx.mouse[0] / Math.max(1, elementPixel[0]),
            ctx.mouse[1] / Math.max(1, elementPixel[1]),
        ];
        const moved =
            !this.#lastMouseUv ||
            Math.abs(mouseUv[0] - this.#lastMouseUv[0]) > 1e-6 ||
            Math.abs(mouseUv[1] - this.#lastMouseUv[1]) > 1e-6;
        if (moved) {
            this.#lastMoveTime = ctx.time;
        }
        this.#lastMouseUv = mouseUv;

        const visible = ctx.intersection > 0;
        const recent = ctx.time - this.#lastMoveTime < IDLE_THRESHOLD;
        const active = visible && (recent || this.params.spawnOnIdle);
        if (!active) {
            this.#birthAccumulator = 0;
            return 0;
        }

        this.#birthAccumulator += this.params.birthRate * dt;
        const nSpawn = Math.min(
            MAX_SPAWNS_PER_FRAME,
            Math.floor(this.#birthAccumulator),
        );
        this.#birthAccumulator -= nSpawn;
        if (nSpawn === 0) {
            return 0;
        }

        const cap = Math.max(
            1,
            Math.min(STATE_SIZE * STATE_SIZE, Math.floor(this.params.count)),
        );
        const elemPxX = Math.max(1, elementPixel[0]);
        const elemPxY = Math.max(1, elementPixel[1]);
        const buf = this.#spawnUniform;
        for (let i = 0; i < nSpawn; i++) {
            const r = Math.sqrt(Math.random()) * this.params.radius;
            const theta = Math.random() * Math.PI * 2;
            const dx = Math.cos(theta) * r;
            const dy = Math.sin(theta) * r;
            const lifeJitter =
                LIFE_JITTER_MIN +
                Math.random() * (LIFE_JITTER_MAX - LIFE_JITTER_MIN);

            const o = i * 4;
            buf[o + 0] = this.#nextSlot;
            buf[o + 1] = mouseUv[0] + dx / elemPxX;
            buf[o + 2] = mouseUv[1] + dy / elemPxY;
            buf[o + 3] = lifeJitter;
            this.#nextSlot = (this.#nextSlot + 1) % cap;
        }
        return nSpawn;
    }

    dispose(): void {
        this.#posA = null;
        this.#posB = null;
        this.#colorTex = null;
        this.#stampTex = null;
        this.#trail = null;
        this.#initialized = false;
    }

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        return dims.canvasRect;
    }
}
