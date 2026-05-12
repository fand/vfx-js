import type { VFX, VFXProps } from "@vfx-js/core";
import { describe, expect, it, vi } from "vitest";
import { applyDelta, createOpQueue, nonEffectKeysEqual } from "./lifecycle.js";

describe("createOpQueue", () => {
    it("runs ops in FIFO order", async () => {
        const q = createOpQueue();
        const log: string[] = [];
        const a = q.enqueue(async () => {
            await Promise.resolve();
            log.push("a");
        });
        const b = q.enqueue(async () => {
            log.push("b");
        });
        const c = q.enqueue(async () => {
            log.push("c");
        });
        await Promise.all([a, b, c]);
        expect(log).toEqual(["a", "b", "c"]);
    });

    it("serializes — later ops wait for earlier ones to settle", async () => {
        const q = createOpQueue();
        let aDone = false;
        const a = q.enqueue(async () => {
            await new Promise((r) => setTimeout(r, 10));
            aDone = true;
        });
        const b = q.enqueue(() => {
            expect(aDone).toBe(true);
        });
        await Promise.all([a, b]);
    });

    it("a failed op does not halt the chain", async () => {
        const q = createOpQueue();
        const log: string[] = [];
        const a = q.enqueue(async () => {
            log.push("a");
            throw new Error("boom");
        });
        const b = q.enqueue(() => {
            log.push("b");
        });
        await expect(a).rejects.toThrow("boom");
        await b;
        expect(log).toEqual(["a", "b"]);
    });

    it("computes 'prev' at execution time (a→b→c serialized correctly)", async () => {
        const q = createOpQueue();
        let applied = "P0";
        const calls: { prev: string; next: string }[] = [];

        const enqueueDelta = (next: string): Promise<void> =>
            q.enqueue(async () => {
                const prev = applied;
                await Promise.resolve();
                calls.push({ prev, next });
                applied = next;
            });

        const b = enqueueDelta("P1");
        const c = enqueueDelta("P2");
        const d = enqueueDelta("P3");

        await Promise.all([b, c, d]);
        expect(calls).toEqual([
            { prev: "P0", next: "P1" },
            { prev: "P1", next: "P2" },
            { prev: "P2", next: "P3" },
        ]);
        expect(applied).toBe("P3");
    });
});

describe("nonEffectKeysEqual", () => {
    it("returns true when all non-effect keys match", () => {
        const a: VFXProps = { shader: "uvGradient", uniforms: {} };
        const b: VFXProps = { shader: "uvGradient", uniforms: {} };
        expect(nonEffectKeysEqual(a, b)).toBe(false); // uniforms differ by ref

        const sharedUniforms = {};
        const c: VFXProps = { shader: "uvGradient", uniforms: sharedUniforms };
        const d: VFXProps = { shader: "uvGradient", uniforms: sharedUniforms };
        expect(nonEffectKeysEqual(c, d)).toBe(true);
    });

    it("ignores the effect key", () => {
        const fxA = [{ render: () => {} }];
        const fxB = [{ render: () => {} }];
        const a: VFXProps = { effect: fxA };
        const b: VFXProps = { effect: fxB };
        expect(nonEffectKeysEqual(a, b)).toBe(true);
    });

    it("detects difference in non-effect keys", () => {
        const a: VFXProps = { overflow: 50 };
        const b: VFXProps = { overflow: 100 };
        expect(nonEffectKeysEqual(a, b)).toBe(false);
    });
});

function makeVfxStub() {
    return {
        add: vi.fn(async () => {}),
        remove: vi.fn(),
        updateEffects: vi.fn(async () => {}),
    } as unknown as VFX & {
        add: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
        updateEffects: ReturnType<typeof vi.fn>;
    };
}

describe("applyDelta", () => {
    const el = {} as HTMLElement;

    it("no-ops when effect ref + non-effect keys are identical", async () => {
        const vfx = makeVfxStub();
        const fx = [{ render: () => {} }];
        const props: VFXProps = { effect: fx, overflow: 10 };
        await applyDelta(vfx, el, props, props, vfx.add);
        expect(vfx.add).not.toHaveBeenCalled();
        expect(vfx.remove).not.toHaveBeenCalled();
        expect(vfx.updateEffects).not.toHaveBeenCalled();
    });

    it("takes the updateEffects fast path when only effect ref changes", async () => {
        const vfx = makeVfxStub();
        const fxA = [{ render: () => {} }];
        const fxB = [{ render: () => {} }];
        const sharedUniforms = {};
        const prev: VFXProps = { effect: fxA, uniforms: sharedUniforms };
        const next: VFXProps = { effect: fxB, uniforms: sharedUniforms };
        await applyDelta(vfx, el, prev, next, vfx.add);
        expect(vfx.updateEffects).toHaveBeenCalledWith(el, fxB);
        expect(vfx.add).not.toHaveBeenCalled();
        expect(vfx.remove).not.toHaveBeenCalled();
    });

    it("falls back to remove+add when a non-effect key changes", async () => {
        const vfx = makeVfxStub();
        const prev: VFXProps = { overflow: 50 };
        const next: VFXProps = { overflow: 100 };
        const addFn = vi.fn(async () => {});
        await applyDelta(vfx, el, prev, next, addFn);
        expect(vfx.remove).toHaveBeenCalledWith(el);
        expect(addFn).toHaveBeenCalledWith(el, next);
        expect(vfx.updateEffects).not.toHaveBeenCalled();
    });

    it("awaits addFn so callers can serialize via a queue", async () => {
        const vfx = makeVfxStub();
        let addResolved = false;
        const addFn = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    setTimeout(() => {
                        addResolved = true;
                        resolve();
                    }, 5);
                }),
        );
        const prev: VFXProps = { overflow: 1 };
        const next: VFXProps = { overflow: 2 };
        await applyDelta(vfx, el, prev, next, addFn);
        expect(addResolved).toBe(true);
    });
});
