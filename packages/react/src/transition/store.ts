import type { RunOpts, TransitionSpec } from "@vfx-js/core";
import type * as React from "react";

// One VFX per page, so one pending spec for the next navigation.
const PENDING_TTL_MS = 2000;

let pending: { spec: RunOpts; at: number } | null = null;

export function setPending(spec: RunOpts): void {
    pending = { spec, at: Date.now() };
}

export function hasPending(): boolean {
    return pending !== null && Date.now() - pending.at <= PENDING_TTL_MS;
}

/** Return the pending spec once, or null if there is none or it is stale. */
export function takePending(): RunOpts | null {
    const current = hasPending() ? pending : null;
    pending = null;
    return current?.spec ?? null;
}

/** Use this spec for the next transition, e.g. before `router.push()`. */
export function setNextTransition(spec: RunOpts | TransitionSpec): void {
    setPending(spec);
}

/** Mark the next transition as "back" unless a spec is already pending. */
export function markBackNavigation(): void {
    if (!hasPending()) {
        setPending({ type: "back" });
    }
}

function isPlainLeftClick(e: React.MouseEvent): boolean {
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

/** Returns an `onClick` that sets the spec for the navigation the click starts. */
export function transition(
    spec: RunOpts | TransitionSpec,
): (e: React.MouseEvent) => void {
    return (e) => {
        if (isPlainLeftClick(e)) {
            setPending(spec);
        }
    };
}
