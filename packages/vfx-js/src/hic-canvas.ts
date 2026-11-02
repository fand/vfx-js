/// <reference path="./html-in-canvas.d.ts" />

/**
 * Helpers for the html-in-canvas wrapper canvas.
 *
 * Chrome has shipped two markups for it:
 * - `<canvas layoutsubtree>` (Chrome ≤ 156);
 * - `<canvas content="drawable">` with a `drawable` attribute on each child
 *   to draw (Chrome 159+, where `layoutsubtree` alone no longer paints).
 *
 * We set both so the same wrapper works in either version.
 */

/** True if `el` is a canvas that captures its children with drawElementImage. */
export function isHicCanvas(el: Element): el is HTMLCanvasElement {
    return (
        el.tagName === "CANVAS" &&
        (el.hasAttribute("layoutsubtree") ||
            el.getAttribute("content") === "drawable")
    );
}

/** Mark `canvas` as an html-in-canvas wrapper and `child` as drawable. */
export function markHicCanvas(
    canvas: HTMLCanvasElement,
    child?: Element | null,
): void {
    canvas.setAttribute("layoutsubtree", "");
    canvas.setAttribute("content", "drawable");
    child?.setAttribute("drawable", "");
}

/** The parts of a DOMRect we use. */
export type RectLike = {
    left: number;
    top: number;
    width: number;
    height: number;
};

/**
 * Where to draw a nested canvas into the capture buffer.
 *
 * `base` is the captured element's rect, `rect` the nested canvas's content
 * box (both in CSS px, viewport coords). `sx` / `sy` are capture buffer px
 * per CSS px. Returns null when the canvas is empty or outside `base`.
 */
export function nestedCanvasDest(
    base: RectLike,
    rect: RectLike,
    sx: number,
    sy: number,
): [number, number, number, number] | null {
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }
    const x = rect.left - base.left;
    const y = rect.top - base.top;
    if (
        x + rect.width <= 0 ||
        y + rect.height <= 0 ||
        x >= base.width ||
        y >= base.height
    ) {
        return null;
    }
    return [x * sx, y * sy, rect.width * sx, rect.height * sy];
}

/** Content box of `el` (inside border and padding), in CSS px. */
function contentRect(el: HTMLElement): RectLike {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const pl = Number.parseFloat(cs.paddingLeft) || 0;
    const pr = Number.parseFloat(cs.paddingRight) || 0;
    const pt = Number.parseFloat(cs.paddingTop) || 0;
    const pb = Number.parseFloat(cs.paddingBottom) || 0;
    const sw = el.clientWidth > 0 ? r.width / el.offsetWidth : 1;
    const sh = el.clientHeight > 0 ? r.height / el.offsetHeight : 1;
    return {
        left: r.left + (el.clientLeft + pl) * sw,
        top: r.top + (el.clientTop + pt) * sh,
        width: Math.max(0, el.clientWidth - pl - pr) * sw,
        height: Math.max(0, el.clientHeight - pt - pb) * sh,
    };
}

function isVisible(el: HTMLElement): boolean {
    if (typeof el.checkVisibility === "function") {
        return el.checkVisibility({
            visibilityProperty: true,
            opacityProperty: true,
        });
    }
    return getComputedStyle(el).visibility !== "hidden";
}

/**
 * Draw each visible canvas inside `root` over the capture at its layout
 * size and position. Works around Chrome drawing nested canvases at buffer
 * size and clipping them. It draws on
 * top of everything else, so an
 * element stacked above a canvas is hidden by it, and a canvas with
 * transparent pixels shows the wrongly sized copy through them.
 */
export function redrawNestedCanvases(
    ctx: CanvasRenderingContext2D,
    root: Element,
): void {
    const canvases = root.querySelectorAll("canvas");
    if (canvases.length === 0) {
        return;
    }
    const base = root.getBoundingClientRect();
    if (base.width <= 0 || base.height <= 0) {
        return;
    }
    const sx = ctx.canvas.width / base.width;
    const sy = ctx.canvas.height / base.height;
    for (const cv of canvases) {
        if (cv.width === 0 || cv.height === 0 || !isVisible(cv)) {
            continue;
        }
        const dest = nestedCanvasDest(base, contentRect(cv), sx, sy);
        if (!dest) {
            continue;
        }
        try {
            ctx.drawImage(cv, ...dest);
        } catch {
            // A canvas without a context or a lost WebGL context.
        }
    }
}
