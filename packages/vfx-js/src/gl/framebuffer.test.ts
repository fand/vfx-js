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
        bindFramebuffer: noop,
        bindTexture: noop,
        texImage2D: noop,
        texStorage2D: noop,
        texParameteri: noop,
        framebufferTexture2D: noop,
        generateMipmap: noop,
        NEAREST: 0x2600,
        NEAREST_MIPMAP_NEAREST: 0x2700,
        LINEAR_MIPMAP_LINEAR: 0x2703,
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
});
