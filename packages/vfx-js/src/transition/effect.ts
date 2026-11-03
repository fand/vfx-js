import type { Effect, EffectContext, EffectRenderTarget } from "../types.js";
import { describeGlslError } from "./glsl.js";
import type { TransitionUniforms } from "./types.js";

export type TransitionStartOpts = {
    /** For error messages. */
    name?: string;
    /** Full shader, see `buildFrag`. */
    frag: string;
    uniforms?: TransitionUniforms;
    /** Seconds. */
    duration: number;
    /** Play backwards with the roles of the old and new content swapped. */
    reverse: boolean;
    /** Per-frame hook. `t` is eased, `x` linear, `dt` in seconds. */
    onFrame?(t: number, x: number, dt: number): void;
    /** Called once when this run finishes or is replaced. */
    onEnd?(): void;
};

const smoothstep = (x: number) => x * x * (3 - 2 * x);

/**
 * One effect per transition target. States:
 * - idle: disabled, the chain passes the capture through.
 * - hold: shows the snapshot of the old content while the new one is captured.
 * - running: mixes the snapshot (`from`) and the live capture (`src`).
 */
export class TransitionEffect implements Effect {
    enabled = false;

    #from: EffectRenderTarget | null = null;
    #snapshotWaiters: (() => void)[] = [];
    #hold = false;
    #spec: TransitionStartOpts | null = null;
    #startTime: number | null = null;
    #onEnd: (() => void) | null = null;

    #endHook: (() => void) | null = null;
    /** Shaders that failed to compile; later runs with them cut straight to the new content. */
    #broken = new Set<string>();

    /** End the current run: call its `onEnd` and settle the promise from `start()`. */
    #end(): void {
        const hook = this.#endHook;
        this.#endHook = null;
        hook?.();
        const resolve = this.#onEnd;
        this.#onEnd = null;
        resolve?.();
    }

    init(ctx: EffectContext): void {
        this.#from = ctx.createRenderTarget();
    }

    /** Copy the current capture into `from` on the next frame and hold it on screen. */
    snapshot(): Promise<void> {
        this.#end();
        this.enabled = true;
        return new Promise((resolve) => this.#snapshotWaiters.push(resolve));
    }

    /** Resolves when the transition ends or another one replaces it. */
    start(spec: TransitionStartOpts): Promise<void> {
        this.#end();
        this.#spec = spec;
        this.#endHook = spec.onEnd ?? null;
        this.#startTime = null;
        this.#hold = false;
        this.enabled = true;
        return new Promise((resolve) => {
            this.#onEnd = resolve;
        });
    }

    /** Stop any transition and pass the capture through. */
    cancel(): void {
        this.#end();
        this.#spec = null;
        this.#hold = false;
        if (this.#snapshotWaiters.length === 0) {
            this.enabled = false;
        }
    }

    get running(): boolean {
        return this.#spec !== null;
    }

    render(ctx: EffectContext): void {
        const from = this.#from;
        if (!from) {
            ctx.blit(ctx.src);
            return;
        }

        if (this.#snapshotWaiters.length > 0) {
            ctx.blit(ctx.src, from);
            this.#spec = null;
            this.#hold = true;
            const waiters = this.#snapshotWaiters;
            this.#snapshotWaiters = [];
            for (const w of waiters) {
                w();
            }
        }

        const spec = this.#spec;
        if (spec) {
            if (this.#startTime === null) {
                this.#startTime = ctx.time;
            }
            const x =
                spec.duration > 0
                    ? (ctx.time - this.#startTime) / spec.duration
                    : 1;
            const t = smoothstep(Math.min(Math.max(x, 0), 1));
            if (x >= 1 || this.#broken.has(spec.frag)) {
                this.#spec = null;
                this.enabled = false;
                ctx.blit(ctx.src);
                this.#end();
                return;
            }
            spec.onFrame?.(t, Math.max(x, 0), ctx.deltaTime);
            try {
                this.#draw(ctx, spec, from, t);
            } catch (e) {
                this.#broken.add(spec.frag);
                const name = spec.name ?? "?";
                const lines = describeGlslError(e);
                if (lines) {
                    console.error(
                        `[VFX-JS] transition "${name}" failed to compile; cutting to the new content.\n  ${lines.join("\n  ")}`,
                    );
                    console.debug(e);
                } else {
                    console.error(
                        `[VFX-JS] transition "${name}" failed; cutting to the new content.`,
                        e,
                    );
                }
                this.#spec = null;
                this.enabled = false;
                ctx.blit(ctx.src);
                this.#end();
            }
            return;
        }

        if (this.#hold) {
            ctx.blit(from);
            return;
        }

        this.enabled = false;
        ctx.blit(ctx.src);
    }

    #draw(
        ctx: EffectContext,
        spec: TransitionStartOpts,
        from: EffectRenderTarget,
        t: number,
    ): void {
        ctx.draw({
            frag: spec.frag,
            uniforms: {
                ...spec.uniforms,
                from,
                src: ctx.src,
                t,
                reverse: spec.reverse ? 1 : 0,
                resolution: [
                    ctx.dims.elementPixel[0],
                    ctx.dims.elementPixel[1],
                ],
                time: ctx.time,
            },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#from = null;
        this.#end();
        for (const w of this.#snapshotWaiters) {
            w();
        }
        this.#snapshotWaiters = [];
    }
}
