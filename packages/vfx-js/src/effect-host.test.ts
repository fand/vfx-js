import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GLContext } from "./gl/context.js";
import type { Quad } from "./gl/quad.js";

// ---------------------------------------------------------------------------
// DOM class stubs — vitest's default env is node, so HTMLVideoElement
// etc. are undefined. Install minimal stubs on globalThis so the host's
// instanceof-based source-kind detection (for autoUpdate defaults) works
// as it would in a browser.
// ---------------------------------------------------------------------------

class HTMLVideoElementStub {
    videoWidth = 0;
    videoHeight = 0;
}
class HTMLImageElementStub {
    naturalWidth = 0;
    naturalHeight = 0;
}
class HTMLCanvasElementStub {
    width = 0;
    height = 0;
}
class ImageBitmapStub {
    width = 0;
    height = 0;
}
class OffscreenCanvasStub {
    width = 0;
    height = 0;
}
(globalThis as unknown as { HTMLVideoElement: unknown }).HTMLVideoElement =
    HTMLVideoElementStub;
(globalThis as unknown as { HTMLImageElement: unknown }).HTMLImageElement =
    HTMLImageElementStub;
(globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement =
    HTMLCanvasElementStub;
(globalThis as unknown as { ImageBitmap: unknown }).ImageBitmap =
    ImageBitmapStub;
(globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
    OffscreenCanvasStub;

// ---------------------------------------------------------------------------
// Module mocks — stand in for the real GL-backed classes so the host's
// orchestration logic can be tested without a WebGL context. Each mock
// tracks constructor args / state so tests can assert on them.
// ---------------------------------------------------------------------------

type MockTexture = {
    source: unknown;
    wrapS: string;
    wrapT: string;
    minFilter: string;
    magFilter: string;
    needsUpdate: boolean;
    externalHandle: unknown;
    autoRegister: boolean;
    disposed: boolean;
    dispose: () => void;
    texture: unknown;
};

type MockFramebuffer = {
    width: number;
    height: number;
    fbo: unknown;
    texture: unknown;
    disposed: boolean;
    dispose: () => void;
    setSize: (w: number, h: number) => void;
    opts: { float?: boolean; wrap?: unknown; filter?: string } | undefined;
};

type MockBackbuffer = {
    ctorArgs: {
        w: number;
        h: number;
        pr: number;
        float?: boolean;
        opts?: { wrap?: unknown; filter?: string };
    };
    target: MockFramebuffer;
    texture: unknown;
    swaps: number;
    disposed: boolean;
    dispose: () => void;
    swap: () => void;
    resize: (w: number, h: number) => void;
};

type MockProgram = {
    vert: string;
    frag: string;
    glslVersion: string | undefined;
    useCount: number;
    uploads: Array<Record<string, { value: unknown }>>;
    disposed: boolean;
    use: () => void;
    uploadUniforms: (u: Record<string, { value: unknown }>) => void;
    dispose: () => void;
};

const textures: MockTexture[] = [];
const framebuffers: MockFramebuffer[] = [];
const backbuffers: MockBackbuffer[] = [];
const programs: MockProgram[] = [];

// Tracked across tests; reset in beforeEach.
const textureCtorCalls: Array<{
    source: unknown;
    opts: { autoRegister?: boolean; externalHandle?: unknown } | undefined;
}> = [];

vi.mock("./gl/texture.js", () => {
    class Texture {
        source: unknown;
        wrapS = "clamp";
        wrapT = "clamp";
        minFilter = "linear";
        magFilter = "linear";
        needsUpdate = true;
        externalHandle: unknown;
        autoRegister = true;
        disposed = false;
        texture = { _brand: "mock-tex" };
        constructor(
            _ctx: unknown,
            source?: unknown,
            opts?: {
                autoRegister?: boolean;
                externalHandle?: unknown;
            },
        ) {
            this.source = source ?? null;
            this.externalHandle = opts?.externalHandle;
            this.autoRegister = opts?.autoRegister !== false;
            textureCtorCalls.push({ source, opts });
            textures.push(this as unknown as MockTexture);
        }
        dispose() {
            this.disposed = true;
        }
    }
    return { Texture };
});

vi.mock("./gl/framebuffer.js", () => {
    class Framebuffer {
        width: number;
        height: number;
        fbo = { _brand: "mock-fbo" };
        texture = { _brand: "mock-fb-tex" };
        disposed = false;
        opts: MockFramebuffer["opts"];
        constructor(
            _ctx: unknown,
            w: number,
            h: number,
            opts?: MockFramebuffer["opts"],
        ) {
            this.width = w;
            this.height = h;
            this.opts = opts;
            framebuffers.push(this as unknown as MockFramebuffer);
        }
        dispose() {
            this.disposed = true;
        }
        setSize(w: number, h: number) {
            this.width = w;
            this.height = h;
        }
    }
    return { Framebuffer };
});

vi.mock("./backbuffer.js", () => {
    class Backbuffer {
        ctorArgs: MockBackbuffer["ctorArgs"];
        target: MockFramebuffer;
        texture = { _brand: "mock-bb-tex" };
        swaps = 0;
        disposed = false;
        constructor(
            _ctx: unknown,
            w: number,
            h: number,
            pr: number,
            float: boolean,
            opts?: { wrap?: unknown; filter?: string },
        ) {
            this.ctorArgs = { w, h, pr, float, opts };
            this.target = {
                width: w * pr,
                height: h * pr,
                fbo: { _brand: "mock-bb-fbo" },
                texture: { _brand: "mock-bb-target-tex" },
                disposed: false,
                dispose: () => {},
                setSize: () => {},
                opts: undefined,
            };
            backbuffers.push(this as unknown as MockBackbuffer);
        }
        dispose() {
            this.disposed = true;
        }
        swap() {
            this.swaps += 1;
        }
        resize(w: number, h: number) {
            this.target.width = w * this.ctorArgs.pr;
            this.target.height = h * this.ctorArgs.pr;
        }
    }
    return { Backbuffer };
});

vi.mock("./gl/program.js", () => {
    class Program {
        vert: string;
        frag: string;
        glslVersion: string | undefined;
        useCount = 0;
        uploads: MockProgram["uploads"] = [];
        disposed = false;
        constructor(
            _ctx: unknown,
            vert: string,
            frag: string,
            glslVersion?: string,
        ) {
            this.vert = vert;
            this.frag = frag;
            this.glslVersion = glslVersion;
            programs.push(this as unknown as MockProgram);
        }
        use() {
            this.useCount += 1;
        }
        uploadUniforms(u: Record<string, { value: unknown }>) {
            this.uploads.push(u);
        }
        dispose() {
            this.disposed = true;
        }
    }
    return { Program };
});

vi.mock("./gl/pass.js", () => ({
    applyBlend: vi.fn(),
}));

vi.mock("./effect-geometry.js", async () => {
    const EFFECT_QUAD_TOKEN = Object.freeze({
        __brand: "EffectQuad",
    });
    return {
        EFFECT_QUAD_TOKEN,
        isEffectQuad: (g: unknown) =>
            g === EFFECT_QUAD_TOKEN ||
            (typeof g === "object" &&
                g !== null &&
                (g as { __brand?: unknown }).__brand === "EffectQuad"),
        EffectGeometryCache: class {
            quadDrawCount = 0;
            customResolveCount = 0;
            disposed = false;
            quad = {
                draw: () => {
                    this.quadDrawCount += 1;
                },
            };
            resolve() {
                this.customResolveCount += 1;
                return {
                    draw: () => {},
                };
            }
            dispose() {
                this.disposed = true;
            }
        },
    };
});

// Imports AFTER vi.mock.
import { EffectHost } from "./effect-host.js";

// ---------------------------------------------------------------------------
// Test GL stub
// ---------------------------------------------------------------------------

function makeGlStub() {
    return {
        BLEND: 0xbe2,
        FRAMEBUFFER: 0x8d40,
        SCISSOR_TEST: 0xc11,
        COLOR_BUFFER_BIT: 0x4000,
        bindFramebuffer: vi.fn(),
        viewport: vi.fn(),
        disable: vi.fn(),
        enable: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        blendFunc: vi.fn(),
    } as unknown as WebGL2RenderingContext;
}

function makeCtxStub(gl: WebGL2RenderingContext): {
    ctx: GLContext;
    unsubCalls: Array<() => void>;
    restoreCbs: Array<() => void>;
} {
    const unsubCalls: Array<() => void> = [];
    const restoreCbs: Array<() => void> = [];
    return {
        ctx: {
            gl,
            addResource: () => {},
            removeResource: () => {},
            onContextRestored: (cb: () => void) => {
                restoreCbs.push(cb);
                const unsub = () => {};
                unsubCalls.push(unsub);
                return unsub;
            },
        } as unknown as GLContext,
        unsubCalls,
        restoreCbs,
    };
}

function makeHost() {
    const gl = makeGlStub();
    const { ctx: glCtx } = makeCtxStub(gl);
    const quad = {} as Quad;
    const host = new EffectHost(
        glCtx,
        quad,
        2,
        { __brand: "EffectTexture", width: 100, height: 100 } as unknown as {
            width: number;
            height: number;
            __brand: "EffectTexture";
        },
        { autoCrop: true, glslVersion: "300 es" },
    );
    host.setFrameDims({
        outputPhysW: 100,
        outputPhysH: 100,
        canvasPhysW: 200,
        canvasPhysH: 200,
        outputViewport: { x: 0, y: 0, w: 100, h: 100 },
        elementPhysW: 100,
        elementPhysH: 100,
        dstInnerRect: [0, 0, 1, 1],
        srcInnerRect: [0, 0, 1, 1],
    });
    return { host, gl, glCtx };
}

beforeEach(() => {
    textures.length = 0;
    framebuffers.length = 0;
    backbuffers.length = 0;
    programs.length = 0;
    textureCtorCalls.length = 0;
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// wrapTexture
// ---------------------------------------------------------------------------

describe("EffectHost.wrapTexture", () => {
    it("HTMLVideoElement defaults to autoUpdate: true (needsUpdate re-sets per frame)", () => {
        const { host } = makeHost();
        const video = Object.assign(new HTMLVideoElementStub(), {
            videoWidth: 640,
            videoHeight: 480,
        });
        host.ctx.wrapTexture(video as unknown as HTMLVideoElement);
        const t = textures[textures.length - 1];
        expect(t.externalHandle).toBeUndefined();
        t.needsUpdate = false;
        host.tickAutoUpdates();
        expect(t.needsUpdate).toBe(true);
    });

    it("HTMLImageElement defaults to autoUpdate: false", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 100,
            naturalHeight: 80,
        });
        host.ctx.wrapTexture(img as unknown as HTMLImageElement);
        const t = textures[textures.length - 1];
        t.needsUpdate = false;
        host.tickAutoUpdates();
        expect(t.needsUpdate).toBe(false);
    });

    it("HTMLCanvasElement defaults to autoUpdate: true", () => {
        const { host } = makeHost();
        const canvas = Object.assign(new HTMLCanvasElementStub(), {
            width: 50,
            height: 50,
        });
        host.ctx.wrapTexture(canvas as unknown as HTMLCanvasElement);
        const t = textures[textures.length - 1];
        t.needsUpdate = false;
        host.tickAutoUpdates();
        expect(t.needsUpdate).toBe(true);
    });

    it("autoUpdate: true override re-triggers for static sources", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        host.ctx.wrapTexture(img as unknown as HTMLImageElement, {
            autoUpdate: true,
        });
        const t = textures[textures.length - 1];
        t.needsUpdate = false;
        host.tickAutoUpdates();
        expect(t.needsUpdate).toBe(true);
    });

    it("autoUpdate: false override suppresses auto-trigger on video-like sources", () => {
        const { host } = makeHost();
        const video = Object.assign(new HTMLVideoElementStub(), {
            videoWidth: 10,
            videoHeight: 10,
        });
        host.ctx.wrapTexture(video as unknown as HTMLVideoElement, {
            autoUpdate: false,
        });
        const t = textures[textures.length - 1];
        t.needsUpdate = false;
        host.tickAutoUpdates();
        expect(t.needsUpdate).toBe(false);
    });

    it("WebGLTexture requires opts.size", () => {
        const { host } = makeHost();
        // Our stub's duck-check for isWebGLTextureHandle returns true
        // when source has no width / naturalWidth / videoWidth.
        const fakeGlTex = {} as unknown as WebGLTexture;
        expect(() => host.ctx.wrapTexture(fakeGlTex)).toThrow(
            /requires opts.size/,
        );
    });

    it("WebGLTexture passes externalHandle + autoRegister: false to Texture", () => {
        const { host } = makeHost();
        const fakeGlTex = {} as unknown as WebGLTexture;
        host.ctx.wrapTexture(fakeGlTex, { size: [64, 32] });
        const last = textureCtorCalls[textureCtorCalls.length - 1];
        expect(last.opts?.externalHandle).toBe(fakeGlTex);
        expect(last.opts?.autoRegister).toBe(false);
    });

    it("wrap + filter options flow through to the underlying Texture", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        host.ctx.wrapTexture(img as unknown as HTMLImageElement, {
            wrap: "repeat",
            filter: "nearest",
        });
        const t = textures[textures.length - 1];
        expect(t.wrapS).toBe("repeat");
        expect(t.wrapT).toBe("repeat");
        expect(t.minFilter).toBe("nearest");
        expect(t.magFilter).toBe("nearest");
    });

    it("tuple wrap [wrapS, wrapT] is respected", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        host.ctx.wrapTexture(img as unknown as HTMLImageElement, {
            wrap: ["repeat", "mirror"],
        });
        const t = textures[textures.length - 1];
        expect(t.wrapS).toBe("repeat");
        expect(t.wrapT).toBe("mirror");
    });
});

