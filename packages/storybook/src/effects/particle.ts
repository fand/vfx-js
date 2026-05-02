// Mouse-driven GPU particles. CPU spawn scheduler picks ring-buffer
// slots each frame and uploads them to a data texture. A full-screen
// advect pass moves every live particle through a 3D curl-noise field;
// a separate gl.POINTS spawn pass overwrites the just-advected texels
// for slots that received fresh spawns. State RTs ping-pong manually.
// Composited over a persistent trail buffer.
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
    EffectTexture,
} from "@vfx-js/core";

const STATE_SIZE = 256;
// Per-frame spawn budget. Spawn entries are uploaded to a square data
// texture (vec4 per entry: slotId, uvX, uvY, lifeJitter) sampled by the
// gl.POINTS spawn pass. 64×64 = 4096 spawns/frame ≈ 245k spawns/sec at
// 60 fps.
const SPAWN_TEX_SIZE = 64;
const MAX_SPAWNS_PER_FRAME = SPAWN_TEX_SIZE * SPAWN_TEX_SIZE;
// Active mouse if it moved within this window (sec) — otherwise spawn
// only when `params.spawnOnIdle` is set.
const IDLE_THRESHOLD = 0.1;
// Per-particle lifespan multiplier range (centred on 1.0).
const LIFE_JITTER_MIN = 0.7;
const LIFE_JITTER_MAX = 1.3;

const STATE_SIZE_VEC: [number, number] = [STATE_SIZE, STATE_SIZE];
const SPAWN_TEX_SIZE_VEC: [number, number] = [SPAWN_TEX_SIZE, SPAWN_TEX_SIZE];

// Vertex index per spawn slot. Read in VERT_SPAWN as `int(position)` to
// pick the right entry in uSpawnTex without depending on gl_VertexID,
// and to give EffectGeometry a `position` attribute it can count.
const SPAWN_VERTEX_INDICES = new Float32Array(MAX_SPAWNS_PER_FRAME);
for (let i = 0; i < MAX_SPAWNS_PER_FRAME; i++) {
    SPAWN_VERTEX_INDICES[i] = i;
}

// age = 2.0 keeps every slot dead until UPDATE writes a fresh particle.
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
uniform sampler2D colorTex;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float alpha;
uniform float alphaDecay;
uniform float fog;
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

    float fogFactor = fog > 0.0
        ? mix(1.0, smoothstep(1.0, -0.5, s.z), fog)
        : 1.0;

    vec2 bufferUv = contentRectUv.xy + s.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;

    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);

    vCorner = position;
    vColor = vec4(c.rgb, lifeAlpha * alpha * fogFactor);
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

// Full-screen advect pass. Reads posTex (and colorTex.w for life
// jitter), advects through the curl-noise field. Spawns are written
// separately by the gl.POINTS spawn pass below.
const FRAG_ADVECT_POS = `#version 300 es
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
    age += dt / (max(life, 1e-3) * lifeMul);

    outColor = vec4(pos, age);
}
`;

// Color buffer pass-through; spawns are written sparsely by the
// gl.POINTS spawn pass.
const FRAG_ADVECT_COLOR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D colorTex;
void main() { outColor = texture(colorTex, uv); }
`;

// Spawn pass: gl.POINTS, one point per spawn entry. Each vertex pulls
// (slotId, uvX, uvY, lifeJitter) from uSpawnTex, computes the target
// state texel center as gl_Position, and writes a single texel of the
// pos / color RT. The `position` attribute carries the spawn-slot
// index (0..MAX-1) and gives EffectGeometry its vertex count.
const VERT_SPAWN = `#version 300 es
precision highp float;
in float position;

uniform sampler2D uSpawnTex;
uniform vec2 uSpawnTexSize;
uniform int uSpawnCount;
uniform vec2 stateSize;

out vec4 vSpawn;

