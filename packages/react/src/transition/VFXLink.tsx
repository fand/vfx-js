"use client";

import type { RunOpts, TransitionSpec } from "@vfx-js/core";
import * as React from "react";
import { transition as transitionOnClick } from "./store.js";

export type VFXLinkProps<C extends React.ElementType> = {
    as?: C;
    transition: RunOpts | TransitionSpec;
} & Omit<React.ComponentPropsWithoutRef<C>, "as" | "transition">;

/** Render `as` (a router `Link` or `"a"`) and set the transition on click. */
export function VFXLink<C extends React.ElementType = "a">(
    props: VFXLinkProps<C>,
) {
    const { as, transition, ...rest } = props;
    const userOnClick = (rest as { onClick?: (e: React.MouseEvent) => void })
        .onClick;
    const setSpec = transitionOnClick(transition);
    const onClick = (e: React.MouseEvent) => {
        userOnClick?.(e);
        setSpec(e);
    };
    return React.createElement(as ?? "a", { ...rest, onClick });
}
