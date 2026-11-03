"use client";

import type {
    AddTransitionOpts,
    Transition,
    TransitionSpec,
} from "@vfx-js/core";
import * as React from "react";
import {
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { VFXContext } from "../context.js";
import {
    VFXTransitionContext,
    type VFXTransitionContextValue,
} from "./context.js";
import { watchNavigationDirection } from "./direction.js";
import { useLiveOpts } from "./live-opts.js";
import { takePending, withPageSpec } from "./store.js";

export type VFXTransitionProps = AddTransitionOpts & {
    /** A single element. A new `key` starts a transition. */
    children: React.ReactElement;
    className?: string;
    style?: React.CSSProperties;
};

const keyOf = (element: React.ReactElement) => element.key;

/**
 * Animate between pages with a shader.
 * Give the child a key that changes per page, e.g. `<Page key={pathname} />`.
 * A child without a key never transitions.
 */
export function VFXTransition(props: VFXTransitionProps) {
    const { children, className, style, ...opts } = props;
    const vfx = useContext(VFXContext);
    const liveOpts = useLiveOpts(opts);
    const ref = useRef<HTMLDivElement>(null);
    const transitionRef = useRef<Transition | null>(null);

    const next = React.Children.only(children);
    const [shown, setShown] = useState(next);
    const requestedKey = useRef(keyOf(next));
    const commitWaiters = useRef<(() => void)[]>([]);
    const declarations = useRef<TransitionSpec[]>([]);

    const context = useMemo<VFXTransitionContextValue>(
        () => ({
            declare(spec) {
                declarations.current.push(spec);
                return () => {
                    const i = declarations.current.lastIndexOf(spec);
                    if (i !== -1) {
                        declarations.current.splice(i, 1);
                    }
                };
            },
        }),
        [],
    );

    useEffect(() => watchNavigationDirection(), []);

    useEffect(() => {
        const element = ref.current;
        if (!vfx || !element) {
            return;
        }
        const transition = vfx.addTransition(element, liveOpts);
        transitionRef.current = transition;
        return () => {
            transition.destroy();
            transitionRef.current = null;
        };
    }, [vfx, liveOpts]);

    useLayoutEffect(() => {
        const waiters = commitWaiters.current;
        commitWaiters.current = [];
        for (const resolve of waiters) {
            resolve();
        }
    }, [shown]);

    useEffect(() => {
        const key = keyOf(next);
        if (key === requestedKey.current) {
            return;
        }
        requestedKey.current = key;
        const transition = transitionRef.current;
        if (!transition) {
            setShown(next);
            return;
        }
        // The entering page declares only after it mounts, so v1 falls back to the leaving page's spec.
        const leaving = declarations.current[declarations.current.length - 1];
        const swap = () =>
            new Promise<void>((resolve) => {
                // A newer key took over, so this page never shows.
                if (requestedKey.current !== key) {
                    resolve();
                    return;
                }
                commitWaiters.current.push(resolve);
                setShown(next);
            });
        transition
            .run(swap, withPageSpec(takePending(), leaving))
            .catch((err) => {
                console.error("[@vfx-js/react] VFXTransition run failed:", err);
            });
    });

    // New key: keep the latest element of the old page until the run swaps.
    const latestShown = useRef(shown);
    if (keyOf(latestShown.current) !== keyOf(shown)) {
        latestShown.current = shown;
    }
    if (keyOf(next) === keyOf(shown)) {
        latestShown.current = next;
    }
    const rendered = latestShown.current;

    return (
        <VFXTransitionContext.Provider value={context}>
            <div ref={ref} className={className} style={style}>
                {rendered}
            </div>
        </VFXTransitionContext.Provider>
    );
}
