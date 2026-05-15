import type { VFX, VFXProps } from "@vfx-js/core";
import { useEffect, useRef } from "react";
import { VFX_PROP_KEYS } from "./split-props.js";

const NON_EFFECT_KEYS: readonly (keyof VFXProps)[] = VFX_PROP_KEYS.filter(
    (k) => k !== "effect",
);

export function nonEffectKeysEqual(a: VFXProps, b: VFXProps): boolean {
    for (const k of NON_EFFECT_KEYS) {
        if (a[k] !== b[k]) {
            return false;
        }
    }
    return true;
}

export type OpQueue = {
    enqueue: (op: () => Promise<void> | void) => Promise<void>;
};

/**
 * FIFO single-flight queue. Each enqueued op runs after the previous
 * resolves; failures in one op don't halt the chain.
 */
export function createOpQueue(): OpQueue {
    let tail: Promise<void> = Promise.resolve();
    return {
        enqueue(op) {
            const next = tail.then(op, op);
            tail = next.then(
                () => {},
                () => {},
            );
            return next;
        },
    };
}

export type AddFn = (element: HTMLElement, props: VFXProps) => Promise<void>;

/**
 * Apply the diff between `prev` and `next`. Awaitable so callers can
 * serialize through a queue.
 *
 * - Same effect ref + identical non-effect keys → no-op.
 * - Only the effect chain differs → `vfx.updateEffects` fast path.
 * - Otherwise → full remove + `addFn(next)`.
 */
export async function applyDelta(
    vfx: VFX,
    element: HTMLElement,
    prev: VFXProps,
    next: VFXProps,
    addFn: AddFn,
): Promise<void> {
    const onlyEffect = nonEffectKeysEqual(prev, next);
    if (onlyEffect && prev.effect === next.effect) {
        return;
    }
    if (onlyEffect && next.effect !== undefined) {
        await vfx.updateEffects(element, next.effect);
        return;
    }
    vfx.remove(element);
    await addFn(element, next);
}

/**
 * Drives `vfx.add` / `vfx.remove` for a DOM element and serializes
 * live `vfxProps` updates through a FIFO queue. `prev` is read at
 * execution time so rapid renders (a→b→c) apply as serial
 * applyDelta(a→b) then applyDelta(b→c), reaching the correct final
 * state without dropped transitions.
 *
 * Mount, prop updates, and unmount all share the queue: an in-flight
 * add followed by unmount cleanly enqueues remove() after add resolves
 * — avoiding the "registered after cleanup" leak.
 */
export function useVFXLifecycle(
    element: HTMLElement | null,
    vfx: VFX | null,
    vfxProps: VFXProps,
): void {
    const propsRef = useRef(vfxProps);
    propsRef.current = vfxProps;

    const lastAppliedRef = useRef<VFXProps | null>(null);
    const queueRef = useRef<OpQueue | null>(null);

    useEffect(() => {
        if (!vfx || !element) {
            return;
        }
        let queue = queueRef.current;
        if (queue === null) {
            queue = createOpQueue();
            queueRef.current = queue;
        }
        let cancelled = false;

        queue.enqueue(async () => {
            if (cancelled) {
                return;
            }
            const initial = propsRef.current;
            try {
                await vfx.add(element, initial);
                lastAppliedRef.current = initial;
            } catch (err) {
                console.error("[@vfx-js/react] add failed:", err);
            }
        });

        return () => {
            cancelled = true;
            queue.enqueue(() => {
                vfx.remove(element);
                lastAppliedRef.current = null;
            });
        };
    }, [element, vfx]);

    useEffect(() => {
        if (!vfx || !element) {
            return;
        }
        let queue = queueRef.current;
        if (queue === null) {
            queue = createOpQueue();
            queueRef.current = queue;
        }
        const next = vfxProps;
        queue.enqueue(async () => {
            const prev = lastAppliedRef.current;
            if (!prev || prev === next) {
                return;
            }
            try {
                await applyDelta(vfx, element, prev, next, (el, p) =>
                    vfx.add(el, p),
                );
                lastAppliedRef.current = next;
            } catch (err) {
                console.error("[@vfx-js/react] applyDelta failed:", err);
            }
        });
    }, [vfx, element, vfxProps]);
}
