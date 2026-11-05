import {
    shaderTransition,
    type TransitionDef,
    type TransitionEffect,
    type TransitionEffectContext,
    type TransitionRun,
} from "@vfx-js/core";
import { DatamoshEffect } from "@vfx-js/effects";

const HOLD = 0.25;
const CHROMA_GAIN = 1.5;
/** Frames after the cut that skip the residual, so the old picture stays. */
const CUT_FRAMES = 2;
const DEFAULT_BLOCK_SIZE = 32;

// The cut always lands on the new content, in both directions.
const cut = shaderTransition({
    name: "datamosh",
    frag: `
vec4 transition(vec2 uv, float t) {
  return reverse > 0.5 ? readFrom(uv) : readTo(uv);
}
`,
});

export class DatamoshTransitionEffect
    extends DatamoshEffect
    implements TransitionEffect
{
    #blockSize: number;
    #frames = 0;
    #healSec = 1;

    constructor(blockSize: number) {
        super({ dup: 0, blockSize });
        this.#blockSize = blockSize;
    }

    start(run: TransitionRun): void {
        this.params.blockSize = this.#blockSize;
        this.params.chromaGain = CHROMA_GAIN;
        this.params.useResidual = false;
        this.params.healRate = 0;
        this.#frames = 0;
        this.#healSec = Math.max(run.duration * (1 - HOLD), 1e-3);
        // Enable while the old content is still the frame, so the mosh starts from it.
        this.enable();
    }

    update(ctx: TransitionEffectContext): void {
        const { x } = ctx.progress;
        const heal = Math.min(Math.max((x - HOLD) / (1 - HOLD), 0), 1);
        this.params.useResidual = ++this.#frames > CUT_FRAMES;
        this.params.chromaGain = CHROMA_GAIN + (1 - CHROMA_GAIN) * heal;
        // Per-frame refresh chance that leaves ~1% of blocks moshed when the
        // heal ends; disable() then shows the clean frame.
        this.params.healRate =
            x < HOLD ? 0 : 1 - 0.01 ** (ctx.deltaTime / this.#healSec);
    }

    end(): void {
        this.disable();
    }
}

/**
 * Hard cut to the new content through a datamosh: the old content's blocks
 * are moved to match the new one, held for 25% of the duration, then healed
 * block by block.
 */
export function createDatamosh(
    opts: { blockSize?: number } = {},
): TransitionDef {
    const size = opts.blockSize;
    const blockSize =
        size !== undefined && Number.isFinite(size) && size >= 2
            ? Math.round(size)
            : DEFAULT_BLOCK_SIZE;
    return {
        name: "datamosh",
        create: () => [cut.create(), new DatamoshTransitionEffect(blockSize)],
    };
}

export const datamosh: TransitionDef = createDatamosh();
