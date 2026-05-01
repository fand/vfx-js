// Gray-Scott reaction-diffusion. Two chemicals A,B live in the RG
// channels of a float ping-pong texture; each step diffuses both via
// a 9-point stencil Laplacian and runs the autocatalytic reaction
// A + 2B → 3B with a feed term on A and a kill term on B. Different
// (feed, kill) pairs produce spots / coral / mitosis / solitons.
//
// State persists across frames via two `persistent: true, float: true`
// RTs ping-ponged within and across frames. Sim is decoupled from
// element size (fixed `simSize`) for predictable performance and
// pattern scale.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const FRAG_SEED = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    // Strong central blob + scattered weak seeds → richer pattern
    // evolution than a single blob (which radiates symmetrically).
    vec2 c = uv - 0.5;
    float blob = smoothstep(0.12, 0.06, length(c));
    float sprinkle = step(0.997, hash(floor(uv * 64.0))) * 0.6;
    float b = max(blob, sprinkle);
    outColor = vec4(1.0, b, 0.0, 1.0);
}
`;

// 9-point stencil Laplacian. Axials get 0.2, diagonals 0.05, center
// -1.0. Sum of weights = 0; reproduces ∇² with better isotropy than
// the bare 5-point cross (which biases patterns to the cardinal axes).
//
// `scaleEnabled=1` modulates the per-pixel sampling radius by the
// source scalar, giving a non-uniform spatial scale across the field
// — bright/opaque regions sample neighbors farther/closer, producing
// coarser/finer patterns locally.
const FRAG_STEP = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D state;
uniform sampler2D srcImg;
uniform vec2 texel;
uniform float feed;
uniform float kill;
uniform float diffA;
uniform float diffB;
uniform float dt;
uniform int sourceMode;     // 0=alpha, 1=luminance
uniform int scaleEnabled;
uniform vec2 scaleRange;

float readSource(vec2 sampleUv) {
    vec4 s = texture(srcImg, sampleUv);
    return sourceMode == 0
        ? s.a
        : dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec2 c = texture(state, uv).rg;

    float texelMul = 1.0;
    if (scaleEnabled == 1) {
        float sv = readSource(uv);
        texelMul = mix(scaleRange.x, scaleRange.y, sv);
    }
    vec2 t = texel * texelMul;

    vec2 N  = texture(state, uv + vec2( 0.0,  t.y)).rg;
    vec2 S  = texture(state, uv + vec2( 0.0, -t.y)).rg;
    vec2 E  = texture(state, uv + vec2( t.x, 0.0)).rg;
    vec2 W  = texture(state, uv + vec2(-t.x, 0.0)).rg;
    vec2 NE = texture(state, uv + vec2( t.x,  t.y)).rg;
    vec2 NW = texture(state, uv + vec2(-t.x,  t.y)).rg;
    vec2 SE = texture(state, uv + vec2( t.x, -t.y)).rg;
    vec2 SW = texture(state, uv + vec2(-t.x, -t.y)).rg;

    vec2 lap = (N + S + E + W) * 0.2 + (NE + NW + SE + SW) * 0.05 - c;

    float a = c.r;
    float b = c.g;
    float reaction = a * b * b;
    float dA = diffA * lap.x - reaction + feed * (1.0 - a);
    float dB = diffB * lap.y + reaction - (kill + feed) * b;

    outColor = vec4(
        clamp(a + dA * dt, 0.0, 1.0),
        clamp(b + dB * dt, 0.0, 1.0),
        0.0,
        1.0
    );
}
`;

// Composite the B channel of the sim. `mode`:
// 0 = mask  — pattern only, alpha gated by source (input element hidden)
// 1 = scale — pattern over base; pairs with the per-pixel sim scale
//             modulation in FRAG_STEP so spatial fineness varies.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D pattern;
uniform float intensity;
uniform int mode;
uniform int sourceMode;

vec3 spectrum(float x) {
    return cos((x - vec3(0.0, 0.5, 1.0)) * vec3(0.6, 1.0, 0.5) * 3.14);
}

