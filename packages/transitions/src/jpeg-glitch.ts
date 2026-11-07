import type { TransitionEffect, TransitionEffectContext } from "@vfx-js/core";
import { JPEGGlitchEffect } from "@vfx-js/effects";
import { HardCut, StagedTransition } from "./_shared";

export type JpegGlitchParams = {
    /** Glitch passes at the peak. Default 4. */
    iterations?: number;
    /** JPEG quality, 0 to 1. Default 0.1. */
    quality?: number;
};

/** Glitch only in the middle; outside it the live capture shows with no codec lag. */
const WINDOW = 0.12;
/** Re-glitches per second. The real rate is capped by encode/decode latency. */
const SPEED = 30;

const qualityOf = (params: JpegGlitchParams) =>
    Math.min(Math.max(params.quality ?? 0.1, 0), 1);

export class JpegGlitchStage
    extends JPEGGlitchEffect
    implements TransitionEffect
{
    #params: () => JpegGlitchParams;

    constructor(params: () => JpegGlitchParams) {
        super({
            quality: qualityOf(params()),
            bypass: true,
            resolutionScale: 0.25,
        });
        this.#params = params;
    }

    start(): void {
        this.params.bypass = true;
        this.params.speed = SPEED;
        this.params.quality = qualityOf(this.#params());
    }

    // Set per frame in render, since the base update() takes no context.
    render(ctx: TransitionEffectContext): void {
        const { x } = ctx.progress;
        this.params.bypass = !(x > WINDOW && x < 1 - WINDOW);
        const amount = Math.sin(Math.min(Math.max(x, 0), 1) * Math.PI);
        const maxIterations = Math.max(
            1,
            Math.round(this.#params().iterations ?? 4),
        );
        this.params.iterations = Math.max(
            1,
            Math.round(maxIterations * amount),
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
export class JpegGlitch extends StagedTransition<JpegGlitchParams> {
    readonly name = "jpeg_glitch";
    // Linear, so the glitch window and the cut line up with the envelope.
    ease = "linear" as const;
    protected readonly stages = [
        new HardCut(),
        new JpegGlitchStage(() => this.params),
    ];
}
