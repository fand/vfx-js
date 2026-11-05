import type { RunOpts } from "@vfx-js/core";
import { createContext } from "react";
import type { Pending } from "./store.js";

/** Lets the incoming page tell its `<VFXTransition>` how it enters. */
export type TransitionScope = { register(spec: RunOpts): () => void };

export const TransitionScopeContext = createContext<TransitionScope | null>(
    null,
);

/**
 * Pick the run spec: a click spec wins whole, else the page spec.
 * A back mark stays under the page spec, so `types.back` fills missing fields.
 */
export function resolveRunOpts(
    pending: Pending | null,
    page: RunOpts | null,
): RunOpts {
    if (pending?.kind === "click") {
        return pending.spec;
    }
    return { ...pending?.spec, ...page };
}
