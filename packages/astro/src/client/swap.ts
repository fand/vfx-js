import { isHicCanvas } from "@vfx-js/core";

/** The part of `swapFunctions` from `astro:transitions/client` we use. */
export type SwapFunctions = {
    deselectScripts(doc: Document): void;
    swapRootAttributes(doc: Document): void;
    swapHeadElements(doc: Document): void;
    swapBodyElement(newElement: Element, oldElement: Element): void;
    saveFocus(): () => void;
};

export const TARGET_ATTR = "data-vfx-transition-target";
const PERSIST_ATTR = "data-astro-transition-persist";
// Core's hidden canvas that holds the old page during a run with keepPlaying.
const KEEP_PLAYING_ATTR = "data-vfx-keep-playing";
const ISLAND = "astro-island";

// Let Astro carry `live` over to where `placeholder` sits in the new page.
function persist(live: Element, placeholder: Element, id: string): void {
    live.setAttribute(PERSIST_ATTR, id);
    placeholder.setAttribute(PERSIST_ATTR, id);
}

// Fresh copies made by this document, so new media start up.
// Persisted elements inside the target are moved over as they are.
function takeChildren(live: HTMLElement, next: HTMLElement): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const node of next.childNodes) {
        fragment.append(document.importNode(node, true));
    }
    for (const old of live.querySelectorAll(`[${PERSIST_ATTR}]`)) {
        const id = old.getAttribute(PERSIST_ATTR);
        for (const match of fragment.querySelectorAll(`[${PERSIST_ATTR}]`)) {
            if (match.getAttribute(PERSIST_ATTR) === id) {
                match.replaceWith(old);
                break;
            }
        }
    }
    return fragment;
}

// Astro unmounts an island again on the next swap after it leaves the page.
// The island is unmounted already, so that event stops here.
function stopUnmount(e: Event): void {
    e.stopImmediatePropagation();
}

// Core drops the old page when the run ends, after this navigation's unmount.
// Unmount its islands then, so their framework roots do not outlive the run.
function unmountIslands(node: Node): void {
    if (!(node instanceof Element)) {
        return;
    }
    const islands = node.matches(ISLAND)
        ? [node, ...node.querySelectorAll(ISLAND)]
        : node.querySelectorAll(ISLAND);
    for (const island of islands) {
        island.dispatchEvent(new CustomEvent("astro:unmount"));
        // A capture listener on the target runs before the renderer's own.
        island.addEventListener("astro:unmount", stopUnmount, {
            capture: true,
        });
    }
}

/**
 * Astro's swap, but the live transition target and the VFX canvas stay.
 * The target takes the children of the new page's target.
 * Returns false when the new page has no target; the live one is gone then.
 */
export function swapKeepingTarget(
    doc: Document,
    live: HTMLElement,
    canvas: HTMLCanvasElement | null,
    fns: SwapFunctions,
    keepPlaying?: (nodes: Node[], onReturn?: (node: Node) => void) => void,
): boolean {
    fns.deselectScripts(doc);
    fns.swapRootAttributes(doc);
    fns.swapHeadElements(doc);
    const restoreFocus = fns.saveFocus();

    const kept: Element[] = [];
    const next = doc.querySelector<HTMLElement>(`[${TARGET_ATTR}]`);
    if (next) {
        // Take persisted elements first, so they go to the new page.
        const children = takeChildren(live, next);
        keepPlaying?.(Array.from(live.childNodes), unmountIslands);
        live.replaceChildren(children);
        live.setAttribute(TARGET_ATTR, next.getAttribute(TARGET_ATTR) ?? "");
        // During a run core wraps the target in a canvas; keep that too.
        const parent = live.parentElement;
        const outer = parent && isHicCanvas(parent) ? parent : live;
        persist(outer, next, "vfx-transition-target");
        kept.push(outer);
        const ghosts = outer.parentElement?.querySelectorAll(
            `:scope > [${KEEP_PLAYING_ATTR}]`,
        );
        for (const [i, ghost] of Array.from(ghosts ?? []).entries()) {
            const placeholder = doc.createElement("div");
            next.after(placeholder);
            persist(ghost, placeholder, `vfx-keep-playing-${i}`);
            kept.push(ghost);
        }
    }
    if (canvas?.parentElement === document.body) {
        const placeholder = doc.createElement("div");
        doc.body.append(placeholder);
        persist(canvas, placeholder, "vfx-canvas");
        kept.push(canvas);
    }

    fns.swapBodyElement(doc.body, document.body);
    for (const el of kept) {
        el.removeAttribute(PERSIST_ATTR);
    }
    restoreFocus();
    return next !== null;
}
