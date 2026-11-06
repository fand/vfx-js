"use client";

import type { RunOpts } from "@vfx-js/core";
import { useContext, useLayoutEffect, useRef } from "react";
import { warnOnce } from "../store.js";
import { TransitionScopeContext } from "./scope.js";

/**
 * Set how this page enters when it mounts inside `<VFXTransition>`.
 * A Link's `transition(spec)` still wins for that click.
 * Only the spec at mount counts.
 */
export function useTransitionIn(spec: RunOpts): void {
    const scope = useContext(TransitionScopeContext);
    const specRef = useRef(spec);
    useLayoutEffect(() => {
        if (!scope) {
            warnOnce(
                "transition-in",
                "[@vfx-js/react] useTransitionIn does nothing outside <VFXTransition>.",
            );
            return;
        }
        return scope.register(specRef.current);
    }, [scope]);
}

/** Component form of `useTransitionIn`, so a Server Component page can use it. */
export function TransitionIn(props: RunOpts): null {
    useTransitionIn(props);
    return null;
}
