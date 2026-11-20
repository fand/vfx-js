import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Framebuffer } from "./framebuffer.js";
import { PixelRead } from "./read-pixels.js";

const GL = {
    DRAW_FRAMEBUFFER_BINDING: 0x8ca6,
    READ_FRAMEBUFFER_BINDING: 0x8caa,
    PIXEL_PACK_BUFFER_BINDING: 0x88ed,
    DRAW_FRAMEBUFFER: 0x8ca9,
    READ_FRAMEBUFFER: 0x8ca8,
    PIXEL_PACK_BUFFER: 0x88eb,
    STREAM_READ: 0x88e1,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    FLOAT: 0x1406,
    SYNC_GPU_COMMANDS_COMPLETE: 0x9117,
    SYNC_STATUS: 0x9114,
    SIGNALED: 0x9119,
    UNSIGNALED: 0x9118,
};

type FakeFbo = { name: string; pixels: number[][] };

/**
 * A WebGL2 stand-in that tracks bindings and copies a framebuffer's
 * "pixels" into the pack buffer at readPixels time, like the GPU would.
 */
function makeGl(opts: { pendingPolls?: number } = {}) {
    let pendingPolls = opts.pendingPolls ?? 0;
    const state = {
        draw: "canvas-draw" as unknown,
        read: "canvas-read" as unknown,
        pack: null as unknown,
    };
    const buffers = new Map<object, number[]>();
    const deleted = { buffers: 0, syncs: 0 };
    const calls: string[] = [];
    const gl = {
        ...GL,
        getParameter: vi.fn((name: number) => {
            const bindings: Record<number, unknown> = {
                [GL.DRAW_FRAMEBUFFER_BINDING]: state.draw,
                [GL.READ_FRAMEBUFFER_BINDING]: state.read,
                [GL.PIXEL_PACK_BUFFER_BINDING]: state.pack,
            };
            return bindings[name] ?? null;
        }),
        bindFramebuffer: vi.fn((target: number, fb: unknown) => {
            if (target === GL.DRAW_FRAMEBUFFER) {
                state.draw = fb;
            } else if (target === GL.READ_FRAMEBUFFER) {
                state.read = fb;
            }
        }),
        createBuffer: vi.fn(() => ({ _brand: "buffer" })),
        bindBuffer: vi.fn((_t: number, b: unknown) => {
            state.pack = b;
        }),
        bufferData: vi.fn(),
        readPixels: vi.fn(
            (x: number, y: number, w: number, h: number, _f, type: number) => {
                calls.push(`readPixels:${type === GL.FLOAT ? "float" : "u8"}`);
                const fbo = state.read as FakeFbo;
                const out: number[] = [];
                for (let row = y; row < y + h; row++) {
                    for (let col = x; col < x + w; col++) {
                        out.push(
                            ...fbo.pixels[row].slice(col * 4, col * 4 + 4),
                        );
                    }
                }
                buffers.set(state.pack as object, out);
            },
        ),
        fenceSync: vi.fn(() => ({ _brand: "sync" })),
        flush: vi.fn(() => calls.push("flush")),
        getSyncParameter: vi.fn(() => {
            if (pendingPolls > 0) {
                pendingPolls--;
                return GL.UNSIGNALED;
            }
            return GL.SIGNALED;
        }),
        getBufferSubData: vi.fn(
            (
                _t: number,
                _offset: number,
                dst: Uint8Array | Float32Array,
                dstOffset: number,
                len: number,
            ) => {
                const src = buffers.get(state.pack as object) ?? [];
                for (let i = 0; i < len; i++) {
                    dst[dstOffset + i] = src[i];
                }
            },
        ),
        deleteBuffer: vi.fn(() => deleted.buffers++),
        deleteSync: vi.fn(() => deleted.syncs++),
    };
    return {
        gl: gl as unknown as WebGL2RenderingContext,
        raw: gl,
        state,
        deleted,
        calls,
    };
}

