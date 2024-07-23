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
