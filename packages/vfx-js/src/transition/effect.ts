import type { ElementRect } from "../rect.js";
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
} from "../types.js";
import type {
    TransitionEase,
    TransitionEffect,
    TransitionEffectContext,
    TransitionProgress,
    TransitionRun,
} from "./types.js";

export type TransitionStartOpts = {
    /** Seconds. Above 0. */
    duration: number;
    /** Defaults to `"smoothstep"`. */
    ease?: TransitionEase;
    /** Called once when this run finishes or is replaced. */
    onEnd?(): void;
};

/** What the transition effects of a run see. Null while idle. */
export type TransitionFrame = {
    from: EffectRenderTarget;
    progress: TransitionProgress;
    /** True while the old content is held, before the animation. */
    holding: boolean;
};

const smoothstep = (x: number) => x * x * (3 - 2 * x);

function applyEase(ease: TransitionEase | undefined, x: number): number {
    if (typeof ease === "function") {
        return ease(x);
    }
    return ease === "linear" ? x : smoothstep(x);
}

const HELD: TransitionProgress = { t: 0, x: 0 };

/**
 * First effect of every transition chain. States:
 * - idle: disabled, the chain passes the capture through.
 * - hold: shows the snapshot of the old content while the new one is captured.
 * - playing: disabled, so the live capture goes to the transition effects; it only keeps time.
 */
export class TransitionStage implements Effect {
    enabled = false;

    #from: EffectRenderTarget | null = null;
    #fromSize: readonly [number, number] = [0, 0];
    #snapshotWaiters: (() => void)[] = [];
    #hold = false;
    #spec: TransitionStartOpts | null = null;
    #startTime: number | null = null;
    #progress: TransitionProgress = HELD;
    #resolveEnd: (() => void) | null = null;
    #onEnd: (() => void) | null = null;

    /** End the current run: call `spec.onEnd` and settle the promise from `start()`. */
    #end(): void {
        const onEnd = this.#onEnd;
        this.#onEnd = null;
        onEnd?.();
        const resolve = this.#resolveEnd;
        this.#resolveEnd = null;
        resolve?.();
    }

    /** Copy the current capture into `from` on the next frame and hold it on screen. */
    snapshot(): Promise<void> {
        this.#end();
        this.#spec = null;
        this.enabled = true;
        return new Promise((resolve) => this.#snapshotWaiters.push(resolve));
    }

    /** Resolves when the transition ends or another one replaces it. */
    start(spec: TransitionStartOpts): Promise<void> {
        this.#end();
        this.#spec = spec;
        this.#onEnd = spec.onEnd ?? null;
        this.#startTime = null;
        this.#progress = HELD;
        this.#hold = false;
        this.enabled = false;
        return new Promise((resolve) => {
            this.#resolveEnd = resolve;
        });
    }

    /** Stop any transition, drop a pending snapshot and pass the capture through. */
    cancel(): void {
        this.#end();
        this.#spec = null;
        this.#hold = false;
        this.enabled = false;
        this.#resolveSnapshotWaiters();
    }

    #resolveSnapshotWaiters(): void {
        const waiters = this.#snapshotWaiters;
        this.#snapshotWaiters = [];
        for (const w of waiters) {
            w();
        }
    }

    get frame(): TransitionFrame | null {
        const from = this.#from;
        if (!from || (!this.#hold && !this.#spec)) {
            return null;
        }
        return {
            from,
            progress: this.#progress,
            holding: this.#spec === null,
        };
    }

    /** End the playing run now; the live capture shows from this frame on. */
    cut(): void {
        if (this.#spec) {
            this.#spec = null;
            this.#end();
        }
    }

    update(ctx: EffectContext): void {
        const spec = this.#spec;
        if (!spec) {
            return;
        }
        if (this.#startTime === null) {
            this.#startTime = ctx.time;
        }
        const x = (ctx.time - this.#startTime) / spec.duration;
        if (x >= 1) {
            this.#spec = null;
            this.#end();
            return;
        }
        const clamped = Math.max(x, 0);
        this.#progress = { t: applyEase(spec.ease, clamped), x: clamped };
    }

    // Element-sized with an explicit size, so a larger stage does not resize it.
    #ensureFrom(ctx: EffectContext): EffectRenderTarget {
        const [w, h] = ctx.dims.elementPixel;
        if (!this.#from || this.#fromSize[0] !== w || this.#fromSize[1] !== h) {
            this.#from?.dispose();
            this.#from = ctx.createRenderTarget({ size: [w, h] });
            this.#fromSize = [w, h];
        }
        return this.#from;
    }

    render(ctx: EffectContext): void {
        if (this.#snapshotWaiters.length > 0) {
            ctx.blit(ctx.src, this.#ensureFrom(ctx));
            this.#hold = true;
            this.#resolveSnapshotWaiters();
        }
        if (this.#from && this.#hold) {
            ctx.blit(this.#from);
            return;
        }
        this.enabled = false;
        ctx.blit(ctx.src);
    }

    dispose(): void {
        this.#from = null;
        this.#fromSize = [0, 0];
        this.#end();
        this.#resolveSnapshotWaiters();
    }
}

export type TransitionFrameSource = {
    readonly frame: TransitionFrame | null;
    cut(): void;
};

/**
 * Puts a `TransitionEffect` in the chain.
 * Skipped outside a run; during one it passes the run state on the context.
 */
export class TransitionSlot implements Effect {
    readonly effect: TransitionEffect;
    #source: TransitionFrameSource;
    #run: TransitionRun | null = null;

    constructor(effect: TransitionEffect, source: TransitionFrameSource) {
        this.effect = effect;
        this.#source = source;
    }

    get enabled(): boolean {
        return (
            this.#run !== null &&
            typeof this.effect.render === "function" &&
            this.effect.enabled !== false
        );
    }

    start(run: TransitionRun): void {
        this.#run = run;
        this.effect.start?.(run);
    }

    end(): void {
        if (this.#run === null) {
            return;
        }
        this.#run = null;
        this.effect.end?.();
    }

    #context(ctx: EffectContext): TransitionEffectContext | null {
        const frame = this.#source.frame;
        const run = this.#run;
        if (!frame || !run) {
            return null;
        }
        return {
            ...ctx,
            from: frame.from,
            progress: frame.progress,
            holding: frame.holding,
            reverse: run.reverse,
            run,
            cut: () => this.#source.cut(),
        };
    }

    init(ctx: EffectContext): void | Promise<void> {
        return this.effect.init?.(ctx);
    }

    update(ctx: EffectContext): void {
        const frame = this.#source.frame;
        if (!frame || frame.holding) {
            return;
        }
        const transitionCtx = this.#context(ctx);
        if (transitionCtx) {
            this.effect.update?.(transitionCtx);
        }
    }

    // The run can end between this frame's enabled check and render, so pass through then.
    render(ctx: EffectContext): void {
        const transitionCtx = this.#context(ctx);
        if (transitionCtx && this.effect.render) {
            this.effect.render(transitionCtx);
        } else {
            ctx.blit(ctx.src);
        }
    }

    outputRect(dims: EffectDims): ElementRect | undefined {
        return this.#run ? this.effect.outputRect?.(dims) : undefined;
    }

    dispose(): void {
        this.effect.dispose?.();
    }
}
