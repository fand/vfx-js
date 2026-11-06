"use client";

import { useVFXTransition } from "@vfx-js/react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { presetList, presets } from "../_lib/presets";
import type { PresetName } from "../_lib/site";
import { PatternCanvas } from "./pattern-canvas";
import { TLink } from "./t-link";

const AUTOPLAY_INTERVAL = 3000;
const BLINK_MS = 300;
/** Copies of the list. The middle one is home; the rest let it scroll endlessly. */
const COPIES = 5;
const HOME = Math.floor(COPIES / 2);

// crossfade is too plain to show off.
const names = presetList
    .map((p) => p.name)
    .filter((name) => name !== "crossfade");

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
    lensDistortion: "LensDistortion",
    slitScan: "SlitScan",
    pixelScan: "PixelScan",
    pixelStretch: "PixelStretch",
    tile: "Tile",
    distortFade: "DistortFade",
};

/** Each run picks a new palette and pattern at random. */
const palettes = ["default", "orange", "purple", "green"];
const patterns = ["dots", "grid", "diagonal", "contour", "sine"];

/** The hero word changes with the theme. */
const words: Partial<Record<PresetName, string>> = {
    swipe: "TRANSITIONS",
    glitch: "TRANSITIONS",
    jpegGlitch: "トランジション",
    zoomBlur: "transitions_",
};

/**
 * The hero. A switch plays the preset and sets a random palette and pattern.
 * Some presets also change the title font.
 */
