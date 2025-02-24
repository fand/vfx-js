import type { Rect } from "./rect.js";

/**
 * Layout of a rect in screen-space (bottom-left origin) that can be directly used in GLSL.
 */
export type XYWH = {
    x: number;
    y: number;
    w: number;
    h: number;
};

/**
 * Convert a Rect (top-left origin) to XYWH (bottom-left origin).
 */
export function rectToXywh(rect: Rect, containerHeight: number): XYWH {
    return {
        x: rect.left,
        y: containerHeight - rect.bottom,
        w: rect.right - rect.left,
        h: rect.bottom - rect.top,
    };
}
