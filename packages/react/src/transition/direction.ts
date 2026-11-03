import { markBackNavigation } from "./store.js";

type NavigateEventLike = Event & {
    navigationType?: string;
    destination?: { index: number };
};

type NavigationLike = EventTarget & {
    currentEntry?: { index: number } | null;
};

/**
 * Call `onBack` on history traversal backward.
 * Uses the Navigation API when present, else treats every `popstate` as back.
 */
export function watchNavigationDirection(
    onBack: () => void = markBackNavigation,
): () => void {
    const navigation = (window as { navigation?: NavigationLike }).navigation;
    if (navigation) {
        const onNavigate = (event: Event) => {
            const e = event as NavigateEventLike;
            if (e.navigationType !== "traverse") {
                return;
            }
            const from = navigation.currentEntry?.index ?? -1;
            const to = e.destination?.index ?? -1;
            // An unknown index counts as back.
            if (from < 0 || to < 0 || to < from) {
                onBack();
            }
        };
        navigation.addEventListener("navigate", onNavigate);
        return () => navigation.removeEventListener("navigate", onNavigate);
    }
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
}
