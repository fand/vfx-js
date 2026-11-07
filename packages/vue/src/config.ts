import {
    getCurrentInstance,
    type MaybeRefOrGetter,
    onUnmounted,
    toValue,
    watch,
} from "vue";
import { clearConfig, setConfig, type VFXConfig } from "./vfx.js";

/**
 * Set the options of the shared VFX while this component is mounted.
 * Call it in `setup`. Pass a ref or a getter to follow changes.
 * A change replaces the VFX; unmount goes back to the defaults.
 */
export function useVFXConfig(config: MaybeRefOrGetter<VFXConfig>): void {
    // The server never makes a VFX.
    if (typeof document === "undefined" || !getCurrentInstance()) {
        return;
    }
    const owner = Symbol("vfx-config");
    // Read each key, so a reactive object is tracked too.
    watch(
        () => {
            const value = toValue(config);
            return {
                pixelRatio: value.pixelRatio,
                zIndex: value.zIndex,
                postEffect: value.postEffect,
                autoplay: value.autoplay,
            };
        },
        (value) => setConfig(owner, value),
        { immediate: true },
    );
    onUnmounted(() => clearConfig(owner));
}
