import type { BackendTexture } from "./backend.js";
import { makeEffectTexture } from "./effect-host.js";
import { setupCapture, teardownCapture } from "./html-in-canvas.js";
import type { EffectTexture } from "./types.js";

/** A texture that follows the captures of a canvas that is not on screen. */
export type LiveTexture = {
    /** Null until the first capture, and after `dispose()`. */
    readonly texture: EffectTexture | null;
    update(offscreen: OffscreenCanvas): void;
    dispose(): void;
};

export type LiveCapture = {
    readonly texture: EffectTexture | null;
    dispose(): void;
};

/**
 * Build a `LiveTexture`.
 * `create` makes the first texture; `refresh` re-uploads it, or returns a new one when the capture canvas changed.
 */
export function createLiveTexture(
    create: (offscreen: OffscreenCanvas) => BackendTexture,
    refresh: (
        texture: BackendTexture,
        offscreen: OffscreenCanvas,
    ) => BackendTexture,
    size: (texture: BackendTexture, axis: "w" | "h") => number,
): LiveTexture {
    let current: BackendTexture | null = null;
    let disposed = false;
    const handle = makeEffectTexture(
        () => current as BackendTexture,
        () => (current ? size(current, "w") : 0),
        () => (current ? size(current, "h") : 0),
    );
    return {
        get texture() {
            return current ? handle : null;
        },
        update(offscreen) {
            if (disposed) {
                return;
            }
            current = current ? refresh(current, offscreen) : create(offscreen);
        },
        dispose() {
            disposed = true;
            current?.dispose();
            current = null;
        },
    };
}

/** Capture an html-in-canvas canvas into `live` on every paint, without drawing it. */
export function captureLive(
    canvas: HTMLCanvasElement,
    live: LiveTexture,
    maxSize: number,
    capture = { setupCapture, teardownCapture },
): LiveCapture {
    let disposed = false;
    capture
        .setupCapture(canvas, {
            onCapture: (offscreen) => live.update(offscreen),
            maxSize,
        })
        .then(
            (first) => {
                if (disposed) {
                    return;
                }
                // The first capture stays on the canvas; clear it so it never shows.
                canvas
                    .getContext("2d")
                    ?.clearRect(0, 0, canvas.width, canvas.height);
                live.update(first);
            },
            (err) => console.error("[VFX-JS] live capture failed:", err),
        );
    return {
        get texture() {
            return live.texture;
        },
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            capture.teardownCapture(canvas);
            live.dispose();
        },
    };
}