void main() {
    int idx = int(position);
    if (idx >= uSpawnCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vSpawn = vec4(0.0);
        return;
    }
    int sx = idx % int(uSpawnTexSize.x);
    int sy = idx / int(uSpawnTexSize.x);
    vec4 s = texelFetch(uSpawnTex, ivec2(sx, sy), 0);
    int slot = int(s.x);
    int tx = slot % int(stateSize.x);
    int ty = slot / int(stateSize.x);
    vec2 ndc = (vec2(float(tx), float(ty)) + 0.5) / stateSize * 2.0 - 1.0;
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = 1.0;
    vSpawn = s;
}
`;

const FRAG_SPAWN_POS = `#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform float alphaThreshold;

void main() {
    vec2 spawnUv = vSpawn.yz;
    vec2 inside = step(vec2(0.0), spawnUv) * step(spawnUv, vec2(1.0));
    float visible = inside.x * inside.y;
    float a = texture(src, clamp(spawnUv, 0.0, 1.0)).a * visible;
    if (a < alphaThreshold) {
        outColor = vec4(0.0, 0.0, 0.0, 2.0); // born dead
        return;
    }
    outColor = vec4(spawnUv, 0.0, 0.0);
}
`;

const FRAG_SPAWN_COLOR = `#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    outColor = vec4(c.rgb, vSpawn.w);
}
`;

export type ParticleParams = {
    /** Max particles. Capped at construction by the state texture size. */
    count: number;
    /** Particles per second emitted within `radius` of the mouse while
     * the mouse is active. */
    birthRate: number;
    /** Particles per second emitted at uniform-random positions across
     * the element. Independent of mouse motion; only gated by visibility
     * and the same alpha-rejection as mouse spawns. */
    screenBirthRate: number;
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

const DEFAULT_PARAMS: ParticleParams = {
    count: STATE_SIZE * STATE_SIZE,
    birthRate: 10000,
    screenBirthRate: 5000,
    life: 1,
    speed: 0.3,
    noiseScale: 1,
    noiseAnimation: 0.3,
    pointSize: 3.0,
    alpha: 1,
    radius: 100,
    speedDecay: 1.0,
    alphaDecay: 1.0,
    alphaThreshold: 0.05,
    spawnOnIdle: true,
    backgroundOpacity: 1.0,
    trailFade: 0.5,
    fog: 0.5,
};

export class ParticleEffect implements Effect {
    params: ParticleParams;

    #posTex0: EffectRenderTarget | null = null;
    #posTex1: EffectRenderTarget | null = null;
    #colorTex0: EffectRenderTarget | null = null;
    #colorTex1: EffectRenderTarget | null = null;
    #stateIndex: 0 | 1 = 0;
    #stampTex: EffectRenderTarget | null = null;
    #trail: EffectRenderTarget | null = null;
    #initialized = false;

    #spawnUniform = new Float32Array(MAX_SPAWNS_PER_FRAME * 4);
    #spawnRawTex: WebGLTexture | null = null;
    #spawnTexHandle: EffectTexture | null = null;
    #spawnGeometry: EffectGeometry | null = null;
    #particleGeometry: EffectGeometry | null = null;
    #gl: WebGL2RenderingContext | null = null;
    #contextRestoredUnsub: (() => void) | null = null;
    #nextSlot = 0;
    #birthAccumulator = 0;
    #screenBirthAccumulator = 0;
    #lastMouseUv: [number, number] | null = null;
    #lastMoveTime = -Infinity;

    constructor(initial: Partial<ParticleParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(ctx: EffectContext): void {
        const stateOpts = {
            size: [STATE_SIZE, STATE_SIZE] as [number, number],
            float: true,
            wrap: "clamp" as const,
            filter: "nearest" as const,
        };
        // Manual ping-pong: a sparse spawn pass into a persistent
        // (auto-swapped) RT would clobber the inactive buffer; two
        // non-persistent RTs sidestep that.
        this.#posTex0 = ctx.createRenderTarget(stateOpts);
        this.#posTex1 = ctx.createRenderTarget(stateOpts);
        this.#colorTex0 = ctx.createRenderTarget(stateOpts);
        this.#colorTex1 = ctx.createRenderTarget(stateOpts);
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
        this.#particleGeometry = {
            attributes: { position: QUAD_VERTS },
            instanceCount: this.#cap(),
        };
        this.#spawnGeometry = {
            mode: "points",
            attributes: {
                position: { data: SPAWN_VERTEX_INDICES, itemSize: 1 },
            },
        };
        this.#gl = ctx.gl;
        this.#allocSpawnTex(ctx);
        this.#contextRestoredUnsub = ctx.onContextRestored(() => {
            this.#gl = ctx.gl;
            this.#allocSpawnTex(ctx);
            this.#initialized = false;
        });
    }

    #allocSpawnTex(ctx: EffectContext): void {
        const gl = ctx.gl;
        const tex = gl.createTexture();
        if (!tex) {
            throw new Error("[ParticleEffect] Failed to create spawn texture");
        }
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // Counteract the global UNPACK_FLIP_Y_WEBGL=true that the
        // framework sets for DOM source uploads — our spawn data is a
        // raw float buffer with row 0 at the top, no flip wanted.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            SPAWN_TEX_SIZE,
            SPAWN_TEX_SIZE,
            0,
            gl.RGBA,
            gl.FLOAT,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.#spawnRawTex = tex;
        this.#spawnTexHandle = ctx.wrapTexture(tex, {
            size: [SPAWN_TEX_SIZE, SPAWN_TEX_SIZE],
            filter: "nearest",
            wrap: "clamp",
        });
    }

    #uploadSpawnTex(ctx: EffectContext): void {
        if (!this.#spawnRawTex) {
            return;
        }
        const gl = ctx.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.#spawnRawTex);
        // The framework sets UNPACK_FLIP_Y_WEBGL=true globally for DOM
        // source uploads; reset it for our raw float data so row 0 of
        // the array stays at row 0 of the texture.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            SPAWN_TEX_SIZE,
            SPAWN_TEX_SIZE,
            gl.RGBA,
            gl.FLOAT,
            this.#spawnUniform,
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    render(ctx: EffectContext): void {
        if (
            !this.#posTex0 ||
            !this.#posTex1 ||
            !this.#colorTex0 ||
            !this.#colorTex1 ||
            !this.#stampTex ||
            !this.#trail ||
            !this.#particleGeometry ||
            !this.#spawnGeometry ||
            !this.#spawnTexHandle ||
            !this.#spawnRawTex
        ) {
            return;
        }

        if (!this.#initialized) {
            ctx.draw({ frag: FRAG_INIT_POS, target: this.#posTex0 });
            ctx.draw({ frag: FRAG_INIT_POS, target: this.#posTex1 });
            ctx.draw({ frag: FRAG_INIT_COLOR, target: this.#colorTex0 });
            ctx.draw({ frag: FRAG_INIT_COLOR, target: this.#colorTex1 });
            this.#stateIndex = 0;
            this.#initialized = true;
        }

        // Cap dt so tab-switch pauses don't teleport particles.
        const dt = Math.min(0.1, Math.max(0, ctx.deltaTime));
        const elementPixel: [number, number] = [
            ctx.dims.elementPixel[0],
            ctx.dims.elementPixel[1],
        ];

        const nSpawn = this.#scheduleSpawns(ctx, dt, elementPixel);
        if (nSpawn > 0) {
            this.#uploadSpawnTex(ctx);
        }

        const i = this.#stateIndex;
        const next: 0 | 1 = i === 0 ? 1 : 0;
        const posCurr = i === 0 ? this.#posTex0 : this.#posTex1;
        const posNext = next === 0 ? this.#posTex0 : this.#posTex1;
        const colorCurr = i === 0 ? this.#colorTex0 : this.#colorTex1;
        const colorNext = next === 0 ? this.#colorTex0 : this.#colorTex1;

        ctx.draw({
            frag: FRAG_ADVECT_POS,
            uniforms: {
                posTex: posCurr,
                colorTex: colorCurr,
                elementPixel,
                time: ctx.time,
                dt,
                speed: this.params.speed,
                noiseScale: this.params.noiseScale,
                noiseAnimation: this.params.noiseAnimation,
                speedDecay: this.params.speedDecay,
                life: this.params.life,
            },
            target: posNext,
        });
        ctx.draw({
            frag: FRAG_ADVECT_COLOR,
            uniforms: { colorTex: colorCurr },
            target: colorNext,
        });
        this.#stateIndex = next;

        if (nSpawn > 0) {
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_POS,
                geometry: this.#spawnGeometry,
                uniforms: {
                    uSpawnTex: this.#spawnTexHandle,
                    uSpawnTexSize: SPAWN_TEX_SIZE_VEC,
                    uSpawnCount: nSpawn,
                    stateSize: STATE_SIZE_VEC,
                    src: ctx.src,
                    alphaThreshold: this.params.alphaThreshold,
                },
                target: posNext,
                blend: "none",
            });
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_COLOR,
                geometry: this.#spawnGeometry,
                uniforms: {
                    uSpawnTex: this.#spawnTexHandle,
                    uSpawnTexSize: SPAWN_TEX_SIZE_VEC,
                    uSpawnCount: nSpawn,
                    stateSize: STATE_SIZE_VEC,
                    src: ctx.src,
                },
                target: colorNext,
                blend: "none",
            });
        }

        ctx.draw({ frag: FRAG_CLEAR, target: this.#stampTex });
        ctx.draw({
            vert: VERT_PARTICLE,
            frag: FRAG_PARTICLE,
            uniforms: {
                posTex: posNext,
                colorTex: colorNext,
                stateSize: STATE_SIZE_VEC,
                pointSize: this.params.pointSize,
                elementPixel,
                particleCount: this.#cap(),
                alpha: this.params.alpha,
                alphaDecay: this.params.alphaDecay,
                fog: this.params.fog,
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
        const mouseActive = visible && (recent || this.params.spawnOnIdle);

        if (mouseActive) {
            this.#birthAccumulator += this.params.birthRate * dt;
        } else {
            this.#birthAccumulator = 0;
        }
        if (visible) {
            this.#screenBirthAccumulator += this.params.screenBirthRate * dt;
        } else {
            this.#screenBirthAccumulator = 0;
        }

        // Mouse takes priority for the per-frame slot budget — when the
        // user is dragging fast we'd rather show that than the ambient.
        let nMouse = Math.min(
            MAX_SPAWNS_PER_FRAME,
            Math.floor(this.#birthAccumulator),
        );
        let nScreen = Math.min(
            MAX_SPAWNS_PER_FRAME - nMouse,
            Math.floor(this.#screenBirthAccumulator),
        );
        this.#birthAccumulator -= nMouse;
        this.#screenBirthAccumulator -= nScreen;
        const total = nMouse + nScreen;
        if (total === 0) {
            return 0;
        }

        const cap = this.#cap();
        const elemPxX = Math.max(1, elementPixel[0]);
        const elemPxY = Math.max(1, elementPixel[1]);
        const buf = this.#spawnUniform;
        let i = 0;
        for (; i < nMouse; i++) {
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
        for (let j = 0; j < nScreen; j++, i++) {
            const lifeJitter =
                LIFE_JITTER_MIN +
                Math.random() * (LIFE_JITTER_MAX - LIFE_JITTER_MIN);

            const o = i * 4;
            buf[o + 0] = this.#nextSlot;
            buf[o + 1] = Math.random();
            buf[o + 2] = Math.random();
            buf[o + 3] = lifeJitter;
            this.#nextSlot = (this.#nextSlot + 1) % cap;
        }
        return total;
    }

    #cap(): number {
        return Math.max(
            1,
            Math.min(STATE_SIZE * STATE_SIZE, Math.floor(this.params.count)),
        );
    }

    dispose(): void {
        this.#contextRestoredUnsub?.();
        this.#contextRestoredUnsub = null;
        if (this.#gl && this.#spawnRawTex) {
            this.#gl.deleteTexture(this.#spawnRawTex);
        }
        this.#spawnRawTex = null;
        this.#spawnTexHandle = null;
        this.#spawnGeometry = null;
        this.#gl = null;
        this.#posTex0 = null;
        this.#posTex1 = null;
        this.#colorTex0 = null;
        this.#colorTex1 = null;
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
