// One-shot implosion / materialize effect — visual reverse of the
// explode burst. Each particle starts scattered around the element
// center and integrates a velocity that's a blend of curl-noise (strong
// at the start) and a target-attractor (strong at the end). The
// attractor's pull rate ramps quadratically with progress so the field
// is dominated by curl chaos early and a near-snap exponential pull
// toward the target late — particles wander, then home in.
//
// State machine:
//   pre-trigger      → render opaque black (the element is "not yet here")
//   during animation → integrate particle positions, render them
//   post-animation   → passthrough src (the element appears naturally)
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";

const STATE_SIZE_DEFAULT = 256;

const FRAG_BLACK = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0, 0.0, 0.0, 1.0); }
`;

const FRAG_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
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

const FRAG_OUTPUT = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D particles;
void main() {
    vec4 p = texture(particles, uv);
    outColor = vec4(p.rgb, p.a);
}
`;

// 3D simplex noise + curl3D (same as explode).
const NOISE_GLSL = `
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

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

vec3 curl3D(vec3 p, float t) {
    float eps = 0.01;
    vec3 dx = vec3(eps, 0.0, 0.0);
    vec3 dy = vec3(0.0, eps, 0.0);
    vec3 dz = vec3(0.0, 0.0, eps);
    vec3 ts = vec3(t * 0.3);
    vec3 pa = p + ts;
    vec3 pb = p + vec3(31.341, 47.853, 19.287) + ts;
    vec3 pc = p + vec3(83.519, 71.523, 53.819) + ts;
    float dPzdy = snoise(pc + dy) - snoise(pc - dy);
    float dPydz = snoise(pb + dz) - snoise(pb - dz);
    float dPxdz = snoise(pa + dz) - snoise(pa - dz);
    float dPzdx = snoise(pc + dx) - snoise(pc - dx);
    float dPydx = snoise(pb + dx) - snoise(pb - dx);
    float dPxdy = snoise(pa + dy) - snoise(pa - dy);
    return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * eps);
}
`;

const FRAG_INIT_STATE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform float scatterRadius;

${NOISE_GLSL}

void main() {
    // Scatter from the element center along a uv-hashed 3D direction.
    float theta = hash21(uv * 7.13) * 6.28318530718;
    float cosPhi = hash21(uv * 11.7) * 2.0 - 1.0;
    float sinPhi = sqrt(max(0.0, 1.0 - cosPhi * cosPhi));
    vec3 dir = vec3(cos(theta) * sinPhi, sin(theta) * sinPhi, cosPhi);
    float r = (0.4 + hash21(uv * 41.7) * 0.7) * scatterRadius;
    vec3 pos = vec3(0.5, 0.5, 0.0) + dir * r;
    outColor = vec4(pos, 0.0);
}
`;

const FRAG_UPDATE_STATE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

uniform sampler2D state;
uniform vec2 stateSize;
uniform vec2 elementPixel;
uniform float dt;
uniform float elapsed;
uniform float duration;
uniform float curlSpeed;
uniform float noiseScale;
uniform float pullStrength;

${NOISE_GLSL}

void main() {
    vec3 pos = texture(state, uv).xyz;

    // Target = uv jittered (deterministic per particle).
    vec2 jitter = (vec2(hash21(uv * 17.31), hash21(uv * 23.79)) - 0.5)
                  / stateSize;
    vec3 target = vec3(uv + jitter, 0.0);

    float p = clamp(elapsed / duration, 0.0, 1.0);

    // Curl-noise velocity, fades to 0 as particles converge.
    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
    vec3 vCurl = curl3D(pos * stretch * noiseScale, elapsed) / stretch
               * curlSpeed * (1.0 - p);

    // Pull rate ramps quadratically with progress — weak early so the
    // curl dominates, near-exponential snap at the end so the particle
    // actually arrives at the target.
    float pullRate = pullStrength * p * p;
    vec3 vPull = (target - pos) * pullRate;

    pos += (vCurl + vPull) * dt;
    outColor = vec4(pos, 0.0);
}
`;

