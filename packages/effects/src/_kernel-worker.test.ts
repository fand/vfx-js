import { afterEach, expect, test, vi } from "vitest";
import { KernelWorker } from "./_kernel-worker.js";

afterEach(() => {
    vi.unstubAllGlobals();
});

/** A worker that never answers, so a job stays pending until dispose. */
function stubSilentWorker() {
    vi.stubGlobal(
        "Worker",
        class {
            onmessage: unknown;
            onerror: unknown;
            postMessage() {}
            terminate() {}
        },
    );
    vi.stubGlobal("URL", {
        createObjectURL: () => "blob:x",
        revokeObjectURL() {},
    });
}

test("dispose rejects a pending job and does not run the kernel on the page", async () => {
    stubSilentWorker();
    let onPage = 0;
    const kw = new KernelWorker((() => ({
        build: () => {
            onPage++;
            return 1;
        },
    })) as never);
    const job = kw.run("build", {});
    kw.dispose();
    await expect(job).rejects.toThrow();
    await expect(kw.run("build", {})).rejects.toThrow("disposed");
    expect(onPage).toBe(0);
});

test("without workers the kernel runs on the page", async () => {
    vi.stubGlobal("Worker", undefined);
    const kw = new KernelWorker((() => ({ build: () => 42 })) as never);
    await expect(kw.run("build", {})).resolves.toBe(42);
});
