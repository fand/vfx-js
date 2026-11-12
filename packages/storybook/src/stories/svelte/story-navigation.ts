// Story-only stand-in for SvelteKit's `$app/navigation`.
// Storybook aliases `$app/navigation` to this file.

import { onMount, tick } from "svelte";
import { page } from "./story-state.svelte.js";

type Navigation = {
    from: { url: URL };
    to: { url: URL };
    type: "link";
    willUnload: false;
    complete: Promise<void>;
};

type Callback = (nav: Navigation) => unknown;

const callbacks = new Set<Callback>();

export function onNavigate(fn: Callback): void {
    onMount(() => {
        callbacks.add(fn);
        return () => callbacks.delete(fn);
    });
}

/** Like SvelteKit: wait for every onNavigate callback, then `swap` the page. */
export async function storyNavigate(
    from: string,
    to: string,
    swap: () => void,
): Promise<void> {
    let complete!: () => void;
    const url = (path: string) => new URL(path, location.href);
    const nav: Navigation = {
        from: { url: url(from) },
        to: { url: url(to) },
        type: "link",
        willUnload: false,
        complete: new Promise<void>((resolve) => {
            complete = resolve;
        }),
    };
    await Promise.all([...callbacks].map((fn) => fn(nav)));
    page.url = nav.to.url;
    swap();
    await tick();
    complete();
}
