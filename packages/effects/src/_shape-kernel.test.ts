import { expect, test } from "vitest";
import { shapeKernelSource } from "../scripts/gen-shape-kernel.mjs";
import { SHAPE_KERNEL_SOURCE } from "./_shape-kernel-source.js";
import { buildShapeAsync } from "./_shape-worker.js";
import { buildShapeJob, type ShapeJob, shapeKernel } from "./_silhouette.js";

test("_shape-kernel-source.ts is up to date (node scripts/gen-shape-kernel.mjs)", () => {
    expect(SHAPE_KERNEL_SOURCE).toBe(shapeKernelSource());
});

test("the kernel source is self-contained and gives the factory's functions", () => {
    // Evaluated alone, as in the worker: nothing from outside is needed.
    const k = new Function(
        `"use strict"; return (${SHAPE_KERNEL_SOURCE})();`,
    )();
    expect(Object.keys(k).sort()).toEqual(Object.keys(shapeKernel()).sort());
});

// A disc, as alpha, with a bright half for the relief.
function job(spawn: boolean, relief: boolean): ShapeJob {
    const W = 64;
    const H = 48;
    const pixels = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const inside = Math.hypot(x - 32, y - 24) < 18;
            pixels[i] = x < 32 ? 255 : 0;
            pixels[i + 3] = inside ? 255 : 0;
        }
    }
    return {
        pixels,
        mw: W,
        mh: H,
        channel: "alpha",
        halfDepthHint: 0.1,
        aspect: W / H,
        smoothRadius: 1,
        smoothPasses: 1,
        spawn,
        relief: relief ? { blur: 0.02, passes: 2, maxRadius: 64 } : undefined,
    };
}

test("the worker's kernel builds the same shape as the module's", () => {
    const k = new Function(
        `"use strict"; return (${SHAPE_KERNEL_SOURCE})();`,
    )();
    const a = k.buildShapeJob(job(true, true));
    const b = buildShapeJob(job(true, true));
    expect(a.sdf).toEqual(b.sdf);
    expect(a.spawn).toEqual(b.spawn);
    expect(a.relief.map).toEqual(b.relief.map);
});

test("spawn points and the relief are built only when asked", () => {
    const plain = buildShapeJob(job(false, false));
    expect(plain?.spawn.length).toBe(0);
    expect(plain?.relief).toBeNull();
    const full = buildShapeJob(job(true, true));
    expect(full?.spawn.length).toBeGreaterThan(0);
    expect(full?.relief?.maxGrad).toBeGreaterThan(0);
});

test("buildShapeAsync runs on the page without workers", async () => {
    const shape = await buildShapeAsync(job(false, false));
    expect(shape?.sdfW).toBe(buildShapeJob(job(false, false))?.sdfW);
});
