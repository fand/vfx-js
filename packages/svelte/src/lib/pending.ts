import type { RunOpts, Transition, TransitionClass } from "@vfx-js/core";
import type { Attachment } from "svelte/attachments";

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

function isPlainLeftClick(e: MouseEvent): boolean {
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
 * An attachment that sets the spec for the navigation a click on the element starts.
 * Use it as `<a href="/about" {@attach transition(spec)}>`.
 */
export function transition<T extends Transition | TransitionClass>(
    spec: RunOpts<T>,
): Attachment {
    return (node) => {
        const onClick = (e: Event) => {
            if (isPlainLeftClick(e as MouseEvent)) {
                setNextTransition(spec);
            }
        };
        node.addEventListener("click", onClick);
        return () => node.removeEventListener("click", onClick);
    };
}
