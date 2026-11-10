/** Tells a run whether the browser already animated its navigation, e.g. a swipe back on a phone. */
export type UATransitions = {
    /** True once per such navigation, while its entry is current. */
    take(): boolean;
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
    navigation: NavigationLike | undefined = (
        globalThis as { navigation?: NavigationLike }
    ).navigation,
): UATransitions {
    // The entry the browser animated to last.
    let animatedKey: string | undefined;
    navigation?.addEventListener("navigate", (e) => {
        const event = e as NavigateEventLike;
        // Routers like Next.js replace the state right after a traverse; the entry stays.
        if (event.navigationType === "replace") {
            return;
        }
        animatedKey = event.hasUAVisualTransition
            ? (event.destination?.key ?? undefined)
            : undefined;
    });
    return {
        take() {
            const key = animatedKey;
            if (!key || navigation?.currentEntry?.key !== key) {
                return false;
            }
            animatedKey = undefined;
            return true;
        },
    };
}

let shared: UATransitions | undefined;

/** One store per document. It starts listening on first use. */
export function sharedUATransitions(): UATransitions {
    shared ??= createUATransitions();
    return shared;
}
