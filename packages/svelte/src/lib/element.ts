import type { VFX, VFXProps } from "@vfx-js/core";
import { setupCapture, teardownCapture } from "@vfx-js/core";
import { attachVFX, peekVFX } from "./vfx.js";

export type { VFXProps };

export type ElementController = {
    update(props: VFXProps | null | undefined): void;
    destroy(): void;
};

export type BindOptions = {
    /** Capture the children of an html-in-canvas `<canvas>`. */
    capture?: boolean;
};

const LOG_PREFIX = "[@vfx-js/svelte]";

const NON_EFFECT_KEYS: readonly (keyof VFXProps)[] = [
    "shader",
    "release",
    "uniforms",
    "overlay",
    "intersection",
    "overflow",
    "wrap",
    "zIndex",
    "backbuffer",
    "autoCrop",
    "glslVersion",
];

function nonEffectKeysEqual(a: VFXProps, b: VFXProps): boolean {
    return NON_EFFECT_KEYS.every((key) => a[key] === b[key]);
}

function createOpQueue() {
    let tail: Promise<void> = Promise.resolve();
    return {
        enqueue(op: () => Promise<void> | void): Promise<void> {
            const next = tail.then(op, op);
            tail = next.then(
                () => {},
                () => {},
            );
            return next;
        },
    };
}

async function applyDelta(
    vfx: VFX,
    el: HTMLElement,
    prev: VFXProps,
    next: VFXProps,
    add: (props: VFXProps) => Promise<boolean>,
): Promise<void> {
    const sameKeys = nonEffectKeysEqual(prev, next);
    if (sameKeys && prev.effect === next.effect) {
        return;
    }
    if (sameKeys && next.effect !== undefined) {
        await vfx.updateEffects(el, next.effect);
        return;
    }
    vfx.remove(el);
    await add(next);
}

function logError(what: string, err: unknown): void {
    console.error(`${LOG_PREFIX} ${what} failed:`, err);
}

function hasOwnTexture(el: HTMLElement): boolean {
    return (
        el instanceof HTMLImageElement ||
        el instanceof HTMLVideoElement ||
        el instanceof HTMLCanvasElement
    );
}

/** Drive `vfx.add` / `remove` / `updateEffects` for one element. */
export function bindElement(
    el: HTMLElement,
    options: BindOptions = {},
): ElementController {
    // One queue, so add, update and remove never overlap.
    const queue = createOpQueue();
    // The props asked for, and the VFX to show them on.
    let wanted: VFXProps | null = null;
    let target: VFX | null = null;
    // What a VFX has now. Read when an op runs, not when it is queued.
    let applied: VFXProps | null = null;
    let appliedOn: VFX | null = null;
    let destroyed = false;

    const canvas =
        options.capture && el instanceof HTMLCanvasElement ? el : null;
    let captureStarted = false;
    let captureTornDown = false;
    let latestCapture: OffscreenCanvas | null = null;

    // Resolves false when nothing was added.
    // The latest capture keeps `vfx.add` on the html-in-canvas path.
    // The capture runs across a VFX replace; it is set up once.
    const add = async (vfx: VFX, props: VFXProps): Promise<boolean> => {
        if (!canvas) {
            await vfx.add(el, props);
            return true;
        }
        if (!captureStarted) {
            captureStarted = true;
            latestCapture = await setupCapture(canvas, {
                onCapture: (capture) => {
                    latestCapture = capture;
                    target?.updateHICTexture(canvas, capture);
                },
                maxSize: vfx.maxTextureSize,
            });
            // Unmounted or replaced during setup: a later op takes over.
            if (destroyed || target !== vfx) {
                return false;
            }
        }
        await vfx.add(canvas, props, latestCapture ?? undefined);
        return true;
    };

    // Move what core has toward `wanted` on `target`.
    const reconcile = async () => {
        if (destroyed && canvas && captureStarted && !captureTornDown) {
            captureTornDown = true;
            teardownCapture(canvas);
        }
        if (appliedOn && appliedOn !== target) {
            appliedOn.remove(el);
            applied = null;
            appliedOn = null;
        }
        const vfx = target;
        const next = destroyed ? null : wanted;
        const prev = applied;
        if (!vfx || prev === next) {
            return;
        }
        try {
            if (!next) {
                vfx.remove(el);
                applied = null;
                appliedOn = null;
            } else if (!prev) {
                if (await add(vfx, next)) {
                    applied = next;
                    appliedOn = vfx;
                }
            } else {
                await applyDelta(vfx, el, prev, next, (props) =>
                    add(vfx, props),
                );
                applied = next;
            }
        } catch (err) {
            logError(prev ? "update" : "add", err);
        }
    };

    // Text and attribute changes do not reach the texture by themselves.
    // Text set with textContent is a childList change.
    // A captured canvas follows its DOM by itself.
    let observer: MutationObserver | null = null;
    if (!canvas && !hasOwnTexture(el)) {
        observer = new MutationObserver(() => {
            if (applied && appliedOn) {
                appliedOn.update(el).catch((err) => logError("update", err));
            }
        });
        observer.observe(el, {
            characterData: true,
            childList: true,
            attributes: true,
            subtree: true,
        });
    }

    const release = attachVFX((vfx) => {
        target = vfx;
        queue.enqueue(reconcile);
        return () => {
            target = null;
            return queue.enqueue(reconcile);
        };
    });

    return {
        update(props) {
            if (destroyed) {
                return;
            }
            wanted = props ?? null;
            queue.enqueue(reconcile);
        },
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            observer?.disconnect();
            // The release waits for the remove, so a slow add does not outlive the VFX.
            release();
            // Without a VFX there is no detach, but the capture may still run.
            queue.enqueue(reconcile);
        },
    };
}

/**
 * Re-capture the element's texture.
 * Use it for changes the binding can't see, like input values.
 */
export function updateElement(el: HTMLElement): Promise<void> {
    return peekVFX()?.update(el) ?? Promise.resolve();
}
