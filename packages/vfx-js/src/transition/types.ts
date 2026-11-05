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
    /** The spec's uniforms. Defaults on the def are not merged in. */
    uniforms: TransitionUniforms;
    /** Seconds. */
    duration: number;
    /** The spec's overflow, if set. */
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

export type TransitionDef = {
    name: string;
    /** The `t` this transition expects. A spec's `ease` wins. Defaults to `"smoothstep"`. */
    ease?: TransitionEase;
    /**
     * Create the effects for one container, in chain order.
     * Called when a run first uses this def; runs that keep using it reuse them.
     */
    create(): TransitionEffect | TransitionEffect[];
};

export type ShaderTransitionOpts = {
    name: string;
    /** GLSL that defines `vec4 transition(vec2 uv, float t)`. */
    frag: string;
    /** Default uniforms. The spec's uniforms win. */
    uniforms?: TransitionUniforms;
    ease?: TransitionEase;
    /** Draw outside the element: `true` for the whole canvas, a number for CSS px on every side. The spec's overflow wins. */
    overflow?: true | number;
};

export type ShaderTransitionDef = Omit<TransitionDef, "create"> & {
    readonly frag: string;
    readonly uniforms: TransitionUniforms;
    readonly overflow?: true | number;
    create(): TransitionEffect;
};

export type TransitionSpec = {
    transition: TransitionDef;
    uniforms?: TransitionUniforms;
    /** Play backwards with the roles of the old and new content swapped. */
    reverse?: boolean;
    /** Seconds. */
    duration?: number;
    /** Extra room to draw outside the element. Overrides the transition's own. */
    overflow?: true | number;
    /** How `t` follows progress. Overrides the transition's own. */
    ease?: TransitionEase;
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
    /** Keep the element wrapped between runs. */
    keepWrapped?: boolean;
    waitFor?: TransitionWaitFor;
};

export type RunOpts = Partial<TransitionSpec>;

export interface Transition {
    /**
     * Change the DOM in `cb` and animate from the old content to the new.
     * `opts` can be a function, called once right after `cb` resolves.
     * Use it when the spec depends on the new content.
     */
    run(
        cb: () => void | Promise<void>,
        opts?: RunOpts | (() => RunOpts),
    ): Promise<void>;
    /** End the current run and show the live content. */
    cancel(): void;
    /** Cancel and stop tracking the element. */
    destroy(): void;
    readonly running: boolean;
}
