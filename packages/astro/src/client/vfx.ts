import { VFX } from "@vfx-js/core";
import { takeVFXOpts } from "./registry";

let instance: VFX | null = null;
// WebGL unavailable: stay plain DOM, and do not retry.
let failed = false;

/**
 * The page's VFX, made on first use with the options from `registerVFX`.
 * Null when WebGL is unavailable.
 */
export function getVFX(): VFX | null {
    if (!instance && !failed) {
        instance = VFX.init({ ...takeVFXOpts() });
        failed = instance === null;
    }
    return instance;
}

/** The VFX if one exists, without making it. */
export function peekVFX(): VFX | null {
    return instance;
}
