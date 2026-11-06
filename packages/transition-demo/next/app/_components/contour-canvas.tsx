"use client";

import { useEffect, useRef } from "react";
import { startContour } from "../_lib/contour";

/** Animated contour lines of simplex noise. Draws only while `active`. */
export function ContourCanvas({ active }: { active: boolean }) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const el = canvas.current;
        if (!active || !el) {
            return;
        }
        return startContour(el);
    }, [active]);

    return <canvas className="hero-contour" ref={canvas} aria-hidden />;
}
