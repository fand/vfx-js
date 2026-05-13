import type { VFXProps } from "@vfx-js/core";
import {
    setupCapture,
    supportsHtmlInCanvas,
    teardownCapture,
} from "@vfx-js/core";
import * as React from "react";
import { useContext, useEffect, useRef } from "react";
import { VFXContext } from "./context.js";
import { applyDelta, createOpQueue, type OpQueue } from "./lifecycle.js";
import { splitVFXProps } from "./split-props.js";

type VFXCanvasProps = React.PropsWithChildren<
    VFXProps & {
        className?: string;
        style?: React.CSSProperties;
    }
>;

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
        const queueRef = useRef<OpQueue | null>(null);

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
            let queue = queueRef.current;
            if (queue === null) {
                queue = createOpQueue();
                queueRef.current = queue;
            }

            if (isSupported) {
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }
                let cancelled = false;

                queue.enqueue(async () => {
                    if (cancelled) {
                        return;
                    }
                    try {
                        const initialCapture = await setupCapture(canvas, {
                            onCapture: (offscreen) => {
                                latestCaptureRef.current = offscreen;
                                vfx.updateHICTexture(canvas, offscreen);
                            },
                            maxSize: vfx.maxTextureSize,
                        });
                        if (cancelled) {
                            teardownCapture(canvas);
                            return;
                        }
                        latestCaptureRef.current = initialCapture;
                        const initial = propsRef.current;
                        await vfx.add(canvas, initial, initialCapture);
                        lastAppliedRef.current = initial;
                    } catch (err) {
                        console.error(
                            "[react-vfx] VFXCanvas mount failed:",
                            err,
                        );
                    }
                });

                return () => {
                    cancelled = true;
                    queue.enqueue(() => {
                        teardownCapture(canvas);
                        vfx.remove(canvas);
                        lastAppliedRef.current = null;
                        latestCaptureRef.current = null;
                    });
                };
            }

            const el = fallbackRef.current;
            if (!el) {
                return;
            }
            let cancelled = false;

            queue.enqueue(async () => {
                if (cancelled) {
                    return;
                }
                try {
                    const initial = propsRef.current;
                    await vfx.add(el, initial);
                    lastAppliedRef.current = initial;
                } catch (err) {
                    console.error(
                        "[react-vfx] VFXCanvas (fallback) mount failed:",
                        err,
                    );
                }
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
                queue.enqueue(() => {
                    vfx.remove(el);
                    lastAppliedRef.current = null;
                });
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
                    await applyDelta(vfx, target, prev, next, (el, p) => {
                        // HIC slow path needs the latest capture to stay
                        // on the HIC route in VFX.add.
                        if (
                            isSupported &&
                            latestCaptureRef.current &&
                            el instanceof HTMLCanvasElement
                        ) {
                            return vfx.add(el, p, latestCaptureRef.current);
                        }
                        return vfx.add(el, p);
                    });
                    lastAppliedRef.current = next;
                } catch (err) {
                    console.error("[react-vfx] applyDelta failed:", err);
                }
            });
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
