import {
    shaderTransition,
    type TransitionDef,
    type TransitionEffect,
    type TransitionEffectContext,
    type TransitionRun,
} from "@vfx-js/core";
import { type PixelSortDirection, PixelSortEffect } from "@vfx-js/effects";

const OPPOSITE: Record<PixelSortDirection, PixelSortDirection> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
};

const cut = shaderTransition({
    name: "pixelsort",
    frag: `
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`,
});

export class PixelsortTransitionEffect
    extends PixelSortEffect
    implements TransitionEffect
{
    #outDir: PixelSortDirection;
    #reverse = false;

    constructor(outDir: PixelSortDirection) {
        super({ range: [1, 1] });
        this.#outDir = outDir;
    }

    start(run: TransitionRun): void {
        this.#reverse = run.reverse;
        this.params.direction = run.reverse
            ? OPPOSITE[this.#outDir]
            : this.#outDir;
        this.params.range[0] = 1;
    }

    update(ctx: TransitionEffectContext): void {
        const { t } = ctx.progress;
        // Reverse plays the forward run backward, so its halves swap directions.
        const forwardT = this.#reverse ? 1 - t : t;
        this.params.direction =
            forwardT < 0.5 ? this.#outDir : OPPOSITE[this.#outDir];
        // Fully sorted at the halfway swap.
        this.params.range[0] = Math.abs(1 - 2 * t);
    }

    end(): void {
        this.params.range[0] = 1;
    }
}

/**
 * The old content melts into sorted streaks toward `direction`; the new one
 * sorts back out of them from the opposite side.
 */
export function createPixelsort(
    opts: { direction?: PixelSortDirection } = {},
): TransitionDef {
    const outDir = opts.direction ?? "up";
    return {
        name: "pixelsort",
        create: () => [cut.create(), new PixelsortTransitionEffect(outDir)],
    };
}

export const pixelsort: TransitionDef = createPixelsort();
