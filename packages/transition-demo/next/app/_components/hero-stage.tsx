"use client";

import { useVFXTransition } from "@vfx-js/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { presetList, presets } from "../_lib/presets";
import type { PresetName } from "../_lib/site";
import { TLink } from "./t-link";

const AUTOPLAY_INTERVAL = 3000;
/** Items drawn on each side of the current one. */
const REACH = 3;

const names = presetList.map((p) => p.name);

const labels: Record<PresetName, string> = {
    crossfade: "Crossfade",
    swipe: "Swipe",
    zoom: "Zoom",
    zoomBlur: "ZoomBlur",
    crosszoom: "CrossZoom",
    glitch: "Glitch",
    glitchSlide: "GlitchSlide",
    jpegGlitch: "JpegGlitch",
    datamosh: "Datamosh",
    pixelsort: "PixelSort",
};

/** The hero word changes with the theme. */
const words: Partial<Record<PresetName, string>> = {
    swipe: "TRANSITIONS",
    glitch: "TRANSITIONS",
    jpegGlitch: "トランジション",
    zoomBlur: "transitions_",
};

const nameAt = (pos: number) =>
    names[((pos % names.length) + names.length) % names.length];

/** The hero. Each preset has its own theme, and the preset plays on switch. */
export function HeroStage() {
    const { ref, run } = useVFXTransition({ duration: 1.1, overflow: 0 });
    // A position on an endless strip. The preset is `nameAt(pos)`.
    const [pos, setPos] = useState(0);
    const [theme, setTheme] = useState<PresetName>(nameAt(0));
    const [autoplay, setAutoplay] = useState(true);
    const posRef = useRef(0);
    const busy = useRef(false);
    const section = useRef<HTMLElement | null>(null);

    /** Plays the preset `step` items away. The carousel moves with the theme. */
    const go = useCallback(
        async (step: number) => {
            if (busy.current) {
                return;
            }
            busy.current = true;
            const next = posRef.current + step;
            const name = nameAt(next);
            await run(
                () => {
                    posRef.current = next;
                    setPos(next);
                    setTheme(name);
                },
                { transition: presets[name] },
            );
            busy.current = false;
        },
        [run],
    );

    useEffect(() => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setAutoplay(false);
        }
    }, []);

    useEffect(() => {
        if (!autoplay) {
            return;
        }
        let visible = true;
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
        });
        if (section.current) {
            io.observe(section.current);
        }
        const id = setInterval(() => {
            if (visible && !document.hidden) {
                go(1);
            }
        }, AUTOPLAY_INTERVAL);
        return () => {
            clearInterval(id);
            io.disconnect();
        };
    }, [autoplay, go]);

    const setRefs = useCallback(
        (el: HTMLElement | null) => {
            section.current = el;
            ref(el);
        },
        [ref],
    );

    const item = (offset: number) => {
        const name = nameAt(pos + offset);
        return (
            <button
                key={pos + offset}
                type="button"
                className="carousel-item"
                data-current={offset === 0 || undefined}
                tabIndex={Math.abs(offset) > 1 ? -1 : undefined}
                aria-label={
                    offset === 0
                        ? `Play ${labels[name]} again`
                        : `Play ${labels[name]}`
                }
                onClick={() => {
                    setAutoplay(false);
                    go(offset);
                }}
            >
                {offset === 0 && <span className="carousel-play" aria-hidden />}
                {labels[name]}
            </button>
        );
    };
    const before = [];
    const after = [];
    for (let i = 1; i <= REACH; i++) {
        before.unshift(item(-i));
        after.push(item(i));
    }

    return (
        <section className="hero" data-theme={theme} ref={setRefs}>
            <div className="hero-glow" aria-hidden />
            <p className="eyebrow">
                <span className="pill">new</span> @vfx-js/transitions
            </p>
            <h1 className="hero-title">
                Shader{" "}
                <em className="hero-em">{words[theme] ?? "transitions"}</em>
                <br />
                for the DOM.
            </h1>
            {/* The side columns share the spare width, so the current item stays centered. */}
            <div className="carousel">
                <div className="carousel-side">{before}</div>
                {item(0)}
                <div className="carousel-side">{after}</div>
            </div>
            <p className="hero-tagline">
                Swap any element — a tab, a carousel, a whole page — through a
                WebGL shader. One component for React. A few lines for
                everything else.
            </p>
            <div className="hero-cta">
                <Link href="/getting-started" className="btn btn-primary">
                    Get started
                </Link>
                {/* A click spec beats the page's own (pixelsort). */}
                <TLink
                    href="/transitions"
                    preset="datamosh"
                    className="btn btn-ghost"
                >
                    See all transitions →
                </TLink>
            </div>
            <div className="hero-install">
                <code>npm i @vfx-js/core @vfx-js/transitions</code>
            </div>
            <span className="scroll-cue" aria-hidden>
                scroll
            </span>
        </section>
    );
}
