import type { VFXElement } from "./types.js";

export type FreezeHooks = {
    /** Show the element's plain content while it is frozen. */
    showPlain(e: VFXElement): void;
    /** Hide the plain content again, restoring `opacity` for DOM elements. */
    hidePlain(e: VFXElement, opacity: string): void;
    isRegistered(e: VFXElement): boolean;
};

type FrozenEntry = { e: VFXElement; opacity: string };
type Freeze = { root: HTMLElement; entries: FrozenEntry[] };

/** Tracks the roots frozen by `freezeInside`, including elements added under them later. */
export class FreezeTracker {
    #hooks: FreezeHooks;
    #freezes = new Set<Freeze>();

    constructor(hooks: FreezeHooks) {
        this.#hooks = hooks;
    }

    /**
     * Freeze the elements inside `root`, and any added under it until the undo.
     * Returns a function that undoes it.
     */
    freezeInside(
        root: HTMLElement,
        elements: readonly VFXElement[],
    ): () => void {
        const freeze: Freeze = { root, entries: [] };
        for (const e of elements) {
            if (e.frozen || !isInside(root, e.element)) {
                continue;
            }
            e.frozen = true;
            freeze.entries.push({ e, opacity: e.element.style.opacity });
            this.#hooks.showPlain(e);
        }
        this.#freezes.add(freeze);

        let done = false;
        return () => {
            if (done) {
                return;
            }
            done = true;
            this.#freezes.delete(freeze);
            for (const { e } of freeze.entries) {
                e.frozen = false;
            }
            // Wait a frame so the overlay is back first.
            requestAnimationFrame(() => {
                for (const { e, opacity } of freeze.entries) {
                    if (e.frozen || !this.#hooks.isRegistered(e)) {
                        continue;
                    }
                    this.#hooks.hidePlain(e, opacity);
                }
            });
        };
    }

    /**
     * Freeze a new element if it sits under a frozen root.
     * `hiddenOpacity` is the opacity it gets once unfrozen; null keeps the current one.
     * Returns whether it was frozen.
     */
    adopt(e: VFXElement, hiddenOpacity: string | null): boolean {
        const freeze = this.#freezeAbove(e.element);
        if (!freeze) {
            return false;
        }
        e.frozen = true;
        freeze.entries.push({
            e,
            opacity: hiddenOpacity ?? e.element.style.opacity,
        });
        return true;
    }

    #freezeAbove(element: HTMLElement): Freeze | undefined {
        for (const freeze of this.#freezes) {
            if (isInside(freeze.root, element)) {
                return freeze;
            }
        }
        return undefined;
    }
}

function isInside(root: HTMLElement, element: HTMLElement): boolean {
    return element !== root && root.contains(element);
}
