import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GLContext } from "./gl/context.js";
import type { Quad } from "./gl/quad.js";
import type { EffectTexture } from "./types.js";

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
    src = "";
    currentSrc = "";
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
    depthTexture: unknown;
    disposed: boolean;
    dispose: () => void;
    setSize: (w: number, h: number) => void;
    generateMipmapsCount: number;
    generateMipmaps: () => void;
    markDirty: () => void;
    resolveColor: () => void;
    resolveDepth: () => void;
    opts:
        | {
              float?: boolean;
              wrap?: unknown;
              filter?: string;
              mipmap?: boolean;
              depth?: boolean;
              samples?: 1 | 4;
          }
        | undefined;
};

/** Read side of a mock Backbuffer. */
type MockReadSide = {
    texture: unknown;
    depthTexture: unknown;
    resolveColor: () => void;
    resolveDepth: () => void;
};

type MockBackbuffer = {
    ctorArgs: {
        w: number;
        h: number;
        pr: number;
        float?: boolean;
        opts?: {
            wrap?: unknown;
            filter?: string;
            mipmap?: boolean;
            depth?: boolean;
            samples?: 1 | 4;
        };
    };
    target: MockFramebuffer;
    read: MockReadSide;
    readSides: [MockReadSide, MockReadSide];
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

// Framebuffer events in call order, e.g. "markDirty:<label>".
const fbEvents: string[] = [];

// Tracked across tests; reset in beforeEach.
const textureCtorCalls: Array<{
    source: unknown;
    opts: { autoRegister?: boolean; externalHandle?: unknown } | undefined;
}> = [];

vi.mock("./gl/texture.js", () => {
    class Texture {
        gl: unknown;
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
            this.gl = (_ctx as { gl: unknown }).gl;
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
        depthTexture: unknown;
        disposed = false;
        generateMipmapsCount = 0;
        opts: MockFramebuffer["opts"];
        constructor(
            ctx: { gl: unknown },
            w: number,
            h: number,
            opts?: MockFramebuffer["opts"],
        ) {
            this.width = w;
            this.height = h;
            this.opts = opts;
            this.depthTexture = opts?.depth
                ? { _brand: "mock-fb-depth", gl: ctx.gl }
                : null;
            framebuffers.push(this as unknown as MockFramebuffer);
        }
        dispose() {
            this.disposed = true;
        }
        setSize(w: number, h: number) {
            this.width = w;
            this.height = h;
        }
        generateMipmaps() {
            this.generateMipmapsCount += 1;
        }
        markDirty() {
            fbEvents.push("markDirty:fb");
        }
        resolveColor() {
            fbEvents.push("resolveColor:fb");
        }
        resolveDepth() {
            fbEvents.push("resolveDepth:fb");
        }
    }
    return { Framebuffer };
});

vi.mock("./backbuffer.js", () => {
    class Backbuffer {
        ctorArgs: MockBackbuffer["ctorArgs"];
        target: MockFramebuffer;
        swaps = 0;
        disposed = false;
        readSides: [MockReadSide, MockReadSide];
        constructor(
            ctx: { gl: unknown },
            w: number,
            h: number,
            pr: number,
            float: boolean,
            opts?: MockBackbuffer["ctorArgs"]["opts"],
        ) {
            this.ctorArgs = { w, h, pr, float, opts };
            const makeReadSide = (index: number): MockReadSide => ({
                texture: { _brand: `mock-bb-tex-${index}` },
                depthTexture: opts?.depth
                    ? { _brand: `mock-bb-depth-${index}`, gl: ctx.gl }
                    : null,
                resolveColor: () => fbEvents.push(`resolveColor:bb${index}`),
                resolveDepth: () => fbEvents.push(`resolveDepth:bb${index}`),
            });
            this.readSides = [makeReadSide(0), makeReadSide(1)];
            this.target = {
                width: w * pr,
                height: h * pr,
                fbo: { _brand: "mock-bb-fbo" },
                texture: { _brand: "mock-bb-target-tex" },
                depthTexture: null,
                disposed: false,
                dispose: () => {},
                setSize: () => {},
                generateMipmapsCount: 0,
                generateMipmaps() {
                    this.generateMipmapsCount += 1;
                    fbEvents.push("generateMipmaps:bb-target");
                },
                markDirty: () => fbEvents.push("markDirty:bb-target"),
                resolveColor: () => {},
                resolveDepth: () => {},
                opts: undefined,
            };
            backbuffers.push(this as unknown as MockBackbuffer);
        }
        // Read side follows swaps.
        get read() {
            return this.readSides[this.swaps % 2];
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

vi.mock("./gl/pass.js", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./gl/pass.js")>()),
    applyBlend: vi.fn(),
}));

vi.mock("./effect-geometry.js", async () => {
    const EFFECT_QUAD_TOKEN = Object.freeze({
        __brand: "EffectQuad",
    });
    return {
        EFFECT_QUAD_TOKEN,
        isEffectQuad: (g: unknown) => g === EFFECT_QUAD_TOKEN,
        EffectGeometryCache: class {
            quadDrawCount = 0;
            customResolveCount = 0;
            disposed = false;
            quad = {
                draw: () => {
                    this.quadDrawCount += 1;
                },
            };
            resolve(geometry: { onDraw?: () => void }) {
                this.customResolveCount += 1;
                return {
                    draw: () => geometry.onDraw?.(),
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
import { ProgramCache } from "./program-cache.js";

// ---------------------------------------------------------------------------
// Test GL stub
// ---------------------------------------------------------------------------

function makeGlStub() {
    return {
        BLEND: 0xbe2,
        FRAMEBUFFER: 0x8d40,
        SCISSOR_TEST: 0xc11,
        COLOR_BUFFER_BIT: 0x4000,
        DEPTH_BUFFER_BIT: 0x100,
        DEPTH_TEST: 0xb71,
        CULL_FACE: 0xb44,
        FRONT: 0x404,
        BACK: 0x405,
        LESS: 0x201,
        LEQUAL: 0x203,
        GREATER: 0x204,
        ALWAYS: 0x207,
        depthFunc: vi.fn(),
        depthMask: vi.fn(),
        cullFace: vi.fn(),
        clearDepth: vi.fn(),
        bindFramebuffer: vi.fn(),
        viewport: vi.fn(),
        disable: vi.fn(),
        enable: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        scissor: vi.fn(),
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
    const programCache = new ProgramCache(glCtx);
    const host = new EffectHost(
        glCtx,
        quad,
        2,
        {
            __brand: "EffectTexture",
            width: 100,
            height: 100,
        } as unknown as EffectTexture,
        { autoCrop: true, glslVersion: "300 es" },
        programCache,
    );
    host.setFrameDims({
        outputBufferW: 100,
        outputBufferH: 100,
        canvasBufferSize: [200, 200],
        outputViewport: { x: 0, y: 0, w: 100, h: 100 },
        elementBufferW: 100,
        elementBufferH: 100,
        contentRectUv: [0, 0, 1, 1],
        srcRectUv: [0, 0, 1, 1],
    });
    return { host, gl, glCtx };
}

beforeEach(() => {
    textures.length = 0;
    framebuffers.length = 0;
    backbuffers.length = 0;
    programs.length = 0;
    textureCtorCalls.length = 0;
    fbEvents.length = 0;
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

    it("update() re-uploads a texture with autoUpdate: false", () => {
        const { host } = makeHost();
        const canvas = Object.assign(new HTMLCanvasElementStub(), {
            width: 50,
            height: 50,
        });
        const handle = host.ctx.wrapTexture(
            canvas as unknown as HTMLCanvasElement,
            { autoUpdate: false },
        );
        const t = textures[textures.length - 1];
        t.needsUpdate = false;
        host.tickAutoUpdates();
        expect(t.needsUpdate).toBe(false);
        handle.update();
        expect(t.needsUpdate).toBe(true);
    });

    it("update() is a no-op after dispose()", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        const handle = host.ctx.wrapTexture(img as unknown as HTMLImageElement);
        const t = textures[textures.length - 1];
        handle.dispose();
        t.needsUpdate = false;
        handle.update();
        expect(t.needsUpdate).toBe(false);
    });

    it("update() is a no-op for WebGLTexture handles", () => {
        const { host } = makeHost();
        const fakeGlTex = {} as unknown as WebGLTexture;
        const handle = host.ctx.wrapTexture(fakeGlTex, { size: [8, 8] });
        const t = textures[textures.length - 1];
        t.needsUpdate = false;
        handle.update();
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

    it("handle.dispose() frees the underlying texture", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        const handle = host.ctx.wrapTexture(img as unknown as HTMLImageElement);
        const t = textures[textures.length - 1];
        expect(t.disposed).toBe(false);
        handle.dispose();
        expect(t.disposed).toBe(true);
    });

    it("handle.dispose() is idempotent and host.dispose() won't double-free", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        const handle = host.ctx.wrapTexture(img as unknown as HTMLImageElement);
        const t = textures[textures.length - 1];
        let disposeCount = 0;
        const original = t.dispose;
        t.dispose = () => {
            disposeCount++;
            original.call(t);
        };
        handle.dispose();
        handle.dispose(); // second call is a no-op
        host.dispose(); // host teardown must not re-dispose it
        expect(disposeCount).toBe(1);
    });

    it("host.dispose() still frees textures that were never hand-disposed", () => {
        const { host } = makeHost();
        const img = Object.assign(new HTMLImageElementStub(), {
            naturalWidth: 10,
            naturalHeight: 10,
        });
        host.ctx.wrapTexture(img as unknown as HTMLImageElement);
        const t = textures[textures.length - 1];
        expect(t.disposed).toBe(false);
        host.dispose();
        expect(t.disposed).toBe(true);
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

    it("auto-size persistent → Backbuffer with pixelRatio=host.pr and CSS W/H", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ persistent: true });
        const args = backbuffers[0].ctorArgs;
        expect(args.pr).toBe(2);
        // elementBufferW / elementBufferH was 100 in makeHost; divided by 2.
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
            outputBufferW: 200,
            outputBufferH: 200,
            canvasBufferSize: [200, 200],
            outputViewport: { x: 0, y: 0, w: 200, h: 200 },
            elementBufferW: 200,
            elementBufferH: 200,
            contentRectUv: [0, 0, 1, 1],
            srcRectUv: [0, 0, 1, 1],
        });
        expect(framebuffers[0].width).toBe(200);
    });

    it("auto-size follows outputBufferW/H (= dst buffer = inner + pad), not elementBufferW/H", () => {
        const { host } = makeHost();
        // dst buffer (120x110) > inner element (100x100) — pad in play.
        host.setFrameDims({
            outputBufferW: 120,
            outputBufferH: 110,
            canvasBufferSize: [200, 200],
            outputViewport: { x: 0, y: 0, w: 120, h: 110 },
            elementBufferW: 100,
            elementBufferH: 100,
            contentRectUv: [0, 0, 1, 1],
            srcRectUv: [0, 0, 1, 1],
        });
        host.ctx.createRenderTarget();
        // Sized to outputBuffer, not elementBuffer.
        expect(framebuffers[0].width).toBe(120);
        expect(framebuffers[0].height).toBe(110);
    });

    it("fixed-size RT does NOT auto-resize", () => {
        const { host } = makeHost();
        host.ctx.createRenderTarget({ size: [50, 50] });
        host.setFrameDims({
            outputBufferW: 200,
            outputBufferH: 200,
            canvasBufferSize: [200, 200],
            outputViewport: { x: 0, y: 0, w: 200, h: 200 },
            elementBufferW: 200,
            elementBufferH: 200,
            contentRectUv: [0, 0, 1, 1],
            srcRectUv: [0, 0, 1, 1],
        });
        // Fixed: still 50×50.
        expect(framebuffers[0].width).toBe(50);
        expect(framebuffers[0].height).toBe(50);
    });

    it("rt.dispose() releases the underlying Framebuffer", () => {
        const { host } = makeHost();
        const rt = host.ctx.createRenderTarget();
        expect(framebuffers[0].disposed).toBe(false);
        rt.dispose();
        expect(framebuffers[0].disposed).toBe(true);
    });

    it("rt.dispose() on persistent RT releases the Backbuffer", () => {
        const { host } = makeHost();
        const rt = host.ctx.createRenderTarget({ persistent: true });
        expect(backbuffers[0].disposed).toBe(false);
        rt.dispose();
        expect(backbuffers[0].disposed).toBe(true);
    });

    it("rt.dispose() is idempotent", () => {
        const { host } = makeHost();
        const rt = host.ctx.createRenderTarget();
        rt.dispose();
        // Second call must not throw and must not double-dispose the fb.
        expect(() => rt.dispose()).not.toThrow();
    });

    it("disposed RT no longer auto-resizes", () => {
        const { host } = makeHost();
        const rt = host.ctx.createRenderTarget();
        rt.dispose();
        // Reset the mock fb's setSize tracking by recording size now.
        const widthAfterDispose = framebuffers[0].width;
        host.setFrameDims({
            outputBufferW: 200,
            outputBufferH: 200,
            canvasBufferSize: [200, 200],
            outputViewport: { x: 0, y: 0, w: 200, h: 200 },
            elementBufferW: 200,
            elementBufferH: 200,
            contentRectUv: [0, 0, 1, 1],
            srcRectUv: [0, 0, 1, 1],
        });
        // Disposed RT removed from auto-resize list → unchanged.
        expect(framebuffers[0].width).toBe(widthAfterDispose);
    });

    it("host.dispose() does not double-dispose a manually-disposed RT", () => {
        const { host } = makeHost();
        const rt = host.ctx.createRenderTarget();
        const fb = framebuffers[0];
        rt.dispose();
        let disposeCount = 0;
        const original = fb.dispose;
        fb.dispose = () => {
            disposeCount++;
            original.call(fb);
        };
        host.dispose();
        expect(disposeCount).toBe(0);
    });

    describe("mipmap", () => {
        const FRAG = "void main(){}";

        it("default (no opt) → mipmap:false in Framebuffer opts", () => {
            const { host } = makeHost();
            host.ctx.createRenderTarget();
            expect(framebuffers[0].opts?.mipmap).toBe(false);
        });

        it("mipmap:true → mipmap:true flows to Framebuffer opts", () => {
            const { host } = makeHost();
            host.ctx.createRenderTarget({ mipmap: true });
            expect(framebuffers[0].opts?.mipmap).toBe(true);
        });

        it("mipmap:'manual' also allocates storage (mipmap:true to Framebuffer)", () => {
            const { host } = makeHost();
            host.ctx.createRenderTarget({ mipmap: "manual" });
            expect(framebuffers[0].opts?.mipmap).toBe(true);
        });

        it("mipmap:'manual' promotes filter (mipmap:true + filter forwarded together)", () => {
            // mipmap:true at the Framebuffer level is what gates the
            // MIN_FILTER promotion (covered by framebuffer.test.ts).
            // Verify both "manual" and `true` reach Framebuffer with
            // the same mipmap flag + the user's filter intact, so the
            // downstream promotion fires in both modes.
            const { host } = makeHost();
            host.ctx.createRenderTarget({ mipmap: true, filter: "nearest" });
            host.ctx.createRenderTarget({
                mipmap: "manual",
                filter: "nearest",
            });
            expect(framebuffers[0].opts?.mipmap).toBe(true);
            expect(framebuffers[0].opts?.filter).toBe("nearest");
            expect(framebuffers[1].opts?.mipmap).toBe(true);
            expect(framebuffers[1].opts?.filter).toBe("nearest");
        });

        it("mipmap:true on persistent → flows to Backbuffer opts", () => {
            const { host } = makeHost();
            host.ctx.createRenderTarget({ persistent: true, mipmap: true });
            expect(backbuffers[0].ctorArgs.opts?.mipmap).toBe(true);
        });

        it("auto mode (mipmap:true): draw regenerates mipmaps", () => {
            const { host } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ mipmap: true });
            host.ctx.draw({ frag: FRAG, target: rt });
            host.ctx.draw({ frag: FRAG, target: rt });
            expect(framebuffers[0].generateMipmapsCount).toBe(2);
        });

        it("manual mode (mipmap:'manual'): draw does NOT auto-regenerate", () => {
            const { host } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ mipmap: "manual" });
            host.ctx.draw({ frag: FRAG, target: rt });
            host.ctx.draw({ frag: FRAG, target: rt });
            expect(framebuffers[0].generateMipmapsCount).toBe(0);
        });

        it("manual mode: rt.generateMipmaps() forwards to Framebuffer", () => {
            const { host } = makeHost();
            const rt = host.ctx.createRenderTarget({ mipmap: "manual" });
            rt.generateMipmaps();
            rt.generateMipmaps();
            expect(framebuffers[0].generateMipmapsCount).toBe(2);
        });

        it("auto mode: rt.generateMipmaps() is callable on top of auto-regen", () => {
            const { host } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ mipmap: true });
            host.ctx.draw({ frag: FRAG, target: rt });
            rt.generateMipmaps();
            expect(framebuffers[0].generateMipmapsCount).toBe(2);
        });

        it("mipmap:false: rt.generateMipmaps() is a silent no-op", () => {
            const { host } = makeHost();
            const rt = host.ctx.createRenderTarget();
            expect(() => rt.generateMipmaps()).not.toThrow();
            expect(framebuffers[0].generateMipmapsCount).toBe(0);
        });

        it("auto mode + persistent: regen targets Backbuffer write FB before swap", () => {
            const { host } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({
                persistent: true,
                mipmap: true,
            });
            host.ctx.draw({ frag: FRAG, target: rt });
            expect(backbuffers[0].target.generateMipmapsCount).toBe(1);
            expect(backbuffers[0].swaps).toBe(1);
        });

        it("non-mipmap target with canvas (null target): no regen attempted", () => {
            const { host } = makeHost();
            host.setPhase("render");
            // Default canvas draw — no target → no resolver → safe.
            expect(() => host.ctx.draw({ frag: FRAG })).not.toThrow();
        });
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

    it("auto-uploads contentRectUv and srcRectUv as vec4 uniforms", () => {
        const { host } = makeHost();
        host.setFrameDims({
            outputBufferW: 100,
            outputBufferH: 100,
            canvasBufferSize: [200, 200],
            outputViewport: { x: 0, y: 0, w: 100, h: 100 },
            elementBufferW: 100,
            elementBufferH: 100,
            contentRectUv: [0.1, 0.2, 0.3, 0.4],
            srcRectUv: [0.5, 0.6, 0.7, 0.8],
        });
        host.setPhase("render");
        host.ctx.draw({ frag: FRAG });
        expect(programs).toHaveLength(1);
        const uploads = programs[0].uploads[0];
        expect(uploads["contentRectUv"].value).toEqual([0.1, 0.2, 0.3, 0.4]);
        expect(uploads["srcRectUv"].value).toEqual([0.5, 0.6, 0.7, 0.8]);
    });

    it("default vertex shader emits uv / uvContent / uvSrc varyings", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.draw({ frag: FRAG });
        const vert = programs[0].vert;
        expect(vert).toMatch(/\bout vec2 uv\b/);
        expect(vert).toMatch(/\bout vec2 uvContent\b/);
        expect(vert).toMatch(/\bout vec2 uvSrc\b/);
        expect(vert).toMatch(/uniform vec4 contentRectUv\b/);
        expect(vert).toMatch(/uniform vec4 srcRectUv\b/);
    });

    it("persistent RT: default draw advances Backbuffer.swap()", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ persistent: true });
        expect(backbuffers).toHaveLength(1);
        host.ctx.draw({ frag: FRAG, target: rt });
        host.ctx.draw({ frag: FRAG, target: rt });
        expect(backbuffers[0].swaps).toBe(2);
    });

    it("persistent RT: swap:false skips Backbuffer.swap()", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ persistent: true });
        host.ctx.draw({ frag: FRAG, target: rt }); // swap → 1
        host.ctx.draw({ frag: FRAG, target: rt, swap: false }); // no-op
        host.ctx.draw({ frag: FRAG, target: rt, swap: false }); // no-op
        host.ctx.draw({ frag: FRAG, target: rt }); // swap → 2
        expect(backbuffers[0].swaps).toBe(2);
    });

    it("non-persistent RT: swap:false is harmless (no-op)", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget(); // not persistent
        host.ctx.draw({ frag: FRAG, target: rt, swap: false });
        host.ctx.draw({ frag: FRAG, target: rt });
        // No backbuffer at all; nothing to assert beyond "did not throw".
        expect(backbuffers).toHaveLength(0);
    });

    it("draws with a texture from the same context", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const tex = host.ctx.wrapTexture(new HTMLCanvasElementStub() as never);
        host.ctx.draw({ frag: FRAG, uniforms: { tex } });
        expect(programs[0].uploads[0]["tex"].value).toBe(textures[0]);
    });

    it("throws on a texture from another context", () => {
        const { host } = makeHost();
        const { host: other } = makeHost();
        other.setPhase("render");
        const tex = other.ctx.wrapTexture(new HTMLCanvasElementStub() as never);
        host.setPhase("render");
        expect(() => host.ctx.draw({ frag: FRAG, uniforms: { tex } })).toThrow(
            "[VFX-JS] This texture belongs to another VFX instance.",
        );
    });
});

