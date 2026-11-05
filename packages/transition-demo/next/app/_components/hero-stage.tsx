"use client";

import type { TransitionDef, TransitionEffect } from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { presetList, presets } from "../_lib/presets";
import type { PresetName } from "../_lib/site";
import { TLink } from "./t-link";

const AUTOPLAY_INTERVAL = 3000;
const SLIDE_MS = 200;
/** Copies of the list. The middle one is home; the rest let it scroll endlessly. */
const COPIES = 5;
const HOME = Math.floor(COPIES / 2);

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

/** The hero. Each preset has its own theme, and the preset plays on switch. */
export function HeroStage() {
    const { ref, run } = useVFXTransition({ duration: 1.1, overflow: 0 });
    const [theme, setTheme] = useState<PresetName>(names[0]);
    // The item to center, as an index into the repeated list.
    // A new object each time, so a repeat click centers again.
    const [focus, setFocus] = useState({ index: HOME * names.length });
    const [autoplay, setAutoplay] = useState(true);
    const focusRef = useRef(focus.index);
    const busy = useRef(false);
    const section = useRef<HTMLElement | null>(null);
    const list = useRef<HTMLDivElement>(null);
    // Called once when the next run starts to play.
    const onPlay = useRef<(() => void) | null>(null);
    const hooked = useMemo(() => {
        const fire = () => {
            const f = onPlay.current;
            onPlay.current = null;
            f?.();
        };
        return Object.fromEntries(
            names.map((n) => [n, withPlayHook(presets[n], fire)]),
        ) as Record<PresetName, TransitionDef>;
    }, []);

    /**
     * Plays the preset at `index` and centers the list on it.
     * With `slide`, the list scrolls there once the run starts to play.
     * The new side of the run is live (html-in-canvas), so the scroll shows.
     */
    const go = useCallback(
        async (index: number, slide = false) => {
            if (busy.current) {
                return;
            }
            busy.current = true;
            const name = names[index % names.length];
            const center = () => {
                const el = list.current;
                const item = el?.children[index] as HTMLElement | undefined;
                if (!el || !item) {
                    return;
                }
                if (!slide || reducedMotion()) {
                    el.scrollLeft = centerOf(el, item);
                    focusRef.current += wrapScroll(el);
                    return;
                }
                scrollToCenter(el, item, SLIDE_MS).then(() => {
                    focusRef.current += wrapScroll(el);
                });
            };
            onPlay.current = center;
            await run(
                () => {
                    focusRef.current = index;
                    setFocus({ index });
                    setTheme(name);
                },
                { transition: hooked[name] },
            );
            // The run ended without playing, e.g. it was cancelled.
            if (onPlay.current === center) {
                onPlay.current = null;
                center();
            }
            busy.current = false;
        },
        [run, hooked],
    );

    useLayoutEffect(() => {
        const el = list.current;
        const item = el?.children[focus.index] as HTMLElement | undefined;
        if (!el || !item) {
            return;
        }
        el.dataset.ready = "";
        // A run centers the list itself once it plays.
        if (busy.current) {
            return;
        }
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
                    {current && <span className="carousel-play" aria-hidden />}
                    {labels[name]}
                </button>,
            );
        }
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
            <div className="carousel" ref={list}>
                {items}
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

const reducedMotion = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The scrollLeft that puts `item` in the middle of `el`. */
function centerOf(el: HTMLElement, item: HTMLElement) {
    return item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2;
}

/** Scrolls `item` to the middle over `ms`. Native smooth scroll has no duration. */
function scrollToCenter(el: HTMLElement, item: HTMLElement, ms: number) {
    const from = el.scrollLeft;
    const to = centerOf(el, item);
    return new Promise<void>((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / ms);
            el.scrollLeft = from + (to - from) * (1 - (1 - t) ** 3);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

/** Wraps `def` so `onPlay` fires on the first frame each run plays. */
function withPlayHook(def: TransitionDef, onPlay: () => void): TransitionDef {
    return {
        // Keep fields like `overflow` that core may read from the def.
        ...def,
        create() {
            let playing = false;
            // No `render`, so the chain passes its input through.
            const hook: TransitionEffect = {
                start() {
                    playing = false;
                },
                update() {
                    if (!playing) {
                        playing = true;
                        onPlay();
                    }
                },
            };
            return [def.create(), hook].flat();
        },
    };
}
