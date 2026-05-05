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
import { GLSL_CURL_NOISE } from "./_curl-noise";

// State texture footprint: 5 RTs (pos×2, color×2, vel×1) × stateSize² ×
// 16 B = 80 MB at 1024 (RGBA32F) / 40 MB at RGBA16F fallback at the 1M
// cap. velTex is single because spawns sparse-write it and advect only
// reads. Smaller `count` shrinks the texture proportionally — smallest
// power-of-two square grid that fits `count` slots.
function stateSizeFromCount(count: number): number {
    const n = Math.max(1, Math.floor(count));
    return 2 ** Math.ceil(Math.log2(Math.sqrt(n)));
}

// Per-frame spawn budget. Spawn entries are uploaded to a square data
// texture (vec4 per entry: slotId, uvX, uvY, dirAngle) sampled by the
// gl.POINTS spawn pass. dirAngle = theta in [0, 2π) for mouse spawns,
// -1 sentinel for screen spawns (no radial impulse). lifeJitter is
// derived on the GPU via hash. 64×64 = 4096 spawns/frame ≈ 245k
// spawns/sec at 60 fps.
const SPAWN_TEX_SIZE = 64;
const MAX_SPAWNS_PER_FRAME = SPAWN_TEX_SIZE * SPAWN_TEX_SIZE;
// Active mouse if it moved within this window (sec) — otherwise spawn
// only when `params.spawnOnIdle` is set.
const IDLE_THRESHOLD = 0.1;
// Per-particle lifespan multiplier range (centred on 1.0).
const LIFE_JITTER_MIN = 0.7;
const LIFE_JITTER_MAX = 1.3;

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
uniform float fadeIn;
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
    // age >= 1: dead. Linear ramp to peak at age=fadeIn, then
    // alphaDecay-shaped decay over the remaining life. Small fadeIn
    // keeps the radial-emit phase visible; larger values restore the
    // slow fade-in look.
    float lifeAlpha;
    if (age >= 1.0) {
        lifeAlpha = 0.0;
    } else {
        float fi = max(fadeIn, 1e-4);
        float rise = clamp(age / fi, 0.0, 1.0);
        float fall = pow(
            clamp((1.0 - age) / max(1.0 - fi, 1e-4), 0.0, 1.0),
            alphaDecay
        );
        lifeAlpha = rise * fall;
    }
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
// decay at the same rate as everything else. blendMode mirrors the
// stamp blend: 0 = add, 1 = premultiplied over.
const FRAG_TRAIL_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trailPrev;
uniform sampler2D particleStamp;
uniform float trailFade;
uniform int blendMode;

