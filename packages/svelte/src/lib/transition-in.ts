import type { RunOpts, Transition, TransitionClass } from "@vfx-js/core";
import { getContext, onDestroy } from "svelte";
import { type TransitionScope, TransitionScopeKey, warnOnce } from "./scope.js";

/**
 * Set how this page enters when it mounts inside `<VFXTransition>`.
 * Call it when the component is created. A link's `transition(spec)` still wins for that click.
 * Only the spec at creation counts.
 */
export function transitionIn<T extends Transition | TransitionClass>(
    spec: RunOpts<T>,
): void {
    const scope = getContext<TransitionScope | undefined>(TransitionScopeKey);
    if (!scope) {
        warnOnce(
            "transition-in",
            "[@vfx-js/svelte] transitionIn does nothing outside <VFXTransition>.",
        );
        return;
    }
    onDestroy(scope.register(spec as RunOpts));
}
