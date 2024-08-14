/**
 * top-left origin rect.
 * Subset of DOMRect, which is returned by `HTMLElement.getBoundingClientRect()`.
 * @internal
 */
export type Rect = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

export function rect(
    top: number,
    right: number,
    bottom: number,
    left: number,
): Rect {
    return { top, right, bottom, left };
}

export const RECT_ZERO: Rect = rect(0, 0, 0, 0);

/**
 * Values to determine a rectangle area for margin, padding etc.
 */
export type RectOpts =
    | number
    | [top: number, right: number, bottom: number, left: number]
    | { top?: number; right?: number; bottom?: number; left?: number };

export function createRect(r: RectOpts): Rect {
    if (typeof r === "number") {
        return {
            top: r,
            right: r,
            bottom: r,
            left: r,
        };
    }
    if (Array.isArray(r)) {
        return {
            top: r[0],
            right: r[1],
            bottom: r[2],
            left: r[3],
        };
    }
    return {
        top: r.top ?? 0,
        right: r.right ?? 0,
        bottom: r.bottom ?? 0,
        left: r.left ?? 0,
    };
}

export function growRect(a: Rect, b: Rect): Rect {
    return {
        top: a.top - b.top,
        right: a.right + b.right,
        bottom: a.bottom + b.bottom,
        left: a.left - b.left,
    };
}

export function shrinkRect(a: Rect, b: Rect): Rect {
    return {
        top: a.top + b.top,
        right: a.right - b.right,
        bottom: a.bottom - b.bottom,
        left: a.left + b.left,
    };
}

function clamp(x: number, xmin: number, xmax: number): number {
    return Math.min(Math.max(x, xmin), xmax);
}

/**
 * Calculate the ratio of the intersection between two Rect objects.
 * It returns a number between 0 and 1.
 */
export function getIntersection(container: Rect, target: Rect): number {
    const targetL = clamp(target.left, container.left, container.right);
    const targetR = clamp(target.right, container.left, container.right);
    const w = (targetR - targetL) / (target.right - target.left);

    const targetT = clamp(target.top, container.top, container.bottom);
    const targetB = clamp(target.bottom, container.top, container.bottom);
    const h = (targetB - targetT) / (target.bottom - target.top);

    return w * h;
}
