// Pad-to-outputRect mapping shared by padded effects.
import type { EffectDims } from "@vfx-js/core";

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
