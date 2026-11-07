"use client";

import { VFX } from "@vfx-js/core";
import { useEffect, useRef } from "react";
import { contourShader, waveShader } from "../_lib/pattern-shaders";

const CONTOUR = { levels: 28, speed: 0.04, opacity: 0.12, lineWidth: 0.75 };
const WAVE = { count: 8, opacity: 0.16, lineWidth: 0.8 };

/** Patterns drawn by shaders. Others are plain CSS. */
const SHADER_PATTERNS = ["contour", "sine"];

/**
 * Animated hero patterns, drawn by a VFX-JS instance of its own.
 * Its canvas sits inside the hero, so transitions capture it.
 * CSS shows only the current pattern's area, and plays only while one is shown.
 */
export function PatternCanvas({ pattern }: { pattern: string }) {
    const wrapper = useRef<HTMLDivElement>(null);
    const contour = useRef<HTMLDivElement>(null);
    const wave = useRef<HTMLDivElement>(null);
    const vfx = useRef<VFX | null>(null);

    useEffect(() => {
        const wrapperEl = wrapper.current;
        const contourEl = contour.current;
        const waveEl = wave.current;
        if (!wrapperEl || !contourEl || !waveEl) {
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
        instance.add(contourEl, {
            shader: contourShader,
            uniforms: {
                levels: CONTOUR.levels,
                speed: CONTOUR.speed,
                lineWidth: CONTOUR.lineWidth,
                dpr,
                ink: [r, g, b, CONTOUR.opacity],
            },
        });
        instance.add(waveEl, {
            shader: waveShader,
            uniforms: {
                ...randomWaves(WAVE.count),
                lineWidth: WAVE.lineWidth,
                dpr,
                ink: [r, g, b, WAVE.opacity],
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
        if (!instance || !SHADER_PATTERNS.includes(pattern)) {
            return;
        }
        // Draw now so a transition capture sees the pattern.
        instance.render();
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }
        instance.play();
        return () => instance.stop();
    }, [pattern]);

    return (
        <div className="hero-shader" ref={wrapper} aria-hidden>
            <div data-pattern="contour" ref={contour} />
            <div data-pattern="sine" ref={wave} />
        </div>
    );
}

/**
 * Random waves around the middle.
 * Centers stay within 25% of the height from the middle, and crests within 40%.
 */
function randomWaves(count: number) {
    const waves: number[] = [];
    const phases: number[] = [];
    for (let i = 0; i < count; i++) {
        const center = random(-0.25, 0.25);
        const amplitude = (0.4 - Math.abs(center)) * random(0.3, 1);
        const wavelength = random(500, 1400);
        // Positive speeds move the crests from right to left.
        const speed = random(0.15, 0.5);
        waves.push(center, amplitude, wavelength, speed);
        phases.push(random(0, Math.PI * 2));
    }
    return { waves, phases };
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** "rgb(r, g, b)" to 0..1 channels. */
function parseColor(color: string) {
    const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r / 255, g / 255, b / 255];
}
