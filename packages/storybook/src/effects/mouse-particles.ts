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

// Quad expanded around each particle; pointSize is applied in NDC
// using elementPixel so quads stay visually sized regardless of buffer
// scale.
const QUAD_VERTS = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
]);

const VERT_PARTICLE = `#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D posTex;
uniform sampler2D posTexPrev;
uniform sampler2D colorTex;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float alpha;
uniform float alphaDecay;
uniform float fog;
uniform vec4 contentRectUv;
// Speed-based alpha gate. Speed is estimated from the position delta
// between the two ping-pong buffers, so it costs only one extra texture
// read instead of re-evaluating the curl field. <=0 disables the gate.
uniform float dt;
uniform float speedThreshold;

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
    vec4 s = texture(posTex, stateUv);
    vec4 c = texture(colorTex, stateUv);

    float age = s.w;
    // age < 0: pre-spawn, age >= 1: dead.
    // alphaDecay > 1 holds peak alpha longer; < 1 sharpens fade-in/out.
    float lifeAlpha = (age >= 0.0 && age < 1.0)
        ? pow(sin(age * 3.14159), alphaDecay)
        : 0.0;
    if (lifeAlpha <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    float fogFactor = mix(1.0, smoothstep(1.0, -0.5, s.z), fog);

    float speedAlpha = 1.0;
    if (speedThreshold > 0.0 && dt > 0.0) {
        vec4 sPrev = texture(posTexPrev, stateUv);
        // Skip freshly (re)spawned slots: their previous state was dead
        // or held a different particle, so the position delta is garbage.
        if (sPrev.w < 1.0) {
            float speedMag = length(s.xy - sPrev.xy) / dt;
            speedAlpha = smoothstep(0.0, speedThreshold, speedMag);
        }
    }

    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, lifeAlpha * alpha * fogFactor * speedAlpha);
}
`;

// Premultiplied output: additive blend lets overlapping particles
// brighten naturally.
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

const FRAG_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// trailFade applies to the whole trail buffer so dead-particle pixels
// decay at the same rate as everything else.
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
    // src is element-sized; the trail buffer extends to the canvas, so
    // mask src outside [0,1].
    vec2 inside = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = inside.x * inside.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0))
              * backgroundOpacity * srcMask;
    vec4 t = texture(trail, uv);
    outColor = vec4(base.rgb * (1.0 - t.a) + t.rgb, max(base.a, t.a));
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
    /** Alpha-envelope shape exponent (>1 holds peak alpha longer; <1 sharpens fade). */
    alphaDecay: number;
    /** Per-particle speed (uv/sec) at which alpha reaches 1; below this it
     * fades smoothly to 0. Set to 0 to disable. */
    speedThreshold: number;
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
    alphaDecay: 1.0,
    speedThreshold: 0.05,
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
    #particleGeometry: EffectGeometry | null = null;
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
        // instanceCount is captured at compile time, so cap to the
        // construction-time params.count (or the state texture).
        const cap = Math.max(
            1,
            Math.min(STATE_SIZE * STATE_SIZE, Math.floor(this.params.count)),
        );
        this.#particleGeometry = {
            attributes: { position: QUAD_VERTS },
            instanceCount: cap,
        };
    }

    render(ctx: EffectContext): void {
        if (
            !this.#posA ||
            !this.#posB ||
            !this.#colorTex ||
            !this.#stampTex ||
            !this.#trail ||
            !this.#particleGeometry
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

        // After the toggle posRead is the freshly written state; the
        // other ping-pong side still holds last frame's state, used for
        // the speed-from-position-delta gate.
        const renderRead = this.#posReadIsA ? this.#posA : this.#posB;
        const renderPrev = this.#posReadIsA ? this.#posB : this.#posA;

        ctx.draw({ frag: FRAG_CLEAR, target: this.#stampTex });
        ctx.draw({
            vert: VERT_PARTICLE,
            frag: FRAG_PARTICLE,
            uniforms: {
                posTex: renderRead,
                posTexPrev: renderPrev,
                colorTex: this.#colorTex,
                stateSize: [STATE_SIZE, STATE_SIZE],
                pointSize: this.params.pointSize,
                elementPixel,
                particleCount: Math.min(
                    STATE_SIZE * STATE_SIZE,
                    Math.max(1, Math.floor(this.params.count)),
                ),
                alpha: this.params.alpha,
                alphaDecay: this.params.alphaDecay,
                fog: this.params.fog,
                dt,
                speedThreshold: this.params.speedThreshold,
            },
            geometry: this.#particleGeometry,
            target: this.#stampTex,
            blend: "additive",
        });

        ctx.draw({
            frag: FRAG_TRAIL_COMPOSITE,
            uniforms: {
                trailPrev: this.#trail,
                particleStamp: this.#stampTex,
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
        this.#particleGeometry = null;
        this.#initialized = false;
    }

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        return dims.canvasRect;
    }
}
