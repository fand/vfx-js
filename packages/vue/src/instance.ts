import type { VFX } from "@vfx-js/core";
import {
    getCurrentInstance,
    onUnmounted,
    type ShallowRef,
    shallowRef,
} from "vue";
import { peekVFX, subscribeVFX } from "./vfx.js";

/**
 * The shared VFX, or null while there is none.
 * Follows config replaces. Reading it does not keep the VFX alive.
 * Use it with `autoplay: false` to call `render()` yourself.
 */
export function useVFXInstance(): Readonly<ShallowRef<VFX | null>> {
    const vfx = shallowRef(peekVFX());
    if (typeof document !== "undefined" && getCurrentInstance()) {
        onUnmounted(
            subscribeVFX((next) => {
                vfx.value = next;
            }),
        );
    }
    return vfx;
}
