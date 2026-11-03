import type { Effect, TransitionDef } from "@vfx-js/core";
import { DatamoshEffect } from "../datamosh";

const HOLD = 0.25;
const CHROMA_GAIN = 1.5;
/** Frames after the cut that skip the residual, so the old picture stays. */
const CUT_FRAMES = 2;
const DEFAULT_BLOCK_SIZE = 32;

type RunState = { frames: number; healSec: number };

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
    // One state per effect, so containers that share this def don't collide.
    const states = new WeakMap<Effect, RunState>();

    return {
        name: "datamosh",
        // The cut always lands on the new content, in both directions.
        frag: `
vec4 transition(vec2 uv, float t) {
  return readNew(uv);
}
`,
        async effects(): Promise<Effect[]> {
            return [new DatamoshEffect({ dup: 0, blockSize })];
        },
        prepare(run, fx) {
            const mosh = fx[0] as DatamoshEffect;
            mosh.params.blockSize = blockSize;
            mosh.params.chromaGain = CHROMA_GAIN;
            mosh.params.useResidual = false;
            mosh.params.healRate = 0;
            states.set(mosh, {
                frames: 0,
                healSec: Math.max(run.duration * (1 - HOLD), 1e-3),
            });
            // Enable while the old content is still the frame, so the mosh starts from it.
            mosh.enable();
        },
        onFrame(_t, x, dt, fx) {
            const mosh = fx[0] as DatamoshEffect;
            const state = states.get(mosh);
            if (!state) {
                return;
            }
            const heal = Math.min(Math.max((x - HOLD) / (1 - HOLD), 0), 1);
            mosh.params.useResidual = ++state.frames > CUT_FRAMES;
            mosh.params.chromaGain = CHROMA_GAIN + (1 - CHROMA_GAIN) * heal;
            // Per-frame refresh chance that leaves ~1% of blocks moshed when the
            // heal ends; disable() then shows the clean frame.
            mosh.params.healRate =
                x < HOLD ? 0 : 1 - 0.01 ** (dt / state.healSec);
        },
        onEnd(fx) {
            const mosh = fx[0] as DatamoshEffect;
            states.delete(mosh);
            mosh.disable();
        },
    };
}

export const datamosh: TransitionDef = createDatamosh();
