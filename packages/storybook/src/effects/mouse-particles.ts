// Mouse-driven GPU particles. CPU spawn scheduler picks ring-buffer
// slots each frame; particles advect along a 3D curl-noise field and
// composite over a persistent trail buffer.
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";

const STATE_SIZE = 256;

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

    #posTex: EffectRenderTarget | null = null;
    #colorTex: EffectRenderTarget | null = null;
    #stampTex: EffectRenderTarget | null = null;
    #trail: EffectRenderTarget | null = null;
    #initialized = false;

    constructor(initial: Partial<MouseParticlesParams> = {}) {
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
    }

    render(ctx: EffectContext): void {
        if (
            !this.#posTex ||
            !this.#colorTex ||
            !this.#stampTex ||
            !this.#trail
        ) {
            return;
        }

        if (!this.#initialized) {
            ctx.draw({ frag: FRAG_INIT_POS, target: this.#posTex });
            ctx.draw({ frag: FRAG_INIT_COLOR, target: this.#colorTex });
            this.#initialized = true;
        }

        // Update / spawn / particle-stamp / trail / output passes are
        // wired up in subsequent commits.
    }

    dispose(): void {
        this.#posTex = null;
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
