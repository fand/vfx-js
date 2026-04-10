import type { VFXProps } from "@vfx-js/core";
import { supportsHtmlInCanvas } from "@vfx-js/core";
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
        const contentRef = useRef<HTMLDivElement>(null);
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
            if (!vfx) return;

            const vfxOpts: VFXProps = {
                shader,
                release,
                uniforms,
                overflow,
                wrap,
            };

            if (isSupported) {
                const canvas = canvasRef.current;
                if (!canvas) return;

                vfx.add(canvas, vfxOpts);

                // MutationObserver for content changes
                const mo = new MutationObserver(() => vfx.update(canvas));
                mo.observe(canvas, {
                    characterData: true,
                    attributes: true,
                    childList: true,
                    subtree: true,
                });

                // ResizeObserver to update canvas pixel buffer
                const content = contentRef.current;
                const ro = content
                    ? new ResizeObserver(() => {
                          const dpr = window.devicePixelRatio;
                          canvas.width = Math.round(content.offsetWidth * dpr);
                          canvas.height = Math.round(
                              content.offsetHeight * dpr,
                          );
                          vfx.update(canvas);
                      })
                    : null;
                if (content) ro?.observe(content);

                return () => {
                    mo.disconnect();
                    ro?.disconnect();
                    vfx.remove(canvas);
                };
            } else {
                // Fallback: behave like VFXDiv
                const el = fallbackRef.current;
                if (!el) return;

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
            }
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
                React.createElement("div", { ref: contentRef }, children),
            );
        }

        // Fallback: render as div
        return React.createElement(
            "div",
            { ...rest, ref: fallbackRef, className, style },
            children,
        );
    },
);
