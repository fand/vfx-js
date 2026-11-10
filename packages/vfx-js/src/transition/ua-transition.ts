/** Tells a run whether the browser already animated its navigation, e.g. a swipe back on a phone. */
export type UATransitions = {
    /**
     * An id for that navigation while its entry is current, else undefined.
     * Each handle cuts once per id. User input clears it, so later runs play.
     */
    current(): number | undefined;
};

type PopStateEventLike = Event & { hasUAVisualTransition?: boolean };

type NavigateEventLike = Event & {
    navigationType?: string;
    hasUAVisualTransition?: boolean;
    destination?: { key?: string | null };
};

export type NavigationLike = EventTarget & {
    currentEntry?: { key?: string } | null;
};

export type WindowLike = EventTarget & { location: { href: string } };

export function createUATransitions(
    navigation: NavigationLike | undefined,
    win: WindowLike | undefined,
): UATransitions {
    let seq = 0;
    // The navigation the browser animated last, by entry key or, without the Navigation API, by URL.
    let animated: { id: number; key?: string; href?: string } | undefined;
    navigation?.addEventListener("navigate", (e) => {
        const event = e as NavigateEventLike;
        // Routers like Next.js replace the state right after a traverse; the entry stays.
        if (event.navigationType === "replace") {
            return;
        }
        const key = event.hasUAVisualTransition && event.destination?.key;
        animated = key ? { id: ++seq, key } : undefined;
    });
    // Older Safari has the flag only on popstate.
    if (!navigation && win) {
        win.addEventListener("popstate", (e) => {
            animated = (e as PopStateEventLike).hasUAVisualTransition
                ? { id: ++seq, href: win.location.href }
                : undefined;
        });
    }
    // A tap or key press after the navigation starts runs of its own.
    const clear = () => {
        animated = undefined;
    };
    win?.addEventListener("pointerdown", clear, true);
    win?.addEventListener("keydown", clear, true);
    return {
        current() {
            if (!animated) {
                return undefined;
            }
            const current = animated.key
                ? navigation?.currentEntry?.key === animated.key
                : win?.location.href === animated.href;
            return current ? animated.id : undefined;
        },
    };
}

let shared: UATransitions | undefined;

/** One store per document. It starts listening on first use. */
export function sharedUATransitions(): UATransitions {
    shared ??= createUATransitions(
        (globalThis as { navigation?: NavigationLike }).navigation,
        typeof window === "undefined" ? undefined : window,
    );
    return shared;
}
