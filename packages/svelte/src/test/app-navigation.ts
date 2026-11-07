// Stands in for SvelteKit's `$app/navigation` in tests.

import { onMount } from "svelte";
import type { onNavigate as kitOnNavigate } from "$app/navigation";

type OnNavigate = Parameters<Parameters<typeof kitOnNavigate>[0]>[0];

export type { OnNavigate };

type Callback = (nav: OnNavigate) => unknown;

export const callbacks = new Set<Callback>();

export function onNavigate(fn: Callback): void {
    onMount(() => {
        callbacks.add(fn);
        return () => callbacks.delete(fn);
    });
}
