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

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 curl2D(vec2 p, float t) {
    float eps = 0.01;
    float ts = t * 0.15;
    float ny0 = vnoise(p + vec2(0.0, eps) + ts);
    float ny1 = vnoise(p - vec2(0.0, eps) + ts);
    float nx0 = vnoise(p + vec2(eps, 0.0) + ts);
    float nx1 = vnoise(p - vec2(eps, 0.0) + ts);
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
        vec2 v = curl2D(pos * noiseScale, time);
        vec2 dPx = (pos - mouseUv) * elementPixel;
        float distPx = length(dPx);
        // Full speed inside the radius, smoothly falling off to 0 at 3x.
        float speedFactor =
            1.0 - smoothstep(radius, radius * 3.0, distPx);
        pos += v * speed * dt * speedFactor;
    }

    outColor = vec4(pos, storedEpoch, justRespawned ? 1.0 : 0.0);
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

    vec2 pos = s.xy;
    bool offscreen = pos.x < 0.0 || pos.x > 1.0
                  || pos.y < 0.0 || pos.y > 1.0;
    if (offscreen) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCorner = vec2(0.0);
        vColor = vec4(0.0);
        return;
    }

    vec2 ndcPos = pos * 2.0 - 1.0;
    vec2 ndcOffset = position * pointSize * 2.0 / elementPixel;
    gl_Position = vec4(ndcPos + ndcOffset, 0.0, 1.0);
    vCorner = position;
    vColor = c;
}
`;

const FRAG_PARTICLE = `#version 300 es
precision highp float;
in vec2 vCorner;
in vec4 vColor;
out vec4 outColor;

uniform sampler2D trailPrev;
uniform vec2 targetSize;

void main() {
    // Soft circular falloff inside the quad.
    float d = length(vCorner) * 2.0;
    float fall = 1.0 - smoothstep(0.6, 1.0, d);
    if (fall <= 0.0) discard;

    vec4 newColor = vec4(vColor.rgb, fall);
    vec4 prev = texture(trailPrev, gl_FragCoord.xy / targetSize);
    // 90% new, 10% prev — particles stamp boldly while the persistent
    // backbuffer accumulates fading streaks at touched pixels.
    outColor = mix(newColor, prev, 0.1);
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
    /** Particle lifespan (sec) — same for all, with per-particle phase offsets. */
    lifespan: number;
    /** uv-displacement-per-second at full speed. */
    speed: number;
    /** Curl-noise frequency (cells per uv unit). */
    noiseScale: number;
    /** Particle quad size in element px. */
    pointSize: number;
    /** Mouse spawn / activity radius in element px. */
    radius: number;
    /** Background image opacity 0..1. */
    backgroundOpacity: number;
};

const DEFAULT_PARAMS: CurlParticlesParams = {
    count: STATE_SIZE * STATE_SIZE,
    lifespan: 3,
    speed: 0.15,
    noiseScale: 5,
    pointSize: 3,
    radius: 200,
    backgroundOpacity: 0.4,
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
    #stateColor: EffectRenderTarget | null = null;
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
        this.#stateColor = ctx.createRenderTarget(stateOpts);
        // Trail auto-resizes to dst buffer (= element); persistent so
        // pass3's mix-with-prev semantic has a real previous frame.
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
            !this.#stateColor ||
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

        // Pass 1: state update.
        ctx.draw({
            frag: FRAG_UPDATE_STATE,
            uniforms: {
                state: this.#statePos,
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

        // Pass 3: instanced quads → persistent trail with mix-with-prev.
        const targetSize: [number, number] = [
            this.#trail.width,
            this.#trail.height,
        ];
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
                trailPrev: this.#trail,
                targetSize,
            },
            geometry: this.#geometry,
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
        this.#stateColor = null;
        this.#trail = null;
        this.#initialized = false;
        this.#geometry = null;
    }
}
