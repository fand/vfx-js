import type { Effect } from "../types.js";
import type { VFX } from "../vfx.js";
import { crossfade } from "./crossfade.js";
import {
    type TransitionFrame,
    TransitionSlot,
    TransitionStage,
} from "./effect.js";
import type {
    AddTransitionOpts,
    RunOpts,
    Transition,
    TransitionDef,
    TransitionEase,
    TransitionRun,
    TransitionUniforms,
} from "./types.js";

const DEFAULT_DURATION = 0.6;
const MEDIA_TIMEOUT_MS = 300;
// How long to wait for a frame that never renders before cutting.
const STALL_TIMEOUT_MS = 1000;

export type ResolvedSpec = {
    transition: TransitionDef;
    uniforms: TransitionUniforms;
    reverse: boolean;
    duration: number;
    overflow: true | number | undefined;
    ease: TransitionEase;
};

// A resolved spec with the def's effects in their slots.
type Bound = { spec: ResolvedSpec; slots: TransitionSlot[] };

/**
 * Pick the run options, then the named type, then the container defaults.
 * Uniforms come with the shader from the first level that sets `transition`.
 */
export function resolveSpec(
    opts: AddTransitionOpts,
    run: RunOpts = {},
): ResolvedSpec {
    const typed = run.type !== undefined ? opts.types?.[run.type] : undefined;
    const shader =
        [run, typed].find((spec) => spec?.transition !== undefined) ?? opts;
    const transition = shader.transition ?? crossfade;
    return {
        transition,
        uniforms: shader.uniforms ?? {},
        reverse: run.reverse ?? typed?.reverse ?? opts.reverse ?? false,
        duration:
            run.duration ??
            typed?.duration ??
            opts.duration ??
            DEFAULT_DURATION,
        overflow: run.overflow ?? typed?.overflow ?? opts.overflow,
        ease:
            run.ease ??
            typed?.ease ??
            opts.ease ??
            transition.ease ??
            "smoothstep",
    };
}

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

export class TransitionController implements Transition {
    #vfx: TransitionHost;
    #element: HTMLElement;
    #opts: AddTransitionOpts;
    #stage: TransitionStageLike;
    #keepWrapped: boolean;
    #onDestroy: (() => void) | undefined;
    #unfreezers: (() => void)[] = [];
    #unlocks: (() => void)[] = [];
    #warnedStall = false;
    #warnedLateCapture = false;

    // Each run takes a new id; a run stops at its next await once it is stale.
    #seq = 0;
    #runningId: number | null = null;
    #destroyed = false;

    #wrapped = false;
    // A pending wrap or effect swap; the next one waits for it.
    #wrapping: Promise<void> | null = null;
    #chain: readonly Effect[] = [];

    // The last def's effects; the same def again reuses them.
    #cache: { def: TransitionDef; slots: TransitionSlot[] } | null = null;
    // The run that owns the effects right now.
    #active: { id: number; slots: TransitionSlot[] } | null = null;

    constructor(
        vfx: TransitionHost,
        element: HTMLElement,
        opts: AddTransitionOpts = {},
        onDestroy?: () => void,
        stage: TransitionStageLike = new TransitionStage(),
    ) {
        this.#onDestroy = onDestroy;
        this.#vfx = vfx;
        this.#element = element;
        this.#opts = opts;
        this.#stage = stage;
        this.#keepWrapped = opts.keepWrapped ?? false;
    }

    get running(): boolean {
        return this.#runningId !== null;
    }

    async run(
        cb: () => void | Promise<void>,
        opts: RunOpts | (() => RunOpts) = {},
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

        const { spec } = bound;
        const started = this.#stage.start({
            duration: spec.duration,
            ease: spec.ease,
            onEnd: () => this.#endActive(id),
        });
        const ended = await settlesWithin(
            started,
            spec.duration * 1000 + STALL_TIMEOUT_MS,
        );
        if (!isCurrent()) {
            return;
        }
        if (!ended) {
            this.#cutAfterStall();
        }
        this.#releaseWrap(id);
    }

    // Get the def's effects. Null means cut: no duration, or create() failed.
    #bind(spec: ResolvedSpec): Bound | null {
        if (spec.duration <= 0) {
            return null;
        }
        const def = spec.transition;
        try {
            return { spec, slots: this.#slotsOf(def) };
        } catch (err) {
            console.error(
                `[VFX-JS] transition "${def.name}" create() failed; cutting to the new content.`,
                err,
            );
            return null;
        }
    }

    // Hand the effects to this run.
    #prepare(id: number, { spec, slots }: Bound): void {
        this.#endActive();
        this.#active = { id, slots };
        const run: TransitionRun = {
            reverse: spec.reverse,
            uniforms: spec.uniforms,
            duration: spec.duration,
        };
        if (spec.overflow !== undefined) {
            run.overflow = spec.overflow;
        }
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

    #slotsOf(def: TransitionDef): TransitionSlot[] {
        if (this.#cache?.def === def) {
            return this.#cache.slots;
        }
        const slots = [def.create()]
            .flat()
            .map((effect) => new TransitionSlot(effect, this.#stage));
        this.#cache = { def, slots };
        return slots;
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
