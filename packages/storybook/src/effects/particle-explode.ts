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
import {
    GLSL_CURL_NOISE,
    LIFE_JITTER_MAX,
    LIFE_JITTER_MIN,
} from "./_curl-noise";

const LIFE_JITTER_MIN_GLSL = LIFE_JITTER_MIN.toFixed(4);
const LIFE_JITTER_MAX_GLSL = LIFE_JITTER_MAX.toFixed(4);

// State texture size is decoupled from image resolution and auto-
// derived from `count` (smallest power-of-two square grid that fits).
// Each texel is a particle slot; on burst, slots with id < params.count
// emit at a hashed random uv across the element. 1024² is the 1M cap
// at the default `count`.
function stateSizeFromCount(count: number): number {
    const n = Math.max(1, Math.floor(count));
    return 2 ** Math.ceil(Math.log2(Math.sqrt(n)));
}

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
uniform float noiseSpeed;
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
    vec3 pos = s.xyz + (vNoise + outward) * noiseSpeed * dt * taper;

    float lifespanScale = mix(
        ${LIFE_JITTER_MIN_GLSL},
        ${LIFE_JITTER_MAX_GLSL},
        hash21(uv * 91.7 + 1.234)
    );
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
uniform vec3 color;
uniform float colorMix;
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
        vec4 c = texture(src, sampleUv);
        outColor = vec4(mix(c.rgb, color, colorMix), c.a);
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
    noiseSpeed: number;
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
    /** Base color blended into particle rgb (hex 0xRRGGBB). */
    color: number;
    /** Mix amount between src color (0) and `color` (1). */
    colorMix: number;
    /** Stamp blend mode. "add" brightens overlaps; "normal" composites
     * with premultiplied-alpha over. */
    blend: "add" | "normal";
};

const DEFAULT_PARAMS: ParticleExplodeParams = {
    count: 1024 * 1024,
    duration: 1.5,
    noiseSpeed: 1.0,
    noiseScale: 0.5,
    noiseAnimation: 1.0,
    outwardBias: 1.0,
    pointSize: 3.0,
    alpha: 1.0,
    alphaDecay: 3.0,
    speedDecay: 2.0,
    fog: 0.5,
    trailFade: 0.5,
    color: 0xffffff,
    colorMix: 0,
    blend: "add",
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
    #fadeOutFrames = 0;

    constructor(initial: Partial<ParticleExplodeParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
        const s = stateSizeFromCount(this.params.count);
        this.#stateSize = [s, s];
        this.#stateSizeVec = [s, s];
    }

    get maxCount(): number {
        return this.#stateSize[0] * this.#stateSize[1];
    }

    trigger(): void {
        this.#triggered = true;
        this.#burstPending = true;
        this.#startTime = -1;
        this.#lastElapsed = 0;
        this.#fadeOutFrames = 0;
    }

    reset(): void {
        this.#triggered = false;
        this.#burstPending = false;
        this.#startTime = -1;
        this.#lastElapsed = 0;
        this.#fadeOutFrames = 0;
    }

    isDone(): boolean {
        if (!this.#triggered) {
            return false;
        }
        if (this.#lastElapsed < this.params.duration) {
            return false;
        }
        return this.#fadeOutFrames >= this.#estimatedFadeFrames();
    }

    // trailFade is applied per-frame, so the trail decays geometrically
    // by trailFade^N. Stop once it falls under ~1/255 (alpha-quantized
    // invisible). Capped to prevent runaway when trailFade≈1.
    #estimatedFadeFrames(): number {
        const tf = this.params.trailFade;
        if (tf <= 0) {
            return 1;
        }
        if (tf >= 0.999) {
            return 600;
        }
        return Math.ceil(-Math.log(255) / Math.log(tf));
    }

    init(ctx: EffectContext): void {
        this.#allocStateRTs(ctx);
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
            instanceCount: this.#stateSize[0] * this.#stateSize[1],
        };
    }

    #allocStateRTs(ctx: EffectContext): void {
        const stateOpts = {
            size: this.#stateSize,
            float: true,
            persistent: true as const,
            wrap: "clamp" as const,
            filter: "nearest" as const,
        };
        this.#posTex = ctx.createRenderTarget(stateOpts);
        this.#colorTex = ctx.createRenderTarget(stateOpts);
    }

    #disposeStateRTs(): void {
        this.#posTex?.dispose();
        this.#colorTex?.dispose();
        this.#posTex = null;
        this.#colorTex = null;
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

        // Resize state RTs while idle. We never realloc mid-burst —
        // doing so would discard the in-flight particle state.
        const newSize = stateSizeFromCount(this.params.count);
        if (newSize !== this.#stateSize[0] && !this.#triggered) {
            this.#disposeStateRTs();
            this.#stateSize = [newSize, newSize];
            this.#stateSizeVec = [newSize, newSize];
            this.#allocStateRTs(ctx);
            this.#particleGeometry.instanceCount = newSize * newSize;
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

        const inFadeOut = elapsed >= this.params.duration;
        // Particles done AND trail decayed to invisible — stop drawing.
        if (inFadeOut && this.#fadeOutFrames >= this.#estimatedFadeFrames()) {
            ctx.draw({ frag: FRAG_CLEAR, target: ctx.target });
            return;
        }

        // Cap dt so tab-switch pauses don't teleport particles.
        const dt = Math.min(0.1, Math.max(0, ctx.deltaTime));
        const elementPixel: [number, number] = [
            ctx.dims.elementPixel[0],
            ctx.dims.elementPixel[1],
        ];

        if (!inFadeOut) {
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
                    noiseSpeed: this.params.noiseSpeed,
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

            const cHex = this.params.color | 0;
            const colorRGB: [number, number, number] = [
                ((cHex >> 16) & 0xff) / 255,
                ((cHex >> 8) & 0xff) / 255,
                (cHex & 0xff) / 255,
            ];
            ctx.draw({
                frag: FRAG_UPDATE_COLOR,
                uniforms: {
                    colorTex: this.#colorTex,
                    src: ctx.src,
                    stateSize: this.#stateSizeVec,
                    count: cap,
                    uBurst: burst,
                    color: colorRGB,
                    colorMix: this.params.colorMix,
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
                blend:
                    this.params.blend === "normal"
                        ? "premultiplied"
                        : "additive",
            });
        } else {
            // Particles done; keep decaying the trail with an empty stamp
            // so trailFade can fade out gracefully instead of cutting.
            ctx.draw({ frag: FRAG_CLEAR, target: this.#stampTex });
            this.#fadeOutFrames++;
        }

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
