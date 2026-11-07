import type {
    AddTransitionOpts,
    Transition,
    TransitionClass,
} from "@vfx-js/core";
import { useLocation, useOutlet } from "react-router";
import {
    VFXTransition as BaseVFXTransition,
    type VFXTransitionOwnProps,
} from "../transition/VFXTransition.js";

export type VFXTransitionProps<
    T extends Transition | TransitionClass = Transition | TransitionClass,
> = AddTransitionOpts<T> &
    Omit<VFXTransitionOwnProps, "children" | "pageKey"> & {
        /** Defaults to the pathname. */
        pageKey?: string | number;
    };

/**
 * `VFXTransition` for React Router. Use it in place of `<Outlet />`.
 * Each pathname is one page by default.
 */
export function VFXTransition<T extends Transition | TransitionClass>({
    pageKey,
    ...props
}: VFXTransitionProps<T>) {
    const { pathname } = useLocation();
    // The outlet element carries its own route context,
    // so a kept old page keeps rendering its own route.
    // `<Outlet />` would read the new one.
    const outlet = useOutlet();
    return (
        <BaseVFXTransition {...props} pageKey={pageKey ?? pathname}>
            {outlet}
        </BaseVFXTransition>
    );
}