// ---------------------------------------------------------------------------
// createRenderTarget
// ---------------------------------------------------------------------------

describe("EffectHost.createRenderTarget", () => {
    it("persistent: false → Framebuffer at element size × pr by default", () => {
        const { host } = makeHost();
        const rt = host.ctx.createRenderTarget();
        expect(framebuffers).toHaveLength(1);
        expect(backbuffers).toHaveLength(0);
        expect(framebuffers[0].width).toBe(100);
        expect(framebuffers[0].height).toBe(100);
        expect(rt.__brand).toBe("EffectRenderTarget");
    });

    it("persistent: true → Backbuffer", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ persistent: true });
        expect(framebuffers).toHaveLength(0);
        expect(backbuffers).toHaveLength(1);
    });

    it("explicit size → fixed physical-px (Framebuffer path, pr=1 semantics)", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ size: [256, 128] });
        expect(framebuffers[0].width).toBe(256);
        expect(framebuffers[0].height).toBe(128);
    });

    it("explicit size on persistent → Backbuffer with pixelRatio=1 and raw physical W/H", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({
            size: [400, 200],
            persistent: true,
        });
        const args = backbuffers[0].ctorArgs;
        expect(args.pr).toBe(1);
        expect(args.w).toBe(400);
        expect(args.h).toBe(200);
    });

    it("auto-size persistent → Backbuffer with pixelRatio=host.pr and logical W/H", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ persistent: true });
        const args = backbuffers[0].ctorArgs;
        expect(args.pr).toBe(2);
        // elementPhysW / elementPhysH was 100 in makeHost; divided by 2.
        expect(args.w).toBe(50);
        expect(args.h).toBe(50);
    });

    it("float: true flows through to Framebuffer opts", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ float: true });
        expect(framebuffers[0].opts?.float).toBe(true);
    });

    it("wrap + filter flow through to Framebuffer opts", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ wrap: "repeat", filter: "nearest" });
        expect(framebuffers[0].opts?.wrap).toEqual(["repeat", "repeat"]);
        expect(framebuffers[0].opts?.filter).toBe("nearest");
    });

    it("wrap + filter flow through to Backbuffer ctor opts", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({
            persistent: true,
            wrap: ["repeat", "clamp"],
            filter: "linear",
        });
        const args = backbuffers[0].ctorArgs;
        expect(args.opts?.wrap).toEqual(["repeat", "clamp"]);
        expect(args.opts?.filter).toBe("linear");
    });

    it("auto-resize kicks in on setFrameDims (auto-tracking RT)", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget();
        // Change element size → auto-track FB.setSize path.
        host.setFrameDims({
            outputPhysW: 200,
            outputPhysH: 200,
            canvasPhysW: 200,
            canvasPhysH: 200,
            outputViewport: { x: 0, y: 0, w: 200, h: 200 },
            elementPhysW: 200,
            elementPhysH: 200,
            dstInnerRect: [0, 0, 1, 1],
            srcInnerRect: [0, 0, 1, 1],
        });
        expect(framebuffers[0].width).toBe(200);
    });

    it("auto-size follows outputPhysW/H (= dst buffer = inner + pad), not elementPhysW/H", () => {
        const { host } = makeHost();
        // dst buffer (120x110) > inner element (100x100) — pad in play.
        host.setFrameDims({
            outputPhysW: 120,
            outputPhysH: 110,
            canvasPhysW: 200,
            canvasPhysH: 200,
            outputViewport: { x: 0, y: 0, w: 120, h: 110 },
            elementPhysW: 100,
            elementPhysH: 100,
            dstInnerRect: [0, 0, 1, 1],
            srcInnerRect: [0, 0, 1, 1],
        });
        host.ctx.createRenderTarget();
        // Sized to outputPhys, not elementPhys.
        expect(framebuffers[0].width).toBe(120);
        expect(framebuffers[0].height).toBe(110);
    });

    it("fixed-size RT does NOT auto-resize", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ size: [50, 50] });
        host.setFrameDims({
            outputPhysW: 200,
            outputPhysH: 200,
            canvasPhysW: 200,
            canvasPhysH: 200,
            outputViewport: { x: 0, y: 0, w: 200, h: 200 },
            elementPhysW: 200,
            elementPhysH: 200,
            dstInnerRect: [0, 0, 1, 1],
            srcInnerRect: [0, 0, 1, 1],
        });
        // Fixed: still 50×50.
        expect(framebuffers[0].width).toBe(50);
        expect(framebuffers[0].height).toBe(50);
    });
});

