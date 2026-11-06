"use client";

import { VFX } from "@vfx-js/core";
import { useEffect, useRef } from "react";
import { contourShader } from "../_lib/contour";

const LEVELS = 28;
const SPEED = 0.04;
const OPACITY = 0.16;

/**
 * Animated contour lines, drawn by a VFX-JS instance of its own.
 * Its canvas sits inside the hero, so transitions capture it. Plays only while `active`.
 */
export function ContourCanvas({ active }: { active: boolean }) {
    const wrapper = useRef<HTMLDivElement>(null);
    const area = useRef<HTMLDivElement>(null);
    const vfx = useRef<VFX | null>(null);

    useEffect(() => {
        const wrapperEl = wrapper.current;
        const areaEl = area.current;
        if (!wrapperEl || !areaEl) {
            return;
        }
        const dpr = Math.min(window.devicePixelRatio, 2);
        const instance = VFX.init({
            wrapper: wrapperEl,
            zIndex: -1,
            // A fixed canvas matches the element rects, which are viewport based.
            scrollPadding: false,
            pixelRatio: dpr,
            autoplay: false,
        });
        if (!instance) {
            return;
        }
        const [r, g, b] = parseColor(getComputedStyle(wrapperEl).color);
        instance.add(areaEl, {
            shader: contourShader,
            uniforms: {
                levels: LEVELS,
                speed: SPEED,
                dpr,
                ink: [r, g, b, OPACITY],
            },
        });
        vfx.current = instance;
        return () => {
            vfx.current = null;
            instance.destroy();
        };
    }, []);

    useEffect(() => {
        const instance = vfx.current;
        if (!instance || !active) {
            return;
        }
        // Draw now so a transition capture sees the lines.
        instance.render();
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }
        instance.play();
        return () => instance.stop();
    }, [active]);

    return (
        <div className="hero-contour" ref={wrapper} aria-hidden>
            <div className="hero-contour-area" ref={area} />
        </div>
    );
}

/** "rgb(r, g, b)" to 0..1 channels. */
function parseColor(color: string) {
    const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r / 255, g / 255, b / 255];
}
