import type { Rect } from "./rect.js";

/**
 * Layout of a rect in screen-space (bottom-left origin) that can be directly used in GLSL.
 * @internal
 */
export type GLRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

/**
 * Convert a Rect (top-left origin) to GLRect (bottom-left origin).
 * @internal
 */
export function rectToGLRect(rect: Rect, containerHeight: number): GLRect {
    return {
        x: rect.left,
        y: containerHeight - rect.bottom,
        w: rect.right - rect.left,
        h: rect.bottom - rect.top,
    };
}

/**
 * @internal
 */
export function getGLRect(x: number, y: number, w: number, h: number): GLRect {
    return { x, y, w, h };
}
