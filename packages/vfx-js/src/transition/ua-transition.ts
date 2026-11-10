/** Tells a run whether the browser already animated its navigation, e.g. a swipe back on a phone. */
export type UATransitions = {
    /**
     * An id for that navigation while its entry is current, else undefined.
     * Each handle cuts once per id. User input clears it, so later runs play.
     */
    current(): number | undefined;
};

type NavigateEventLike = Event & {
    navigationType?: string;
    hasUAVisualTransition?: boolean;
    destination?: { key?: string | null };
};

export type NavigationLike = EventTarget & {
    currentEntry?: { key?: string } | null;
};

export function createUATransitions(
    navigation: NavigationLike | undefined,
    input: EventTarget | undefined,
): UATransitions {
    let seq = 0;
    // The navigation the browser animated last.
    let animated: { id: number; key: string } | undefined;
    navigation?.addEventListener("navigate", (e) => {
        const event = e as NavigateEventLike;
        // Routers like Next.js replace the state right after a traverse; the entry stays.
        if (event.navigationType === "replace") {
            return;
        }
        const key = event.hasUAVisualTransition && event.destination?.key;
        animated = key ? { id: ++seq, key } : undefined;
    });
    // A tap or key press after the navigation starts runs of its own.
    const clear = () => {
        animated = undefined;
    };
    input?.addEventListener("pointerdown", clear, true);
    input?.addEventListener("keydown", clear, true);
    return {
        current() {
            if (animated && navigation?.currentEntry?.key === animated.key) {
                return animated.id;
            }
            return undefined;
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