/** A 2x2 framebuffer whose pixel at (col, row) is [row, col, 0, 255]. */
function makeFb(
    opts: { float?: boolean; msaa?: boolean; calls?: string[] } = {},
): Framebuffer {
    const pixels = [0, 1].map((row) =>
        [0, 1].flatMap((col) => [row, col, 0, 255]),
    );
    const fbo: FakeFbo = { name: "fbo", pixels };
    const resolveFbo: FakeFbo | null = opts.msaa
        ? { name: "resolve", pixels }
        : null;
    return {
        width: 2,
        height: 2,
        float: opts.float ?? false,
        fbo: opts.msaa ? { name: "msaa", pixels: [] } : fbo,
        resolveFbo,
        resolveColor: () => opts.calls?.push("resolveColor"),
    } as unknown as Framebuffer;
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("PixelRead", () => {
    it("reads an 8-bit target into a Uint8Array, bottom-up", async () => {
        const { gl } = makeGl();
        const read = new PixelRead(gl, makeFb(), undefined, () => {});
        await vi.runAllTimersAsync();
        const px = await read.promise;
        expect(px).toBeInstanceOf(Uint8Array);
        expect([...px]).toEqual([
            0, 0, 0, 255, 0, 1, 0, 255, 1, 0, 0, 255, 1, 1, 0, 255,
        ]);
    });

    it("reads a float target as FLOAT into a Float32Array", async () => {
        const { gl, raw, calls } = makeGl();
        const read = new PixelRead(
            gl,
            makeFb({ float: true }),
            undefined,
            () => {},
        );
        await vi.runAllTimersAsync();
        const px = await read.promise;
        expect(px).toBeInstanceOf(Float32Array);
        expect(px.length).toBe(16);
        expect(calls).toContain("readPixels:float");
        expect(raw.bufferData).toHaveBeenCalledWith(
            GL.PIXEL_PACK_BUFFER,
            16 * 4,
            GL.STREAM_READ,
        );
    });

    it("resolves an MSAA target and reads the resolved framebuffer", async () => {
        const { gl, calls } = makeGl();
        const fb = makeFb({ msaa: true, calls });
        const read = new PixelRead(gl, fb, undefined, () => {});
        await vi.runAllTimersAsync();
        const px = await read.promise;
        expect(calls.indexOf("resolveColor")).toBeLessThan(
            calls.indexOf("readPixels:u8"),
        );
        expect(px[4]).toBe(0);
        expect(px[5]).toBe(1);
    });

    it("restores the framebuffer and pack buffer bindings", () => {
        const { gl, state } = makeGl();
        state.pack = "user-pack";
        new PixelRead(gl, makeFb(), undefined, () => {});
        expect(state.draw).toBe("canvas-draw");
        expect(state.read).toBe("canvas-read");
        expect(state.pack).toBe("user-pack");
    });

    it("flushes and waits for the fence before mapping the buffer", async () => {
        const { gl, raw } = makeGl({ pendingPolls: 2 });
        let settled = false;
        const read = new PixelRead(gl, makeFb(), undefined, () => {
            settled = true;
        });
        expect(raw.flush).toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(4);
        await vi.advanceTimersByTimeAsync(4);
        expect(raw.getBufferSubData).not.toHaveBeenCalled();
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(4);
        expect(raw.getBufferSubData).toHaveBeenCalledTimes(1);
        expect(settled).toBe(true);
        await expect(read.promise).resolves.toBeInstanceOf(Uint8Array);
    });

    it("frees the buffer and the fence once read", async () => {
        const { gl, deleted } = makeGl();
        const read = new PixelRead(gl, makeFb(), undefined, () => {});
        await vi.runAllTimersAsync();
        await read.promise;
        expect(deleted).toEqual({ buffers: 1, syncs: 1 });
    });

    it("flips rows with flipY", async () => {
        const { gl } = makeGl();
        const read = new PixelRead(gl, makeFb(), { flipY: true }, () => {});
        await vi.runAllTimersAsync();
        const px = await read.promise;
        expect([...px]).toEqual([
            1, 0, 0, 255, 1, 1, 0, 255, 0, 0, 0, 255, 0, 1, 0, 255,
        ]);
    });

    it("reads a rect", async () => {
        const { gl } = makeGl();
        const read = new PixelRead(
            gl,
            makeFb(),
            { rect: [1, 1, 1, 1] },
            () => {},
        );
        await vi.runAllTimersAsync();
        expect([...(await read.promise)]).toEqual([1, 1, 0, 255]);
    });

    it("reads into the given buffer", async () => {
        const { gl } = makeGl();
        const into = new Uint8Array(20);
        const read = new PixelRead(gl, makeFb(), { into }, () => {});
        await vi.runAllTimersAsync();
        expect(await read.promise).toBe(into);
        expect(into[3]).toBe(255);
        expect(into[16]).toBe(0);
    });

    it("rejects a rect outside the target without touching GL", async () => {
        const { gl, raw } = makeGl();
        const settled = vi.fn();
        const read = new PixelRead(
            gl,
            makeFb(),
            { rect: [1, 0, 2, 2] },
            settled,
        );
        expect(read.settled).toBe(true);
        expect(settled).toHaveBeenCalledWith(read);
        await expect(read.promise).rejects.toThrow("rect");
        expect(raw.createBuffer).not.toHaveBeenCalled();
    });

    it("rejects an into of the wrong type or size", async () => {
        const { gl } = makeGl();
        const wrongType = new PixelRead(
            gl,
            makeFb({ float: true }),
            { into: new Uint8Array(16) },
            () => {},
        );
        await expect(wrongType.promise).rejects.toThrow("Float32Array");
        const tooSmall = new PixelRead(
            gl,
            makeFb(),
            { into: new Uint8Array(15) },
            () => {},
        );
        await expect(tooSmall.promise).rejects.toThrow("Uint8Array");
    });

    it("cancel rejects and frees the GL objects", async () => {
        const { gl, raw, deleted } = makeGl({ pendingPolls: 100 });
        const read = new PixelRead(gl, makeFb(), undefined, () => {});
        read.cancel(new Error("gone"));
        await expect(read.promise).rejects.toThrow("gone");
        expect(deleted).toEqual({ buffers: 1, syncs: 1 });
        await vi.runAllTimersAsync();
        expect(raw.getBufferSubData).not.toHaveBeenCalled();
    });

    it("rejects when the fence is gone", async () => {
        const { gl, raw } = makeGl();
        raw.getSyncParameter.mockReturnValue(null as unknown as number);
        const read = new PixelRead(gl, makeFb(), undefined, () => {});
        const done = expect(read.promise).rejects.toThrow("fence");
        await vi.runAllTimersAsync();
        await done;
    });
});