// ---------------------------------------------------------------------------
// clear — fast GPU clear (no draw)
// ---------------------------------------------------------------------------

describe("EffectHost.clear", () => {
    it("clears a user RT with no draw", () => {
        const { host, gl } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget();
        host.ctx.clear(rt);
        expect(programs).toHaveLength(0);
        expect(gl.clear).toHaveBeenCalled();
        expect(gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
    });

    it("persistent RT: zeroes both sides, leaving read/write orientation", () => {
        const { host, gl } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ persistent: true });
        host.ctx.clear(rt);
        // Two clears (one per buffer), two swaps that net to identity.
        expect(gl.clear).toHaveBeenCalledTimes(2);
        expect(backbuffers[0].swaps).toBe(2);
    });

    it("stage output (null target): scissors to the stage viewport", () => {
        const { host, gl } = makeHost();
        host.setFrameDims({
            outputBufferW: 100,
            outputBufferH: 100,
            canvasBufferSize: [200, 200],
            outputViewport: { x: 10, y: 20, w: 30, h: 40 },
            elementBufferW: 100,
            elementBufferH: 100,
            contentRectUv: [0, 0, 1, 1],
            srcRectUv: [0, 0, 1, 1],
        });
        host.setPhase("render");
        host.ctx.clear();
        expect(gl.enable).toHaveBeenCalledWith(gl.SCISSOR_TEST);
        expect(gl.scissor).toHaveBeenCalledWith(10, 20, 30, 40);
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, null);
    });

    it("in update() phase is a no-op and warns once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { host, gl } = makeHost();
        host.setPhase("update");
        const rt = host.ctx.createRenderTarget();
        host.ctx.clear(rt);
        host.ctx.clear(rt);
        expect(gl.clear).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// depth — depth textures, per-draw depth / cull state, depth clears
// ---------------------------------------------------------------------------

describe("EffectHost depth", () => {
    const FRAG = "void main(){}";

    function glMocks(gl: WebGL2RenderingContext) {
        return gl as unknown as Record<string, ReturnType<typeof vi.fn>>;
    }

    /** Assert the draw left depth and cull at the baseline. */
    function expectBaselineAfterDraw(gl: WebGL2RenderingContext) {
        const m = glMocks(gl);
        const disables = m.disable.mock.calls.map((c) => c[0]);
        expect(disables.slice(-2)).toEqual([gl.DEPTH_TEST, gl.CULL_FACE]);
        expect(m.depthMask.mock.calls.at(-1)).toEqual([true]);
    }

    function drawWithDepth(
        opts: Omit<Parameters<EffectHost["ctx"]["draw"]>[0], "frag">,
    ) {
        const { host, gl } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ depth: true });
        host.ctx.draw({ frag: FRAG, target: rt, ...opts });
        return { host, gl, m: glMocks(gl) };
    }

    describe("depthTexture", () => {
        it("absent without depth: true", () => {
            const { host } = makeHost();
            const rt = host.ctx.createRenderTarget();
            expect(rt.depthTexture).toBeUndefined();
            expect(framebuffers[0].opts?.depth).toBe(false);
        });

        it("present with depth: true, sized like the RT", () => {
            const { host } = makeHost();
            const rt = host.ctx.createRenderTarget({
                depth: true,
                size: [64, 32],
            });
            expect(framebuffers[0].opts?.depth).toBe(true);
            expect(rt.depthTexture?.__brand).toBe("EffectTexture");
            expect(rt.depthTexture?.width).toBe(64);
            expect(rt.depthTexture?.height).toBe(32);
        });

        it("samples the framebuffer's depth texture as a uniform", () => {
            const { host } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            const depth = rt.depthTexture as EffectTexture;
            host.ctx.draw({ frag: FRAG, uniforms: { depth } });
            expect(programs[0].uploads[0]["depth"].value).toBe(
                framebuffers[0].depthTexture,
            );
        });

        it("dispose on the depth handle is a no-op", () => {
            const { host } = makeHost();
            const rt = host.ctx.createRenderTarget({ depth: true });
            rt.depthTexture?.dispose();
            expect(framebuffers[0].disposed).toBe(false);
        });

        it("persistent: follows the read side across swaps", () => {
            const { host } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({
                persistent: true,
                depth: true,
            });
            expect(backbuffers[0].ctorArgs.opts?.depth).toBe(true);
            const depth = rt.depthTexture as EffectTexture;
            host.ctx.draw({ frag: FRAG, uniforms: { depth } });
            const first = programs[0].uploads[0]["depth"].value;
            host.ctx.draw({ frag: FRAG, target: rt });
            host.ctx.draw({ frag: FRAG, uniforms: { depth } });
            const second = programs[0].uploads[2]["depth"].value;
            expect(first).toBe(backbuffers[0].readSides[0].depthTexture);
            expect(second).toBe(backbuffers[0].readSides[1].depthTexture);
        });
    });

    describe("draw state", () => {
        it("no depth or cull opts → depth and cull state untouched", () => {
            const { m } = drawWithDepth({});
            expect(m.depthFunc).not.toHaveBeenCalled();
            expect(m.depthMask).not.toHaveBeenCalled();
            expect(m.cullFace).not.toHaveBeenCalled();
        });

        it("depthTest: true → DEPTH_TEST on, LEQUAL, mask on, then baseline", () => {
            const { gl, m } = drawWithDepth({ depthTest: true });
            expect(m.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(m.depthFunc).toHaveBeenCalledWith(gl.LEQUAL);
            expect(m.depthMask).toHaveBeenNthCalledWith(1, true);
            expectBaselineAfterDraw(gl);
        });

        it("depthFunc is honored", () => {
            const { gl, m } = drawWithDepth({
                depthTest: true,
                depthFunc: "greater",
            });
            expect(m.depthFunc).toHaveBeenCalledWith(gl.GREATER);
        });

        it("depthTest: true + depthWrite: false → depthMask(false)", () => {
            const { gl, m } = drawWithDepth({
                depthTest: true,
                depthWrite: false,
            });
            expect(m.depthMask).toHaveBeenNthCalledWith(1, false);
            expectBaselineAfterDraw(gl);
        });

        it("depthWrite only → DEPTH_TEST on with ALWAYS", () => {
            const { gl, m } = drawWithDepth({ depthWrite: true });
            expect(m.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(m.depthFunc).toHaveBeenCalledWith(gl.ALWAYS);
            expect(m.depthMask).toHaveBeenNthCalledWith(1, true);
            expectBaselineAfterDraw(gl);
        });

        it("cull: back / front → CULL_FACE on with the face", () => {
            for (const cull of ["back", "front"] as const) {
                const { gl, m } = drawWithDepth({ cull });
                expect(m.enable).toHaveBeenCalledWith(gl.CULL_FACE);
                expect(m.cullFace).toHaveBeenCalledWith(
                    cull === "back" ? gl.BACK : gl.FRONT,
                );
                expect(m.enable).not.toHaveBeenCalledWith(gl.DEPTH_TEST);
                expectBaselineAfterDraw(gl);
            }
        });

        it("cull works on the canvas, which has no depth", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            host.ctx.draw({ frag: FRAG, cull: "back" });
            expect(glMocks(gl).enable).toHaveBeenCalledWith(gl.CULL_FACE);
            expectBaselineAfterDraw(gl);
        });

        it("state is reset even when the draw throws", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            const geometry = {
                attributes: {},
                onDraw: () => {
                    throw new Error("draw failed");
                },
            };
            expect(() =>
                host.ctx.draw({
                    frag: FRAG,
                    target: rt,
                    geometry,
                    depthTest: true,
                    cull: "back",
                }),
            ).toThrow("draw failed");
            expectBaselineAfterDraw(gl);
        });

        it("depth on a target without depth → warns once and skips depth", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget();
            host.ctx.draw({ frag: FRAG, target: rt, depthTest: true });
            host.ctx.draw({ frag: FRAG, depthWrite: true });
            host.ctx.draw({
                frag: FRAG,
                target: host.ctx.target,
                depthTest: true,
            });
            const m = glMocks(gl);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(m.enable).not.toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(m.depthFunc).not.toHaveBeenCalled();
            warn.mockRestore();
        });

        it("blit leaves depth off", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            host.ctx.blit(host.ctx.createRenderTarget(), rt);
            const m = glMocks(gl);
            expect(m.enable).not.toHaveBeenCalledWith(gl.DEPTH_TEST);
            expect(m.depthMask).not.toHaveBeenCalled();
        });
    });

    describe("clear", () => {
        it("depth RT → clears color and depth to 1", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            host.ctx.clear(rt);
            const m = glMocks(gl);
            expect(m.clearDepth).toHaveBeenCalledWith(1);
            expect(m.clear).toHaveBeenCalledWith(
                gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
            );
        });

        it("RT without depth → color only", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget();
            host.ctx.clear(rt);
            expect(glMocks(gl).clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
            expect(glMocks(gl).clearDepth).not.toHaveBeenCalled();
        });

        it("depth: false → color only", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            host.ctx.clear(rt, { depth: false });
            expect(glMocks(gl).clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
        });

        it("color: false → depth only", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            host.ctx.clear(rt, { color: false });
            const m = glMocks(gl);
            expect(m.clear).toHaveBeenCalledWith(gl.DEPTH_BUFFER_BIT);
            expect(m.clearColor).not.toHaveBeenCalled();
        });

        it("both false → nothing", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({ depth: true });
            host.ctx.clear(rt, { color: false, depth: false });
            expect(glMocks(gl).clear).not.toHaveBeenCalled();
            expect(glMocks(gl).bindFramebuffer).not.toHaveBeenCalled();
        });

        it("persistent depth RT → both sides get color and depth", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            const rt = host.ctx.createRenderTarget({
                persistent: true,
                depth: true,
            });
            host.ctx.clear(rt);
            const m = glMocks(gl);
            expect(m.clear).toHaveBeenCalledTimes(2);
            for (const call of m.clear.mock.calls) {
                expect(call[0]).toBe(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            }
            expect(backbuffers[0].swaps).toBe(2);
        });

        it("stage output → color only; color: false does nothing", () => {
            const { host, gl } = makeHost();
            host.setPhase("render");
            host.ctx.clear();
            const m = glMocks(gl);
            expect(m.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
            m.clear.mockClear();
            host.ctx.clear(null, { color: false });
            expect(m.clear).not.toHaveBeenCalled();
        });
    });
});

