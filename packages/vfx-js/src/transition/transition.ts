import type { Effect } from "../types.js";
import type { VFX } from "../vfx.js";
import { Crossfade } from "./crossfade.js";
import {
    type TransitionFrame,
    TransitionSlot,
    TransitionStage,
} from "./effect.js";
import { type HistorySpecs, historySpecs } from "./history.js";
import type {
    AddTransitionOpts,
    RunOpts,
    ShowOpts,
    SlideRef,
    Transition,
    TransitionClass,
    TransitionEase,
    TransitionHandle,
    TransitionRun,
} from "./types.js";
import { sharedUATransitions, type UATransitions } from "./ua-transition.js";

const DEFAULT_DURATION = 0.6;
const MEDIA_TIMEOUT_MS = 300;
// How long to wait for a frame that never renders before cutting.
const STALL_TIMEOUT_MS = 1000;

export type ResolvedSpec = {
    transition: Transition | TransitionClass;
    /** Constructor params. Only used with a class. */
    params: unknown;
    reverse: boolean;
    duration: number;
    /** The spec's own; the transition's fills in later. */
    overflow: true | number | undefined;
    ease: TransitionEase | undefined;
};

// A run's settings with the transition in its slot.
type Bound = {
    run: TransitionRun;
    ease: TransitionEase;
    slots: TransitionSlot[];
};

/**
 * Put `top` over `base`, field by field.
 * A `top` that sets `transition` drops the base params, so they never reach another class.
 */
export function layerSpec(base: RunOpts, top: RunOpts): RunOpts {
    const params =
        top.transition !== undefined
            ? top.params
            : base.params === undefined && top.params === undefined
              ? undefined
              : { ...(base.params as object), ...(top.params as object) };
    return {
        transition: top.transition ?? base.transition,
        params,
        reverse: top.reverse ?? base.reverse,
        duration: top.duration ?? base.duration,
        overflow: top.overflow ?? base.overflow,
        ease: top.ease ?? base.ease,
    };
}

/** Put the run options over the container defaults, then fill in the rest. */
export function resolveSpec(
    opts: AddTransitionOpts,
    run: RunOpts = {},
): ResolvedSpec {
    const spec = layerSpec(opts, run);
    return {
        transition: spec.transition ?? Crossfade,
        params: spec.params,
        reverse: spec.reverse ?? false,
        duration: spec.duration ?? DEFAULT_DURATION,
        overflow: spec.overflow,
        ease: spec.ease,
    };
}

const isClass = (
    source: Transition | TransitionClass,
): source is TransitionClass => typeof source === "function";

function sameValue(a: unknown, b: unknown): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, i) => item === b[i]);
    }
    return a === b;
}

/** Shallow equal; arrays compare by item. Missing params equal empty ones. */
export function sameParams(a: unknown, b: unknown): boolean {
    const left = (a ?? {}) as Record<string, unknown>;
    const right = (b ?? {}) as Record<string, unknown>;
    const keys = Object.keys(left);
    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => key in right && sameValue(left[key], right[key]))
    );
}

// The handle that runs each instance right now.
const claims = new WeakMap<Transition, TransitionController>();

function isOnScreen(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
        rect.right > 0 &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.top < window.innerHeight
    );
}

// Lazy images off screen and `preload="none"` videos do not load on their own.
function willNotLoad(media: HTMLImageElement | HTMLVideoElement): boolean {
    if (media.tagName === "IMG") {
        return (
            (media as HTMLImageElement).loading === "lazy" && !isOnScreen(media)
        );
    }
    return (media as HTMLVideoElement).preload === "none";
}

/** Wait for pending images, videos and `fonts`, or until the timeout. */
export function waitForMedia(
    root: ParentNode,
    fonts: Promise<unknown> | undefined,
    timeoutMs = MEDIA_TIMEOUT_MS,
): Promise<void> {
    const pending: Promise<unknown>[] = [];
    for (const media of root.querySelectorAll<
        HTMLImageElement | HTMLVideoElement
    >("img, video")) {
        const isImage = media.tagName === "IMG";
        const ready = isImage
            ? (media as HTMLImageElement).complete
            : (media as HTMLVideoElement).readyState >= 2;
        if (!ready && !willNotLoad(media)) {
            pending.push(
                new Promise<void>((resolve) => {
                    const done = () => resolve();
                    media.addEventListener(
                        isImage ? "load" : "loadeddata",
                        done,
                        { once: true },
                    );
                    media.addEventListener("error", done, { once: true });
                }),
            );
        }
    }
    if (fonts) {
        pending.push(fonts);
    }
    if (pending.length === 0) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        const done = () => {
            clearTimeout(timer);
            resolve();
        };
        Promise.all(pending).then(done, done);
    });
}

