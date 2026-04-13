import type { VFXProps } from "@vfx-js/core";
import {
    setupCapture,
    supportsHtmlInCanvas,
    teardownCapture,
} from "@vfx-js/core";
import * as React from "react";
import { useContext, useEffect, useRef } from "react";
import { VFXContext } from "./context.js";
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

        // Forward ref
        useEffect(() => {
            const el = isSupported ? canvasRef.current : fallbackRef.current;
            if (parentRef instanceof Function) {
                parentRef(el);
            } else if (parentRef) {
                parentRef.current = el;
            }
        }, [parentRef, isSupported]);

        // VFX registration
        useEffect(() => {
            if (!vfx) {
                return;
            }

            if (isSupported) {
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }

                let cancelled = false;
                setupCapture(canvas, {
                    onCapture: (offscreen) =>
                        vfx.updateHICTexture(canvas, offscreen),
                    maxSize: vfx.maxTextureSize,
                }).then((initialCapture) => {
                    if (cancelled) {
                        return;
                    }
                    vfx.add(canvas, vfxProps, initialCapture);
                });

                return () => {
                    cancelled = true;
                    teardownCapture(canvas);
                    vfx.remove(canvas);
                };
            }

            // Fallback: behave like VFXDiv
            const el = fallbackRef.current;
            if (!el) {
                return;
            }

            vfx.add(el, vfxProps);

            const mo = new MutationObserver(() => vfx.update(el));
            mo.observe(el, {
                characterData: true,
                attributes: true,
                childList: true,
                subtree: true,
            });

            return () => {
                mo.disconnect();
                vfx.remove(el);
            };
        }, [vfx, vfxProps, isSupported]);

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
