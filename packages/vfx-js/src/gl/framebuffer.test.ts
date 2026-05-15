import { describe, expect, it, vi } from "vitest";
import type { GLContext } from "./context.js";
import { Framebuffer } from "./framebuffer.js";

/** Minimal WebGL2 mock — only what Framebuffer touches. */
function makeMockGl() {
    let fboSeq = 0;
    let texSeq = 0;
    const noop = () => {};
    return {
        TEXTURE_2D: 0x0de1,
        FRAMEBUFFER: 0x8d40,
        COLOR_ATTACHMENT0: 0x8ce0,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_MAG_FILTER: 0x2800,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,
        NEAREST: 0x2600,
        LINEAR: 0x2601,
        NEAREST_MIPMAP_NEAREST: 0x2700,
        LINEAR_MIPMAP_LINEAR: 0x2703,
        CLAMP_TO_EDGE: 0x812f,
        RGBA: 0x1908,
        RGBA8: 0x8058,
        RGBA16F: 0x881a,
        RGBA32F: 0x8814,
        UNSIGNED_BYTE: 0x1401,
        FLOAT: 0x1406,
        HALF_FLOAT: 0x140b,
        createFramebuffer: vi.fn<() => { _fbo: number } | null>(() => ({
            _fbo: ++fboSeq,
        })),
        deleteFramebuffer: vi.fn(),
        createTexture: vi.fn(() => ({ _tex: ++texSeq })),
        deleteTexture: vi.fn(),
        bindFramebuffer: noop,
        bindTexture: noop,
        texImage2D: vi.fn(),
        texStorage2D: vi.fn(),
        texParameteri: vi.fn(),
        framebufferTexture2D: noop,
        generateMipmap: vi.fn(),
    };
}

function makeCtx(gl: ReturnType<typeof makeMockGl>): GLContext {
    return {
        gl,
        floatLinearFilter: false,
        addResource: vi.fn(),
        removeResource: vi.fn(),
    } as unknown as GLContext;
}

describe("Framebuffer", () => {
    it("deletes the old FBO on setSize", () => {
        const gl = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        const oldFbo = fb.fbo;
        fb.setSize(20, 20);
        expect(gl.deleteFramebuffer).toHaveBeenCalledWith(oldFbo);
        expect(fb.fbo).not.toBe(oldFbo);
    });

    it("keeps the old FBO live if createFramebuffer fails mid-setSize", () => {
        const gl = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        const oldFbo = fb.fbo;
        gl.createFramebuffer.mockReturnValueOnce(null);
        expect(() => fb.setSize(20, 20)).toThrow();
        expect(gl.deleteFramebuffer).not.toHaveBeenCalled();
        expect(fb.fbo).toBe(oldFbo);
    });

    it("deletes the old FBO only after the new one is assigned", () => {
        const gl = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        const order: string[] = [];
        gl.createFramebuffer.mockImplementationOnce(() => {
            order.push("create");
            return { _fbo: 999 };
        });
        gl.deleteFramebuffer.mockImplementationOnce(() => order.push("delete"));
        fb.setSize(20, 20);
        expect(order).toEqual(["create", "delete"]);
    });

    describe("mipmap", () => {
        it("default (no opt) → texImage2D, single level, base filter", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 16, 16);
            expect(gl.texImage2D).toHaveBeenCalled();
            expect(gl.texStorage2D).not.toHaveBeenCalled();
            // MIN_FILTER set to base LINEAR (no mipmap promotion).
            const minCall = gl.texParameteri.mock.calls.find(
                (c) => c[1] === gl.TEXTURE_MIN_FILTER,
            );
            expect(minCall?.[2]).toBe(gl.LINEAR);
        });

        it("mipmap:true → texStorage2D with log2(max) + 1 levels", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 64, 32, { mipmap: true });
            expect(gl.texImage2D).not.toHaveBeenCalled();
            expect(gl.texStorage2D).toHaveBeenCalledTimes(1);
            // 64x32 → log2(64) + 1 = 7 levels
            const call = gl.texStorage2D.mock.calls[0];
            expect(call[1]).toBe(7);
            expect(call[3]).toBe(64);
            expect(call[4]).toBe(32);
        });

        it("mipmap:true + filter:'linear' (default) → MIN=LINEAR_MIPMAP_LINEAR, MAG=LINEAR", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 16, 16, { mipmap: true });
            const min = gl.texParameteri.mock.calls.find(
                (c) => c[1] === gl.TEXTURE_MIN_FILTER,
            );
            const mag = gl.texParameteri.mock.calls.find(
                (c) => c[1] === gl.TEXTURE_MAG_FILTER,
            );
            expect(min?.[2]).toBe(gl.LINEAR_MIPMAP_LINEAR);
            expect(mag?.[2]).toBe(gl.LINEAR);
        });

        it("mipmap:true + filter:'nearest' → MIN=NEAREST_MIPMAP_NEAREST, MAG=NEAREST", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 16, 16, {
                mipmap: true,
                filter: "nearest",
            });
            const min = gl.texParameteri.mock.calls.find(
                (c) => c[1] === gl.TEXTURE_MIN_FILTER,
            );
            const mag = gl.texParameteri.mock.calls.find(
                (c) => c[1] === gl.TEXTURE_MAG_FILTER,
            );
            expect(min?.[2]).toBe(gl.NEAREST_MIPMAP_NEAREST);
            expect(mag?.[2]).toBe(gl.NEAREST);
        });

        it("1x1 mipmap RT → 1 level (no crash)", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 1, 1, { mipmap: true });
            expect(gl.texStorage2D.mock.calls[0][1]).toBe(1);
        });

        it("generateMipmaps() calls gl.generateMipmap when mipmap:true", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { mipmap: true });
            fb.generateMipmaps();
            expect(gl.generateMipmap).toHaveBeenCalledWith(gl.TEXTURE_2D);
        });

        it("generateMipmaps() is no-op when mipmap:false", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16);
            fb.generateMipmaps();
            expect(gl.generateMipmap).not.toHaveBeenCalled();
        });

        it("setSize on mipmap RT reallocates with new level count", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { mipmap: true });
            // 16 → 5 levels
            expect(gl.texStorage2D.mock.calls[0][1]).toBe(5);
            fb.setSize(64, 64);
            // 64 → 7 levels
            expect(gl.texStorage2D.mock.calls[1][1]).toBe(7);
        });
    });
});
