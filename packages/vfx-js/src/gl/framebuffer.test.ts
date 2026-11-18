import { describe, expect, it, vi } from "vitest";
import type { GLContext } from "./context.js";
import { Framebuffer } from "./framebuffer.js";

/** Minimal WebGL2 mock — only what Framebuffer touches. */
function makeMockGl() {
    let fboSeq = 0;
    let texSeq = 0;
    let renderbufferSeq = 0;
    const noop = () => {};
    return {
        TEXTURE_2D: 0x0de1,
        FRAMEBUFFER: 0x8d40,
        COLOR_ATTACHMENT0: 0x8ce0,
        DEPTH_ATTACHMENT: 0x8d00,
        DEPTH_COMPONENT: 0x1902,
        DEPTH_COMPONENT24: 0x81a6,
        UNSIGNED_INT: 0x1405,
        TEXTURE_COMPARE_MODE: 0x884c,
        NONE: 0,
        READ_FRAMEBUFFER: 0x8ca8,
        DRAW_FRAMEBUFFER: 0x8ca9,
        RENDERBUFFER: 0x8d41,
        COLOR_BUFFER_BIT: 0x4000,
        DEPTH_BUFFER_BIT: 0x100,
        SCISSOR_TEST: 0xc11,
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
        bindFramebuffer: vi.fn(),
        createRenderbuffer: vi.fn(() => ({ _renderbuffer: ++renderbufferSeq })),
        deleteRenderbuffer: vi.fn(),
        bindRenderbuffer: vi.fn(),
        renderbufferStorageMultisample: vi.fn(),
        framebufferRenderbuffer: vi.fn(),
        blitFramebuffer: vi.fn(),
        disable: vi.fn(),
        SAMPLES: 0x80a9,
        getInternalformatParameter: vi.fn<
            (target: number, format: number, name: number) => Int32Array | null
        >(() => new Int32Array([8, 4, 2])),
        bindTexture: noop,
        texImage2D: vi.fn(),
        texStorage2D: vi.fn(),
        texParameteri: vi.fn(),
        framebufferTexture2D: vi.fn(),
        generateMipmap: vi.fn(),
    };
}

