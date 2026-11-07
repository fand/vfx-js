import { onDestroy } from "svelte";
import { clearConfig, setConfig, type VFXConfig } from "./vfx.js";

/**
 * Set the options of the shared VFX while this component is mounted.
 * Call it when the component is created. Pass a getter to follow changes.
 * A change replaces the VFX; destroy goes back to the defaults.
 */
export function vfxConfig(config: VFXConfig | (() => VFXConfig)): void {
    // The server never makes a VFX.
    if (typeof document === "undefined") {
        return;
    }
    const owner = Symbol("vfx-config");
    const read = () => {
        const value = typeof config === "function" ? config() : config;
        return {
            pixelRatio: value.pixelRatio,
            zIndex: value.zIndex,
            postEffect: value.postEffect,
            autoplay: value.autoplay,
        };
    };
    // Set now, before children mount and make the VFX.
    setConfig(owner, read());
    if (typeof config === "function") {
        $effect(() => {
            setConfig(owner, read());
        });
    }
    onDestroy(() => clearConfig(owner));
}
