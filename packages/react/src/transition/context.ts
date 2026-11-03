import type { TransitionSpec } from "@vfx-js/core";
import { createContext } from "react";

export type VFXTransitionContextValue = {
    /** Register the current page's spec. Returns a function that removes it. */
    declare(spec: TransitionSpec): () => void;
};

export const VFXTransitionContext =
    createContext<VFXTransitionContextValue | null>(null);