function makeCtx(
    gl: ReturnType<typeof makeMockGl>,
    caps: { floatLinearFilter?: boolean; floatBlend?: boolean } = {},
): GLContext {
    return {
        gl,
        floatLinearFilter: caps.floatLinearFilter ?? false,
        floatBlend: caps.floatBlend ?? false,
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
        it("default (no opt) → texImage2D level 0 only, base filter", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 16, 16);
            expect(gl.texImage2D).toHaveBeenCalledTimes(1);
            // MIN_FILTER set to base LINEAR (no mipmap promotion).
            const minCall = gl.texParameteri.mock.calls.find(
                (c) => c[1] === gl.TEXTURE_MIN_FILTER,
            );
            expect(minCall?.[2]).toBe(gl.LINEAR);
        });

        it("mipmap:true → per-level texImage2D with log2(max) + 1 levels", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 64, 32, { mipmap: true });
            // 64x32 → log2(64) + 1 = 7 levels
            expect(gl.texImage2D).toHaveBeenCalledTimes(7);
            const levels = gl.texImage2D.mock.calls.map((c) => c[1]);
            expect(levels).toEqual([0, 1, 2, 3, 4, 5, 6]);
            expect(gl.texImage2D.mock.calls[0][3]).toBe(64);
            expect(gl.texImage2D.mock.calls[0][4]).toBe(32);
            // Level 6 → 1×1 (after 6 halvings of 64x32, clamped).
            const last = gl.texImage2D.mock.calls[6];
            expect(last[3]).toBe(1);
            expect(last[4]).toBe(1);
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
            expect(gl.texImage2D).toHaveBeenCalledTimes(1);
            expect(gl.texImage2D.mock.calls[0][1]).toBe(0);
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
            expect(gl.texImage2D).toHaveBeenCalledTimes(5);
            fb.setSize(64, 64);
            // +7 levels for the new size = 12 total
            expect(gl.texImage2D).toHaveBeenCalledTimes(12);
        });
    });

    describe("depth", () => {
        function depthAttachCalls(gl: ReturnType<typeof makeMockGl>) {
            return gl.framebufferTexture2D.mock.calls.filter(
                (c) => c[1] === gl.DEPTH_ATTACHMENT,
            );
        }

        function depthUploads(gl: ReturnType<typeof makeMockGl>) {
            return gl.texImage2D.mock.calls.filter(
                (c) => c[2] === gl.DEPTH_COMPONENT24,
            );
        }

        it("no depth by default", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16);
            expect(fb.depth).toBe(false);
            expect(fb.depthTexture).toBeNull();
            expect(depthAttachCalls(gl)).toHaveLength(0);
            expect(depthUploads(gl)).toHaveLength(0);
        });

        it("depth:true attaches a DEPTH_COMPONENT24 texture", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 8, { depth: true });
            expect(fb.depth).toBe(true);
            expect(fb.depthTexture).not.toBeNull();
            const uploads = depthUploads(gl);
            expect(uploads).toHaveLength(1);
            expect(uploads[0][3]).toBe(16);
            expect(uploads[0][4]).toBe(8);
            expect(uploads[0][6]).toBe(gl.DEPTH_COMPONENT);
            expect(uploads[0][7]).toBe(gl.UNSIGNED_INT);
            const attach = depthAttachCalls(gl);
            expect(attach).toHaveLength(1);
            expect(attach[0][3]).toBe(fb.depthTexture?.texture);
            expect(fb.depthTexture?.needsUpdate).toBe(false);
            expect(gl.texParameteri).toHaveBeenCalledWith(
                gl.TEXTURE_2D,
                gl.TEXTURE_COMPARE_MODE,
                gl.NONE,
            );
        });

        it("setSize re-allocates depth at the new size", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { depth: true });
            const handle = fb.depthTexture?.texture;
            fb.setSize(32, 24);
            const uploads = depthUploads(gl);
            expect(uploads).toHaveLength(2);
            expect(uploads[1][3]).toBe(32);
            expect(uploads[1][4]).toBe(24);
            expect(depthAttachCalls(gl)).toHaveLength(2);
            expect(fb.depthTexture?.texture).toBe(handle);
        });

        it("restore rebuilds the depth texture handle", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { depth: true });
            const oldHandle = fb.depthTexture?.texture;
            fb.restore();
            const newHandle = fb.depthTexture?.texture;
            expect(newHandle).not.toBe(oldHandle);
            const attach = depthAttachCalls(gl);
            expect(attach).toHaveLength(2);
            expect(attach[1][3]).toBe(newHandle);
            expect(fb.depthTexture?.needsUpdate).toBe(false);
        });

        it("dispose deletes the depth texture", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { depth: true });
            const handle = fb.depthTexture?.texture;
            fb.dispose();
            expect(gl.deleteTexture).toHaveBeenCalledWith(fb.texture.texture);
            expect(gl.deleteTexture).toHaveBeenCalledWith(handle);
        });
    });

    describe("samples", () => {
        type MockGl = ReturnType<typeof makeMockGl>;

        function storageCalls(gl: MockGl) {
            return gl.renderbufferStorageMultisample.mock.calls;
        }

        function blitMasks(gl: MockGl) {
            return gl.blitFramebuffer.mock.calls.map((c) => c[8]);
        }

        it("samples 1 → no renderbuffers, no resolve FBO, resolve is a no-op", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { depth: true });
            expect(fb.samples).toBe(1);
            expect(fb.resolveFbo).toBeNull();
            expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);
            expect(gl.createRenderbuffer).not.toHaveBeenCalled();
            fb.markDirty();
            fb.resolveColor();
            fb.resolveDepth();
            expect(gl.blitFramebuffer).not.toHaveBeenCalled();
            fb.dispose();
            expect(gl.deleteRenderbuffer).not.toHaveBeenCalled();
            expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
        });

        it("samples 4 → draws to a multisampled FBO, textures on the resolve FBO", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 8, {
                samples: 4,
                depth: true,
            });
            expect(fb.samples).toBe(4);
            expect(fb.resolveFbo).not.toBeNull();
            expect(fb.fbo).not.toBe(fb.resolveFbo);
            expect(storageCalls(gl)).toEqual([
                [gl.RENDERBUFFER, 4, gl.RGBA8, 16, 8],
                [gl.RENDERBUFFER, 4, gl.DEPTH_COMPONENT24, 16, 8],
            ]);
            const attachments = gl.framebufferRenderbuffer.mock.calls.map(
                (c) => c[1],
            );
            expect(attachments).toEqual([
                gl.COLOR_ATTACHMENT0,
                gl.DEPTH_ATTACHMENT,
            ]);
            // Textures attach to the resolve FBO.
            expect(gl.framebufferTexture2D).toHaveBeenCalledTimes(2);
        });

        it("samples 4 without depth → color renderbuffer only", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 16, 16, { samples: 4 });
            expect(storageCalls(gl)).toHaveLength(1);
            expect(storageCalls(gl)[0][2]).toBe(gl.RGBA8);
        });

        it("float + samples 4 → RGBA16F on both sides, no float-blend throw", () => {
            const gl = makeMockGl();
            new Framebuffer(
                makeCtx(gl, { floatLinearFilter: true, floatBlend: false }),
                16,
                16,
                { float: true, samples: 4 },
            );
            expect(storageCalls(gl)[0][2]).toBe(gl.RGBA16F);
            const upload = gl.texImage2D.mock.calls[0];
            expect(upload[2]).toBe(gl.RGBA16F);
            expect(upload[7]).toBe(gl.HALF_FLOAT);
        });

        it("float + samples 1 keeps RGBA32F and the float-blend check", () => {
            const gl = makeMockGl();
            expect(
                () =>
                    new Framebuffer(
                        makeCtx(gl, { floatLinearFilter: true }),
                        16,
                        16,
                        { float: true },
                    ),
            ).toThrow("EXT_float_blend");
        });

        it("resolves only when dirty, and only once", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 8, { samples: 4 });
            fb.resolveColor();
            expect(gl.blitFramebuffer).not.toHaveBeenCalled();
            fb.markDirty();
            fb.resolveColor();
            fb.resolveColor();
            expect(gl.blitFramebuffer).toHaveBeenCalledTimes(1);
            expect(gl.blitFramebuffer).toHaveBeenCalledWith(
                0,
                0,
                16,
                8,
                0,
                0,
                16,
                8,
                gl.COLOR_BUFFER_BIT,
                gl.NEAREST,
            );
        });

        it("blits from the multisampled FBO, then unbinds both sides", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { samples: 4 });
            gl.bindFramebuffer.mockClear();
            fb.markDirty();
            fb.resolveColor();
            expect(gl.disable).toHaveBeenCalledWith(gl.SCISSOR_TEST);
            expect(gl.bindFramebuffer.mock.calls).toEqual([
                [gl.READ_FRAMEBUFFER, fb.fbo],
                [gl.DRAW_FRAMEBUFFER, fb.resolveFbo],
                [gl.READ_FRAMEBUFFER, null],
                [gl.DRAW_FRAMEBUFFER, null],
            ]);
        });

        it("depth resolves separately from color", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, {
                samples: 4,
                depth: true,
            });
            fb.markDirty();
            fb.resolveDepth();
            expect(blitMasks(gl)).toEqual([gl.DEPTH_BUFFER_BIT]);
            fb.resolveColor();
            fb.resolveDepth();
            expect(blitMasks(gl)).toEqual([
                gl.DEPTH_BUFFER_BIT,
                gl.COLOR_BUFFER_BIT,
            ]);
        });

        it("no depth → resolveDepth never blits", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { samples: 4 });
            fb.markDirty();
            fb.resolveDepth();
            expect(gl.blitFramebuffer).not.toHaveBeenCalled();
        });

        it("generateMipmaps resolves color first", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, {
                samples: 4,
                mipmap: true,
            });
            fb.markDirty();
            fb.generateMipmaps();
            expect(blitMasks(gl)).toEqual([gl.COLOR_BUFFER_BIT]);
            expect(gl.blitFramebuffer.mock.invocationCallOrder[0]).toBeLessThan(
                gl.generateMipmap.mock.invocationCallOrder[0],
            );
        });

        it("setSize rebuilds renderbuffers and FBOs, deletes the old ones, clears dirty", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, {
                samples: 4,
                depth: true,
            });
            const oldFbo = fb.fbo;
            const oldResolveFbo = fb.resolveFbo;
            const oldRenderbuffers = gl.createRenderbuffer.mock.results.map(
                (r) => r.value,
            );
            fb.markDirty();
            fb.setSize(32, 16);
            expect(storageCalls(gl).slice(2)).toEqual([
                [gl.RENDERBUFFER, 4, gl.RGBA8, 32, 16],
                [gl.RENDERBUFFER, 4, gl.DEPTH_COMPONENT24, 32, 16],
            ]);
            expect(gl.deleteFramebuffer).toHaveBeenCalledWith(oldFbo);
            expect(gl.deleteFramebuffer).toHaveBeenCalledWith(oldResolveFbo);
            for (const renderbuffer of oldRenderbuffers) {
                expect(gl.deleteRenderbuffer).toHaveBeenCalledWith(
                    renderbuffer,
                );
            }
            fb.resolveColor();
            fb.resolveDepth();
            expect(gl.blitFramebuffer).not.toHaveBeenCalled();
        });

        it("restore rebuilds renderbuffers", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, {
                samples: 4,
                depth: true,
            });
            fb.restore();
            expect(gl.createRenderbuffer).toHaveBeenCalledTimes(4);
            expect(gl.createFramebuffer).toHaveBeenCalledTimes(4);
        });

        it("dispose deletes both FBOs and the renderbuffers", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, {
                samples: 4,
                depth: true,
            });
            const fbo = fb.fbo;
            const resolveFbo = fb.resolveFbo;
            fb.dispose();
            expect(gl.deleteFramebuffer).toHaveBeenCalledWith(fbo);
            expect(gl.deleteFramebuffer).toHaveBeenCalledWith(resolveFbo);
            expect(gl.deleteRenderbuffer).toHaveBeenCalledTimes(2);
        });

        it("keeps the old FBOs if the multisampled FBO fails to create", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { samples: 4 });
            const oldFbo = fb.fbo;
            gl.createFramebuffer
                .mockReturnValueOnce({ _fbo: 900 })
                .mockReturnValueOnce(null);
            expect(() => fb.setSize(32, 32)).toThrow();
            expect(fb.fbo).toBe(oldFbo);
            expect(gl.deleteFramebuffer).toHaveBeenCalledWith({ _fbo: 900 });
            expect(gl.deleteFramebuffer).not.toHaveBeenCalledWith(oldFbo);
        });

        it("falls back to samples 1 with one warning when the format can't take 4", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const gl = makeMockGl();
            gl.getInternalformatParameter.mockReturnValue(new Int32Array([2]));
            const ctx = makeCtx(gl);
            const fb = new Framebuffer(ctx, 16, 16, {
                float: true,
                samples: 4,
            });
            new Framebuffer(ctx, 16, 16, { float: true, samples: 4 });
            expect(gl.getInternalformatParameter).toHaveBeenCalledWith(
                gl.RENDERBUFFER,
                gl.RGBA16F,
                gl.SAMPLES,
            );
            expect(fb.samples).toBe(1);
            expect(fb.resolveFbo).toBeNull();
            expect(gl.createRenderbuffer).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(1);
            warn.mockRestore();
        });

        it("checks RGBA8 for non-float targets", () => {
            const gl = makeMockGl();
            const fb = new Framebuffer(makeCtx(gl), 16, 16, { samples: 4 });
            expect(gl.getInternalformatParameter).toHaveBeenCalledWith(
                gl.RENDERBUFFER,
                gl.RGBA8,
                gl.SAMPLES,
            );
            expect(fb.samples).toBe(4);
        });

        it("samples 1 never queries sample counts", () => {
            const gl = makeMockGl();
            new Framebuffer(makeCtx(gl), 16, 16);
            expect(gl.getInternalformatParameter).not.toHaveBeenCalled();
        });
    });
});
