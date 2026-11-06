"use client";

import type {
    AddTransitionOpts,
    RunOpts,
    TransitionHandle,
} from "@vfx-js/core";
import type * as React from "react";
import {
    Fragment,
    startTransition,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { useVFXInstance } from "../use-vfx-instance.js";
import { useLiveOpts } from "./live-opts.js";
import {
    resolveRunOpts,
    type TransitionScope,
    TransitionScopeContext,
} from "./scope.js";
import { takePending } from "./store.js";

export type VFXTransitionProps = AddTransitionOpts & {
    /** Changes per page, e.g. the pathname. A new key mounts the children fresh. */
    pageKey?: string | number;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    /** Size the target to the viewport height. Default `true`; `false` leaves sizing to your CSS. */
    fullscreen?: boolean;
};

type Shown = { key: string | number | undefined; node: React.ReactNode };

const OUTER_STYLE: React.CSSProperties = { display: "contents" };
// Pages share one viewport-sized box and scroll inside it.
const FILL_STYLE: React.CSSProperties = {
    height: "100dvh",
    overflow: "hidden",
};

/**
 * Animate between pages with a shader.
 * Pass a `pageKey` that changes per page, e.g. the pathname.
 * Without a `pageKey` it never transitions.
 * The target fills the viewport height by default; pass `fullscreen={false}` to size it yourself.
 */
export function VFXTransition(props: VFXTransitionProps) {
    const {
        pageKey,
        children,
        className,
        style,
        fullscreen = true,
        ...opts
    } = props;
    const vfx = useVFXInstance();
    const liveOpts = useLiveOpts(opts);
    const ref = useRef<HTMLDivElement>(null);
    const transitionRef = useRef<TransitionHandle | null>(null);

    const [shown, setShown] = useState<Shown>({
        key: pageKey,
        node: children,
    });
    const requestedKey = useRef(pageKey);
    const commitWaiters = useRef<(() => void)[]>([]);

    // The spec of the page that mounts during a run.
    const incoming = useRef<RunOpts | null>(null);
    const [scope] = useState<TransitionScope>(() => ({
        register(spec) {
            incoming.current = spec;
            return () => {
                if (incoming.current === spec) {
                    incoming.current = null;
                }
            };
        },
    }));

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
        const key = pageKey;
        if (key === requestedKey.current) {
            return;
        }
        requestedKey.current = key;
        const next: Shown = { key, node: children };
        const transition = transitionRef.current;
        if (!transition || key === undefined) {
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
        incoming.current = null;
        transition
            .run(swap, () => resolveRunOpts(takePending(), incoming.current))
            .catch((err) => {
                console.error("[@vfx-js/react] VFXTransition run failed:", err);
            });
    });

    // New key: keep the latest children of the old page until the run swaps.
    const latestShown = useRef(shown);
    if (latestShown.current.key !== shown.key) {
        latestShown.current = shown;
    }
    if (pageKey === undefined || pageKey === shown.key) {
        latestShown.current = { key: shown.key, node: children };
    }
    const rendered = latestShown.current;

    // Core moves the inner div into a canvas during a run.
    // React removes the outer div on unmount, and that one never moves.
    return (
        <div style={OUTER_STYLE}>
            <div
                ref={ref}
                className={className}
                style={fullscreen ? { ...FILL_STYLE, ...style } : style}
            >
                <TransitionScopeContext.Provider value={scope}>
                    <Fragment key={rendered.key}>{rendered.node}</Fragment>
                </TransitionScopeContext.Provider>
            </div>
        </div>
    );
}
