import type {
    TransitionEffect,
    TransitionEffectContext,
    TransitionRun,
} from "@vfx-js/core";
import { type PixelSortDirection, PixelSortEffect } from "@vfx-js/effects";
import { HardCut, StagedTransition } from "./_shared.js";

export type PixelsortParams = {
    /** Where the old content melts. Default `"up"`. */
    direction?: PixelSortDirection;
};

const OPPOSITE: Record<PixelSortDirection, PixelSortDirection> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
};

export class PixelsortStage
    extends PixelSortEffect
    implements TransitionEffect
{
    #outDirection: () => PixelSortDirection;
    #reverse = false;

    constructor(outDirection: () => PixelSortDirection) {
        super({ range: [1, 1] });
        this.#outDirection = outDirection;
    }

    start(run: TransitionRun): void {
        const outDirection = this.#outDirection();
        this.#reverse = run.reverse;
        this.params.direction = run.reverse
            ? OPPOSITE[outDirection]
            : outDirection;
        this.params.range[0] = 1;
    }

    update(ctx: TransitionEffectContext): void {
        const { t } = ctx.progress;
        const outDirection = this.#outDirection();
        // Reverse plays the forward run backward, so its halves swap directions.
        const forwardT = this.#reverse ? 1 - t : t;
        this.params.direction =
            forwardT < 0.5 ? outDirection : OPPOSITE[outDirection];
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
export class Pixelsort extends StagedTransition<PixelsortParams> {
    readonly name = "pixelsort";
    protected readonly stages = [
        new HardCut(),
        new PixelsortStage(() => this.params.direction ?? "up"),
    ];
}