// ---------------------------------------------------------------------------
// draw — program cache + phase gating
// ---------------------------------------------------------------------------

describe("EffectHost.draw", () => {
    const FRAG = "void main(){}";
    const FRAG2 = "void main(){/*v2*/}";

    it("collapses two draws with identical (frag, vert) to one Program", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({ frag: FRAG });
        host.ctx.draw({ frag: FRAG });
        // Host may also compile its own passthrough on demand; but we
        // didn't call passthroughCopy here.
        expect(programs).toHaveLength(1);
    });

    it("different frag → new Program", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({ frag: FRAG });
        host.ctx.draw({ frag: FRAG2 });
        expect(programs).toHaveLength(2);
    });

    it("different vert with same frag → new Program", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({
            frag: FRAG,
            vert: "void main(){gl_Position=vec4(0);}",
        });
        host.ctx.draw({
            frag: FRAG,
            vert: "void main(){gl_Position=vec4(1);}",
        });
        expect(programs).toHaveLength(2);
    });

    it("ctx.draw() in update() phase is a no-op and warns once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { host } = makeHost();
        host.setPhase("update");
        host.ctx.draw({ frag: FRAG });
        host.ctx.draw({ frag: FRAG });
        host.ctx.draw({ frag: FRAG2 });
        expect(programs).toHaveLength(0);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("ctx.draw() in init() phase is also a no-op (no warning — update-only message)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { host } = makeHost();
        host.setPhase("init");
        host.ctx.draw({ frag: FRAG });
        expect(programs).toHaveLength(0);
        // The warning text is update-phase-specific; init draws are
        // silently ignored.
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("auto-uploads dstInnerRect and srcInnerRect as vec4 uniforms", () => {
        const { host } = makeHost();
        host.setFrameDims({
            outputPhysW: 100,
            outputPhysH: 100,
            canvasPhysW: 200,
            canvasPhysH: 200,
            outputViewport: { x: 0, y: 0, w: 100, h: 100 },
            elementPhysW: 100,
            elementPhysH: 100,
            dstInnerRect: [0.1, 0.2, 0.3, 0.4],
            srcInnerRect: [0.5, 0.6, 0.7, 0.8],
        });
        host.setPhase("render");
        host.ctx.draw({ frag: FRAG });
        expect(programs).toHaveLength(1);
        const uploads = programs[0].uploads[0];
        expect(uploads["dstInnerRect"].value).toEqual([0.1, 0.2, 0.3, 0.4]);
        expect(uploads["srcInnerRect"].value).toEqual([0.5, 0.6, 0.7, 0.8]);
    });

    it("default vertex shader emits uv / uvInnerDst / uvInner varyings", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({ frag: FRAG });
        const vert = programs[0].vert;
        expect(vert).toMatch(/\bout vec2 uv\b/);
        expect(vert).toMatch(/\bout vec2 uvInnerDst\b/);
        expect(vert).toMatch(/\bout vec2 uvInner\b/);
        expect(vert).toMatch(/uniform vec4 dstInnerRect\b/);
        expect(vert).toMatch(/uniform vec4 srcInnerRect\b/);
    });
});

