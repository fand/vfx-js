import type { Effect, TransitionDef } from "@vfx-js/core";
import { type PixelSortDirection, PixelSortEffect } from "../pixelsort";

const OPPOSITE: Record<PixelSortDirection, PixelSortDirection> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
};

/**
 * The old content melts into sorted streaks toward `direction`; the new one
 * sorts back out of them from the opposite side.
 */
export function createPixelsort(
    opts: { direction?: PixelSortDirection } = {},
): TransitionDef {
    const outDir = opts.direction ?? "up";
    // One state per effect, so containers that share this def don't collide.
    const reversed = new WeakMap<Effect, boolean>();

    return {
        name: "pixelsort",
        frag: `
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`,
        async effects(): Promise<Effect[]> {
            const effect: Effect = new PixelSortEffect({ range: [1, 1] });
            effect.enabled = false;
            return [effect];
        },
        prepare(run, fx) {
            const effect = fx[0] as PixelSortEffect;
            reversed.set(effect, run.reverse);
            effect.params.direction = run.reverse ? OPPOSITE[outDir] : outDir;
            effect.params.range[0] = 1;
            (effect as Effect).enabled = true;
        },
        onFrame(t, _x, _dt, fx) {
            const effect = fx[0] as PixelSortEffect;
            // Reverse plays the forward run backward, so its halves swap directions.
            const forwardT = reversed.get(effect) ? 1 - t : t;
            effect.params.direction =
                forwardT < 0.5 ? outDir : OPPOSITE[outDir];
            // Fully sorted at the halfway swap.
            effect.params.range[0] = Math.abs(1 - 2 * t);
        },
        onEnd(fx) {
            const effect = fx[0] as PixelSortEffect;
            reversed.delete(effect);
            (effect as Effect).enabled = false;
            effect.params.range[0] = 1;
        },
    };
}

export const pixelsort: TransitionDef = createPixelsort();
