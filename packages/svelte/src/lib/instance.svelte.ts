import type { VFX } from "@vfx-js/core";
import { onDestroy } from "svelte";
import { peekVFX, subscribeVFX } from "./vfx.js";

/**
 * The shared VFX as `.current`, or null while there is none.
 * Follows config replaces. Reading it does not keep the VFX alive.
 * Use it with `autoplay: false` to call `render()` yourself.
 * Call it when the component is created.
 */
export function vfxInstance(): { readonly current: VFX | null } {
    let current = $state.raw(peekVFX());
    if (typeof document !== "undefined") {
        onDestroy(
            subscribeVFX((next) => {
                current = next;
            }),
        );
    }
    return {
        get current() {
            return current;
        },
    };
}
