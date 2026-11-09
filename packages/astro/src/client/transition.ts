import type { AddTransitionOpts, TransitionHandle } from "@vfx-js/core";
import { fromTransitionAttr, pickRunOpts } from "./props";
import { type SwapFunctions, swapKeepingTarget, TARGET_ATTR } from "./swap";
import { getVFX } from "./vfx";

const LOG_PREFIX = "[@vfx-js/astro]";
const LINK_ATTR = "data-vfx-transition";
const PAGE_META = 'meta[name="vfx-transition-in"]';
// Astro's ClientRouter puts this in the head of each page it handles.
const ROUTER_META = 'meta[name="astro-view-transitions-enabled"]';

declare global {
    interface Window {
        __vfxAstroTransition?: { uninstall(): void };
    }
}

// The parts of Astro's router events we use.
type PreparationEvent = Event & {
    loader: () => Promise<void>;
    sourceElement?: Element;
    newDocument: Document;
    direction: string;
    signal: AbortSignal;
};
type SwapEvent = Event & {
    newDocument: Document;
    swap: () => void;
};

export type TransitionDeps = {
    /** `swapFunctions` from `astro:transitions/client`. */
    swapFunctions: SwapFunctions;
};

type Bound = {
    target: HTMLElement;
    handle: TransitionHandle;
    // Core reads this on each run, so the target's attribute applies to the next run.
    live: AddTransitionOpts;
};

function readOpts(target: HTMLElement, live: AddTransitionOpts): void {
    const opts = fromTransitionAttr(target.getAttribute(TARGET_ATTR) ?? "{}");
    for (const key of Object.keys(live)) {
        delete live[key as keyof AddTransitionOpts];
    }
    Object.assign(live, opts);
}

function specFrom(attr: string | null | undefined) {
    return attr ? fromTransitionAttr(attr) : null;
}

function createTransitionRuntime(deps: TransitionDeps) {
    let bound: Bound | null = null;
    // Resolves the held run once the new page is in.
    let hold: (() => void) | null = null;
    const release = () => {
        hold?.();
        hold = null;
    };

    const unbind = () => {
        bound?.handle.destroy();
        bound = null;
    };

    const bind = (): Bound | null => {
        // Core may put a still copy of the target in the page during a run.
        // Keep the live one rather than look it up again.
        if (bound?.target.isConnected) {
            return bound;
        }
        const target = document.querySelector<HTMLElement>(`[${TARGET_ATTR}]`);
        unbind();
        const vfx = getVFX();
        if (!target || !vfx) {
            return null;
        }
        const live: AddTransitionOpts = {};
        readOpts(target, live);
        bound = { target, live, handle: vfx.addTransition(target, live) };
        return bound;
    };

    const onPreparation = (e: Event) => {
        const ev = e as PreparationEvent;
        const load = ev.loader;
        ev.loader = async () => {
            await load();
            // A newer navigation drops the previous one.
            release();
            const current = bind();
            if (!current || ev.signal.aborted) {
                return;
            }
            readOpts(current.target, current.live);
            const opts = pickRunOpts(
                specFrom(ev.sourceElement?.getAttribute(LINK_ATTR)),
                specFrom(
                    ev.newDocument
                        .querySelector(PAGE_META)
                        ?.getAttribute("content"),
                ),
            );

            const swapped = new Promise<void>((resolve) => {
                hold = resolve;
            });
            const held = hold;
            ev.signal.addEventListener("abort", () => {
                if (hold === held) {
                    release();
                }
            });
            // Let Astro go on once the old page is captured.
            await new Promise<void>((snapshotTaken) => {
                current.handle
                    .run(() => {
                        snapshotTaken();
                        return swapped;
                    }, opts)
                    .catch((err) => {
                        console.error(`${LOG_PREFIX} transition failed:`, err);
                    })
                    .finally(snapshotTaken);
            });
        };
    };

    const onSwap = (e: Event) => {
        const ev = e as SwapEvent;
        const target = bound?.target;
        if (!target?.isConnected) {
            const swap = ev.swap;
            ev.swap = () => {
                swap();
                release();
            };
            return;
        }
        ev.swap = () => {
            const kept = swapKeepingTarget(
                ev.newDocument,
                target,
                getVFX()?.canvas ?? null,
                deps.swapFunctions,
            );
            release();
            if (!kept) {
                unbind();
            }
        };
    };

    document.addEventListener("astro:before-preparation", onPreparation);
    document.addEventListener("astro:before-swap", onSwap);
    // Make the VFX now, so the first navigation does not wait for it.
    bind();

    return {
        uninstall() {
            document.removeEventListener(
                "astro:before-preparation",
                onPreparation,
            );
            document.removeEventListener("astro:before-swap", onSwap);
            release();
            unbind();
        },
    };
}

let warned = false;

/**
 * Animate ClientRouter navigations on the `<VFXTransition>` target.
 * Safe to call more than once. Does nothing without `<ClientRouter>`.
 */
export function installTransition(deps: TransitionDeps): void {
    if (typeof window === "undefined" || window.__vfxAstroTransition) {
        return;
    }
    if (!document.querySelector(ROUTER_META)) {
        if (!warned) {
            warned = true;
            console.warn(
                `${LOG_PREFIX} <VFXTransition> needs <ClientRouter /> from astro:transitions. Without it each link reloads the page, so nothing is animated.`,
            );
        }
        return;
    }
    window.__vfxAstroTransition = createTransitionRuntime(deps);
}

/** Stop animating navigations. */
export function uninstallTransition(): void {
    window.__vfxAstroTransition?.uninstall();
    delete window.__vfxAstroTransition;
}