// ---------------------------------------------------------------------------
// samples — multisampled targets resolve lazily
// ---------------------------------------------------------------------------

describe("EffectHost samples", () => {
    const FRAG = "void main(){}";

    function glMock(gl: WebGL2RenderingContext) {
        return gl as unknown as Record<string, ReturnType<typeof vi.fn>>;
    }

    it("passes samples 4 through; other values become 1", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const { host } = makeHost();
        host.ctx.createRenderTarget({ samples: 4 });
        host.ctx.createRenderTarget({ samples: 2 as unknown as 4 });
        host.ctx.createRenderTarget({ persistent: true, samples: 4 });
        expect(framebuffers[0].opts?.samples).toBe(4);
        expect(framebuffers[1].opts?.samples).toBe(1);
        expect(backbuffers[0].ctorArgs.opts?.samples).toBe(4);
    });

    it("invalid samples → 1, warns once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { host } = makeHost();
        host.ctx.createRenderTarget({ samples: 2 as unknown as 4 });
        host.ctx.createRenderTarget({ samples: 8 as unknown as 4 });
        host.ctx.createRenderTarget({ samples: 1 });
        host.ctx.createRenderTarget({ samples: 4 });
        expect(framebuffers.map((fb) => fb.opts?.samples)).toEqual([
            1, 1, 1, 4,
        ]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain("samples must be 1 or 4");
        warn.mockRestore();
    });

    it("draw marks the target dirty", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ samples: 4 });
        host.ctx.draw({ frag: FRAG, target: rt });
        expect(fbEvents).toEqual(["markDirty:fb"]);
    });

    it("sampling an RT resolves it before the draw framebuffer is bound", () => {
        const { host, gl } = makeHost();
        host.setPhase("render");
        const source = host.ctx.createRenderTarget({ samples: 4 });
        const target = host.ctx.createRenderTarget();
        const resolve = vi.spyOn(
            framebuffers[0] as { resolveColor: () => void },
            "resolveColor",
        );
        host.ctx.draw({ frag: FRAG, target, uniforms: { source } });
        expect(resolve).toHaveBeenCalledTimes(1);
        const bindOrder = glMock(gl).bindFramebuffer.mock.invocationCallOrder;
        expect(bindOrder.length).toBeGreaterThan(0);
        expect(resolve.mock.invocationCallOrder[0]).toBeLessThan(
            Math.min(...bindOrder),
        );
        expect(programs[0].uploads[0]["source"].value).toBe(
            framebuffers[0].texture,
        );
    });

    it("sampling depthTexture resolves depth", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ samples: 4, depth: true });
        const depth = rt.depthTexture as EffectTexture;
        host.ctx.draw({ frag: FRAG, uniforms: { depth } });
        expect(fbEvents).toEqual(["resolveDepth:fb"]);
    });

    it("clear marks the target dirty; persistent marks both sides", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({ samples: 4 });
        host.ctx.clear(rt);
        expect(fbEvents).toEqual(["markDirty:fb"]);
        fbEvents.length = 0;
        const persistent = host.ctx.createRenderTarget({
            persistent: true,
            samples: 4,
        });
        host.ctx.clear(persistent);
        expect(fbEvents).toEqual([
            "markDirty:bb-target",
            "markDirty:bb-target",
        ]);
    });

    it("persistent: resolves the read side, which follows swaps", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({
            persistent: true,
            samples: 4,
        });
        host.ctx.draw({ frag: FRAG, uniforms: { rt } });
        host.ctx.draw({ frag: FRAG, target: rt });
        host.ctx.draw({ frag: FRAG, uniforms: { rt } });
        expect(fbEvents).toEqual([
            "resolveColor:bb0",
            "markDirty:bb-target",
            "resolveColor:bb1",
        ]);
        expect(programs[0].uploads[0]["rt"].value).toBe(
            backbuffers[0].readSides[0].texture,
        );
        expect(programs[0].uploads[2]["rt"].value).toBe(
            backbuffers[0].readSides[1].texture,
        );
    });

    it("auto mipmaps: marks dirty before regenerating, before swap", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const rt = host.ctx.createRenderTarget({
            persistent: true,
            samples: 4,
            mipmap: true,
        });
        host.ctx.draw({ frag: FRAG, target: rt });
        expect(fbEvents).toEqual([
            "markDirty:bb-target",
            "generateMipmaps:bb-target",
        ]);
        expect(backbuffers[0].swaps).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// blit — uvSrc copy helper
// ---------------------------------------------------------------------------

describe("EffectHost.blit", () => {
    function makeSource(host: EffectHost): EffectTexture {
        return host.ctx.wrapTexture({
            naturalWidth: 50,
            naturalHeight: 50,
        } as unknown as HTMLImageElement);
    }

    it("samples uvSrc and binds source as the `src` uniform", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const src = makeSource(host);
        host.ctx.blit(src);
        expect(programs).toHaveLength(1);
        expect(programs[0].frag).toMatch(/texture\(src, uvSrc\)/);
        expect(programs[0].uploads[0]["src"]).toBeDefined();
    });

    it("writes transparent outside the source instead of its edge pixels", () => {
        const { host } = makeHost();
        host.setPhase("render");
        host.ctx.blit(makeSource(host));
        expect(programs[0].frag).toMatch(
            /inside \? texture\(src, uvSrc\) : vec4\(0\.0\)/,
        );
    });

    it("defaults to ctx.target when target is omitted; explicit RT overrides", () => {
        const { host } = makeHost();
        host.setPhase("render");
        const src = makeSource(host);
        const rt = host.ctx.createRenderTarget({ persistent: true });
        host.ctx.blit(src, rt);
        expect(backbuffers[0].swaps).toBe(1);
        host.ctx.blit(src, rt, { swap: false });
        expect(backbuffers[0].swaps).toBe(1);
    });

    it("in update() phase is a no-op and warns once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { host } = makeHost();
        host.setPhase("update");
        const src = makeSource(host);
        host.ctx.blit(src);
        host.ctx.blit(src);
        expect(programs).toHaveLength(0);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
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
            } as unknown as EffectTexture,
            { autoCrop: true, glslVersion: "300 es" },
            new ProgramCache(glCtx),
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

describe("EffectHost.setFrameState", () => {
    it("defaults enterProgress / leaveProgress to 0", () => {
        const { host } = makeHost();
        expect(host.ctx.enterProgress).toBe(0);
        expect(host.ctx.leaveProgress).toBe(0);
    });

    it("writes enterProgress / leaveProgress to ctx", () => {
        const { host } = makeHost();
        host.setFrameState({
            time: 0,
            deltaTime: 0,
            mouse: [0, 0],
            mouseViewport: [0, 0],
            intersection: 0,
            enterTime: 0,
            leaveTime: 0,
            enterProgress: 0.25,
            leaveProgress: 0.5,
            uniforms: {},
        });
        expect(host.ctx.enterProgress).toBe(0.25);
        expect(host.ctx.leaveProgress).toBe(0.5);
    });
});

describe("EffectHost.dispose", () => {
    it("releases owned Framebuffers / Backbuffers / Textures (not Programs — those live on the shared cache)", () => {
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
        // Programs survive host disposal — they're owned by the
        // VFX-scoped ProgramCache and shared with other hosts.
        expect(programs.every((p) => !p.disposed)).toBe(true);
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

// ---------------------------------------------------------------------------
// resetState
// ---------------------------------------------------------------------------

describe("EffectHost.resetState", () => {
    /** GL stub where every method is a spy and every constant is its name. */
    function makeFullGlStub() {
        const fns = new Map<string, ReturnType<typeof vi.fn>>();
        const target = {
            drawingBufferWidth: 320,
            drawingBufferHeight: 240,
        } as Record<string, unknown>;
        return new Proxy(target, {
            get(t, prop: string) {
                if (prop in t) {
                    return t[prop];
                }
                if (/^[A-Z0-9_]+$/.test(prop)) {
                    return prop;
                }
                if (prop === "getParameter") {
                    let fn = fns.get(prop);
                    if (!fn) {
                        fn = vi.fn(() => 4);
                        fns.set(prop, fn);
                    }
                    return fn;
                }
                let fn = fns.get(prop);
                if (!fn) {
                    fn = vi.fn();
                    fns.set(prop, fn);
                }
                return fn;
            },
        }) as unknown as WebGL2RenderingContext & {
            [k: string]: ReturnType<typeof vi.fn>;
        };
    }

    function makeResetHost(opts: { lost?: boolean } = {}) {
        const gl = makeFullGlStub();
        const glCtx = {
            gl,
            isContextLost: opts.lost ?? false,
            addResource: () => {},
            removeResource: () => {},
            onContextRestored: () => () => {},
        } as unknown as GLContext;
        const host = new EffectHost(
            glCtx,
            {} as Quad,
            1,
            {
                __brand: "EffectTexture",
                width: 1,
                height: 1,
            } as unknown as EffectTexture,
            { autoCrop: true, glslVersion: "300 es" },
            new ProgramCache(glCtx),
        );
        host.setPhase("render");
        return { host, gl };
    }

    it("writes the pipeline baseline without querying state", () => {
        const { host, gl } = makeResetHost();
        host.ctx.resetState();

        expect(gl.bindFramebuffer).toHaveBeenCalledWith("FRAMEBUFFER", null);
        expect(gl.drawBuffers).toHaveBeenCalledWith(["BACK"]);
        expect(gl.viewport).toHaveBeenCalledWith(0, 0, 320, 240);
        for (const cap of [
            "DEPTH_TEST",
            "CULL_FACE",
            "STENCIL_TEST",
            "SCISSOR_TEST",
            "BLEND",
            "POLYGON_OFFSET_FILL",
            "RASTERIZER_DISCARD",
            "SAMPLE_ALPHA_TO_COVERAGE",
            "SAMPLE_COVERAGE",
        ]) {
            expect(gl.disable).toHaveBeenCalledWith(cap);
        }
        expect(gl.enable).not.toHaveBeenCalled();
        expect(gl.depthMask).toHaveBeenCalledWith(true);
        expect(gl.colorMask).toHaveBeenCalledWith(true, true, true, true);
        expect(gl.frontFace).toHaveBeenCalledWith("CCW");
        expect(gl.useProgram).toHaveBeenCalledWith(null);
        expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
        expect(gl.bindBuffer).toHaveBeenCalledWith("ARRAY_BUFFER", null);
        expect(gl.bindBuffer).toHaveBeenCalledWith("PIXEL_UNPACK_BUFFER", null);
        expect(gl.pixelStorei).toHaveBeenCalledWith("UNPACK_ROW_LENGTH", 0);
        expect(gl.pixelStorei).toHaveBeenCalledWith(
            "UNPACK_FLIP_Y_WEBGL",
            false,
        );
        expect(gl.readBuffer).toHaveBeenCalledWith("BACK");
        expect(gl.depthFunc).toHaveBeenCalledWith("LESS");
        expect(gl.stencilMask).toHaveBeenCalledWith(0xffffffff);
        expect(gl.cullFace).toHaveBeenCalledWith("BACK");
        expect(gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
        expect(gl.bindTransformFeedback).toHaveBeenCalledWith(
            "TRANSFORM_FEEDBACK",
            null,
        );
        for (const target of [
            "PIXEL_PACK_BUFFER",
            "UNIFORM_BUFFER",
            "COPY_READ_BUFFER",
            "COPY_WRITE_BUFFER",
        ]) {
            expect(gl.bindBuffer).toHaveBeenCalledWith(target, null);
        }
        expect(gl.pixelStorei).toHaveBeenCalledWith(
            "UNPACK_COLORSPACE_CONVERSION_WEBGL",
            "BROWSER_DEFAULT_WEBGL",
        );
        for (const [param, value] of [
            ["UNPACK_PREMULTIPLY_ALPHA_WEBGL", false],
            ["UNPACK_ALIGNMENT", 4],
            ["UNPACK_IMAGE_HEIGHT", 0],
            ["UNPACK_SKIP_PIXELS", 0],
            ["UNPACK_SKIP_ROWS", 0],
            ["UNPACK_SKIP_IMAGES", 0],
            ["PACK_ALIGNMENT", 4],
            ["PACK_ROW_LENGTH", 0],
            ["PACK_SKIP_PIXELS", 0],
            ["PACK_SKIP_ROWS", 0],
        ] as const) {
            expect(gl.pixelStorei).toHaveBeenCalledWith(param, value);
        }
        // Only the one-time texture unit query.
        expect(gl.getParameter).toHaveBeenCalledTimes(1);
        expect(gl.getParameter).toHaveBeenCalledWith(
            "MAX_COMBINED_TEXTURE_IMAGE_UNITS",
        );
        expect(gl.activeTexture).toHaveBeenCalledWith("TEXTURE0");
        // Stub reports 4 units.
        expect(gl.bindSampler).toHaveBeenCalledTimes(4);
        for (let i = 0; i < 4; i++) {
            expect(gl.bindSampler).toHaveBeenCalledWith(i, null);
        }
    });

    it("queries the texture unit count only once", () => {
        const { host, gl } = makeResetHost();
        host.ctx.resetState();
        host.ctx.resetState();
        expect(gl.getParameter).toHaveBeenCalledTimes(1);
    });

    it("works outside render() too", () => {
        const { host, gl } = makeResetHost();
        host.setPhase("update");
        host.ctx.resetState();
        expect(gl.useProgram).toHaveBeenCalledWith(null);
    });

    it("is a no-op after dispose", () => {
        const { host, gl } = makeResetHost();
        const ctx = host.ctx;
        host.dispose();
        ctx.resetState();
        expect(gl.bindFramebuffer).not.toHaveBeenCalled();
        expect(gl.disable).not.toHaveBeenCalled();
    });

    it("survives an object spread of the context", () => {
        const { host, gl } = makeResetHost();
        const spread = { ...host.ctx };
        spread.resetState();
        expect(gl.useProgram).toHaveBeenCalledWith(null);
    });

    it("is a no-op while the context is lost", () => {
        const { host, gl } = makeResetHost({ lost: true });
        host.ctx.resetState();
        expect(gl.bindFramebuffer).not.toHaveBeenCalled();
        expect(gl.disable).not.toHaveBeenCalled();
    });
});
