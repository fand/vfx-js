// Builds the silhouette's SDF off the main thread: one worker shared by
// every effect that reads a shape (GlassEffect, BubbleEffect,
// SwirlParticleEffect). Jobs run one after another. Without workers (CSP,
// old browsers, Node) the kernel runs on the page, as before.
import { KernelWorker } from "./_kernel-worker.js";
import { SHAPE_KERNEL_SOURCE } from "./_shape-kernel-source.js";
import {
    type ShapeJob,
    type ShapeJobResult,
    shapeKernel,
} from "./_silhouette.js";

let worker: KernelWorker | null = null;

/** Build a shape in the worker. The job's pixels are handed over: don't use them after. */
export function buildShapeAsync(job: ShapeJob): Promise<ShapeJobResult> {
    worker ??= new KernelWorker(shapeKernel as never, SHAPE_KERNEL_SOURCE);
    return worker.run<ShapeJobResult>("buildShapeJob", job, [
        job.pixels.buffer as ArrayBuffer,
    ]);
}
