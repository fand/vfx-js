import type { AddTransitionOpts, RunOpts, Transition } from "@vfx-js/core";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useTransition,
} from "react";
import { useVFXInstance } from "../use-vfx-instance.js";
import { useLiveOpts } from "./live-opts.js";

export type UseVFXTransition = {
    ref: (element: HTMLElement | null) => void;
    /** Run `cb` inside `startTransition` and animate once React has committed. */
    run: (cb: () => void | Promise<void>, opts?: RunOpts) => Promise<void>;
};

export function useVFXTransition(
    opts: AddTransitionOpts = {},
): UseVFXTransition {
    const vfx = useVFXInstance();
    const liveOpts = useLiveOpts(opts);
    const [element, setElement] = useState<HTMLElement | null>(null);
    const transitionRef = useRef<Transition | null>(null);
    const [isPending, startTransition] = useTransition();
    const sawPending = useRef(false);
    const settleWaiters = useRef<(() => void)[]>([]);

    useEffect(() => {
        if (!vfx || !element) {
            return;
        }
        const transition = vfx.addTransition(element, liveOpts);
        transitionRef.current = transition;
        return () => {
            transition.destroy();
            transitionRef.current = null;
        };
    }, [vfx, element, liveOpts]);

    useLayoutEffect(() => {
        if (isPending) {
            sawPending.current = true;
            return;
        }
        if (sawPending.current) {
            sawPending.current = false;
            const waiters = settleWaiters.current;
            settleWaiters.current = [];
            for (const resolve of waiters) {
                resolve();
            }
        }
    }, [isPending]);

    const settle = useCallback(
        (cb: () => void | Promise<void>) =>
            new Promise<void>((resolve) => {
                settleWaiters.current.push(resolve);
                sawPending.current = false;
                startTransition(cb);
                // Nothing went pending: `cb` did not update React state.
                requestAnimationFrame(() => {
                    if (!sawPending.current) {
                        resolve();
                    }
                });
            }),
        [],
    );

    const run = useCallback(
        async (cb: () => void | Promise<void>, runOpts?: RunOpts) => {
            const transition = transitionRef.current;
            if (!transition) {
                await settle(cb);
                return;
            }
            await transition.run(() => settle(cb), runOpts);
        },
        [settle],
    );

    return { ref: setElement, run };
}
