import type { VFX, VFXProps } from "@vfx-js/core";
import {
    setupCapture,
    supportsHtmlInCanvas,
    teardownCapture,
} from "@vfx-js/core";
import * as React from "react";
import { useContext, useEffect, useRef } from "react";
import { VFXContext } from "./context.js";
import { nonEffectKeysEqual } from "./lifecycle.js";
import { splitVFXProps } from "./split-props.js";

type VFXCanvasProps = React.PropsWithChildren<
    VFXProps & {
        className?: string;
        style?: React.CSSProperties;
    }
>;

function applyCanvasDelta(
    vfx: VFX,
    target: HTMLElement,
    isHIC: boolean,
    latestCapture: OffscreenCanvas | null,
    prev: VFXProps,
    next: VFXProps,
): void {
    const onlyEffect = nonEffectKeysEqual(prev, next);
    if (onlyEffect && prev.effect === next.effect) {
        return;
    }
    if (onlyEffect && next.effect !== undefined) {
        vfx.updateEffects(target, next.effect).catch((err) => {
            console.error("[react-vfx] updateEffects failed:", err);
        });
        return;
    }
    vfx.remove(target);
    // HIC's `layoutsubtree && initialCapture` branch in VFX.add needs the
    // capture handed in; pass the most recent one so the slow path stays
    // on the HIC route instead of falling through to plain canvas.
    if (isHIC && latestCapture && target instanceof HTMLCanvasElement) {
        vfx.add(target, next, latestCapture).catch((err) => {
            console.error("[react-vfx] add (delta) failed:", err);
        });
    } else {
        vfx.add(target, next).catch((err) => {
            console.error("[react-vfx] add (delta) failed:", err);
        });
    }
}

/**
 * Wraps children in a `<canvas layoutsubtree>` and applies VFX via html-in-canvas.
 * Falls back to a `<div>` with dom-to-canvas when unsupported.
 */
export const VFXCanvas = React.forwardRef<HTMLElement, VFXCanvasProps>(
    function VFXCanvas(props, parentRef) {
        const vfx = useContext(VFXContext);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const fallbackRef = useRef<HTMLDivElement>(null);

        const { vfxProps, domProps } = splitVFXProps(props);
        const { children, ...restDomProps } = domProps as typeof domProps & {
            children?: React.ReactNode;
        };

        const isSupported = supportsHtmlInCanvas();

        const propsRef = useRef(vfxProps);
        propsRef.current = vfxProps;

        const lastAppliedRef = useRef<VFXProps | null>(null);
        const latestCaptureRef = useRef<OffscreenCanvas | null>(null);

        useEffect(() => {
            const el = isSupported ? canvasRef.current : fallbackRef.current;
            if (parentRef instanceof Function) {
                parentRef(el);
            } else if (parentRef) {
                parentRef.current = el;
            }
        }, [parentRef, isSupported]);

        useEffect(() => {
            if (!vfx) {
                return;
            }

            if (isSupported) {
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }
                const initial = propsRef.current;
                let cancelled = false;

                setupCapture(canvas, {
                    onCapture: (offscreen) => {
                        latestCaptureRef.current = offscreen;
                        vfx.updateHICTexture(canvas, offscreen);
                    },
                    maxSize: vfx.maxTextureSize,
                })
                    .then((initialCapture) => {
                        if (cancelled) {
                            return;
                        }
                        latestCaptureRef.current = initialCapture;
                        return vfx.add(canvas, initial, initialCapture);
                    })
                    .then(() => {
                        if (cancelled) {
                            return;
                        }
                        lastAppliedRef.current = initial;
                        const latest = propsRef.current;
                        if (latest !== initial) {
                            applyCanvasDelta(
                                vfx,
                                canvas,
                                true,
                                latestCaptureRef.current,
                                initial,
                                latest,
                            );
                            lastAppliedRef.current = latest;
                        }
                    })
                    .catch((err) => {
                        console.error(
                            "[react-vfx] VFXCanvas mount failed:",
                            err,
                        );
                    });

                return () => {
                    cancelled = true;
                    teardownCapture(canvas);
                    vfx.remove(canvas);
                    lastAppliedRef.current = null;
                    latestCaptureRef.current = null;
                };
            }

            const el = fallbackRef.current;
            if (!el) {
                return;
            }
            const initial = propsRef.current;
            let cancelled = false;

            vfx.add(el, initial)
                .then(() => {
                    if (cancelled) {
                        return;
                    }
                    lastAppliedRef.current = initial;
                    const latest = propsRef.current;
                    if (latest !== initial) {
                        applyCanvasDelta(vfx, el, false, null, initial, latest);
                        lastAppliedRef.current = latest;
                    }
                })
                .catch((err) => {
                    console.error(
                        "[react-vfx] VFXCanvas (fallback) mount failed:",
                        err,
                    );
                });

            const mo = new MutationObserver(() => vfx.update(el));
            mo.observe(el, {
                characterData: true,
                attributes: true,
                childList: true,
                subtree: true,
            });

            return () => {
                cancelled = true;
                mo.disconnect();
                vfx.remove(el);
                lastAppliedRef.current = null;
            };
        }, [vfx, isSupported]);

        useEffect(() => {
            if (!vfx) {
                return;
            }
            const target = isSupported
                ? canvasRef.current
                : fallbackRef.current;
            if (!target) {
                return;
            }
            const last = lastAppliedRef.current;
            if (!last || last === vfxProps) {
                return;
            }
            applyCanvasDelta(
                vfx,
                target,
                isSupported,
                latestCaptureRef.current,
                last,
                vfxProps,
            );
            lastAppliedRef.current = vfxProps;
        }, [vfx, isSupported, vfxProps]);

        if (isSupported) {
            return React.createElement(
                "canvas",
                {
                    ...restDomProps,
                    ref: canvasRef,
                    layoutsubtree: "",
                },
                React.createElement("div", null, children),
            );
        }

        return React.createElement(
            "div",
            { ...restDomProps, ref: fallbackRef },
            children,
        );
    },
);
