"use client";

import type { RunOpts } from "@vfx-js/core";
import { setNextTransition } from "@vfx-js/react";
import { Crossfade, LensDistortion } from "@vfx-js/transitions";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./header";

// Gives VFX-JS time to attach the transition.
const MIN_SHOW_MS = 300;

const pageLoaded = () =>
    new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
            resolve();
            return;
        }
        window.addEventListener("load", () => resolve(), { once: true });
    });

const animationsDone = (selector: string) =>
    Promise.all(
        (
            document
                .querySelector(selector)
                ?.getAnimations({ subtree: true }) ?? []
        ).map((a) => a.finished.catch(() => {})),
    );

// Two frames, so the new style is rendered and its transition has started.
const nextPaint = () =>
    new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

// Hydration is the first step, so the logo starts at 1 / STEPS.
const WAIT_COUNT = 3;
const STEPS = WAIT_COUNT + 1;
const step = (done: number) => (done + 1) / STEPS;

// How far the logo creeps toward the next step while it waits.
const CREEP = 0.9;
// Time constants in seconds: catch up to a finished step, and creep.
const CATCH_UP = 0.1;
const CREEP_TIME = 1.5;

/**
 * Draws the logo stroke as the waits finish.
 * Between steps it creeps on, so it never looks stuck.
 * Resolves when the stroke is full.
 */
function drawProgress(
    loader: HTMLElement,
    getDone: () => number,
    isCancelled: () => boolean,
): Promise<void> {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = step(0);
    let last = performance.now();
    return new Promise((resolve) => {
        const frame = (now: number) => {
            if (isCancelled()) {
                return;
            }
            const dt = (now - last) / 1000;
            last = now;
            const done = getDone();
            const reached = step(done);
            const full = done === WAIT_COUNT;
            const target =
                full || reduced
                    ? reached
                    : reached + (step(done + 1) - reached) * CREEP;
            const tau = shown < reached || full ? CATCH_UP : CREEP_TIME;
            shown = reduced
                ? target
                : shown + (target - shown) * (1 - Math.exp(-dt / tau));
            if (full && 1 - shown < 0.002) {
                loader.style.setProperty("--p", "1");
                resolve();
                return;
            }
            loader.style.setProperty("--p", String(shown));
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
}

/**
 * False until fonts and images are in.
 * Then the next outlet run goes from the cover to the page:
 * lensDistortion on the top page, a short crossfade elsewhere.
 */
export function useLoaded(): boolean {
    const [loaded, setLoaded] = useState(false);
    // The path at mount; the cover only shows on the first page.
    const isTop = useRef(usePathname() === "/");
    useEffect(() => {
        const loader = document.querySelector<HTMLElement>(".loader");
        if (!loader) {
            return;
        }
        let cancelled = false;
        let timer: number | undefined;
        let done = 0;
        for (const wait of [
            document.fonts.ready,
            pageLoaded(),
            new Promise((r) => setTimeout(r, MIN_SHOW_MS)),
        ]) {
            wait.then(() => {
                done++;
            });
        }
        drawProgress(
            loader,
            () => done,
            () => cancelled,
        )
            .then(() => {
                // Fill the logo, then leave.
                loader.dataset.done = "";
            })
            .then(nextPaint)
            .then(() => animationsDone(".loader .brand-mark"))
            .then(() => {
                if (cancelled) {
                    return;
                }
                const spec: RunOpts = isTop.current
                    ? { transition: LensDistortion, duration: 1.4 }
                    : { transition: Crossfade, duration: 0.3 };
                setNextTransition(spec);
                setLoaded(true);
                // Show the header after the run, so it stays off the cover.
                timer = window.setTimeout(
                    () => {
                        document.documentElement.removeAttribute(
                            "data-loading",
                        );
                    },
                    (spec.duration ?? 0) * 1000,
                );
            });
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, []);
    return loaded;
}

/** Black screen with the logo, over the page until it is ready. */
export function LoaderCover() {
    return (
        <div className="loader" aria-hidden>
            <BrandMark />
        </div>
    );
}
