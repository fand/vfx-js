import { describe, expect, it, vi } from "vitest";
import type { GLContext } from "./context.js";
import { Framebuffer } from "./framebuffer.js";

/** Minimal WebGL2 mock — tracks the calls Framebuffer makes. */
function makeMockGl() {
    let fboSeq = 0;
    let texSeq = 0;
    const calls: Array<[string, ...unknown[]]> = [];
    const record =
        (name: string) =>
        (...args: unknown[]) => {
            calls.push([name, ...args]);
        };
    const gl = {
        // enum constants (only the ones Framebuffer touches)
        TEXTURE_2D: 0x0de1,
        FRAMEBUFFER: 0x8d40,
        COLOR_ATTACHMENT0: 0x8ce0,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_MAG_FILTER: 0x2800,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,
        LINEAR: 0x2601,
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
        bindFramebuffer: record("bindFramebuffer"),
        bindTexture: record("bindTexture"),
        texImage2D: record("texImage2D"),
        texParameteri: record("texParameteri"),
        framebufferTexture2D: record("framebufferTexture2D"),
    };
    return { gl, calls };
}

function makeCtx(gl: ReturnType<typeof makeMockGl>["gl"]): GLContext {
    return {
        gl,
        floatLinearFilter: false,
        addResource: vi.fn(),
        removeResource: vi.fn(),
    } as unknown as GLContext;
}

describe("Framebuffer", () => {
    it("deletes the old FBO on setSize", () => {
        const { gl } = makeMockGl();
        const ctx = makeCtx(gl);
        const fb = new Framebuffer(ctx, 10, 10);
        const oldFbo = fb.fbo;

        fb.setSize(20, 20);

        expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
        expect(gl.deleteFramebuffer).toHaveBeenCalledWith(oldFbo);
        expect(fb.fbo).not.toBe(oldFbo);
        expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
    });

    it("does not delete on constructor (no prior fbo)", () => {
        const { gl } = makeMockGl();
        new Framebuffer(makeCtx(gl), 10, 10);
        expect(gl.deleteFramebuffer).not.toHaveBeenCalled();
        expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);
    });

    it("skips re-allocation when setSize is a no-op", () => {
        const { gl } = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        fb.setSize(10, 10);
        expect(gl.deleteFramebuffer).not.toHaveBeenCalled();
        expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);
    });

    it("deletes the old FBO once per setSize across multiple resizes", () => {
        const { gl } = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        fb.setSize(20, 20);
        fb.setSize(30, 30);
        fb.setSize(40, 40);
        expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(3);
        expect(gl.createFramebuffer).toHaveBeenCalledTimes(4);
    });

    it("dispose deletes the current FBO", () => {
        const { gl } = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        const current = fb.fbo;
        fb.dispose();
        expect(gl.deleteFramebuffer).toHaveBeenCalledWith(current);
    });

    it("keeps the old FBO live if createFramebuffer fails mid-setSize", () => {
        const { gl } = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        const oldFbo = fb.fbo;
        gl.createFramebuffer.mockReturnValueOnce(null);

        expect(() => fb.setSize(20, 20)).toThrow();
        expect(gl.deleteFramebuffer).not.toHaveBeenCalled();
        expect(fb.fbo).toBe(oldFbo);
    });

    it("deletes old FBO only after the new one is created and assigned", () => {
        const { gl, calls } = makeMockGl();
        const fb = new Framebuffer(makeCtx(gl), 10, 10);
        const oldFbo = fb.fbo;
        const order: string[] = [];
        gl.createFramebuffer.mockImplementationOnce(() => {
            order.push("create");
            return { _fbo: 999 };
        });
        gl.deleteFramebuffer.mockImplementationOnce(() => {
            order.push("delete");
        });

        fb.setSize(20, 20);

        expect(order).toEqual(["create", "delete"]);
        expect(calls.some(([n]) => n === "framebufferTexture2D")).toBe(true);
        expect(gl.deleteFramebuffer).toHaveBeenCalledWith(oldFbo);
    });
});
