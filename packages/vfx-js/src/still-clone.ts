/**
 * A still copy of an element, pinned over its place on screen.
 *
 * Wrapping an element in an html-in-canvas canvas hides it until the first
 * capture lands, one frame later. The copy covers that frame.
 *
 * - Scripts are dropped; `autoplay` is removed.
 * - `<canvas>` and `<video>` become canvases holding their current picture.
 * - `<iframe>` becomes an empty box of the same size, since a copy would load again.
 * - Form values and scroll positions are copied over.
 * - The `id` stays, so `#id` styles still apply.
 *   The page holds a duplicate id for that one frame; the copy is hidden from
 *   assistive tech and ignores the pointer.
 */
export function coverWithStill(
    element: HTMLElement,
    zIndex: number,
): () => void {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true) as HTMLElement;
    const from = [element, ...element.querySelectorAll<HTMLElement>("*")];
    const to = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
    const scrolls: [HTMLElement, number, number][] = [];
    const swaps: [Element, Node][] = [];

    for (let i = 0; i < from.length && i < to.length; i++) {
        const a = from[i];
        const b = to[i];
        if (a.scrollTop || a.scrollLeft) {
            scrolls.push([b, a.scrollTop, a.scrollLeft]);
        }
        if (a instanceof HTMLScriptElement) {
            swaps.push([b, document.createComment("script")]);
        } else if (
            a instanceof HTMLCanvasElement ||
            a instanceof HTMLVideoElement
        ) {
            swaps.push([b, still(a)]);
        } else if (a instanceof HTMLIFrameElement) {
            swaps.push([b, box(a)]);
        } else if (
            a instanceof HTMLInputElement &&
            b instanceof HTMLInputElement
        ) {
            b.value = a.value;
            b.checked = a.checked;
        } else if (
            a instanceof HTMLTextAreaElement &&
            b instanceof HTMLTextAreaElement
        ) {
            b.value = a.value;
        } else if (
            a instanceof HTMLSelectElement &&
            b instanceof HTMLSelectElement
        ) {
            b.selectedIndex = a.selectedIndex;
        } else if (a instanceof HTMLMediaElement) {
            b.removeAttribute("autoplay");
        }
    }
    for (const [old, next] of swaps) {
        old.replaceWith(next);
    }

    clone.setAttribute("aria-hidden", "true");
    const style = clone.style;
    style.setProperty("position", "fixed");
    style.setProperty("left", `${rect.left}px`);
    style.setProperty("top", `${rect.top}px`);
    style.setProperty("width", `${rect.width}px`);
    style.setProperty("height", `${rect.height}px`);
    style.setProperty("box-sizing", "border-box");
    style.setProperty("margin", "0");
    style.setProperty("pointer-events", "none");
    // Above the page, below the VFX output canvas.
    style.setProperty("z-index", zIndex.toString());

    // A sibling keeps inherited styles. A transformed ancestor shifts
    // fixed boxes, so measure once and correct.
    element.parentNode?.insertBefore(clone, element);
    const placed = clone.getBoundingClientRect();
    if (placed.left !== rect.left || placed.top !== rect.top) {
        style.setProperty("left", `${rect.left * 2 - placed.left}px`);
        style.setProperty("top", `${rect.top * 2 - placed.top}px`);
    }
    for (const [el, top, left] of scrolls) {
        el.scrollTop = top;
        el.scrollLeft = left;
    }
    freezeAnimations(from, to);

    return () => {
        clone.remove();
    };
}

/**
 * A fresh clone starts its CSS animations from zero.
 * Hold each one at the original's time, so the still matches the element.
 * Pairs by element, pseudo-element and animation name: the clone has no
 * CSS transitions or script animations, so list order would not line up.
 */
function freezeAnimations(from: Element[], to: Element[]): void {
    const root = from[0];
    const cloneRoot = to[0];
    if (!root || !cloneRoot || typeof root.getAnimations !== "function") {
        return;
    }
    const keyOf = (anim: Animation, order: Map<Element, number>) => {
        if (!("animationName" in anim)) {
            return null;
        }
        const effect = anim.effect as KeyframeEffect | null;
        const target = effect?.target;
        const i = target ? order.get(target) : undefined;
        if (i === undefined) {
            return null;
        }
        return `${i}|${effect?.pseudoElement ?? ""}|${anim.animationName}`;
    };
    const toOrder = new Map(to.map((el, i) => [el, i]));
    const clones = new Map<string, Animation>();
    for (const anim of cloneRoot.getAnimations({ subtree: true })) {
        const key = keyOf(anim, toOrder);
        if (key) {
            clones.set(key, anim);
        }
    }
    const fromOrder = new Map(from.map((el, i) => [el, i]));
    for (const anim of root.getAnimations({ subtree: true })) {
        const key = keyOf(anim, fromOrder);
        const copy = key && clones.get(key);
        if (copy) {
            copy.currentTime = anim.currentTime;
            copy.pause();
        }
    }
}

/** Copy class and inline style, and pin the laid-out size. */
function sameBox(from: HTMLElement, to: HTMLElement): void {
    const r = from.getBoundingClientRect();
    const cs = getComputedStyle(from);
    to.className = from.className;
    to.style.cssText = from.style.cssText;
    to.style.width = `${r.width}px`;
    to.style.height = `${r.height}px`;
    to.style.display = cs.display === "inline" ? "inline-block" : cs.display;
    to.style.boxSizing = "border-box";
}

function still(src: HTMLCanvasElement | HTMLVideoElement): HTMLCanvasElement {
    const c = document.createElement("canvas");
    const w = src instanceof HTMLVideoElement ? src.videoWidth : src.width;
    const h = src instanceof HTMLVideoElement ? src.videoHeight : src.height;
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    sameBox(src, c);
    try {
        c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
    } catch {
        // A tainted or not-ready source stays empty.
    }
    return c;
}

function box(src: HTMLElement): HTMLElement {
    const d = document.createElement("div");
    sameBox(src, d);
    return d;
}
