import type {
    Effect,
    EffectContext,
    EffectRenderTarget,
    EffectTexture,
    EffectUniformValue,
} from "../types.js";

/** Numbers, vectors and arrays; no textures. */
export type TransitionUniforms = Record<
    string,
    Exclude<EffectUniformValue, EffectTexture | EffectRenderTarget>
>;

/** How `t` follows linear progress. A function maps 0..1 progress to `t`. */
export type TransitionEase = "smoothstep" | "linear" | ((x: number) => number);

/** One run of a transition, passed to `TransitionEffect.start`. */
export type TransitionRun = {
    reverse: boolean;
    /** Seconds. */
    duration: number;
    /** The spec's overflow, else the transition's own, if set. */
    overflow?: true | number;
};

/** `x` is linear progress, `t` the eased one. Both go from 0 to 1 and ignore `reverse`. */
export type TransitionProgress = { readonly t: number; readonly x: number };

/** The effect context during a run. */
export type TransitionEffectContext = EffectContext & {
    /** The snapshot of the old content, element-sized. */
    readonly from: EffectRenderTarget;
    readonly progress: TransitionProgress;
    /** True while the old content is held, before the animation. `progress` is zero then. */
    readonly holding: boolean;
    readonly reverse: boolean;
    readonly run: TransitionRun;
    /** End the run now and show the new content, e.g. when a shader fails. */
    cut(): void;
};

/**
 * An effect that takes part in a run.
 * Outside a run it is skipped and the chain passes its input through.
 * `render` also runs while the old content is held (`ctx.holding`); pass the input through then unless you need those frames.
 * `update` runs only while the animation plays.
 */
export interface TransitionEffect extends Effect {
    /** Called once per run while the old content is held, before the first frame. */
    start?(run: TransitionRun): void;
    /** Called once when the run ends, is dropped or is cancelled. */
    end?(): void;
    update?(ctx: TransitionEffectContext): void;
    render?(ctx: TransitionEffectContext): void;
}

/** A transition: one effect plus the defaults a spec can override. Write it as a class. */
export interface Transition extends TransitionEffect {
    readonly name?: string;
    /** The `t` this transition expects. A spec's `ease` wins. Defaults to `"smoothstep"`. */
    ease?: TransitionEase;
    /** Draw outside the element: `true` for the whole canvas, a number for CSS px on every side. A spec's `overflow` wins. */
    overflow?: true | number;
}

/** A transition class. Core makes one instance per container with `new Class(params)`. */
export type TransitionClass<P = never> = new (params?: P) => Transition;

// A class's constructor params, or `unknown` when the class is not known.
type ParamsOf<T> =
    T extends TransitionClass<infer P>
        ? [P] extends [never]
            ? unknown
            : P
        : never;

export type TransitionSpec<
    T extends Transition | TransitionClass = Transition | TransitionClass,
> = {
    /** A class, or an instance to use as is. An instance runs in one container at a time. */
    transition: T;
    /** Constructor params. Only with a class. */
    params?: ParamsOf<T>;
    /** Play backwards with the roles of the old and new content swapped. */
    reverse?: boolean;
    /** Seconds. */
    duration?: number;
    /** Extra room to draw outside the element. Overrides the transition's own. */
    overflow?: true | number;
    /** How `t` follows progress. Overrides the transition's own. */
    ease?: TransitionEase;
    /**
     * Keep capturing the old content during the run, so its animations and videos keep playing.
     * Hand the old nodes over with `ctx.keepPrev()` in the `run()` callback; `show()` does it for you.
     * Default false.
     */
    liveFrom?: boolean;
};

/**
 * What to wait for after the DOM changes, before the new content is captured.
 * `"media"` waits for pending images, videos and fonts, up to about 300 ms.
 */
export type TransitionWaitFor =
    | "media"
    | "none"
    | ((element: HTMLElement) => Promise<void>);

export type AddTransitionOpts<
    T extends Transition | TransitionClass = Transition | TransitionClass,
> = Partial<TransitionSpec<T>> & {
    /** Keep the element wrapped between runs. */
    keepWrapped?: boolean;
    waitFor?: TransitionWaitFor;
    /**
     * On back, play the spec that entered the page, reversed. On forward, play it again.
     * Needs the Navigation API. `show()` ignores it.
     */
    autoReverse?: boolean;
    /**
     * How a slide enters with `show()`.
     * Its fields go over the container's; `show()` opts go over it.
     */
    slideSpec?: (slide: HTMLElement) => RunOpts | undefined;
};

export type RunOpts<
    T extends Transition | TransitionClass = Transition | TransitionClass,
> = Partial<TransitionSpec<T>>;

/** Passed to the `run()` callback. */
export type RunContext = {
    /**
     * Hand the old nodes over before you drop them, so `liveFrom` can keep them playing.
     * VFX-JS moves them into a hidden canvas and removes them when the run ends.
     * No-op unless the run may use `liveFrom`.
     * With function opts it keeps them until the spec is known.
     */
    keepPrev(nodes: Node | Iterable<Node>): void;
};

/** A direct child of the container, its index, or a selector inside it. */
export type SlideRef = HTMLElement | number | string;

export type ShowOpts<
    T extends Transition | TransitionClass = Transition | TransitionClass,
> = RunOpts<T> & {
    /** Remove the slides it hides instead of hiding them. Default false. */
    remove?: boolean;
};

/** Controls the transitions of one element. */
export interface TransitionHandle {
    /**
     * Show one slide and hide the other direct children, with a run.
     * A detached element is appended first.
     * Throws a `TypeError` when `slide` is not a direct child.
     * Resolves at once when the slide is already the only one shown and no run is in flight.
     */
    show<T extends Transition | TransitionClass>(
        slide: SlideRef,
        opts?: ShowOpts<T>,
    ): Promise<void>;
    /**
     * Change the DOM in `cb` and animate from the old content to the new.
     * `opts` can be a function, called once right after `cb` resolves.
     * Use it when the spec depends on the new content.
     * With `liveFrom`, call `ctx.keepPrev()` in `cb` before you drop the old nodes.
     */
    run<T extends Transition | TransitionClass>(
        cb: (ctx: RunContext) => void | Promise<void>,
        opts?: RunOpts<T> | (() => RunOpts<T>),
    ): Promise<void>;
    /** End the current run and show the live content. */
    cancel(): void;
    /** Cancel and stop tracking the element. */
    destroy(): void;
    readonly running: boolean;
}
