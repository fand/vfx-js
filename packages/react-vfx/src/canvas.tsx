import type { VFXProps } from "@vfx-js/core";
import {
    setupCapture,
    supportsHtmlInCanvas,
    teardownCapture,
} from "@vfx-js/core";
import * as React from "react";
import { useContext, useEffect, useRef } from "react";
import { VFXContext } from "./context.js";

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

        const {
            shader,
            release,
            uniforms,
            overflow,
            wrap,
            children,
            className,
            style,
            ...rest
        } = props;

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

            const vfxOpts: VFXProps = {
                shader,
                release,
                uniforms,
                overflow,
                wrap,
            };

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
                    vfx.add(canvas, vfxOpts, initialCapture);
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

            vfx.add(el, vfxOpts);

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
        }, [vfx, shader, release, uniforms, overflow, wrap, isSupported]);

        if (isSupported) {
            return React.createElement(
                "canvas",
                {
                    ...rest,
                    ref: canvasRef,
                    layoutsubtree: "",
                    className,
                    style,
                },
                React.createElement("div", null, children),
            );
        }

        return React.createElement(
            "div",
            { ...rest, ref: fallbackRef, className, style },
            children,
        );
    },
);