// ---------------------------------------------------------------------------
// onContextRestored
// ---------------------------------------------------------------------------

describe("EffectHost.onContextRestored", () => {
    it("returns the GLContext's unsub and auto-unsubs all subscriptions on dispose", () => {
        const gl = makeGlStub();
        const unsubs: Array<() => void> = [];
        const callbacks: Array<() => void> = [];
        const unsubSpies: Array<ReturnType<typeof vi.fn>> = [];
        const glCtx = {
            gl,
            addResource: () => {},
            removeResource: () => {},
            onContextRestored: (cb: () => void) => {
                callbacks.push(cb);
                const spy = vi.fn();
                unsubSpies.push(spy);
                unsubs.push(spy);
                return spy;
            },
        } as unknown as GLContext;
        const host = new EffectHost(
            glCtx,
            {} as Quad,
            1,
            {
                __brand: "EffectTexture",
                width: 1,
                height: 1,
            } as unknown as {
                width: number;
                height: number;
                __brand: "EffectTexture";
            },
            { autoCrop: true, glslVersion: "300 es" },
        );
        const returned = host.ctx.onContextRestored(() => {});
        expect(returned).toBe(unsubSpies[0]);
        host.ctx.onContextRestored(() => {});
        host.dispose();
        for (const s of unsubSpies) {
            expect(s).toHaveBeenCalledTimes(1);
        }
    });
});

