// Pad-to-outputRect mapping shared by padded effects.
import type { EffectDims } from "@vfx-js/core";

const MAX_PAD = 10000;

/** `pad` clamped to 0..10000 CSS px, or `fallback` when it is not valid. */
export function padOf(
    pad: unknown,
    fallback: number | "fullscreen",
): number | "fullscreen" {
    if (pad === "fullscreen") {
        return pad;
    }
    return typeof pad === "number" && Number.isFinite(pad)
        ? Math.min(Math.max(pad, 0), MAX_PAD)
        : fallback;
}

export function padOutputRect(
    pad: number | "fullscreen",
    dims: EffectDims,
): readonly [number, number, number, number] {
    if (pad === "fullscreen") {
        return dims.canvasRect;
    }
    const px = pad * dims.pixelRatio;
    const [, , ew, eh] = dims.contentRect;
    return [-px, -px, ew + 2 * px, eh + 2 * px];
}
