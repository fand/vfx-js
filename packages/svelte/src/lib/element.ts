import type { VFX, VFXProps } from "@vfx-js/core";
import { acquireVFX, peekVFX, releaseVFX } from "./vfx.js";

export type { VFXProps };

export type ElementController = {
    update(props: VFXProps | null | undefined): void;
    destroy(): void;
};

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
    await vfx.add(el, next);
}

function logError(what: string, err: unknown): void {
    console.error(`[@vfx-js/svelte] ${what} failed:`, err);
}

function hasOwnTexture(el: HTMLElement): boolean {
    return (
        el instanceof HTMLImageElement ||
        el instanceof HTMLVideoElement ||
        el instanceof HTMLCanvasElement
    );
}

/** Drive `vfx.add` / `remove` / `updateEffects` for one element. */
export function bindElement(el: HTMLElement): ElementController {
    const vfx = acquireVFX();
    if (!vfx) {
        let released = false;
        return {
            update() {},
            destroy() {
                if (!released) {
                    released = true;
                    releaseVFX();
                }
            },
        };
    }

    // One queue, so add, update and remove never overlap.
    const queue = createOpQueue();
    // What core has now. Read when an op runs, not when it is queued.
    let applied: VFXProps | null = null;
    let destroyed = false;

    // Text and attribute changes do not reach the texture by themselves.
    // Text set with textContent is a childList change.
    let observer: MutationObserver | null = null;
    if (!hasOwnTexture(el)) {
        observer = new MutationObserver(() => {
            if (applied) {
                vfx.update(el).catch((err) => logError("update", err));
            }
        });
        observer.observe(el, {
            characterData: true,
            childList: true,
            attributes: true,
            subtree: true,
        });
    }

    return {
        update(props) {
            if (destroyed) {
                return;
            }
            const next = props ?? null;
            queue.enqueue(async () => {
                const prev = applied;
                if (prev === next) {
                    return;
                }
                try {
                    if (!next) {
                        vfx.remove(el);
                        applied = null;
                    } else if (!prev) {
                        await vfx.add(el, next);
                        applied = next;
                    } else {
                        await applyDelta(vfx, el, prev, next);
                        applied = next;
                    }
                } catch (err) {
                    logError(prev ? "update" : "add", err);
                }
            });
        },
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            observer?.disconnect();
            // Release after the remove, so a slow add does not outlive the VFX.
            queue
                .enqueue(() => {
                    if (applied) {
                        vfx.remove(el);
                        applied = null;
                    }
                })
                .finally(releaseVFX);
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
