// Builds the silhouette's SDF off the main thread: one worker shared by
// every effect that reads a shape (GlassEffect, BubbleEffect,
// SwirlParticleEffect). Jobs run one after another. Without workers (CSP,
// old browsers, Node) the kernel runs on the page, as before.
import { KernelWorker } from "./_kernel-worker.js";
import { SHAPE_KERNEL_SOURCE } from "./_shape-kernel-source.js";
import {
    type ReliefJob,
    type ShapeJob,
    type ShapeJobResult,
    shapeKernel,
} from "./_silhouette.js";

let worker: KernelWorker | null = null;

function shapeWorker(): KernelWorker {
    worker ??= new KernelWorker(shapeKernel as never, SHAPE_KERNEL_SOURCE);
    return worker;
}

/** Build a shape in the worker. The job's pixels are handed over: don't use them after. */
export function buildShapeAsync(job: ShapeJob): Promise<ShapeJobResult> {
    return shapeWorker().run<ShapeJobResult>("buildShapeJob", job, [
        job.pixels.buffer as ArrayBuffer,
    ]);
}

/** Build a relief again in the worker. The luminance is copied, not handed over. */
export function buildReliefAsync(
    job: ReliefJob,
): Promise<{ map: Float32Array; maxGrad: number }> {
    return shapeWorker().run("buildReliefJob", job);
}
