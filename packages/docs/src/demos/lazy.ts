import type { VFXProps } from "@vfx-js/core";
import { getPageVFX } from "../page-vfx";

type Entry = {
    makeProps: () => VFXProps;
    /** Pending add or remove. Each runs after the last one ends. */
    queue: Promise<void>;
    added: boolean;
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
 */
export function lazyDemo(element: HTMLElement, makeProps: () => VFXProps) {
    observer ??= new IntersectionObserver(onChange, {
        rootMargin: "50% 0px",
    });
    entries.set(element, {
        makeProps,
        queue: Promise.resolve(),
        added: false,
    });
    observer.observe(element);
}
