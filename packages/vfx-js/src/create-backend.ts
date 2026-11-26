import type { Backend } from "./backend.js";
import { createWebGLBackend } from "./gl/backend.js";

/**
 * Pick and create the GPU backend for a VFX canvas.
 * WebGL2 is created now and throws when missing.
 * WebGPU needs an async device request, so it returns a promise.
 * Its code is loaded on demand, so WebGL pages don't pay for it.
 * @internal
 */
export function createBackend(
    canvas: HTMLCanvasElement,
    opts: { backend: "webgl" | "webgpu"; preserveDrawingBuffer: boolean },
): Backend | Promise<Backend> {
    if (opts.backend === "webgpu") {
        return import("./webgpu/backend.js").then((m) =>
            m.createWebGPUBackend(canvas),
        );
    }
    return createWebGLBackend(canvas, opts.preserveDrawingBuffer);
}
