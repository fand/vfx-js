import { expect, test } from "vitest";
import { bubbleKernelSource } from "../scripts/gen-bubble-kernel.mjs";
import { bubbleKernel, buildFoam } from "./_bubble-fill.js";
import { BUBBLE_KERNEL_SOURCE } from "./_bubble-kernel-source.js";
import { buildShape } from "./_silhouette.js";

test("_bubble-kernel-source.ts is up to date (node scripts/gen-bubble-kernel.mjs)", () => {
    expect(BUBBLE_KERNEL_SOURCE).toBe(bubbleKernelSource());
});

test("the kernel source is self-contained and gives the factory's functions", () => {
    // Evaluated alone, as in the worker: nothing from outside is needed.
    const k = new Function(
        `"use strict"; return (${BUBBLE_KERNEL_SOURCE})();`,
    )();
    expect(Object.keys(k).sort()).toEqual(Object.keys(bubbleKernel()).sort());
});

test("the worker's kernel places the same foam as the module's", () => {
    // A rounded bar, as alpha.
    const W = 128;
    const H = 48;
    const px = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const inside =
                Math.hypot(Math.max(Math.abs(x - 64) - 40, 0), y - 24) < 16;
            px[(y * W + x) * 4 + 3] = inside ? 255 : 0;
        }
    }
    const shape = buildShape(px, W, H, "alpha", 0.05, W / H, 1, 1);
    if (!shape) {
        throw new Error("empty shape");
    }
    const input = {
        shape: {
            sdf: shape.sdf,
            sdfW: shape.sdfW,
            sdfH: shape.sdfH,
            sdfRect: shape.sdfRect,
        },
        fill: {
            halfDepth: 0.05,
            bevel: 0.02,
            cellSize: 0.1,
            roundness: 0.3,
            cellSizeRandomness: 0.25,
            seed: 3,
            minSize: 0.25,
        },
        wobble: 0.06,
        containment: 0.5,
    };
    const k = new Function(
        `"use strict"; return (${BUBBLE_KERNEL_SOURCE})();`,
    )();
    const a = k.buildFoam(input);
    const b = buildFoam(input);
    expect(a.fill.count).toBeGreaterThan(10);
    expect(Array.from(a.grid.sphereData)).toEqual(
        Array.from(b.grid.sphereData),
    );
    expect(Array.from(a.grid.index)).toEqual(Array.from(b.grid.index));
    expect(Array.from(a.edgeGrid.index)).toEqual(
        Array.from(b.edgeGrid?.index ?? []),
    );
    expect(Array.from(a.drift)).toEqual(Array.from(b.drift));
});