// ---------------------------------------------------------------------------
// dispose
// ---------------------------------------------------------------------------

describe("EffectHost.dispose", () => {
    it("releases owned Programs / Framebuffers / Backbuffers / Textures", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({ frag: "a" });
        host.ctx.draw({ frag: "b" });
        host.ctx.createRenderTarget();
        host.ctx.createRenderTarget({ persistent: true });
        host.ctx.wrapTexture({
            naturalWidth: 10,
            naturalHeight: 10,
        } as unknown as HTMLImageElement);
        expect(programs.length).toBeGreaterThanOrEqual(2);
        expect(framebuffers).toHaveLength(1);
        expect(backbuffers).toHaveLength(1);
        expect(textures.length).toBe(1);

        host.dispose();
        expect(programs.every((p) => p.disposed)).toBe(true);
        expect(framebuffers.every((f) => f.disposed)).toBe(true);
        expect(backbuffers.every((b) => b.disposed)).toBe(true);
        expect(textures.every((t) => t.disposed)).toBe(true);
    });

    it("dispose is idempotent — double-dispose does not crash or re-dispose", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({ frag: "a" });
        host.dispose();
        const disposedCount = programs.filter((p) => p.disposed).length;
        host.dispose();
        // Second dispose must not somehow "un-dispose" or re-enter
        // cleanup logic in a way that mutates counts.
        expect(programs.filter((p) => p.disposed).length).toBe(disposedCount);
    });
});
