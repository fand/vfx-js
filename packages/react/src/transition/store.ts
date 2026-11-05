import type { RunOpts } from "@vfx-js/core";
import type * as React from "react";

// One VFX per page, so one pending spec for the next navigation.
const PENDING_TTL_MS = 10_000;

/** `"click"` comes from a Link or `setNextTransition`, `"back"` from history traversal. */
export type PendingKind = "click" | "back";

export type Pending = { spec: RunOpts; kind: PendingKind };

let pending: (Pending & { at: number }) | null = null;

export function setPending(spec: RunOpts, kind: PendingKind = "click"): void {
    pending = { spec, kind, at: Date.now() };
}

export function hasPending(): boolean {
    return pending !== null && Date.now() - pending.at <= PENDING_TTL_MS;
}

/** Return the pending spec once, or null if there is none or it is stale. */
export function takePending(): Pending | null {
    const current = hasPending() ? pending : null;
    pending = null;
    return current ? { spec: current.spec, kind: current.kind } : null;
}

/** Use this spec for the next transition, e.g. before `router.push()`. */
export function setNextTransition(spec: RunOpts): void {
    setPending(spec);
}

/** Mark the next transition as "back" unless a spec is already pending. */
export function markBackNavigation(): void {
    if (!hasPending()) {
        setPending({ type: "back" }, "back");
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
export function transition(spec: RunOpts): (e: React.MouseEvent) => void {
    return (e) => {
        if (isPlainLeftClick(e)) {
            setPending(spec);
        }
    };
}