float readSource(vec4 s) {
    return sourceMode == 0
        ? s.a
        : dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec4 base = texture(src, uvSrc);
    float sv = readSource(base);
    float p = texture(pattern, uv).g;
    float pi = clamp(p * intensity, 0.0, 1.0);
    vec3 tint = 0.5 + 0.5 * spectrum(p * 1.2);

    if (mode == 0) {
        outColor = vec4(tint * pi, pi * sv);
    } else {
        outColor = vec4(mix(base.rgb, tint, pi), base.a);
    }
}
`;

export type RDSource = "alpha" | "luminance";
export type RDMode = "mask" | "scale";

export type RDParams = {
    /**
     * Sim grid longest side in cells. Other side follows the element's
     * aspect ratio so patterns stay isotropic in display space.
     * Default 256.
     */
    simMaxDim: number;
    /** A-replenishment rate. */
    feed: number;
    /** B-decay rate. */
    kill: number;
    /** Diffusion of A. */
    diffA: number;
    /** Diffusion of B. */
    diffB: number;
    /** Sim timestep per iteration. */
    dt: number;
    /** Iterations per frame; higher evolves faster (more GPU). */
    stepsPerFrame: number;
    /** Composite gain. */
    intensity: number;
    /**
     * Which scalar to read off `ctx.src` per pixel — used by `mask`
     * mode to gate the composite, and by `scale` mode to modulate the
     * sim sampling radius.
     */
    source: RDSource;
    /**
     * `mask`: composite shows the pattern only where source > 0;
     * the input element itself is not drawn.
     * `scale`: pattern over base, with per-pixel sim sampling radius
     * driven by `scaleRange × source`.
     */
    mode: RDMode;
    /**
     * For `mode=scale`: per-pixel texel multiplier range. Mapped by
     * source: `mix(scaleRange[0], scaleRange[1], sourceValue)`.
     */
    scaleRange: [number, number];
};

const DEFAULT_PARAMS: RDParams = {
    simMaxDim: 256,
    feed: 0.0367,
    kill: 0.0649,
    diffA: 1.0,
    diffB: 0.5,
    dt: 1.0,
    stepsPerFrame: 8,
    intensity: 1.0,
    source: "alpha",
    mode: "mask",
    scaleRange: [0.5, 3.0],
};

/**
 * Gray-Scott reaction-diffusion as an Effect. Mutate `params` directly
 * for runtime tweaks; call `reseed()` to restart the pattern.
 */
export class ReactionDiffusionEffect implements Effect {
    params: RDParams;

    #a: EffectRenderTarget | null = null;
    #b: EffectRenderTarget | null = null;
    #seeded = false;

    constructor(initial: Partial<RDParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    init(_ctx: EffectContext): void {
        // RT allocation deferred to first render — element aspect
        // (`ctx.dims.elementPixel`) isn't valid until then.
    }

    /** Restart the simulation on the next render. */
    reseed(): void {
        this.#seeded = false;
    }

    render(ctx: EffectContext): void {
        const desired = this.#desiredSize(ctx);
        if (!desired) {
            return;
        }
        if (
            !this.#a ||
            !this.#b ||
            this.#a.width !== desired[0] ||
            this.#a.height !== desired[1]
        ) {
            // Aspect / simMaxDim change → reallocate. The previous
            // RTs are released when the effect host disposes; we
            // accept a small leak here for the much simpler control
            // flow vs. plumbing per-RT dispose into the public API.
            this.#allocate(ctx, desired);
        }
        if (!this.#a || !this.#b) {
            return;
        }
        const {
            feed,
            kill,
            diffA,
            diffB,
            dt,
            stepsPerFrame,
            intensity,
            source,
            mode,
            scaleRange,
        } = this.params;
        const texel: [number, number] = [1 / this.#a.width, 1 / this.#a.height];
        const sourceMode = source === "alpha" ? 0 : 1;
        const scaleEnabled = mode === "scale" ? 1 : 0;
        const compositeMode = mode === "mask" ? 0 : 1;

        if (!this.#seeded) {
            // Seed only A — B will be written by the first step. After
            // this draw, A's persistent front buffer holds the seed.
            ctx.draw({ frag: FRAG_SEED, target: this.#a });
            this.#seeded = true;
        }

        // Ping-pong A↔B for stepsPerFrame iterations. After each write
        // the persistent RT's front buffer holds the new state, so the
        // next iter swap correctly reads the just-written values.
        let read = this.#a;
        let write = this.#b;
        for (let i = 0; i < stepsPerFrame; i++) {
            ctx.draw({
                frag: FRAG_STEP,
                uniforms: {
                    state: read,
                    srcImg: ctx.src,
                    texel,
                    feed,
                    kill,
                    diffA,
                    diffB,
                    dt,
                    sourceMode,
                    scaleEnabled,
                    scaleRange,
                },
                target: write,
            });
            const tmp = read;
            read = write;
            write = tmp;
        }

        ctx.draw({
            frag: FRAG_COMPOSITE,
            uniforms: {
                src: ctx.src,
                pattern: read,
                intensity,
                mode: compositeMode,
                sourceMode,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#a = null;
        this.#b = null;
        this.#seeded = false;
    }

    #desiredSize(ctx: EffectContext): [number, number] | null {
        const [ew, eh] = ctx.dims.elementPixel;
        if (ew < 1 || eh < 1) {
            return null;
        }
        const aspect = ew / eh;
        const max = Math.max(16, Math.floor(this.params.simMaxDim));
        const w = aspect >= 1 ? max : Math.max(16, Math.round(max * aspect));
        const h = aspect >= 1 ? Math.max(16, Math.round(max / aspect)) : max;
        return [w, h];
    }

    #allocate(ctx: EffectContext, size: [number, number]): void {
        const opts = {
            size,
            float: true,
            persistent: true,
            wrap: "clamp" as const,
            filter: "linear" as const,
        };
        this.#a = ctx.createRenderTarget(opts);
        this.#b = ctx.createRenderTarget(opts);
        // Sim state was tied to old buffers; force reseed.
        this.#seeded = false;
    }
}