const VERT_PARTICLE = `#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D state;
uniform sampler2D src;
uniform vec2 stateSize;
uniform float pointSize;
uniform vec2 elementPixel;
uniform int particleCount;
uniform float fog;
uniform float elapsed;
uniform vec4 contentRectUv;
uniform vec4 srcRectUv;

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

    vec3 pos = texture(state, stateUv).xyz;

    // Target uv (= state-uv) drives color sampling — every particle
    // pulls its color from the pixel it's destined to fill.
    vec2 jitter = (vec2(hash21(stateUv * 17.31), hash21(stateUv * 23.79))
                   - 0.5) / stateSize;
    vec2 targetUv = clamp(stateUv + jitter, 0.0, 1.0);
    vec2 srcSampleUv = srcRectUv.xy + targetUv * srcRectUv.zw;
    vec4 c = texture(src, srcSampleUv);

    // Brief fade-in over the first few frames so the trigger doesn't
    // pop. elapsed is in seconds; ramp over ~0.1s.
    float fadeIn = smoothstep(0.0, 0.1, elapsed);

    float fogFactor = mix(1.0, smoothstep(1.0, -0.5, pos.z), fog);

    // Map element-uv → buffer-uv via contentRectUv so particles land
    // at their element-relative positions even when the dst buffer
    // covers the canvas (outputRect=canvasRect).
    vec2 bufferUv = contentRectUv.xy + pos.xy * contentRectUv.zw;
    vec2 ndcPos = bufferUv * 2.0 - 1.0;
    vec2 bufferPixel = elementPixel / max(contentRectUv.zw, vec2(1e-6));
    vec2 ndcOffset = position * pointSize * 2.0 / bufferPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);
    vCorner = position;
    vColor = vec4(c.rgb, c.a * fadeIn * fogFactor);
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

const QUAD_VERTS = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
]);

export type ImplodeParams = {
    /** Particle count. Locked at construction. */
    count: number;
    /** Total animation duration (sec). */
    duration: number;
    /** Curl-noise velocity magnitude (uv per sec) at p=0. */
    curlSpeed: number;
    /** Curl-noise frequency (cells per uv unit). */
    noiseScale: number;
    /** Initial scatter radius in uv units. */
    scatterRadius: number;
    /** Max pull rate (1/sec) toward target at p=1. Higher = harder snap. */
    pullStrength: number;
    /** Particle quad size in element px. */
    pointSize: number;
    /** Depth fog 0..1. */
    fog: number;
};

const DEFAULT_PARAMS: ImplodeParams = {
    count: STATE_SIZE_DEFAULT * STATE_SIZE_DEFAULT,
    duration: 1.5,
    curlSpeed: 0.4,
    noiseScale: 3.0,
    scatterRadius: 1.0,
    pullStrength: 12.0,
    pointSize: 1.5,
    fog: 0.5,
};

/**
 * One-shot "materialize" effect via stateful curl-noise + attractor
 * integration. Pre-trigger renders opaque black; `trigger()` plays a
 * particle convergence animation; once `duration` elapses, falls
 * through to a passthrough of the underlying src.
 */
export class ImplodeEffect implements Effect {
    params: ImplodeParams;

    #state: EffectRenderTarget | null = null;
    #particleStamp: EffectRenderTarget | null = null;
    #geometry: EffectGeometry | null = null;
    #stateSize: [number, number];

    #triggered = false;
    #startTime = -1;
    #lastElapsed = 0;
    #stateInitialized = false;

    constructor(
        initial: Partial<ImplodeParams> = {},
        stateSize?: readonly [number, number],
    ) {
        this.#stateSize = stateSize
            ? [Math.max(1, stateSize[0]), Math.max(1, stateSize[1])]
            : [STATE_SIZE_DEFAULT, STATE_SIZE_DEFAULT];
        const fullCount = this.#stateSize[0] * this.#stateSize[1];
        this.params = { ...DEFAULT_PARAMS, count: fullCount, ...initial };
    }

    trigger(): void {
        this.#triggered = true;
        this.#startTime = -1;
        this.#stateInitialized = false;
    }

    reset(): void {
        this.#triggered = false;
        this.#startTime = -1;
        this.#lastElapsed = 0;
        this.#stateInitialized = false;
    }

    isDone(): boolean {
        return this.#triggered && this.#lastElapsed >= this.params.duration;
    }

    init(ctx: EffectContext): void {
        this.#state = ctx.createRenderTarget({
            size: this.#stateSize,
            float: true,
            persistent: true,
            wrap: "clamp",
            filter: "nearest",
        });
        this.#particleStamp = ctx.createRenderTarget({
            float: false,
            wrap: "clamp",
            filter: "linear",
        });
        const cap = Math.max(
            1,
            Math.min(
                this.#stateSize[0] * this.#stateSize[1],
                Math.floor(this.params.count),
            ),
        );
        this.#geometry = {
            attributes: { position: QUAD_VERTS },
            instanceCount: cap,
        };
    }

    render(ctx: EffectContext): void {
        if (!this.#state || !this.#particleStamp || !this.#geometry) {
            return;
        }

        if (!this.#triggered) {
            ctx.draw({ frag: FRAG_BLACK, target: ctx.target });
            return;
        }

        if (this.#startTime < 0) {
            this.#startTime = ctx.time;
        }
        const elapsed = ctx.time - this.#startTime;
        this.#lastElapsed = elapsed;

        if (elapsed >= this.params.duration) {
            ctx.draw({
                frag: FRAG_PASSTHROUGH,
                uniforms: { src: ctx.src },
                target: ctx.target,
            });
            return;
        }

        const dt = Math.min(0.1, Math.max(0, ctx.deltaTime));
        const elementPixel: [number, number] = [
            ctx.dims.elementPixel[0],
            ctx.dims.elementPixel[1],
        ];

        if (!this.#stateInitialized) {
            // First frame after trigger: scatter particles around the
            // element center.
            ctx.draw({
                frag: FRAG_INIT_STATE,
                uniforms: { scatterRadius: this.params.scatterRadius },
                target: this.#state,
            });
            this.#stateInitialized = true;
        } else {
            // Subsequent frames: integrate position via curl + attractor.
            ctx.draw({
                frag: FRAG_UPDATE_STATE,
                uniforms: {
                    state: this.#state,
                    stateSize: this.#stateSize,
                    elementPixel,
                    dt,
                    elapsed,
                    duration: this.params.duration,
                    curlSpeed: this.params.curlSpeed,
                    noiseScale: this.params.noiseScale,
                    pullStrength: this.params.pullStrength,
                },
                target: this.#state,
            });
        }

        ctx.draw({ frag: FRAG_CLEAR, target: this.#particleStamp });

        ctx.draw({
            vert: VERT_PARTICLE,
            frag: FRAG_PARTICLE,
            uniforms: {
                state: this.#state,
                src: ctx.src,
                stateSize: this.#stateSize,
                pointSize: this.params.pointSize,
                elementPixel,
                particleCount: Math.min(
                    this.#stateSize[0] * this.#stateSize[1],
                    Math.max(1, Math.floor(this.params.count)),
                ),
                fog: this.params.fog,
                elapsed,
            },
            geometry: this.#geometry,
            target: this.#particleStamp,
            blend: "additive",
        });

        ctx.draw({
            frag: FRAG_OUTPUT,
            uniforms: { particles: this.#particleStamp },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#state = null;
        this.#particleStamp = null;
        this.#geometry = null;
    }

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        return dims.canvasRect;
    }
}