export type TransitionHost = Pick<
    VFX,
    | "addHTMLWithStill"
    | "update"
    | "updateInTime"
    | "updateEffects"
    | "remove"
    | "freezeInside"
    | "lockSize"
    | "forceRender"
>;

export type TransitionStageLike = Effect &
    Pick<TransitionStage, "snapshot" | "start" | "cancel" | "cut"> & {
        readonly frame: TransitionFrame | null;
    };

// Resolves to false when the promise has not settled in time.
function settlesWithin(promise: Promise<void>, ms: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(false), ms);
        promise.then(
            () => {
                clearTimeout(timer);
                resolve(true);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            },
        );
    });
}

const nextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function sameEffects(a: readonly Effect[], b: readonly Effect[]): boolean {
    return a.length === b.length && a.every((e, i) => e === b[i]);
}

export class TransitionController implements TransitionHandle {
    #vfx: TransitionHost;
    #element: HTMLElement;
    #opts: AddTransitionOpts;
    #stage: TransitionStageLike;
    #history: HistorySpecs;
    #uaTransitions: UATransitions;
    // The browser-animated navigation this handle cut last.
    #uaCut: number | undefined;
    #keepWrapped: boolean;
    #onDestroy: (() => void) | undefined;
    #unfreezers: (() => void)[] = [];
    #unlocks: (() => void)[] = [];
    #warnedStall = false;
    #warnedLateCapture = false;
    #warnedClash = false;

    // Each run takes a new id; a run stops at its next await once it is stale.
    #seq = 0;
    #runningId: number | null = null;
    #destroyed = false;

    #wrapped = false;
    // A pending wrap or effect swap; the next one waits for it.
    #wrapping: Promise<void> | null = null;
    #chain: readonly Effect[] = [];

