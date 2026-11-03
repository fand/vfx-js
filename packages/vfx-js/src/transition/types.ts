import type { Effect } from "../types.js";

export type TransitionUniforms = Record<string, number | [number, number]>;

/** One run of a transition, passed to the driver hooks. */
export type TransitionRun = {
    reverse: boolean;
    uniforms: TransitionUniforms;
    /** Seconds. */
    duration: number;
};

export type TransitionDef = {
    name: string;
    /** GLSL that defines `vec4 transition(vec2 uv, float t)`. See `PRELUDE`. */
    frag: string;

    // Optional JS driver for transitions built on extra effects.

    /**
     * Extra effects placed after the transition effect in the chain.
     * Created once per transition object and kept for its lifetime.
     * They must pass through (disabled) until `prepare`.
     */
    effects?(): Promise<Effect[]>;
    /** Called while the old content is held on screen, before the DOM changes. */
    prepare?(run: TransitionRun, fx: Effect[]): void;
    /** Called every frame while running. `t` is eased, `x` is linear, both 0..1. `dt` is seconds. */
    onFrame?(t: number, x: number, dt: number, fx: Effect[]): void;
    /** Called once when the run ends or is replaced. Must leave `fx` passing through. */
    onEnd?(fx: Effect[]): void;
};

export type TransitionSpec = {
    transition: TransitionDef;
    uniforms?: TransitionUniforms;
    /** Play backwards with the roles of the old and new content swapped. */
    reverse?: boolean;
    /** Seconds. */
    duration?: number;
};

/**
 * What to wait for after the DOM changes, before the new content is captured.
 * `"media"` waits for pending images, videos and fonts, up to about a second.
 */
export type TransitionWaitFor =
    | "media"
    | "none"
    | ((element: HTMLElement) => Promise<void>);

export type AddTransitionOpts = Partial<TransitionSpec> & {
    /** Specs picked by `run(cb, { type })`. */
    types?: Record<string, TransitionSpec>;
    /** Persistent effects placed after the transition in the chain. */
    effects?: Effect[];
    /** Keep the element wrapped between runs. Forced on when `effects` is not empty. */
    keepWrapped?: boolean;
    waitFor?: TransitionWaitFor;
};

export type RunOpts = Partial<TransitionSpec> & {
    type?: string;
};

export interface Transition {
    /** Change the DOM in `cb` and animate from the old content to the new. */
    run(cb: () => void | Promise<void>, opts?: RunOpts): Promise<void>;
    /** End the current run and show the live content. */
    cancel(): void;
    /** Cancel and stop tracking the element. */
    destroy(): void;
    readonly running: boolean;
}
