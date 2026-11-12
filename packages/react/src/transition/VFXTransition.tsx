"use client";

import type {
    AddTransitionOpts,
    RunContext,
    RunOpts,
    Transition,
    TransitionClass,
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
import { type TransitionScope, TransitionScopeContext } from "./scope.js";
import { takePending } from "./store.js";

export type VFXTransitionProps<
    T extends Transition | TransitionClass = Transition | TransitionClass,
> = AddTransitionOpts<T> & VFXTransitionOwnProps;

export type VFXTransitionOwnProps = {
    /** Changes per page, e.g. the pathname. A new key mounts the children fresh. */
    pageKey?: string | number;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    /** Size the target to the viewport height. Default `true`; `false` leaves sizing to your CSS. */
    fullscreen?: boolean;
};

type Shown = {
    key: string | number | undefined;
    node: React.ReactNode;
    // New per page, so a kept old page never shares a key with the new one.
    id: number;
};

// Old pages that core keeps playing, then the shown page.
type Pages = { kept: Shown[]; shown: Shown };

const OUTER_STYLE: React.CSSProperties = { display: "contents" };
// With keepPlaying, each page sits in its own box that core can move.
const PAGE_STYLE: React.CSSProperties = { display: "contents" };
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
export function VFXTransition<T extends Transition | TransitionClass>(
    props: VFXTransitionProps<T>,
) {
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

    const [pages, setPages] = useState<Pages>(() => ({
        kept: [],
        shown: { key: pageKey, node: children, id: 0 },
    }));
    const { shown } = pages;
    const nextId = useRef(1);
    const pageBoxes = useRef(new Map<number, HTMLElement>());
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

    // The page on screen; a pending page that suspends is not it yet.
    const committedId = useRef(shown.id);
    useLayoutEffect(() => {
        committedId.current = shown.id;
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
        const next: Shown = { key, node: children, id: nextId.current++ };
        const transition = transitionRef.current;
        if (!transition || key === undefined) {
            startTransition(() => setPages((p) => ({ ...p, shown: next })));
            return;
        }
        const swap = (ctx: RunContext) =>
            new Promise<void>((resolve) => {
                // A newer key took over, so this page never shows.
                if (requestedKey.current !== key) {
                    resolve();
                    return;
                }
                const kept = keepOldPage(ctx);
                commitWaiters.current.push(resolve);
                // A page that suspends keeps the old page instead of a fallback.
                startTransition(() =>
                    setPages((p) => ({
                        kept: kept ? [...p.kept, kept] : p.kept,
                        shown: next,
                    })),
                );
            });
        incoming.current = null;
        transition
            // A click spec wins whole over the page spec.
            .run(swap, () => takePending() ?? incoming.current ?? {})
            .catch((err) => {
                console.error("[@vfx-js/react] VFXTransition run failed:", err);
            });
    });

    // Hand the shown page's box to core, and keep rendering it until core gives it back.
    // React never inserts before it or removes it while core holds it:
    // new pages go after it, and it leaves the tree only after it is back.
    const keepOldPage = (ctx: RunContext): Shown | null => {
        const page = latestShown.current;
        const { id } = page;
        const box = pageBoxes.current.get(id);
        if (!liveOpts.keepPlaying || !box) {
            return null;
        }
        const parent = box.parentNode;
        ctx.keepPlaying(box, (node) => {
            // Still the shown page when the new one has not come in; keep it visible then.
            if (committedId.current !== id) {
                (node as HTMLElement).style.display = "none";
            }
            setPages((p) => ({
                ...p,
                kept: p.kept.filter((page) => page.id !== id),
            }));
        });
        // Core leaves the box in place when the run does not use keepPlaying.
        return box.parentNode !== parent ? page : null;
    };

    // New key: keep the latest children of the old page until the run swaps.
    const latestShown = useRef(shown);
    if (latestShown.current.id !== shown.id) {
        latestShown.current = shown;
    }
    if (pageKey === undefined || pageKey === shown.key) {
        latestShown.current = { ...shown, node: children };
    }
    const rendered = [...pages.kept, latestShown.current];
    // A page core holds keeps its box even if keepPlaying turns off mid-run.
    const boxed = (page: Shown) =>
        Boolean(opts.keepPlaying) || page !== latestShown.current;

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
                    {rendered.map((page) =>
                        boxed(page) ? (
                            <div
                                key={page.id}
                                style={PAGE_STYLE}
                                ref={(box) => {
                                    if (box) {
                                        pageBoxes.current.set(page.id, box);
                                    } else {
                                        pageBoxes.current.delete(page.id);
                                    }
                                }}
                            >
                                {page.node}
                            </div>
                        ) : (
                            <Fragment key={page.id}>{page.node}</Fragment>
                        ),
                    )}
                </TransitionScopeContext.Provider>
            </div>
        </div>
    );
}
