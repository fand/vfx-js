import type { RunOpts, Transition, TransitionClass } from "@vfx-js/core";

// One VFX per page, so one pending spec for the next navigation.
const PENDING_TTL_MS = 10_000;

let pending: { spec: RunOpts; at: number } | null = null;

/** Return the pending spec once, or null if there is none or it is stale. */
export function takePending(): RunOpts | null {
    const current =
        pending !== null && Date.now() - pending.at <= PENDING_TTL_MS
            ? pending
            : null;
    pending = null;
    return current ? current.spec : null;
}

/** Use this spec for the next transition, e.g. before `router.push()`. */
export function setNextTransition<T extends Transition | TransitionClass>(
    spec: RunOpts<T>,
): void {
    pending = { spec, at: Date.now() };
}

export function isPlainLeftClick(e: MouseEvent): boolean {
    if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
    ) {
        return false;
    }
    const target = (e.currentTarget as Element | null)?.getAttribute?.(
        "target",
    );
    return !target || target === "_self";
}

/**
 * Returns a click handler that sets the spec for the navigation the click starts.
 * In templates, use `v-transition="spec"` instead.
 * Use this in code, e.g. `addEventListener("click", transition(spec))` or `:onClick="transition(spec)"`.
 */
export function transition<T extends Transition | TransitionClass>(
    spec: RunOpts<T>,
): (e: MouseEvent) => void {
    return (e) => {
        if (isPlainLeftClick(e)) {
            setNextTransition(spec);
        }
    };
}
