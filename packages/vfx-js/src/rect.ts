/**
 * @internal
 */
type Tetra = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

/** @internal */
function tetra(
    top: number,
    right: number,
    bottom: number,
    left: number,
): Tetra {
    return { top, right, bottom, left };
}

/** @internal */
function createTetra(r: MarginOpts): Tetra {
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

/**
 * top-left origin rect.
 * Subset of DOMRect, which is returned by `HTMLElement.getBoundingClientRect()`.
 * @internal
 */
export type Rect = Tetra & { readonly __brand: unique symbol };

export const RECT_ZERO: Rect = tetra(0, 0, 0, 0) as Rect;

/**
 * @internal
 */
export type Margin = Tetra & { readonly __brand: unique symbol };

/**
 * Values for margin, padding, overflow etc.
 */
export type MarginOpts =
    | number
    | [top: number, right: number, bottom: number, left: number]
    | { top?: number; right?: number; bottom?: number; left?: number };

export function createMargin(r: MarginOpts): Margin {
    return createTetra(r) as Margin;
}

export const MARGIN_ZERO: Margin = tetra(0, 0, 0, 0) as Margin;

/**
 * Values to determine a rectangle area for margin, padding etc.
 */
export type RectOpts = MarginOpts;

export function createRect(r: RectOpts): Rect {
    return createTetra(r) as Rect;
}

export function toRect(r: DOMRect): Rect {
    return {
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        left: r.left,
    } as Rect;
}

export function growRect(a: Rect, b: Margin): Rect {
    return {
        top: a.top - b.top,
        right: a.right + b.right,
        bottom: a.bottom + b.bottom,
        left: a.left - b.left,
    } as Rect;
}

export function shrinkRect(a: Rect, b: Margin): Rect {
    return {
        top: a.top + b.top,
        right: a.right - b.right,
        bottom: a.bottom - b.bottom,
        left: a.left + b.left,
    } as Rect;
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
