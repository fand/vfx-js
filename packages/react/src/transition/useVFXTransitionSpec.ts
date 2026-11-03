import type { TransitionSpec } from "@vfx-js/core";
import { useContext, useEffect } from "react";
import { VFXTransitionContext } from "./context.js";

/** Declare this page's transition to the surrounding `<VFXTransition>`. */
export function useVFXTransitionSpec(spec: TransitionSpec): void {
    const context = useContext(VFXTransitionContext);
    useEffect(() => context?.declare(spec), [context, spec]);
}
