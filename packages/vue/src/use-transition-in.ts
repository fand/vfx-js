import type { RunOpts, Transition, TransitionClass } from "@vfx-js/core";
import { inject, onUnmounted } from "vue";
import { TransitionScopeKey, warnOnce } from "./scope.js";

/**
 * Set how this page enters when it mounts inside `<VFXTransition>`.
 * Call it in `setup`. A link's `transition(spec)` still wins for that click.
 * Only the spec at setup counts.
 */
export function useTransitionIn<T extends Transition | TransitionClass>(
    spec: RunOpts<T>,
): void {
    const scope = inject(TransitionScopeKey, null);
    if (!scope) {
        warnOnce(
            "transition-in",
            "[@vfx-js/vue] useTransitionIn does nothing outside <VFXTransition>.",
        );
        return;
    }
    onUnmounted(scope.register(spec as RunOpts));
}
