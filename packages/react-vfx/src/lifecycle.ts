import type { VFX, VFXProps } from "@vfx-js/core";
import { useEffect, useRef } from "react";

const NON_EFFECT_KEYS: readonly (keyof VFXProps)[] = [
    "shader",
    "release",
    "uniforms",
    "overlay",
    "intersection",
    "overflow",
    "wrap",
    "zIndex",
    "backbuffer",
    "autoCrop",
    "glslVersion",
] as const;

export function nonEffectKeysEqual(a: VFXProps, b: VFXProps): boolean {
    for (const k of NON_EFFECT_KEYS) {
        if (a[k] !== b[k]) {
            return false;
        }
    }
    return true;
}

function applyDelta(
    vfx: VFX,
    element: HTMLElement,
    prev: VFXProps,
    next: VFXProps,
): void {
    const onlyEffect = nonEffectKeysEqual(prev, next);
    if (onlyEffect && prev.effect === next.effect) {
        return;
    }
    if (onlyEffect && next.effect !== undefined) {
        vfx.updateEffects(element, next.effect).catch((err) => {
            console.error("[react-vfx] updateEffects failed:", err);
        });
        return;
    }
    vfx.remove(element);
    vfx.add(element, next).catch((err) => {
        console.error("[react-vfx] add (delta) failed:", err);
    });
}

/**
 * Drives `vfx.add` / `vfx.remove` for a DOM element and reflects live
 * `vfxProps` changes back to the running VFX. When only the `effect`
 * prop differs, the chain is swapped in place via `vfx.updateEffects`
 * (preserves init state for kept effects). Otherwise falls back to a
 * full `remove` + `add`.
 *
 * Two effects: one bound to `(element, vfx)` for mount/unmount, another
 * bound to `vfxProps` for live deltas. The mount effect captures props
 * via a ref so it doesn't re-run on every prop change.
 */
export function useVFXLifecycle(
    element: HTMLElement | null,
    vfx: VFX | null,
    vfxProps: VFXProps,
): void {
    const propsRef = useRef(vfxProps);
    propsRef.current = vfxProps;

    const lastAppliedRef = useRef<VFXProps | null>(null);

    useEffect(() => {
        if (!vfx || !element) {
            return;
        }
        const initial = propsRef.current;
        let cancelled = false;
        vfx.add(element, initial)
            .then(() => {
                if (cancelled) {
                    return;
                }
                lastAppliedRef.current = initial;
                const latest = propsRef.current;
                if (latest !== initial) {
                    applyDelta(vfx, element, initial, latest);
                    lastAppliedRef.current = latest;
                }
            })
            .catch((err) => {
                console.error("[react-vfx] add failed:", err);
            });
        return () => {
            cancelled = true;
            vfx.remove(element);
            lastAppliedRef.current = null;
        };
    }, [element, vfx]);

    useEffect(() => {
        if (!vfx || !element) {
            return;
        }
        const last = lastAppliedRef.current;
        if (!last) {
            return;
        }
        if (last === vfxProps) {
            return;
        }
        applyDelta(vfx, element, last, vfxProps);
        lastAppliedRef.current = vfxProps;
    }, [vfx, element, vfxProps]);
}
