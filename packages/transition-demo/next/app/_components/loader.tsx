"use client";

import { setNextTransition } from "@vfx-js/react";
import { crossfade, lensDistortion } from "@vfx-js/transitions";
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

// The CSS logo animation starts at first paint, before hydration.
// So wait for it to end, not for a timer.
const logoDrawn = () =>
    Promise.all(
        (
            document
                .querySelector(".loader")
                ?.getAnimations({ subtree: true }) ?? []
        ).map((a) => a.finished.catch(() => {})),
    );

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
        let cancelled = false;
        Promise.all([
            document.fonts.ready,
            pageLoaded(),
            logoDrawn(),
            new Promise((r) => setTimeout(r, MIN_SHOW_MS)),
        ]).then(() => {
            if (cancelled) {
                return;
            }
            setNextTransition(
                isTop.current
                    ? { transition: lensDistortion, duration: 1.4 }
                    : { transition: crossfade, duration: 0.3 },
            );
            setLoaded(true);
            document.documentElement.removeAttribute("data-loading");
        });
        return () => {
            cancelled = true;
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
