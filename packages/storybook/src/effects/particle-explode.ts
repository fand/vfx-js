// One-shot full-element burst that reuses particle.ts's curl-noise
// advection. trigger() seeds every state texel from its own uv (so the
// element "shatters" into ~one particle per state slot); particles
// then advect via 3D curl + radial outward bias and fade out over
// `duration`. The persistent trail buffer is shared with mouse-
// particles for visual consistency; set trailFade=0 to disable.
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";

// State texture size is now decoupled from image resolution. Each
// texel is a particle slot; on burst, slots with id < params.count
// emit at a hashed random uv across the element. Slots beyond count
// stay dead. 1024² gives a 1M-particle ceiling.
const STATE_SIZE_DEFAULT = 1024;

// 4D simplex noise (Ashima Arts / Ian McEwan, MIT) + 3D curl on top —
// identical to particle.ts so the two effects animate consistently.
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

const GLSL_HASH = `
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;

// On burst: slots with id < count emit at a hashed uv (random point on
// the element); slots beyond count are written dead (age=2). Otherwise
// advects via curl + radial outward bias.
const FRAG_UPDATE_POS = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D posTex;
uniform vec2 stateSize;
uniform vec2 elementPixel;
uniform float time;
uniform float dt;
uniform float speed;
uniform float noiseScale;
uniform float noiseAnimation;
uniform float speedDecay;
uniform float outwardBias;
uniform float duration;
uniform float count;
uniform int uBurst;
${GLSL_HASH}
${GLSL_CURL_NOISE}

void main() {
    if (uBurst == 1) {
        ivec2 pix = ivec2(floor(uv * stateSize));
        float fid = float(pix.y * int(stateSize.x) + pix.x);
        if (fid >= count) {
            outColor = vec4(0.0, 0.0, 0.0, 2.0); // dead
            return;
        }
        vec2 spawnUv = vec2(
            hash21(uv * 31.7 + 11.13),
            hash21(uv * 73.13 + 7.71)
        );
        float z0 = (hash21(uv * 53.7 + 0.81) - 0.5) * 0.02;
        outColor = vec4(spawnUv, z0, 0.0);
        return;
    }

    vec4 s = texture(posTex, uv);
    float age = s.w;
    if (age >= 1.0) {
        outColor = s;
        return;
    }

    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
    vec3 noiseInput = s.xyz * stretch / max(noiseScale, 1e-4);
    vec3 vNoise = curl3D(noiseInput, time * noiseAnimation) / stretch;
    vec3 outward = vec3(s.xy - vec2(0.5), s.z) * outwardBias;

    float taper = pow(clamp(1.0 - age, 0.0, 1.0), speedDecay);
    vec3 pos = s.xyz + (vNoise + outward) * speed * dt * taper;

    float lifespanScale = 0.7 + hash21(uv * 91.7 + 1.234) * 0.6;
    age += dt / max(duration * lifespanScale, 1e-3);

    outColor = vec4(pos, age);
}
`;

// On burst: slots with id < count sample src at the same hashed uv
// FRAG_UPDATE_POS uses for their spawn position. Slots beyond count
// get cleared. Otherwise pass through the previously-captured color.
const FRAG_UPDATE_COLOR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D colorTex;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 stateSize;
uniform float count;
uniform int uBurst;
${GLSL_HASH}

void main() {
    if (uBurst == 1) {
        ivec2 pix = ivec2(floor(uv * stateSize));
        float fid = float(pix.y * int(stateSize.x) + pix.x);
        if (fid >= count) {
            outColor = vec4(0.0);
            return;
        }
        vec2 spawnUv = vec2(
            hash21(uv * 31.7 + 11.13),
            hash21(uv * 73.13 + 7.71)
        );
        vec2 sampleUv = srcRectUv.xy + spawnUv * srcRectUv.zw;
        outColor = texture(src, sampleUv);
        return;
    }
    outColor = texture(colorTex, uv);
}
`;

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
    // Quarter-cosine envelope: full alpha at trigger, 0 at age=1.
    // alphaDecay > 1 holds peak alpha longer; < 1 makes the fade snappy.
    float lifeAlpha = (age >= 0.0 && age < 1.0)
        ? pow(cos(age * 1.5707963), alphaDecay)
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
    vColor = vec4(c.rgb, c.a * lifeAlpha * alpha * fogFactor);
}
`;

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

// Particles only — the source element is "shattered" away on trigger
// and never composited back in until reset().
const FRAG_OUTPUT = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D trail;

void main() {
    outColor = texture(trail, uv);
}
`;

const FRAG_PASSTHROUGH = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`;

export type ParticleExplodeParams = {
    /** Particle count. Hard-capped by the state texture size² (default 1M). */
    count: number;
    /** Total burst duration (sec); per-particle life is jittered. */
    duration: number;
    /** uv-displacement-per-second at full strength. */
    speed: number;
    /** Approximate swirl size in uv units (larger → bigger swirls). */
    noiseScale: number;
    /** Morph rate on the 4th simplex axis (units per second). */
    noiseAnimation: number;
    /** Radial outward push from element center, blended with curl. */
    outwardBias: number;
    /** Particle quad size in element px. */
    pointSize: number;
    /** Global alpha multiplier on each particle (0..1). */
    alpha: number;
    /** Alpha-envelope shape exponent (>1 holds peak alpha longer). */
    alphaDecay: number;
    /** Life-taper curve exponent (>1 holds full speed longer). */
    speedDecay: number;
    /** Depth fog 0..1. */
    fog: number;
    /** Per-frame trail decay (0..1). 0 = stamp shows directly without
     * smear; higher values leave longer trails. */
    trailFade: number;
};

