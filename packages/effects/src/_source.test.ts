import type { EffectContext } from "@vfx-js/core";
import { describe, expect, test, vi } from "vitest";
import {
    ASPECT_TOLERANCE,
    CAPTURE_DELAY,
    CAPTURE_RETRY_MAX,
    RESIZE_SETTLE,
    SourceCapture,
    type SourceReadback,
    sourceChannelOf,
} from "./_source.js";

type Target = { width: number; height: number; disposed: boolean };

/**
 * A fake EffectContext with what the capture uses. Each `readPixels` is
 * held until `resolve(i)` / `reject(i)`.
 */
function makeCtx(w = 200, h = 100) {
    const targets: Target[] = [];
    const reads: {
        target: Target;
        opts: unknown;
        resolve: (px: Uint8Array) => void;
        reject: (e: Error) => void;
    }[] = [];
    const draws: unknown[] = [];
    const ctx = {
        src: { width: w, height: h },
        dims: { elementPixel: [w, h] as [number, number] },
        draw: (d: unknown) => draws.push(d),
        createRenderTarget(o: { size: [number, number] }) {
            const t = {
                width: o.size[0],
                height: o.size[1],
                disposed: false,
                dispose() {
                    t.disposed = true;
                },
            };
            targets.push(t);
            return t;
        },
        readPixels: vi.fn((target: Target, opts?: unknown) => {
            return new Promise<Uint8Array>((resolve, reject) => {
                reads.push({ target, opts, resolve, reject });
            });
        }),
    };
    const resize = (nw: number, nh: number) => {
        ctx.dims.elementPixel = [nw, nh];
        ctx.src.width = nw;
        ctx.src.height = nh;
    };
    return {
        ctx: ctx as unknown as EffectContext,
        raw: ctx,
        targets,
        reads,
        draws,
        resize,
    };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Run `update` until a read starts; the number of frames it took. */
function framesToRead(
    cap: SourceCapture,
    ctx: EffectContext,
    reads: unknown[],
    max = 1000,
): number {
    const n = reads.length;
    for (let i = 1; i <= max; i++) {
        cap.update(ctx);
        if (reads.length > n) {
            return i;
        }
    }
    return -1;
}

function pixels(w: number, h: number): Uint8Array {
    return new Uint8Array(w * h * 4);
}

describe("SourceCapture", () => {
    test("waits CAPTURE_DELAY frames, then reads a mask of the long side at the element's aspect", async () => {
        const { ctx, reads, targets, draws } = makeCtx(200, 100);
        const got: SourceReadback[] = [];
        const cap = new SourceCapture({
            longSide: 64,
            onRead: (r) => {
                got.push(r);
                return true;
            },
        });
        expect(cap.phase).toBe("capture");
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
        expect(cap.phase).toBe("reading");
        expect(draws).toHaveLength(1);
        expect(targets).toHaveLength(1);
        expect(targets[0]).toMatchObject({ width: 64, height: 32 });
        // The read copies the pixels when called, so the mask goes at once.
        expect(targets[0].disposed).toBe(true);
        expect(reads[0].opts).toBeUndefined();

        const px = pixels(64, 32);
        reads[0].resolve(px);
        await tick();
        expect(got).toEqual([{ pixels: px, width: 64, height: 32, aspect: 2 }]);
        expect(cap.phase).toBe("idle");
        // Idle: no more reads while nothing changes.
        expect(framesToRead(cap, ctx, reads, 50)).toBe(-1);
    });

    test("portrait elements get the long side as height; read options are passed", () => {
        const { ctx, reads, targets } = makeCtx(50, 200);
        const cap = new SourceCapture({
            longSide: 100,
            read: { flipY: true },
            onRead: () => true,
        });
        framesToRead(cap, ctx, reads);
        expect(targets[0]).toMatchObject({ width: 25, height: 100 });
        expect(reads[0].opts).toEqual({ flipY: true });
    });

    test("does not count frames while the source or the element is empty", () => {
        const { ctx, reads, resize } = makeCtx();
        const cap = new SourceCapture({ longSide: 16, onRead: () => true });
        resize(0, 0);
        for (let i = 0; i < 10; i++) {
            cap.update(ctx);
        }
        expect(reads).toHaveLength(0);
        resize(20, 10);
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
    });

    test("an empty read is retried with a doubling gap, capped at CAPTURE_RETRY_MAX", async () => {
        const { ctx, reads } = makeCtx();
        const onRead = vi.fn(() => false);
        const cap = new SourceCapture({ longSide: 16, onRead });
        const gaps: number[] = [];
        for (let i = 0; i < 8; i++) {
            gaps.push(framesToRead(cap, ctx, reads));
            reads[reads.length - 1].resolve(pixels(16, 8));
            await tick();
            expect(cap.phase).toBe("capture");
        }
        const want: number[] = [];
        for (let g = CAPTURE_DELAY; want.length < 8; ) {
            want.push(g);
            g = Math.min(g * 2, CAPTURE_RETRY_MAX);
        }
        expect(gaps).toEqual(want);
        expect(onRead).toHaveBeenCalledTimes(8);
    });

    test("a rejected read is retried without backoff", async () => {
        const { ctx, reads } = makeCtx();
        const cap = new SourceCapture({ longSide: 16, onRead: () => false });
        framesToRead(cap, ctx, reads);
        reads[0].resolve(pixels(16, 8)); // empty: the gap doubles
        await tick();
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY * 2);
        reads[1].reject(new Error("lost"));
        await tick();
        expect(cap.phase).toBe("capture");
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY * 2);
    });

    test("refresh drops a read in flight and starts over", async () => {
        const { ctx, reads } = makeCtx();
        const onRead = vi.fn(() => true);
        const cap = new SourceCapture({ longSide: 16, onRead });
        framesToRead(cap, ctx, reads);
        cap.refresh();
        expect(cap.phase).toBe("capture");
        reads[0].resolve(pixels(16, 8));
        await tick();
        expect(onRead).not.toHaveBeenCalled();
        expect(cap.phase).toBe("capture");
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
        reads[1].resolve(pixels(16, 8));
        await tick();
        expect(onRead).toHaveBeenCalledTimes(1);
        expect(cap.phase).toBe("idle");
    });

    test("refresh resets the backoff, and works when idle", async () => {
        const { ctx, reads } = makeCtx();
        let ok = false;
        const cap = new SourceCapture({ longSide: 16, onRead: () => ok });
        framesToRead(cap, ctx, reads);
        reads[0].resolve(pixels(16, 8));
        await tick();
        cap.refresh();
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
        ok = true;
        reads[1].resolve(pixels(16, 8));
        await tick();
        expect(cap.phase).toBe("idle");
        cap.refresh();
        expect(cap.phase).toBe("capture");
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
    });

    test("a restored context drops the read in flight and reads again", async () => {
        const { ctx, reads } = makeCtx();
        const onRead = vi.fn(() => true);
        const cap = new SourceCapture({ longSide: 16, onRead });
        framesToRead(cap, ctx, reads);
        cap.contextRestored();
        expect(cap.phase).toBe("capture");
        reads[0].reject(new Error("lost"));
        await tick();
        expect(onRead).not.toHaveBeenCalled();
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
        reads[1].resolve(pixels(16, 8));
        await tick();
        expect(cap.phase).toBe("idle");
        // Idle: a restore keeps the capture.
        cap.contextRestored();
        expect(cap.phase).toBe("idle");
    });

    test("reset drops the read in flight and starts over like a new instance", async () => {
        const { ctx, reads } = makeCtx();
        const onRead = vi.fn(() => false);
        const cap = new SourceCapture({ longSide: 16, onRead });
        framesToRead(cap, ctx, reads);
        reads[0].resolve(pixels(16, 8));
        await tick();
        framesToRead(cap, ctx, reads);
        cap.reset();
        reads[1].resolve(pixels(16, 8));
        await tick();
        expect(onRead).toHaveBeenCalledTimes(1);
        expect(framesToRead(cap, ctx, reads)).toBe(CAPTURE_DELAY);
    });

    test("with minLongSide, the mask follows the element's size and is read again when it grows", async () => {
        const { ctx, reads, targets, resize } = makeCtx(200, 100);
        const cap = new SourceCapture({
            longSide: 1024,
            minLongSide: 64,
            onRead: () => true,
        });
        framesToRead(cap, ctx, reads);
        expect([targets[0].width, targets[0].height]).toEqual([200, 100]);
        reads[0].resolve(pixels(200, 100));
        await tick();

        // Grown, but within the tolerance: kept.
        resize(240, 120);
        expect(framesToRead(cap, ctx, reads, 50)).toBe(-1);
        // Grown past it: read again at the new size.
        resize(400, 200);
        expect(framesToRead(cap, ctx, reads)).toBeGreaterThan(0);
        expect([targets[1].width, targets[1].height]).toEqual([400, 200]);
        reads[1].resolve(pixels(400, 200));
        await tick();

        // Clamped to longSide and minLongSide.
        resize(4000, 2000);
        framesToRead(cap, ctx, reads);
        expect(targets[2].width).toBe(1024);
        reads[2].resolve(pixels(1024, 512));
        await tick();
        cap.refresh();
        resize(20, 10);
        framesToRead(cap, ctx, reads);
        expect(targets[3].width).toBe(64);
    });

    test("recaptures once a changed aspect ratio has settled, not on a change of size alone", async () => {
        const { ctx, reads, resize } = makeCtx(200, 100);
        const got: number[] = [];
        const cap = new SourceCapture({
            longSide: 16,
            onRead: (r) => {
                got.push(r.aspect);
                return true;
            },
        });
        framesToRead(cap, ctx, reads);
        reads[0].resolve(pixels(16, 8));
        await tick();

        // Same aspect, new size: kept.
        resize(400, 200);
        expect(framesToRead(cap, ctx, reads, 50)).toBe(-1);
        // Within the tolerance: kept.
        resize(Math.round(400 * (1 + ASPECT_TOLERANCE / 2)), 200);
        expect(framesToRead(cap, ctx, reads, 50)).toBe(-1);

        // A resize animation: read back once, after it settles.
        for (let w = 400; w > 200; w -= 10) {
            resize(w, 200);
            cap.update(ctx);
        }
        expect(reads).toHaveLength(1);
        resize(200, 200);
        // The frame the size changed, RESIZE_SETTLE still frames, then the
        // capture delay.
        expect(framesToRead(cap, ctx, reads)).toBe(
            1 + RESIZE_SETTLE + CAPTURE_DELAY - 1,
        );
        reads[1].resolve(pixels(16, 16));
        await tick();
        expect(got).toEqual([2, 1]);
        expect(framesToRead(cap, ctx, reads, 50)).toBe(-1);
    });
});

describe("sourceChannelOf", () => {
    test("keeps the channels and reads anything else as alpha", () => {
        expect(sourceChannelOf("alpha")).toBe("alpha");
        expect(sourceChannelOf("luminance")).toBe("luminance");
        expect(sourceChannelOf("none")).toBe("none");
        expect(sourceChannelOf(undefined)).toBe("alpha");
        expect(sourceChannelOf("luma")).toBe("alpha");
    });
});
