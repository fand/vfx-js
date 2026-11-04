"use client";

import type { AddTransitionOpts, Transition } from "@vfx-js/core";
import * as React from "react";
import {
    startTransition,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { VFXContext } from "../context.js";
import { watchNavigationDirection } from "./direction.js";
import { useLiveOpts } from "./live-opts.js";
import { takePending } from "./store.js";

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
            startTransition(() => setShown(next));
            return;
        }
        const swap = () =>
            new Promise<void>((resolve) => {
                // A newer key took over, so this page never shows.
                if (requestedKey.current !== key) {
                    resolve();
                    return;
                }
                commitWaiters.current.push(resolve);
                // A page that suspends keeps the old page instead of a fallback.
                startTransition(() => setShown(next));
            });
        transition.run(swap, takePending() ?? {}).catch((err) => {
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
        <div ref={ref} className={className} style={style}>
            {rendered}
        </div>
    );
}
