type Cleanup = () => void;

/**
 * Run `setup` on every page load, including ClientRouter navigations.
 * The cleanup it returns runs before the next page swaps in.
 */
export function onPage(setup: () => Cleanup | undefined | void): void {
    document.addEventListener("astro:page-load", () => {
        const cleanup = setup();
        if (cleanup) {
            document.addEventListener("astro:before-swap", cleanup, {
                once: true,
            });
        }
    });
}

/** The element that scrolls the page. Pages scroll inside the transition target. */
export function scrollRoot(): HTMLElement | null {
    return document.querySelector<HTMLElement>(".Page");
}

// Scroll restore for back / forward.
// The window does not scroll, so Astro's own restore does nothing for us.
// Positions live in memory per history entry, and in `history.state.pageScroll` for reloads.

type ScrollState = { index?: number; pageScroll?: number } | null;

const positions = new Map<string, number>();

// Hash links of one page share Astro's index, so the URL is part of the key.
function entryKey(): string {
    return `${location.href} ${(history.state as ScrollState)?.index}`;
}

function savedScroll(): number | undefined {
    return (
        positions.get(entryKey()) ??
        (history.state as ScrollState)?.pageScroll
    );
}

// Merge into Astro's state; Astro spreads the old state on its own updates too.
function saveToHistory(top: number) {
    if (history.state) {
        history.replaceState({ ...history.state, pageScroll: top }, "");
    }
}

// Images may still be loading, so the page can be too short at first.
// Try again for a few frames, and stop when the user scrolls.
function restoreScroll(top: number) {
    const root = scrollRoot();
    if (!root) {
        return;
    }
    let tries = 30;
    const stop = () => {
        tries = 0;
    };
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) {
        window.addEventListener(type, stop, { once: true, passive: true });
    }
    const apply = () => {
        root.scrollTop = top;
        if (tries-- > 0 && Math.abs(root.scrollTop - top) > 1) {
            requestAnimationFrame(apply);
        }
    };
    apply();
}

// On back / forward, location and history.state are already the target entry here.
// Restoring inside the swap means the transition captures the new page at that position.
function onSwap(e: Event) {
    const ev = e as Event & { navigationType: string; swap: () => void };
    if (ev.navigationType !== "traverse") {
        return;
    }
    const swap = ev.swap;
    ev.swap = () => {
        swap();
        const top = savedScroll();
        if (top !== undefined) {
            restoreScroll(top);
        }
    };
}

function installScrollRestore() {
    let path = location.pathname;
    let lastNavigation = "load";
    let pending: ReturnType<typeof setTimeout> | undefined;

    document.addEventListener("astro:before-preparation", (e) => {
        lastNavigation = e.navigationType;
        // On a push, the current entry is still the old page. On back / forward it is not.
        if (e.navigationType !== "traverse") {
            clearTimeout(pending);
            saveToHistory(scrollRoot()?.scrollTop ?? 0);
        }
        // Add it late, so it wraps the swap of <VFXTransition>, which replaces the swap without calling the old one.
        document.removeEventListener("astro:before-swap", onSwap);
        document.addEventListener("astro:before-swap", onSwap, { once: true });
    });

    onPage(() => {
        path = location.pathname;
        // A new entry may reuse the key of one dropped from the forward history.
        if (lastNavigation !== "traverse" && lastNavigation !== "load") {
            positions.delete(entryKey());
        }
        const root = scrollRoot();
        root?.addEventListener(
            "scroll",
            () => {
                const key = entryKey();
                positions.set(key, root.scrollTop);
                // history.replaceState is rate limited in some browsers, so wait for a pause.
                clearTimeout(pending);
                pending = setTimeout(() => {
                    if (entryKey() === key && root.isConnected) {
                        saveToHistory(root.scrollTop);
                    }
                }, 150);
            },
            { passive: true },
        );
    });

    // Back / forward between hash links of one page: Astro does not swap.
    window.addEventListener("popstate", () => {
        const top = savedScroll();
        if (location.pathname === path && top !== undefined) {
            requestAnimationFrame(() => restoreScroll(top));
        }
    });

    // A reload keeps history.state. Go back to where the user was.
    const top = savedScroll();
    if (top !== undefined) {
        document.addEventListener(
            "astro:page-load",
            () => restoreScroll(top),
            { once: true },
        );
    }
}

installScrollRestore();
