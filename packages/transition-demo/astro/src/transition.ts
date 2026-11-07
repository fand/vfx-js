import {
    swapFunctions,
    type TransitionBeforePreparationEvent,
    type TransitionBeforeSwapEvent,
} from "astro:transitions/client";
import { type RunOpts, VFX } from "@vfx-js/core";
import { presets } from "@vfx-js/transition-demo-shared/transitions";
import { Swipe } from "@vfx-js/transitions";

const back = { transition: Swipe, reverse: true };

// Wire core `run(cb)` to Astro ClientRouter by hand.
// `run` snapshots the old page before `cb`, so the router waits for the
// snapshot in `before-preparation`, and `cb` waits for the swap.
// The swap only replaces `<nav>` and `<main>`, so the VFX canvas and the
// transition target stay in the document.
export function setupTransition() {
    const vfx = new VFX();
    const outlet = document.querySelector<HTMLElement>("main.outlet");
    if (!outlet) {
        return;
    }
    const t = vfx.addTransition(outlet, {
        duration: 0.8,
    });

    let finishSwap: (() => void) | null = null;
    const releaseSwap = () => {
        finishSwap?.();
        finishSwap = null;
    };

    document.addEventListener("astro:before-preparation", (e) => {
        const ev = e as TransitionBeforePreparationEvent;
        const load = ev.loader;
        ev.loader = async () => {
            await load();
            // A newer navigation drops this one, so free its run.
            releaseSwap();
            ev.signal.addEventListener("abort", releaseSwap);
            const name = ev.sourceElement?.getAttribute("data-transition");
            const preset = name
                ? presets[name as keyof typeof presets]
                : undefined;
            const opts: RunOpts =
                ev.direction === "back"
                    ? back
                    : preset
                      ? { transition: preset }
                      : {};
            await new Promise<void>((snapshotTaken) => {
                t.run(() => {
                    snapshotTaken();
                    return new Promise<void>((done) => {
                        finishSwap = done;
                    });
                }, opts).catch((err) => console.error(err));
            });
        };
    });

    document.addEventListener("astro:before-swap", (e) => {
        const ev = e as TransitionBeforeSwapEvent;
        ev.swap = () => {
            const doc = ev.newDocument;
            // Same as Astro's swap, except the body.
            swapFunctions.deselectScripts(doc);
            swapFunctions.swapRootAttributes(doc);
            swapFunctions.swapHeadElements(doc);
            const restoreFocus = swapFunctions.saveFocus();
            const nav = doc.querySelector("nav.nav");
            const main = doc.querySelector("main.outlet");
            if (nav) {
                document
                    .querySelector("nav.nav")
                    ?.replaceChildren(...nav.childNodes);
            }
            if (main) {
                outlet.replaceChildren(...main.childNodes);
            }
            restoreFocus();
            releaseSwap();
        };
    });
}
