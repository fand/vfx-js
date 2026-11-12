import type { RouterContext } from "./base.js";

/** A Vue transition that hands the leaving page to core and ends when core gives it back. */
export type KeepingTransition = {
    css: false;
    mode: "default";
    onLeave(el: Element, done: () => void): void;
};

const transitions = new WeakMap<RouterContext, KeepingTransition>();

/** The page transition for `ctx`. The same object on each render, so Vue sees no change. */
export function keepingTransition(ctx: RouterContext): KeepingTransition {
    let transition = transitions.get(ctx);
    if (!transition) {
        transition = {
            css: false,
            // Both pages are in the DOM at once, so the new one is captured during the run.
            mode: "default",
            onLeave(el, done) {
                const parent = el.parentNode;
                ctx.held?.keepPlaying(el, () => done());
                // Core keeps nothing when the run does not use keepPlaying.
                if (el.parentNode === parent) {
                    done();
                }
            },
        };
        transitions.set(ctx, transition);
    }
    return transition;
}
