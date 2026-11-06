import type { RunOpts } from "@vfx-js/core";
import { createContext } from "react";

/** Lets the incoming page tell its `<VFXTransition>` how it enters. */
export type TransitionScope = { register(spec: RunOpts): () => void };

export const TransitionScopeContext = createContext<TransitionScope | null>(
    null,
);
