"use client";

import type { Transition } from "@vfx-js/core";
import { useRef } from "react";

function sameValue(a: unknown, b: unknown): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, i) => item === b[i]);
    }
    return a === b;
}

// Shallow equal, arrays by item, like core's cache. Missing params equal empty ones.
function sameParams(a: unknown, b: unknown): boolean {
    const left = (a ?? {}) as Record<string, unknown>;
    const right = (b ?? {}) as Record<string, unknown>;
    const keys = Object.keys(left);
    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => key in right && sameValue(left[key], right[key]))
    );
}

/**
 * Make one instance of a transition class and keep it while the class and params stay equal.
 * Params compare shallowly, so an inline object is fine.
 * Use it to change params while a run plays, e.g. from a slider.
 * Changed params make a new instance.
 */
export function useTransitionInstance<P, T extends Transition>(
    Class: new (params: P) => T,
    params?: P,
): T {
    const ref = useRef<{
        Class: new (params: P) => T;
        params: P | undefined;
        instance: T;
    } | null>(null);
    const current = ref.current;
    if (
        !current ||
        current.Class !== Class ||
        !sameParams(current.params, params)
    ) {
        ref.current = { Class, params, instance: new Class(params as P) };
    }
    return (ref.current as { instance: T }).instance;
}
