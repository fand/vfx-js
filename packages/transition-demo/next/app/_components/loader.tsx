"use client";

import { setNextTransition } from "@vfx-js/react";
import { lensDistortion } from "@vfx-js/transitions";
import { useEffect, useState } from "react";
import { BrandMark } from "./header";

// Keep the logo up this long, so it does not just flash.
// It also gives VFX-JS time to attach the transition.
const MIN_SHOW_MS = 300;

const pageLoaded = () =>
    new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
            resolve();
            return;
        }
        window.addEventListener("load", () => resolve(), { once: true });
    });

/**
 * False until fonts and images are in.
 * Then the next outlet run plays lensDistortion, from the cover to the page.
 */
export function useLoaded(): boolean {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            document.fonts.ready,
            pageLoaded(),
            new Promise((r) => setTimeout(r, MIN_SHOW_MS)),
        ]).then(() => {
            if (cancelled) {
                return;
            }
            setNextTransition({ transition: lensDistortion, duration: 1.4 });
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