void main() {
    vec4 prev = texture(trailPrev, uv);
    vec4 stamp = texture(particleStamp, uv);
    vec4 faded = prev * trailFade;
    if (blendMode == 1) {
        outColor = vec4(
            stamp.rgb + faded.rgb * (1.0 - stamp.a),
            clamp(stamp.a + faded.a * (1.0 - stamp.a), 0.0, 1.0)
        );
    } else {
        outColor = vec4(
            faded.rgb + stamp.rgb,
            clamp(faded.a + stamp.a, 0.0, 1.0)
        );
    }
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
// jitter), blends a radial impulse (from velTex, set at spawn) with the
// curl-noise field as the particle ages. Spawns are written separately
// by the gl.POINTS spawn pass below.
const FRAG_ADVECT_POS = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform sampler2D colorTex;
uniform sampler2D velTex;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float noiseSpeed;
uniform float emitSpeed;
uniform float noiseDelay;
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
    vec3 curlV = curl3D(noiseInput, time * noiseAnimation) / stretch;

    // velTex.xy is a unit direction in pixel space (0 for screen
    // spawns). Convert to uv-space velocity by dividing by elementPixel
    // so the radial blast keeps circular symmetry on non-square
    // elements.
    vec2 radialDirPx = texture(velTex, uv).xy;
    vec3 radialV = vec3(radialDirPx / max(elementPixel, vec2(1.0)), 0.0);

    float blend = noiseDelay > 0.0 ? smoothstep(0.0, noiseDelay, age) : 1.0;
    vec3 v = mix(radialV * emitSpeed, curlV * noiseSpeed, blend);

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + v * dt * taper;

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

// hash21 for GPU-side lifeJitter generation.
const GLSL_HASH = `
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;

// Spawn pass: gl.POINTS, one point per spawn entry. Each vertex pulls
// (slotId, uvX, uvY, dirAngle) from uSpawnTex, computes the target
// state texel center as gl_Position, and writes a single texel of the
// pos / color / vel RT. The `position` attribute carries the spawn-slot
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

// lifeJitter is hashed from the spawn entry (slot id + uv) to keep
// every spawn varied without a CPU-side random.
const FRAG_SPAWN_COLOR = `#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;

uniform sampler2D src;
uniform vec3 color;
uniform float colorMix;
uniform vec2 lifeJitterRange;
${GLSL_HASH}

void main() {
    vec4 c = texture(src, clamp(vSpawn.yz, 0.0, 1.0));
    float h = hash21(vSpawn.yz + vec2(vSpawn.x) * 1.7);
    float lifeJitter = mix(lifeJitterRange.x, lifeJitterRange.y, h);
    outColor = vec4(mix(c.rgb, color, colorMix), lifeJitter);
}
`;

// Writes the radial direction (unit vector in pixel space) per spawn
// slot from vSpawn.w (theta). Screen spawns carry -1 sentinel and get
// zero velocity so they receive only curl-noise advection.
const FRAG_SPAWN_VEL = `#version 300 es
precision highp float;
in vec4 vSpawn;
out vec4 outColor;
void main() {
    float theta = vSpawn.w;
    vec2 dir = theta >= 0.0 ? vec2(cos(theta), sin(theta)) : vec2(0.0);
    outColor = vec4(dir, 0.0, 0.0);
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
    /** Curl-noise drift speed (uv/sec) once the emit impulse decays. */
    noiseSpeed: number;
    /** Initial outward speed (px/sec) applied to mouse-spawned particles
     * — fades to curl-noise drift over `noiseDelay`. Screen-spawned
     * particles ignore this. */
    emitSpeed: number;
    /** Fraction of life (0..1) over which motion smoothstep-blends from
     * the radial impulse at spawn to the curl-noise field. 0 disables
     * the radial phase entirely. */
    noiseDelay: number;
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
    /** Fraction of life over which the particle ramps from 0 to peak
     * alpha. Small values (≈0.05) keep the radial-emit phase visible;
     * larger values (≈0.5) restore the slow fade-in look. */
    fadeIn: number;
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
    /** Base color blended into particle rgb (hex 0xRRGGBB). */
    color: number;
    /** Mix amount between src color (0) and `color` (1). */
    colorMix: number;
    /** Stamp blend mode. "add" brightens overlaps; "normal" composites
     * with premultiplied-alpha over. */
    blend: "add" | "normal";
};

const DEFAULT_PARAMS: ParticleParams = {
    count: 1024 * 1024,
    birthRate: 10000,
    screenBirthRate: 5000,
    life: 1,
    noiseSpeed: 0.3,
    emitSpeed: 600,
    noiseDelay: 0.15,
    noiseScale: 1,
    noiseAnimation: 0.3,
    pointSize: 3.0,
    alpha: 1,
    radius: 100,
    speedDecay: 1.0,
    alphaDecay: 1.0,
    fadeIn: 0.05,
    alphaThreshold: 0.05,
    spawnOnIdle: true,
    backgroundOpacity: 1.0,
    trailFade: 0.5,
    fog: 0.5,
    color: 0xffffff,
    colorMix: 0,
    blend: "add",
};

export class ParticleEffect implements Effect {
    params: ParticleParams;

    #posTex0: EffectRenderTarget | null = null;
    #posTex1: EffectRenderTarget | null = null;
    #colorTex0: EffectRenderTarget | null = null;
    #colorTex1: EffectRenderTarget | null = null;
    #velTex: EffectRenderTarget | null = null;
    #stateIndex: 0 | 1 = 0;
    #stampTex: EffectRenderTarget | null = null;
    #trail: EffectRenderTarget | null = null;
    #initialized = false;

    #stateSize: number;
    #stateSizeVec: [number, number];
    #stateCapacity: number;

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
        this.#stateSize = stateSizeFromCount(this.params.count);
        this.#stateSizeVec = [this.#stateSize, this.#stateSize];
        this.#stateCapacity = this.#stateSize * this.#stateSize;
    }

    get maxCount(): number {
        return this.#stateCapacity;
    }

    init(ctx: EffectContext): void {
        const stateOpts = {
            size: [this.#stateSize, this.#stateSize] as [number, number],
            float: true,
            wrap: "clamp" as const,
            filter: "nearest" as const,
        };
        // Manual ping-pong (pos/color): a sparse spawn pass into a
        // persistent (auto-swapped) RT would clobber the inactive
        // buffer; two non-persistent RTs sidestep that. velTex is
        // single — sparsely written at spawn, only read in advect.
        this.#posTex0 = ctx.createRenderTarget(stateOpts);
        this.#posTex1 = ctx.createRenderTarget(stateOpts);
        this.#colorTex0 = ctx.createRenderTarget(stateOpts);
        this.#colorTex1 = ctx.createRenderTarget(stateOpts);
        this.#velTex = ctx.createRenderTarget(stateOpts);
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
        // Allocate the full state capacity so params.count can grow at
        // runtime up to the auto-derived ceiling without re-init.
        this.#particleGeometry = {
            attributes: { position: QUAD_VERTS },
            instanceCount: this.#stateCapacity,
        };
        this.#spawnGeometry = {
            mode: "points",
            attributes: {
                position: { data: SPAWN_VERTEX_INDICES, itemSize: 1 },
            },
        };
        this.#gl = ctx.gl;
        this.#allocSpawnTextures(ctx);
        this.#contextRestoredUnsub = ctx.onContextRestored(() => {
            this.#gl = ctx.gl;
            this.#allocSpawnTextures(ctx);
            this.#initialized = false;
        });
    }

    #createSpawnTex(ctx: EffectContext): {
        raw: WebGLTexture;
        handle: EffectTexture;
    } {
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
        const handle = ctx.wrapTexture(tex, {
            size: [SPAWN_TEX_SIZE, SPAWN_TEX_SIZE],
            filter: "nearest",
            wrap: "clamp",
        });
        return { raw: tex, handle };
    }

    #allocSpawnTextures(ctx: EffectContext): void {
        const a = this.#createSpawnTex(ctx);
        this.#spawnRawTex = a.raw;
        this.#spawnTexHandle = a.handle;
    }

    #uploadSpawnTextures(ctx: EffectContext): void {
        if (!this.#spawnRawTex) return;
        const gl = ctx.gl;
        // Reset framework's global UNPACK_FLIP_Y_WEBGL=true (set for
        // DOM source uploads) so row 0 of our raw float buffer maps to
        // row 0 of the texture.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.bindTexture(gl.TEXTURE_2D, this.#spawnRawTex);
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
            !this.#velTex ||
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
            ctx.draw({ frag: FRAG_INIT_COLOR, target: this.#velTex });
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
            this.#uploadSpawnTextures(ctx);
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
                velTex: this.#velTex,
                elementPixel,
                time: ctx.time,
                dt,
                noiseSpeed: this.params.noiseSpeed,
                emitSpeed: this.params.emitSpeed,
                noiseDelay: this.params.noiseDelay,
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
            const spawnUniforms = {
                uSpawnTex: this.#spawnTexHandle,
                uSpawnTexSize: SPAWN_TEX_SIZE_VEC,
                uSpawnCount: nSpawn,
                stateSize: this.#stateSizeVec,
            };
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_POS,
                geometry: this.#spawnGeometry,
                uniforms: {
                    ...spawnUniforms,
                    src: ctx.src,
                    alphaThreshold: this.params.alphaThreshold,
                },
                target: posNext,
                blend: "none",
            });
            const cHex = this.params.color | 0;
            const colorRGB: [number, number, number] = [
                ((cHex >> 16) & 0xff) / 255,
                ((cHex >> 8) & 0xff) / 255,
                (cHex & 0xff) / 255,
            ];
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_COLOR,
                geometry: this.#spawnGeometry,
                uniforms: {
                    ...spawnUniforms,
                    src: ctx.src,
                    color: colorRGB,
                    colorMix: this.params.colorMix,
                    lifeJitterRange: [LIFE_JITTER_MIN, LIFE_JITTER_MAX],
                },
                target: colorNext,
                blend: "none",
            });
            ctx.draw({
                vert: VERT_SPAWN,
                frag: FRAG_SPAWN_VEL,
                geometry: this.#spawnGeometry,
                uniforms: spawnUniforms,
                target: this.#velTex,
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
                stateSize: this.#stateSizeVec,
                pointSize: this.params.pointSize,
                elementPixel,
                particleCount: this.#cap(),
                alpha: this.params.alpha,
                alphaDecay: this.params.alphaDecay,
                fadeIn: this.params.fadeIn,
                fog: this.params.fog,
            },
            geometry: this.#particleGeometry,
            target: this.#stampTex,
            blend: this.params.blend === "normal" ? "premultiplied" : "additive",
        });

        ctx.draw({
            frag: FRAG_TRAIL_COMPOSITE,
            uniforms: {
                trailPrev: this.#trail,
                particleStamp: this.#stampTex,
                trailFade: this.params.trailFade,
                blendMode: this.params.blend === "normal" ? 1 : 0,
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
        // .w = theta in [0, 2π) for mouse spawns. FRAG_SPAWN_VEL turns
        // it into a unit (cosθ, sinθ) in pixel space; FRAG_ADVECT_POS
        // divides by elementPixel for circular symmetry on non-square
        // elements.
        for (; i < nMouse; i++) {
            const r = Math.sqrt(Math.random()) * this.params.radius;
            const theta = Math.random() * Math.PI * 2;
            const dx = Math.cos(theta) * r;
            const dy = Math.sin(theta) * r;

            const o = i * 4;
            buf[o + 0] = this.#nextSlot;
            buf[o + 1] = mouseUv[0] + dx / elemPxX;
            buf[o + 2] = mouseUv[1] + dy / elemPxY;
            buf[o + 3] = theta;
            this.#nextSlot = (this.#nextSlot + 1) % cap;
        }
        // .w = -1 sentinel: no radial impulse (curl-noise only).
        for (let j = 0; j < nScreen; j++, i++) {
            const o = i * 4;
            buf[o + 0] = this.#nextSlot;
            buf[o + 1] = Math.random();
            buf[o + 2] = Math.random();
            buf[o + 3] = -1;
            this.#nextSlot = (this.#nextSlot + 1) % cap;
        }
        return total;
    }

    #cap(): number {
        return Math.max(
            1,
            Math.min(this.#stateCapacity, Math.floor(this.params.count)),
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
        this.#velTex = null;
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
