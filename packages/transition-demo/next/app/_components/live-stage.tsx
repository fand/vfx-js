"use client";

import { useVFXTransition } from "@vfx-js/react";
import { useEffect, useRef, useState } from "react";
import { presets } from "../_lib/presets";
import type { PresetName } from "../_lib/site";
import { Scene } from "./scenes";

const order: PresetName[] = [
    "pixelsort",
    "glitch",
    "zoom",
    "swipe",
    "datamosh",
    "crosszoom",
    "glitchSlide",
    "jpegGlitch",
    "zoomBlur",
];

/** Plays a preset every few seconds while it is on screen. */
export function LiveStage() {
    const { ref, run } = useVFXTransition({ duration: 1.1, overflow: 0 });
    const [scene, setScene] = useState(0);
    const [playing, setPlaying] = useState<PresetName>("crossfade");
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let visible = false;
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
        });
        if (box.current) {
            io.observe(box.current);
        }
        let i = 0;
        const id = setInterval(() => {
            if (!visible || document.hidden) {
                return;
            }
            const name = order[i++ % order.length];
            setPlaying(name);
            run(() => setScene((s) => s + 1), {
                transition: presets[name],
            });
        }, 2600);
        return () => {
            clearInterval(id);
            io.disconnect();
        };
    }, [run]);

    return (
        <div className="live" ref={box}>
            <div className="live-stage" ref={ref}>
                <Scene index={scene} />
            </div>
            <div className="live-caption">
                <span className="dot" />
                <code>{playing}</code>
                <span className="live-hint">playing now</span>
            </div>
        </div>
    );
}
