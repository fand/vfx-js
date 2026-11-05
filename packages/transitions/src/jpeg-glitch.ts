import {
    shaderTransition,
    type TransitionDef,
    type TransitionEffect,
    type TransitionEffectContext,
} from "@vfx-js/core";
import { JPEGGlitchEffect } from "@vfx-js/effects";

/** Glitch only in the middle; outside it the live capture shows with no codec lag. */
const WINDOW = 0.12;
/** Re-glitches per second. The real rate is capped by encode/decode latency. */
const SPEED = 30;

const cut = shaderTransition({
    name: "jpeg_glitch",
    frag: `
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`,
});

export class JpegGlitchTransitionEffect
    extends JPEGGlitchEffect
    implements TransitionEffect
{
    #maxIterations: number;
    #quality: number;

    constructor(maxIterations: number, quality: number) {
        super({ quality, bypass: true });
        this.#maxIterations = maxIterations;
        this.#quality = quality;
    }

    start(): void {
        this.params.bypass = true;
        this.params.speed = SPEED;
        this.params.quality = this.#quality;
    }

    // Set per frame in render, since the base update() takes no context.
    render(ctx: TransitionEffectContext): void {
        const { x } = ctx.progress;
        this.params.bypass = !(x > WINDOW && x < 1 - WINDOW);
        const amount = Math.sin(Math.min(Math.max(x, 0), 1) * Math.PI);
        this.params.iterations = Math.max(
            1,
            Math.round(this.#maxIterations * amount),
        );
        super.render(ctx);
    }

    end(): void {
        this.params.bypass = true;
    }
}

/**
 * Hard cut through a real JPEG glitch: the content is encoded, its bytes
 * corrupted and decoded again. The corruption peaks at the cut halfway.
 */
export function createJpegGlitch(
    opts: { iterations?: number; quality?: number } = {},
): TransitionDef {
    const maxIterations = Math.max(1, Math.round(opts.iterations ?? 64));
    const quality = Math.min(Math.max(opts.quality ?? 0.3, 0), 1);
    return {
        name: "jpeg_glitch",
        // Linear, so the glitch window and the cut line up with the envelope.
        ease: "linear",
        create: () => [
            cut.create(),
            new JpegGlitchTransitionEffect(maxIterations, quality),
        ],
    };
}

export const jpegGlitch: TransitionDef = createJpegGlitch();
