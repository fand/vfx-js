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

// The CSS logo animation starts at first paint, before hydration.
// So wait for it to end, not for a timer.
const logoDrawn = () => animationsDone(".loader .brand-mark");

// Two frames, so the full bar is rendered and its transition has started.
const nextPaint = () =>
    new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * `loaded` is false until fonts and images are in.
 * Then the next outlet run goes from the cover to the page:
 * lensDistortion on the top page, a short crossfade elsewhere.
 * `progress` is the share of waits done, 0 to 1.
 */
export function useLoaded(): { loaded: boolean; progress: number } {
    const [loaded, setLoaded] = useState(false);
    const [done, setDone] = useState(0);
    // The path at mount; the cover only shows on the first page.
    const isTop = useRef(usePathname() === "/");
    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;
        const waits = [
            document.fonts.ready,
            pageLoaded(),
            logoDrawn(),
            new Promise((r) => setTimeout(r, MIN_SHOW_MS)),
        ].map((p) => p.then(() => !cancelled && setDone((n) => n + 1)));
        Promise.all(waits)
            .then(nextPaint)
            .then(() => animationsDone(".loader-bar"))
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
    // Hydration counts as the first step.
    return { loaded, progress: (done + 1) / (WAIT_COUNT + 1) };
}

const WAIT_COUNT = 4;

/** Black screen with the logo, over the page until it is ready. */
export function LoaderCover({ progress }: { progress: number }) {
    return (
        <div className="loader" aria-hidden>
            <BrandMark />
            <div
                className="loader-bar"
                data-done={progress >= 1 || undefined}
                style={{ "--p": progress } as React.CSSProperties}
            />
        </div>
    );
}