const DEFAULT_PARAMS: ParticleExplodeParams = {
    count: STATE_SIZE_DEFAULT * STATE_SIZE_DEFAULT,
    duration: 1.5,
    speed: 0.4,
    noiseScale: 0.5,
    noiseAnimation: 1.0,
    outwardBias: 1.5,
    pointSize: 3.0,
    alpha: 1.0,
    alphaDecay: 1.0,
    speedDecay: 1.0,
    fog: 0.5,
    trailFade: 0.0,
};

// One-shot explode. Construct a new instance per `vfx.add()`. Call
// `trigger()` to start; query `isDone()` to detect completion.
export class ParticleExplodeEffect implements Effect {
    params: ParticleExplodeParams;

    #posTex: EffectRenderTarget | null = null;
    #colorTex: EffectRenderTarget | null = null;
    #stampTex: EffectRenderTarget | null = null;
    #trail: EffectRenderTarget | null = null;
    #particleGeometry: EffectGeometry | null = null;
    #stateSize: [number, number];
    #stateSizeVec: [number, number];

    #triggered = false;
    #burstPending = false;
    #startTime = -1;
    #lastElapsed = 0;

    constructor(
        initial: Partial<ParticleExplodeParams> = {},
        stateSize?: readonly [number, number],
    ) {
        this.#stateSize = stateSize
            ? [Math.max(1, stateSize[0]), Math.max(1, stateSize[1])]
            : [STATE_SIZE_DEFAULT, STATE_SIZE_DEFAULT];
        this.#stateSizeVec = [this.#stateSize[0], this.#stateSize[1]];
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    trigger(): void {
        this.#triggered = true;
        this.#burstPending = true;
        this.#startTime = -1;
        this.#lastElapsed = 0;
    }

    reset(): void {
        this.#triggered = false;
        this.#burstPending = false;
        this.#startTime = -1;
        this.#lastElapsed = 0;
    }

    isDone(): boolean {
        return this.#triggered && this.#lastElapsed >= this.params.duration;
    }

    init(ctx: EffectContext): void {
        const stateOpts = {
            size: this.#stateSize,
            float: true,
            persistent: true as const,
            wrap: "clamp" as const,
            filter: "nearest" as const,
        };
        this.#posTex = ctx.createRenderTarget(stateOpts);
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
        // Always allocate the full state capacity so params.count can be
        // raised at runtime without recreating the effect (the shader
        // gates by particleCount uniform per-frame).
        this.#particleGeometry = {
            attributes: { position: QUAD_VERTS },
            instanceCount: this.#stateSize[0] * this.#stateSize[1],
        };
    }

    render(ctx: EffectContext): void {
        if (
            !this.#posTex ||
            !this.#colorTex ||
            !this.#stampTex ||
            !this.#trail ||
            !this.#particleGeometry
        ) {
            return;
        }

        if (!this.#triggered) {
            ctx.draw({
                frag: FRAG_PASSTHROUGH,
                uniforms: { src: ctx.src },
                target: ctx.target,
            });
            return;
        }

        if (this.#startTime < 0) {
            this.#startTime = ctx.time;
        }
        const elapsed = ctx.time - this.#startTime;
        this.#lastElapsed = elapsed;

        if (elapsed >= this.params.duration) {
            ctx.draw({ frag: FRAG_CLEAR, target: ctx.target });
            return;
        }

        // Cap dt so tab-switch pauses don't teleport particles.
        const dt = Math.min(0.1, Math.max(0, ctx.deltaTime));
        const elementPixel: [number, number] = [
            ctx.dims.elementPixel[0],
            ctx.dims.elementPixel[1],
        ];

        const burst = this.#burstPending ? 1 : 0;
        this.#burstPending = false;

        const cap = this.#cap();
        ctx.draw({
            frag: FRAG_UPDATE_POS,
            uniforms: {
                posTex: this.#posTex,
                stateSize: this.#stateSizeVec,
                elementPixel,
                time: ctx.time,
                dt,
                speed: this.params.speed,
                noiseScale: this.params.noiseScale,
                noiseAnimation: this.params.noiseAnimation,
                speedDecay: this.params.speedDecay,
                outwardBias: this.params.outwardBias,
                duration: this.params.duration,
                count: cap,
                uBurst: burst,
            },
            target: this.#posTex,
        });

        ctx.draw({
            frag: FRAG_UPDATE_COLOR,
            uniforms: {
                colorTex: this.#colorTex,
                src: ctx.src,
                stateSize: this.#stateSizeVec,
                count: cap,
                uBurst: burst,
            },
            target: this.#colorTex,
        });

        ctx.draw({ frag: FRAG_CLEAR, target: this.#stampTex });
        ctx.draw({
            vert: VERT_PARTICLE,
            frag: FRAG_PARTICLE,
            uniforms: {
                posTex: this.#posTex,
                colorTex: this.#colorTex,
                stateSize: this.#stateSizeVec,
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
            uniforms: { trail: this.#trail },
            target: ctx.target,
        });
    }

    #cap(): number {
        const max = this.#stateSize[0] * this.#stateSize[1];
        return Math.max(1, Math.min(max, Math.floor(this.params.count)));
    }

    dispose(): void {
        this.#posTex = null;
        this.#colorTex = null;
        this.#stampTex = null;
        this.#trail = null;
        this.#particleGeometry = null;
    }

    // Particles can scatter past the element bounds.
    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        return dims.canvasRect;
    }
}
