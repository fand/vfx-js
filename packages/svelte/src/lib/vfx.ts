import { VFX } from "@vfx-js/core";

// One VFX per page, shared by every component of this package.
let instance: VFX | null = null;
let refCount = 0;
let failed = false;

/** Get the shared VFX, or null when WebGL is unavailable. Pair with `releaseVFX`. */
export function acquireVFX(): VFX | null {
    refCount++;
    if (!instance && !failed) {
        instance = VFX.init();
        // WebGL unavailable: stay plain DOM, and do not retry.
        failed = instance === null;
    }
    return instance;
}

export function releaseVFX(): void {
    refCount--;
    if (refCount > 0) {
        return;
    }
    // Wait a frame so a remount in the same tick keeps the canvas.
    requestAnimationFrame(() => {
        if (refCount > 0 || !instance) {
            return;
        }
        instance.stop();
        instance.destroy();
        instance = null;
    });
}

/** The shared VFX if one exists, without taking a reference. */
export function peekVFX(): VFX | null {
    return instance;
}
