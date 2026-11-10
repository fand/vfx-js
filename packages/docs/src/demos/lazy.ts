import type { VFXProps } from "@vfx-js/core";
import { scrollRoot } from "../lifecycle";
import { getPageVFX } from "../page-vfx";

type Entry = {
    makeProps: () => VFXProps;
    /** Pending add or remove. Each runs after the last one ends. */
    queue: Promise<void>;
    added: boolean;
    /** The page is gone. Skip pending adds. */
    dropped: boolean;
};

const entries = new Map<Element, Entry>();
let observer: IntersectionObserver | undefined;

function onChange(changes: IntersectionObserverEntry[]) {
    const vfx = getPageVFX();
    for (const change of changes) {
        const entry = entries.get(change.target);
        if (!entry) {
            continue;
        }
        const element = change.target as HTMLElement;
        const show = change.isIntersecting;
        entry.queue = entry.queue
            .then(async () => {
                if (entry.dropped) {
                    return;
                }
                if (show && !entry.added) {
                    entry.added = true;
                    await vfx.add(element, entry.makeProps());
                } else if (!show && entry.added) {
                    entry.added = false;
                    vfx.remove(element);
                }
            })
            .catch((e) => console.warn(e));
    }
}

/**
 * Add the element to the page VFX when it comes near the viewport,
 * and remove it when it goes far away. `makeProps` runs on every add,
 * so effects get fresh instances.
 * Demos are removed before the next page swaps in.
 */
export function lazyDemo(element: HTMLElement, makeProps: () => VFXProps) {
    // The page scrolls inside its own box, so watch that box.
    observer ??= new IntersectionObserver(onChange, {
        root: scrollRoot(),
        rootMargin: "50% 0px",
    });
    entries.set(element, {
        makeProps,
        queue: Promise.resolve(),
        added: false,
        dropped: false,
    });
    observer.observe(element);
}

function dropAll() {
    observer?.disconnect();
    observer = undefined;
    const vfx = getPageVFX();
    for (const [element, entry] of entries) {
        entry.dropped = true;
        entry.queue = entry.queue.then(() => {
            if (entry.added) {
                entry.added = false;
                vfx.remove(element as HTMLElement);
            }
        });
    }
    entries.clear();
}

document.addEventListener("astro:before-swap", dropAll);
