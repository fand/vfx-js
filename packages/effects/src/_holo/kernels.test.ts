import { expect, test } from "vitest";
import { kernelSources } from "../../scripts/gen-holo-kernels.mjs";
import { LOGO_KERNEL_SOURCE, PAPER_KERNEL_SOURCE } from "./data/kernels.js";
import { logoKernel } from "./scene/logo.js";
import { paperKernel } from "./scene/paper-maps.js";

test("data/kernels.ts is up to date (node scripts/gen-holo-kernels.mjs)", () => {
    const k = kernelSources();
    expect(LOGO_KERNEL_SOURCE).toBe(k.logo);
    expect(PAPER_KERNEL_SOURCE).toBe(k.paper);
});

test("the kernel sources are self-contained and give the factories' functions", () => {
    for (const [src, factory] of [
        [LOGO_KERNEL_SOURCE, logoKernel],
        [PAPER_KERNEL_SOURCE, paperKernel],
    ] as const) {
        // evaluated alone, as in the worker: nothing from outside the function is needed
        const k = new Function(`"use strict"; return (${src})();`)();
        expect(Object.keys(k).sort()).toEqual(Object.keys(factory()).sort());
    }
});