    // The last transition; the same instance, or the same class with equal params, reuses it.
    #cache: {
        key: {
            source: Transition | TransitionClass;
            params: unknown;
        };
        transition: Transition;
        slots: TransitionSlot[];
    } | null = null;
    // The instance this handle claimed for its run.
    #claimed: Transition | null = null;
    // The run that owns the effects right now.
    #active: { id: number; slots: TransitionSlot[] } | null = null;

    constructor(
        vfx: TransitionHost,
        element: HTMLElement,
        opts: AddTransitionOpts = {},
        onDestroy?: () => void,
        stage: TransitionStageLike = new TransitionStage(),
        history: HistorySpecs = historySpecs,
        uaTransitions: UATransitions = sharedUATransitions(),
    ) {
        this.#onDestroy = onDestroy;
        this.#vfx = vfx;
        this.#element = element;
        this.#opts = opts;
        this.#stage = stage;
        this.#history = history;
        this.#uaTransitions = uaTransitions;
        this.#keepWrapped = opts.keepWrapped ?? false;
    }

    get running(): boolean {
        return this.#runningId !== null;
    }

    show(slide: SlideRef, opts: ShowOpts = {}): Promise<void> {
        const target = this.#resolveSlide(slide);
        const { remove = false, ...runOpts } = opts;
        // A pending run may still change the slides, so only skip when idle.
        if (!this.running && this.#isOnlyShown(target)) {
            return Promise.resolve();
        }
        const slideSpec = this.#opts.slideSpec?.(target);
        const spec = slideSpec ? layerSpec(slideSpec, runOpts) : runOpts;
        return this.#start(() => {
            if (target.parentElement !== this.#element) {
                this.#element.append(target);
            }
            for (const child of Array.from(this.#element.children)) {
                if (child === target) {
                    continue;
                }
                if (remove) {
                    child.remove();
                } else {
                    (child as HTMLElement).hidden = true;
                }
            }
            target.hidden = false;
        }, spec);
    }

    #resolveSlide(slide: SlideRef): HTMLElement {
        const container = this.#element;
        const target =
            typeof slide === "number"
                ? container.children[slide]
                : typeof slide === "string"
                  ? container.querySelector(slide)
                  : slide;
        if (!target) {
            throw new TypeError(`[VFX-JS] show(): no slide for ${slide}.`);
        }
        const isChild = target.parentElement === container;
        if (!isChild && (target.isConnected || container.contains(target))) {
            throw new TypeError(
                "[VFX-JS] show(): the slide must be a direct child of the container.",
            );
        }
        return target as HTMLElement;
    }

    #isOnlyShown(target: HTMLElement): boolean {
        if (target.parentElement !== this.#element || target.hidden) {
            return false;
        }
        return Array.from(this.#element.children).every(
            (child) => child === target || (child as HTMLElement).hidden,
        );
    }

    run(
        cb: () => void | Promise<void>,
        opts: RunOpts | (() => RunOpts) = {},
    ): Promise<void> {
        // The browser already animated this navigation, so cut before the snapshot.
        const animated = this.#destroyed
            ? undefined
            : this.#uaTransitions.current();
        if (animated !== undefined && animated !== this.#uaCut) {
            this.#uaCut = animated;
            return this.#start(
                async () => {
                    await cb();
                    // Lazy opts may consume state, like a pending link spec.
                    const spec = typeof opts === "function" ? opts() : opts;
                    // Keep the history store in step for later runs.
                    if (this.#opts.autoReverse) {
                        this.#history.pick(spec);
                    }
                },
                { duration: 0 },
            );
        }
        if (!this.#opts.autoReverse) {
            return this.#start(cb, opts);
        }
        // Lazy, so the history entry has changed when the spec is picked.
        return this.#start(cb, () =>
            this.#history.pick(typeof opts === "function" ? opts() : opts),
        );
    }

    // Slides do not change history, so `show()` comes here and skips autoReverse.
    async #start(
        cb: () => void | Promise<void>,
        opts: RunOpts | (() => RunOpts),
    ): Promise<void> {
        if (this.#destroyed) {
            await cb();
            return;
        }
        const id = ++this.#seq;
        this.#runningId = id;
        try {
            await this.#run(id, cb, opts);
        } finally {
            if (this.#runningId === id) {
                this.#runningId = null;
            }
            if (this.#seq === id) {
                this.#unfreeze();
                this.#unlock();
                this.#release();
            }
        }
    }

    async #run(
        id: number,
        cb: () => void | Promise<void>,
        opts: RunOpts | (() => RunOpts),
    ): Promise<void> {
        const isCurrent = () => id === this.#seq;
        // A stale run still applies its DOM change, just without animating.
        let called = false;
        const update = async () => {
            if (!called) {
                called = true;
                await cb();
            }
        };
        const cut = async () => {
            this.#endActive();
            this.#stage.cancel();
            await update();
            if (isCurrent()) {
                if (this.#wrapped && this.#keepWrapped) {
                    await this.#vfx.update(this.#element);
                }
                this.#releaseWrap(id);
            }
        };

        // A static spec binds before the snapshot, a lazy one after `cb`.
        let bound: Bound | null = null;
        if (typeof opts !== "function") {
            bound = this.#bind(resolveSpec(this.#opts, opts));
            if (!isCurrent()) {
                return update();
            }
            if (bound === null) {
                return cut();
            }
        }

        this.#freeze();
        try {
            await this.#ensureWrapped(bound?.slots ?? null, isCurrent, true);
        } catch (err) {
            console.error(
                "[VFX-JS] transition failed to wrap the element; cutting to the new content.",
                err,
            );
            return update();
        }
        if (!isCurrent()) {
            return update();
        }
        this.#unlocks.push(this.#vfx.lockSize(this.#element));
        this.#unlocks.push(this.#vfx.forceRender(this.#element));
        const snapshotTaken = await settlesWithin(
            this.#stage.snapshot(),
            STALL_TIMEOUT_MS,
        );
        if (!isCurrent()) {
            return update();
        }
        if (!snapshotTaken) {
            this.#cutAfterStall();
            await update();
            if (isCurrent()) {
                this.#releaseWrap(id);
            }
            return;
        }

        if (bound) {
            this.#prepare(id, bound);
        }

        let lazyOpts: RunOpts | undefined;
        try {
            await update();
            if (typeof opts === "function" && isCurrent()) {
                lazyOpts = opts();
            }
        } catch (err) {
            if (isCurrent()) {
                this.#endActive();
                this.#stage.cancel();
                this.#releaseWrap(id);
            }
            throw err;
        }
        if (!isCurrent()) {
            return;
        }

        if (bound === null) {
            bound = this.#bind(resolveSpec(this.#opts, lazyOpts));
            if (!isCurrent()) {
                return;
            }
            if (bound === null) {
                return cut();
            }
            // The transition effect stays first, so the held snapshot survives the swap.
            try {
                await this.#ensureWrapped(bound.slots, isCurrent, false);
            } catch (err) {
                console.error(
                    "[VFX-JS] transition failed to swap the effects; cutting to the new content.",
                    err,
                );
                return cut();
            }
            if (!isCurrent()) {
                return;
            }
            this.#prepare(id, bound);
        }

        // New content may bring its own VFX elements.
        this.#freeze();
        try {
            await this.#waitFor();
        } catch (err) {
            console.error("[VFX-JS] transition waitFor failed:", err);
        }
        if (!isCurrent()) {
            return;
        }
        const captured = await this.#vfx.updateInTime(this.#element);
        if (!captured && !this.#warnedLateCapture) {
            this.#warnedLateCapture = true;
            console.warn(
                "[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.",
            );
        }
        if (!isCurrent()) {
            return;
        }
        await nextFrame();
        if (!isCurrent()) {
            return;
        }

        const started = this.#stage.start({
            duration: bound.run.duration,
            ease: bound.ease,
            onEnd: () => this.#endActive(id),
        });
        const ended = await settlesWithin(
            started,
            bound.run.duration * 1000 + STALL_TIMEOUT_MS,
        );
        if (!isCurrent()) {
            return;
        }
        if (!ended) {
            this.#cutAfterStall();
        }
        this.#releaseWrap(id);
    }

    // Get the transition in its slot. Null means cut: no duration, a failed constructor, or a busy instance.
    #bind(spec: ResolvedSpec): Bound | null {
        if (spec.duration <= 0) {
            return null;
        }
        const source = spec.transition;
        if (!isClass(source) && !this.#claim(source)) {
            return null;
        }
        let transition: Transition;
        let slots: TransitionSlot[];
        try {
            ({ transition, slots } = this.#slotsOf(source, spec.params));
        } catch (err) {
            console.error(
                `[VFX-JS] transition "${source.name}" constructor failed; cutting to the new content.`,
                err,
            );
            return null;
        }
        const run: TransitionRun = {
            reverse: spec.reverse,
            duration: spec.duration,
        };
        const overflow = spec.overflow ?? transition.overflow;
        if (overflow !== undefined) {
            run.overflow = overflow;
        }
        const ease = spec.ease ?? transition.ease ?? "smoothstep";
        return { run, ease, slots };
    }

    // False when another live handle runs this instance.
    #claim(transition: Transition): boolean {
        const owner = claims.get(transition);
        if (owner && owner !== this) {
            if (!this.#warnedClash) {
                this.#warnedClash = true;
                console.warn(
                    `[VFX-JS] transition "${transition.name ?? "unnamed"}" instance is running in another container; cutting to the new content. Pass the class to share it.`,
                );
            }
            return false;
        }
        if (this.#claimed !== transition) {
            this.#release();
        }
        claims.set(transition, this);
        this.#claimed = transition;
        return true;
    }

    #release(): void {
        const claimed = this.#claimed;
        this.#claimed = null;
        if (claimed && claims.get(claimed) === this) {
            claims.delete(claimed);
        }
    }

    // Hand the effects to this run.
    #prepare(id: number, { run, slots }: Bound): void {
        this.#endActive();
        this.#active = { id, slots };
        for (const slot of slots) {
            slot.start(run);
        }
    }

    // The element stopped rendering, so the effect never resolves.
    #cutAfterStall(): void {
        if (!this.#warnedStall) {
            this.#warnedStall = true;
            console.warn(
                "[VFX-JS] transition target did not render in time; cutting to the new content.",
            );
        }
        this.#endActive();
        this.#stage.cancel();
    }

    cancel(): void {
        const id = ++this.#seq;
        this.#runningId = null;
        this.#endActive();
        this.#stage.cancel();
        this.#unfreeze();
        this.#unlock();
        this.#release();
        this.#releaseWrap(id);
    }

    destroy(): void {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;
        this.cancel();
        // The chain disposes the effects when the element is removed.
        this.#cache = null;
        this.#onDestroy?.();
    }

    #freeze(): void {
        this.#unfreezers.push(this.#vfx.freezeInside(this.#element));
    }

    #unlock(): void {
        const unlocks = this.#unlocks;
        this.#unlocks = [];
        for (const unlock of unlocks) {
            unlock();
        }
    }

    #unfreeze(): void {
        const unfreezers = this.#unfreezers;
        this.#unfreezers = [];
        for (const unfreeze of unfreezers) {
            unfreeze();
        }
    }

    // A new transition's slots replace the old ones; the chain disposes the ones it drops.
    #slotsOf(
        source: Transition | TransitionClass,
        params: unknown,
    ): { transition: Transition; slots: TransitionSlot[] } {
        const cache = this.#cache;
        if (
            cache?.key.source === source &&
            (!isClass(source) || sameParams(cache.key.params, params))
        ) {
            return cache;
        }
        // Params are checked against the class where the spec is written.
        const transition = isClass(source)
            ? new (source as TransitionClass<unknown>)(params)
            : source;
        const slots = [new TransitionSlot(transition, this.#stage)];
        this.#cache = { key: { source, params }, transition, slots };
        return { transition, slots };
    }

    #endActive(id?: number): void {
        const active = this.#active;
        if (active && (id === undefined || active.id === id)) {
            this.#active = null;
            for (const slot of active.slots) {
                slot.end();
            }
        }
    }

    // Wrap the element, or sync the chain and optionally take a fresh capture.
    // Null `slots` keeps the effects already in the chain.
    async #ensureWrapped(
        slots: readonly Effect[] | null,
        isCurrent: () => boolean,
        recapture: boolean,
    ): Promise<void> {
        if (this.#wrapping) {
            await this.#wrapping;
        }
        // A newer run owns the chain now.
        if (!isCurrent()) {
            return;
        }
        const chain =
            slots !== null
                ? [this.#stage, ...slots]
                : this.#wrapped
                  ? this.#chain
                  : [this.#stage];
        if (!this.#wrapped) {
            const wrapping = this.#vfx
                .addHTMLWithStill(this.#element, { effect: chain })
                .then(() => {
                    this.#wrapped = true;
                    this.#chain = chain;
                })
                .finally(() => {
                    this.#wrapping = null;
                });
            this.#wrapping = wrapping;
            await wrapping;
            return;
        }
        if (!sameEffects(chain, this.#chain)) {
            this.#chain = chain;
            // The chain disposes the effects it drops.
            const swapping = this.#vfx
                .updateEffects(this.#element, chain)
                .finally(() => {
                    this.#wrapping = null;
                });
            this.#wrapping = swapping;
            await swapping;
        }
        if (recapture) {
            await this.#vfx.update(this.#element);
        }
    }

    // Unwrap once any pending wrap lands, unless a newer run took over.
    #releaseWrap(id: number): void {
        if (this.#keepWrapped && !this.#destroyed) {
            return;
        }
        const unwrap = () => {
            if (id !== this.#seq || !this.#wrapped) {
                return;
            }
            this.#wrapped = false;
            this.#chain = [];
            this.#vfx.remove(this.#element);
        };
        if (this.#wrapping) {
            this.#wrapping.then(unwrap, () => {});
        } else {
            unwrap();
        }
    }

    #waitFor(): Promise<void> {
        const waitFor = this.#opts.waitFor ?? "media";
        if (waitFor === "none") {
            return Promise.resolve();
        }
        if (waitFor === "media") {
            return waitForMedia(this.#element, document.fonts?.ready);
        }
        return waitFor(this.#element);
    }
}
