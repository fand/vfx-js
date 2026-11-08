import type { VFX, VFXProps } from "@vfx-js/core";
import { fromAttr } from "./props";
import { onRegister } from "./registry";
import { getVFX, peekVFX } from "./vfx";

const LOG_PREFIX = "[@vfx-js/astro]";
const ATTR = "data-vfx";

declare global {
    interface Window {
        __vfxAstro?: { uninstall(): void };
    }
}

export type ElementController = {
    update(props: VFXProps | null): void;
    destroy(): void;
};

const PROP_KEYS: readonly (keyof VFXProps)[] = [
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

function propsEqual(a: VFXProps, b: VFXProps): boolean {
    return PROP_KEYS.every((key) => a[key] === b[key]);
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
    if (propsEqual(prev, next)) {
        return;
    }
    vfx.remove(el);
    await vfx.add(el, next);
}

function logError(what: string, err: unknown): void {
    console.error(`${LOG_PREFIX} ${what} failed:`, err);
}

// Core reads these as they are, and waits for an image or video to load.
function hasOwnTexture(el: HTMLElement): boolean {
    return (
        el instanceof HTMLImageElement ||
        el instanceof HTMLVideoElement ||
        el instanceof HTMLCanvasElement
    );
}

/** Drive `vfx.add` / `remove` for one element. */
export function bindElement(el: HTMLElement): ElementController {
    // One queue, so add, update and remove never overlap.
    const queue = createOpQueue();
    let wanted: VFXProps | null = null;
    // What core has now. Read when an op runs, not when it is queued.
    let applied: VFXProps | null = null;
    let destroyed = false;

    const reconcile = async () => {
        const next = destroyed ? null : wanted;
        const prev = applied;
        if (prev === next) {
            return;
        }
        // Make the VFX only when there is something to show.
        const vfx = next ? getVFX() : peekVFX();
        if (!vfx) {
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
    };

    // Text and attribute changes do not reach the texture by themselves.
    // Text set with textContent is a childList change.
    let observer: MutationObserver | null = null;
    if (!hasOwnTexture(el)) {
        observer = new MutationObserver((records) => {
            // Our own attribute goes through `update`.
            const ownOnly = records.every(
                (r) => r.target === el && r.attributeName === ATTR,
            );
            if (applied && !ownOnly) {
                peekVFX()
                    ?.update(el)
                    .catch((err) => logError("update", err));
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
            wanted = props;
            queue.enqueue(reconcile);
        },
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            observer?.disconnect();
            queue.enqueue(reconcile);
        },
    };
}

type Entry = {
    controller: ElementController;
    attr: string;
    // A name in the attribute that is not registered yet.
    missing?: string;
};

function createRuntime() {
    const entries = new Map<HTMLElement, Entry>();

    const warnIfStillMissing = (el: HTMLElement, entry: Entry) => {
        const check = () => {
            if (entries.get(el) === entry && entry.missing) {
                console.warn(
                    `${LOG_PREFIX} ${entry.missing} is not registered. Register it with registerVFX.`,
                    el,
                );
            }
        };
        if (document.readyState === "complete") {
            setTimeout(check);
        } else {
            window.addEventListener("load", check, { once: true });
        }
    };

    const apply = (el: HTMLElement, entry: Entry) => {
        const { props, missing } = fromAttr(entry.attr);
        entry.missing = missing;
        entry.controller.update(props);
        if (missing) {
            warnIfStillMissing(el, entry);
        }
    };

    // Match the controller to the element's current attribute.
    const sync = (el: HTMLElement) => {
        const attr = el.isConnected ? el.getAttribute(ATTR) : null;
        let entry = entries.get(el);
        if (attr === null) {
            if (entry) {
                entry.controller.destroy();
                entries.delete(el);
            }
            return;
        }
        if (entry?.attr === attr) {
            return;
        }
        if (entry) {
            entry.attr = attr;
        } else {
            entry = { controller: bindElement(el), attr };
            entries.set(el, entry);
        }
        apply(el, entry);
    };

    const syncTree = (node: Node) => {
        if (!(node instanceof HTMLElement)) {
            return;
        }
        sync(node);
        for (const el of node.querySelectorAll<HTMLElement>(`[${ATTR}]`)) {
            sync(el);
        }
    };

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === "attributes") {
                syncTree(record.target);
                continue;
            }
            for (const node of record.removedNodes) {
                syncTree(node);
            }
            for (const node of record.addedNodes) {
                syncTree(node);
            }
        }
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [ATTR],
    });

    // Retry elements that waited for a name.
    const unsubscribe = onRegister(() => {
        for (const [el, entry] of entries) {
            if (entry.missing) {
                apply(el, entry);
            }
        }
    });

    syncTree(document.documentElement);

    return {
        uninstall() {
            observer.disconnect();
            unsubscribe();
            for (const entry of entries.values()) {
                entry.controller.destroy();
            }
            entries.clear();
        },
    };
}

/**
 * Watch the page for elements with `data-vfx`.
 * Safe to call more than once.
 */
export function install(): void {
    if (typeof window === "undefined" || window.__vfxAstro) {
        return;
    }
    window.__vfxAstro = createRuntime();
}

/** Stop watching and remove every effect. */
export function uninstall(): void {
    window.__vfxAstro?.uninstall();
    delete window.__vfxAstro;
}
