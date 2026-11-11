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
// Core's hidden canvas that holds the old page during a run with liveFrom.
const LIVE_FROM_ATTR = "data-vfx-live-from";

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
    keepPrev?: (nodes: Node[]) => void,
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
        keepPrev?.(Array.from(live.childNodes));
        live.replaceChildren(children);
        live.setAttribute(TARGET_ATTR, next.getAttribute(TARGET_ATTR) ?? "");
        // During a run core wraps the target in a canvas; keep that too.
        const parent = live.parentElement;
        const outer = parent && isHicCanvas(parent) ? parent : live;
        persist(outer, next, "vfx-transition-target");
        kept.push(outer);
        const ghosts = outer.parentElement?.querySelectorAll(
            `:scope > [${LIVE_FROM_ATTR}]`,
        );
        for (const [i, ghost] of Array.from(ghosts ?? []).entries()) {
            const placeholder = doc.createElement("div");
            next.after(placeholder);
            persist(ghost, placeholder, `vfx-live-from-${i}`);
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
