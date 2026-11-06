"use client";

// Internal Next API; it may move on a Next upgrade.
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { usePathname } from "next/navigation.js";
import { useContext, useRef } from "react";
import {
    VFXTransition as BaseVFXTransition,
    type VFXTransitionProps as BaseVFXTransitionProps,
} from "../transition/VFXTransition.js";

export type VFXTransitionProps = Omit<BaseVFXTransitionProps, "pageKey"> & {
    /** Defaults to the pathname. */
    pageKey?: string | number;
};

// Layout `children` reads the current route from LayoutRouterContext,
// so a kept old page would render the new route.
// Pin the context from mount so the old page keeps its own content.
function FrozenRouter({ children }: { children: React.ReactNode }) {
    const context = useContext(LayoutRouterContext);
    const frozen = useRef(context).current;
    return (
        <LayoutRouterContext.Provider value={frozen}>
            {children}
        </LayoutRouterContext.Provider>
    );
}

/** `VFXTransition` for the App Router. Each pathname is one page by default. */
export function VFXTransition({
    children,
    pageKey,
    ...props
}: VFXTransitionProps) {
    const pathname = usePathname();
    return (
        <BaseVFXTransition {...props} pageKey={pageKey ?? pathname}>
            <FrozenRouter>{children}</FrozenRouter>
        </BaseVFXTransition>
    );
}
