import type { ElementRect } from "../rect.js";
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
} from "../types.js";
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
    /** Draw outside the element: `true` for the whole canvas, a number for CSS px on every side. */
    overflow?: true | number;
    /** Per-frame hook. `t` is eased, `x` linear, `dt` in seconds. */
    onFrame?(t: number, x: number, dt: number): void;
    /** Called once when this run finishes or is replaced. */
    onEnd?(): void;
};

const smoothstep = (x: number) => x * x * (3 - 2 * x);

function covers(outer: ElementRect, inner: ElementRect): boolean {
    const [x, y, w, h] = outer;
    const [innerX, innerY, innerW, innerH] = inner;
    return (
        x <= innerX &&
        y <= innerY &&
        x + w >= innerX + innerW &&
        y + h >= innerY + innerH
    );
}

// Like blit, but transparent outside the element when the stage is larger.
const PASSTHROUGH_FRAG = `#version 300 es
precision highp float;
in vec2 uvContent;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
  bool inside = all(greaterThanEqual(uvContent, vec2(0.0))) && all(lessThanEqual(uvContent, vec2(1.0)));
  outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`;

/**
 * One effect per transition target. States:
 * - idle: disabled, the chain passes the capture through.
 * - hold: shows the snapshot of the old content while the new one is captured.
 * - running: mixes the snapshot (`from`) and the live capture (`src`).
 */
export class TransitionEffect implements Effect {
    enabled = false;

    #from: EffectRenderTarget | null = null;
    #fromSize: readonly [number, number] = [0, 0];
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
        this.#endHook = spec.onEnd ?? null;
        this.#startTime = null;
        this.#hold = false;
        this.enabled = true;
        return new Promise((resolve) => {
            this.#onEnd = resolve;
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

    get running(): boolean {
        return this.#spec !== null;
    }

    // Only a running transition grows the stage, so the snapshot and hold stay element-sized.
    outputRect(dims: EffectDims): ElementRect | undefined {
        const overflow = this.#spec?.overflow;
        if (
            overflow === undefined ||
            this.#snapshotWaiters.length > 0 ||
            covers(dims.contentRect, dims.canvasRect)
        ) {
            return undefined;
        }
        if (overflow === true) {
            return dims.canvasRect;
        }
        const pad = overflow * dims.pixelRatio;
        const [x, y, w, h] = dims.contentRect;
        return [x - pad, y - pad, w + pad * 2, h + pad * 2];
    }

    #passthrough(ctx: EffectContext): void {
        ctx.draw({
            frag: PASSTHROUGH_FRAG,
            uniforms: { src: ctx.src },
            target: ctx.target,
        });
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
            this.#spec = null;
            this.#hold = true;
            this.#resolveSnapshotWaiters();
        }

        const from = this.#from;
        if (!from) {
            this.#passthrough(ctx);
            return;
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
                this.#passthrough(ctx);
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
                this.#passthrough(ctx);
                this.#end();
            }
            return;
        }

        if (this.#hold) {
            ctx.blit(from);
            return;
        }

        this.enabled = false;
        this.#passthrough(ctx);
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
        this.#fromSize = [0, 0];
        this.#end();
        this.#resolveSnapshotWaiters();
    }
}
