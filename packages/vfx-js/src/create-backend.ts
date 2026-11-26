import type { Backend } from "./backend.js";
import { createWebGLBackend } from "./gl/backend.js";

/**
 * Pick and create the GPU backend for a VFX canvas.
 * Throws when no backend is available.
 * @internal
 */
export function createBackend(
    canvas: HTMLCanvasElement,
    opts: { preserveDrawingBuffer: boolean },
): Backend {
    return createWebGLBackend(canvas, opts.preserveDrawingBuffer);
}