export function HeroStage() {
    const { ref, run } = useVFXTransition({ duration: 1.1, overflow: 0 });
    const [theme, setTheme] = useState<PresetName>(names[0]);
    const [look, setLook] = useState({ palette: "default", pattern: "dots" });
    // The item to center, as an index into the repeated list.
    // A new object each time, so a repeat click centers again.
    const [focus, setFocus] = useState({ index: HOME * names.length });
    // Off for now; set to true to step through presets again.
    const [autoplay, setAutoplay] = useState(false);
    const focusRef = useRef(focus.index);
    const busy = useRef(false);
    const section = useRef<HTMLElement | null>(null);
    const list = useRef<HTMLDivElement>(null);

    /**
     * Plays the preset at `index`. The list is centered on it when the run lands.
     * With `blinkFirst`, the clicked item blinks before the run.
     */
    const go = useCallback(
        async (index: number, blinkFirst = false) => {
            if (busy.current) {
                return;
            }
            busy.current = true;
            const name = names[index % names.length];
            const item = list.current?.children[index] as
                | HTMLElement
                | undefined;
            if (blinkFirst && item && !reducedMotion()) {
                await blink(item, BLINK_MS);
            }
            await run(
                () => {
                    focusRef.current = index;
                    setFocus({ index });
                    setTheme(name);
                    setLook((prev) => ({
                        palette: pickOther(palettes, prev.palette),
                        pattern: pickOther(patterns, prev.pattern),
                    }));
                },
                { transition: presets[name] },
            );
            busy.current = false;
        },
        [run],
    );

    useLayoutEffect(() => {
        const el = list.current;
        const item = el?.children[focus.index] as HTMLElement | undefined;
        if (!el || !item) {
            return;
        }
        el.dataset.ready = "";
        el.scrollLeft = centerOf(el, item);
        focusRef.current += wrapScroll(el);
    }, [focus]);

    useEffect(() => {
        const el = list.current;
        if (!el) {
            return;
        }
        // Jump back to the home copy once scrolling stops.
        let timer = 0;
        const onScrollEnd = () => {
            // Runs and slides set the scroll themselves.
            if (busy.current) {
                return;
            }
            focusRef.current += wrapScroll(el);
        };
        const onScroll = () => {
            clearTimeout(timer);
            timer = window.setTimeout(onScrollEnd, 150);
        };
        const stop = () => setAutoplay(false);
        const hasScrollEnd = "onscrollend" in window;
        el.addEventListener(
            hasScrollEnd ? "scrollend" : "scroll",
            hasScrollEnd ? onScrollEnd : onScroll,
        );
        el.addEventListener("pointerdown", stop);
        el.addEventListener("wheel", stop, { passive: true });
        el.addEventListener("touchstart", stop, { passive: true });
        return () => {
            clearTimeout(timer);
            el.removeEventListener("scrollend", onScrollEnd);
            el.removeEventListener("scroll", onScroll);
            el.removeEventListener("pointerdown", stop);
            el.removeEventListener("wheel", stop);
            el.removeEventListener("touchstart", stop);
        };
    }, []);

    // Keep the header clear while the hero is under it.
    useEffect(() => {
        const hero = section.current;
        const frame = hero?.closest(".frame");
        if (!hero || !frame) {
            return;
        }
        const root = document.documentElement;
        const update = () => {
            const header = document.querySelector(".header")?.clientHeight ?? 0;
            const under = frame.scrollTop < hero.offsetHeight - header;
            if (under) {
                root.dataset.header = "clear";
            } else {
                delete root.dataset.header;
            }
        };
        update();
        frame.addEventListener("scroll", update, { passive: true });
        return () => {
            frame.removeEventListener("scroll", update);
            delete root.dataset.header;
        };
    }, []);

    useEffect(() => {
        if (reducedMotion()) {
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
                go(focusRef.current + 1);
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

    /** Scrolls the list by half its width, without playing a preset. */
    const scrollList = (direction: number) => {
        const el = list.current;
        if (!el) {
            return;
        }
        setAutoplay(false);
        el.scrollBy({
            left: (direction * el.clientWidth) / 2,
            behavior: reducedMotion() ? "auto" : "smooth",
        });
    };

    const items = [];
    for (let copy = 0; copy < COPIES; copy++) {
        const home = copy === HOME;
        for (const [k, name] of names.entries()) {
            const index = copy * names.length + k;
            const current = name === theme;
            items.push(
                <button
                    key={index}
                    type="button"
                    className="carousel-item"
                    data-current={current || undefined}
                    tabIndex={home ? undefined : -1}
                    aria-hidden={home ? undefined : true}
                    aria-label={
                        current
                            ? `Play ${labels[name]} again`
                            : `Play ${labels[name]}`
                    }
                    onClick={() => {
                        setAutoplay(false);
                        go(index, true);
                    }}
                >
                    <span className="carousel-play" aria-hidden />
                    <span className="carousel-label">{labels[name]}</span>
                </button>,
            );
        }
    }

    return (
        <section
            className="hero"
            data-theme={theme}
            data-palette={look.palette}
            data-pattern={look.pattern}
            ref={setRefs}
        >
            <div className="hero-glow" aria-hidden />
            <PatternCanvas pattern={look.pattern} />
            <p className="eyebrow">
                <span className="pill">new</span> @vfx-js/transitions
            </p>
            <h1 className="hero-title">
                Shader{" "}
                <em className="hero-em">{words[theme] ?? "transitions"}</em>
                <br />
                for the DOM.
            </h1>
            {/* The frame gives the grown item room without moving the layout. */}
            <div className="carousel-frame">
                <div className="carousel" ref={list}>
                    {items}
                </div>
                {/* The list loops, so it can always scroll both ways. */}
                <button
                    type="button"
                    className="carousel-arrow"
                    data-side="left"
                    aria-label="Scroll presets left"
                    onClick={() => scrollList(-1)}
                />
                <button
                    type="button"
                    className="carousel-arrow"
                    data-side="right"
                    aria-label="Scroll presets right"
                    onClick={() => scrollList(1)}
                />
            </div>
            <p className="hero-tagline">
                Next-level page transitions with HTML-in-Canvas. Your live pages
                go through WebGL shaders, in a few lines of React or plain JS.
            </p>
            <div className="hero-cta">
                <Link href="/getting-started" className="btn btn-primary">
                    Get started
                </Link>
                {/* A click spec beats the page's own (pixelsort). */}
                <TLink
                    href="/presets"
                    preset="datamosh"
                    className="btn btn-ghost"
                >
                    See all presets →
                </TLink>
            </div>
            <span className="scroll-cue" aria-hidden>
                scroll
            </span>
        </section>
    );
}

/**
 * Moves the scroll by whole copies so the center sits in the home copy.
 * The copies look the same, so the jump is invisible.
 * Returns the index shift.
 */
function wrapScroll(el: HTMLElement) {
    const first = el.children[0] as HTMLElement;
    const nextCopy = el.children[names.length] as HTMLElement;
    const copyWidth = nextCopy.offsetLeft - first.offsetLeft;
    const center = el.scrollLeft + el.clientWidth / 2 - first.offsetLeft;
    const shift = HOME - Math.floor(center / copyWidth);
    if (shift !== 0) {
        el.scrollLeft += shift * copyWidth;
    }
    return shift * names.length;
}

/** A random item of `list` other than `current`. */
function pickOther(list: string[], current: string) {
    const rest = list.filter((x) => x !== current);
    return rest[Math.floor(Math.random() * rest.length)];
}

const reducedMotion = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The scrollLeft that puts `item` in the middle of `el`. */
function centerOf(el: HTMLElement, item: HTMLElement) {
    return item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2;
}

/** Blinks `item` for `ms`. The CSS animation runs while `data-blink` is set. */
function blink(item: HTMLElement, ms: number) {
    item.dataset.blink = "";
    return new Promise<void>((resolve) =>
        setTimeout(() => {
            delete item.dataset.blink;
            resolve();
        }, ms),
    );
}
