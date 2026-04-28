import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GLContext } from "./gl/context.js";
import type { Quad } from "./gl/quad.js";
import type {
    Effect,
    EffectRenderTarget,
    EffectTexture,
    EffectUniformValue,
} from "./types.js";

// ---------------------------------------------------------------------------
// Mocks — replace EffectHost + Framebuffer with in-process stubs so the
// chain's orchestration logic can be unit-tested without a WebGL context.
// ---------------------------------------------------------------------------

type Call = [string, unknown?];

type MockHost = {
    ctx: {
        src?: unknown;
        target?: unknown;
        // Other fields aren't consulted by the chain.
    };
    _calls: Call[];
    setPhase: (p: string) => void;
    setFrameState: (s: unknown) => void;
    setFrameDims: (d: unknown) => void;
    setSrc: (v: unknown) => void;
    setOutput: (v: unknown) => void;
    passthroughCopy: (src: unknown, target: unknown, vp: unknown) => void;
    clearRt: (rt: unknown) => void;
    tickAutoUpdates: () => void;
    dispose: () => void;
};

type MockFramebuffer = {
    width: number;
    height: number;
    disposed: boolean;
    dispose: () => void;
    texture: unknown;
};

const hosts: MockHost[] = [];
const fbs: MockFramebuffer[] = [];
const fbConstructorArgs: Array<{
    w: number;
    h: number;
    opts: { float?: boolean } | undefined;
}> = [];

vi.mock("./effect-host.js", () => {
    class EffectHost {
        ctx: MockHost["ctx"] = {};
        _calls: Call[] = [];
        constructor() {
            hosts.push(this as unknown as MockHost);
        }
        setPhase(p: string) {
            this._calls.push(["setPhase", p]);
        }
        setFrameState(s: unknown) {
            this._calls.push(["setFrameState", s]);
        }
        setFrameDims(d: unknown) {
            this._calls.push(["setFrameDims", d]);
        }
        setSrc(v: unknown) {
            this.ctx.src = v;
            this._calls.push(["setSrc", v]);
        }
        setOutput(v: unknown) {
            this.ctx.target = v;
            this._calls.push(["setOutput", v]);
        }
        passthroughCopy(src: unknown, target: unknown, vp: unknown) {
            this._calls.push(["passthroughCopy", { src, target, vp }]);
        }
        clearRt(rt: unknown) {
            this._calls.push(["clearRt", rt]);
        }
        tickAutoUpdates() {
            this._calls.push(["tickAutoUpdates"]);
        }
        dispose() {
            this._calls.push(["dispose"]);
        }
    }
    return {
        EffectHost,
        makeEffectTexture: (
            resolve: () => unknown,
            w: () => number,
            h: () => number,
        ) => ({
            __brand: "EffectTexture",
            get width() {
                return w();
            },
            get height() {
                return h();
            },
            _resolve: resolve,
        }),
        makeEffectRenderTargetFromFb: (fb: MockFramebuffer) => ({
            __brand: "EffectRenderTarget",
            get width() {
                return fb.width;
            },
            get height() {
                return fb.height;
            },
            _fb: fb,
        }),
    };
});

vi.mock("./gl/framebuffer.js", () => {
    class Framebuffer {
        width: number;
        height: number;
        disposed = false;
        texture = { _brand: "mock-tex" };
        constructor(
            _ctx: unknown,
            w: number,
            h: number,
            opts?: { float?: boolean },
        ) {
            this.width = w;
            this.height = h;
            fbConstructorArgs.push({ w, h, opts });
            fbs.push(this as unknown as MockFramebuffer);
        }
        dispose() {
            this.disposed = true;
        }
    }
    return { Framebuffer };
});

// Imports MUST come after vi.mock calls.
import { type ChainFrameInput, EffectChain } from "./effect-chain.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCapture(): EffectTexture {
    return {
        __brand: "EffectTexture",
        width: 100,
        height: 100,
    } as unknown as EffectTexture;
}

function makeChain(
    effects: readonly Effect[],
    isPostEffect = false,
): EffectChain {
    return new EffectChain(
        {} as GLContext,
        {} as Quad,
        2,
        effects,
        { autoCrop: true, glslVersion: "300 es" },
        makeCapture(),
        isPostEffect,
    );
}

function makeInput(overrides: Partial<ChainFrameInput> = {}): ChainFrameInput {
    return {
        time: 0,
        deltaTime: 0,
        mouse: [0, 0],
        mouseViewport: [0, 0],
        intersection: 1,
        enterTime: 0,
        leaveTime: 0,
        resolvedUniforms: {},
        canvasSize: [50, 50],
        canvasBufferSize: [100, 100],
        elementSize: [50, 50],
        elementBufferSize: [100, 100],
        elementRectOnCanvasPx: { x: 0, y: 0, w: 100, h: 100 },
        finalTarget: null,
        isVisible: true,
        ...overrides,
    };
}

/**
 * Capture ctx.src / ctx.target at the moment render() is invoked. Can't
 * inspect after the fact because the chain mutates the same ctx across
 * passes.
 */
function recordingRender(log: Array<{ src: unknown; target: unknown }>) {
    return (ctx: { src: unknown; target: unknown }) => {
        log.push({ src: ctx.src, target: ctx.target });
    };
}

beforeEach(() => {
    hosts.length = 0;
    fbs.length = 0;
    fbConstructorArgs.length = 0;
});

// ---------------------------------------------------------------------------
// renderingIndices / intermediate count
// ---------------------------------------------------------------------------

describe("EffectChain: renderingIndices", () => {
    it("collects only effects with a render method", () => {
        const chain = makeChain([
            { render: () => {} },
            { update: () => {} }, // no render → skipped
            { render: () => {} },
        ]);
        expect(chain.renderingIndices).toEqual([0, 2]);
    });

    it("stageCount=0 when no effect has render", () => {
        const chain = makeChain([{ update: () => {} }, { init: () => {} }]);
        expect(chain.renderingIndices).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// stageCount=0 identity copy
// ---------------------------------------------------------------------------

describe("EffectChain: stageCount=0 identity copy", () => {
    it("copies capture → finalTarget once via passthroughCopy", () => {
        const chain = makeChain([{ update: () => {} }]);
        chain.run(makeInput({ finalTarget: null }));
        const passthroughCalls = hosts[0]._calls.filter(
            (c) => c[0] === "passthroughCopy",
        );
        expect(passthroughCalls).toHaveLength(1);
    });

    it("stageCount=0 does nothing when isVisible is false", () => {
        const chain = makeChain([{ update: () => {} }]);
        chain.run(makeInput({ isVisible: false }));
        for (const h of hosts) {
            expect(h._calls.some((c) => c[0] === "passthroughCopy")).toBe(
                false,
            );
        }
    });
});

// ---------------------------------------------------------------------------
// Intermediate allocation + src/output swapping (stageCount=N)
// ---------------------------------------------------------------------------

describe("EffectChain: stageCount=3 intermediates + swap", () => {
    it("allocates 2 intermediates and swaps src/output per pass", () => {
        const log: Array<{ src: unknown; target: unknown }> = [];
        const effects: Effect[] = [
            { render: recordingRender(log) },
            { render: recordingRender(log) },
            { render: recordingRender(log) },
        ];
        const chain = makeChain(effects);
        const capture = makeCapture();
        // Capture reference from the chain's constructor via the first
        // stage's src. finalTarget: null → canvas.
        chain.run(makeInput({ finalTarget: null }));

        // 2 intermediates allocated (stageCount-1 = 3-1 = 2).
        expect(fbs).toHaveLength(2);

        // Stage 0: src = capture, output = intermediate[0].rtHandle
        expect(log[0].src).toBeDefined();
        expect(
            (log[0].target as { __brand: string; _fb?: unknown }).__brand,
        ).toBe("EffectRenderTarget");
        expect((log[0].target as { _fb: unknown })._fb).toBe(fbs[0]);
        // Ignore the exact `capture` identity; the chain wraps it as the
        // texture handle it stores at construction.
        void capture;

        // Stage 1: src = intermediate[0] (tex handle), output = intermediate[1]
        expect((log[1].src as { __brand: string })?.__brand).toBe(
            "EffectTexture",
        );
        expect((log[1].target as { _fb: unknown })._fb).toBe(fbs[1]);

        // Stage 2: src = intermediate[1] (tex handle), output = null (canvas)
        expect((log[2].src as { __brand: string })?.__brand).toBe(
            "EffectTexture",
        );
        expect(log[2].target).toBe(null);
    });

    it("clears each intermediate before its producing effect writes", () => {
        const effects: Effect[] = [
            { render: () => {} },
            { render: () => {} },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput());

        // hosts 0 and 1 each clearRt (their outputs are intermediates).
        // host 2's output is the final target (null) — no clearRt.
        expect(hosts[0]._calls.filter((c) => c[0] === "clearRt")).toHaveLength(
            1,
        );
        expect(hosts[1]._calls.filter((c) => c[0] === "clearRt")).toHaveLength(
            1,
        );
        expect(hosts[2]._calls.filter((c) => c[0] === "clearRt")).toHaveLength(
            0,
        );
    });
});

// ---------------------------------------------------------------------------
// Render-less middle effect is skipped
// ---------------------------------------------------------------------------

describe("EffectChain: render-less middle", () => {
    it("skips the no-render effect and reduces intermediate count", () => {
        const effects: Effect[] = [
            { render: () => {} }, // rendering
            { update: () => {} }, // no render → transparent
            { render: () => {} }, // rendering
        ];
        const chain = makeChain(effects);
        expect(chain.renderingIndices).toEqual([0, 2]);
        chain.run(makeInput());
        // stageCount=2 → 1 intermediate (not 2).
        expect(fbs).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// outputRect: per-stage rect declaration
// ---------------------------------------------------------------------------

describe("EffectChain: outputRect default", () => {
    it("undefined outputRect → dstRect inherits srcRect (stage 0 = contentRect)", () => {
        const effects: Effect[] = [{ render: () => {} }, { render: () => {} }];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const [s0, s1] = chain.stages;
        expect(s0.dstRect).toEqual([0, 0, 100, 100]);
        expect(s1.dstRect).toEqual([0, 0, 100, 100]);
        expect(s0.dstBufferSize).toEqual([100, 100]);
    });

    it("undefined outputRect on stage k>0 inherits prev stage's dstRect", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-10, -10, 120, 120] as const,
            },
            // No outputRect → inherits stage 0's dstRect.
            { render: () => {} },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const [, s1, s2] = chain.stages;
        expect(s1.dstRect).toEqual([-10, -10, 120, 120]);
        expect(s2.dstRect).toEqual([-10, -10, 120, 120]);
    });
});

describe("EffectChain: outputRect dstBufferSize", () => {
    it("dstBufferSize = [rect.w, rect.h] regardless of element size", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-10, -10, 120, 120] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(fbs).toHaveLength(1);
        expect(fbs[0].width).toBe(120);
        expect(fbs[0].height).toBe(120);
        expect(chain.stages[0].dstBufferSize).toEqual([120, 120]);
    });

    it("asymmetric rect → asymmetric buffer", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-50, 0, 200, 100] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(fbs[0].width).toBe(200);
        expect(fbs[0].height).toBe(100);
    });

    it("reallocates intermediate only on size delta", () => {
        const rect = vi
            .fn()
            .mockReturnValueOnce([0, 0, 100, 100])
            .mockReturnValueOnce([0, 0, 100, 100]) // same → reuse
            .mockReturnValueOnce([0, 0, 200, 200]); // changed → reallocate
        const effects: Effect[] = [
            { render: () => {}, outputRect: rect },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput());
        chain.run(makeInput());
        chain.run(makeInput());
        expect(fbConstructorArgs).toHaveLength(2);
        expect(fbs[0].disposed).toBe(true);
    });
});

describe("EffectChain: outputRect stage independence", () => {
    it("[a(big), b(small)] uses each stage's rect as-is — no monotonic clamp", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-20, -20, 140, 140] as const,
            },
            {
                render: () => {},
                outputRect: () => [0, 0, 100, 100] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const [s0, s1] = chain.stages;
        expect(s0.dstRect).toEqual([-20, -20, 140, 140]);
        expect(s1.dstRect).toEqual([0, 0, 100, 100]);
        // Stage 1 buffer SHRINKS back to element-only — no clamp.
        expect(fbs[0].width).toBe(140);
        expect(fbs[1].width).toBe(100);
    });

    it("does not warn when later stage's rect is smaller than earlier stage's", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-50, -50, 200, 200] as const,
            },
            {
                render: () => {},
                outputRect: () => [0, 0, 100, 100] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe("EffectChain: outputRect contentRectUv / srcRectUv", () => {
    it("contentRectUv = rectInRect(contentRect, dstRect) — symmetric outset", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-10, -10, 120, 120] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const [s0] = chain.stages;
        // contentRect [0,0,100,100] within dstRect [-10,-10,120,120].
        expect(s0.contentRectUv[0]).toBeCloseTo(10 / 120);
        expect(s0.contentRectUv[1]).toBeCloseTo(10 / 120);
        expect(s0.contentRectUv[2]).toBeCloseTo(100 / 120);
        expect(s0.contentRectUv[3]).toBeCloseTo(100 / 120);
    });

    it("contentRectUv — asymmetric rect", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-50, 0, 200, 100] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const [s0] = chain.stages;
        expect(s0.contentRectUv[0]).toBeCloseTo(50 / 200);
        expect(s0.contentRectUv[1]).toBeCloseTo(0);
        expect(s0.contentRectUv[2]).toBeCloseTo(100 / 200);
        expect(s0.contentRectUv[3]).toBeCloseTo(1);
    });

    it("contentRectUv for default rect (= contentRect) is (0, 0, 1, 1)", () => {
        const effects: Effect[] = [{ render: () => {} }, { render: () => {} }];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(chain.stages[0].contentRectUv).toEqual([0, 0, 1, 1]);
    });
});

describe("EffectChain: outputRect dims input", () => {
    it("contentRect = [0, 0, elementBufferSize[0], elementBufferSize[1]]", () => {
        const probe = vi.fn().mockReturnValue([0, 0, 100, 100]);
        const effects: Effect[] = [
            { render: () => {}, outputRect: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 200] }));
        const dims = probe.mock.calls[0][0];
        expect(dims.contentRect).toEqual([0, 0, 100, 200]);
    });

    it("stage 0 srcRect == contentRect", () => {
        const probe = vi.fn().mockReturnValue([0, 0, 100, 100]);
        const effects: Effect[] = [
            { render: () => {}, outputRect: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const dims = probe.mock.calls[0][0];
        expect(dims.srcRect).toEqual([0, 0, 100, 100]);
        expect(dims.srcRect).toEqual(dims.contentRect);
    });

    it("stage k>0 srcRect == prev stage's dstRect", () => {
        const probe = vi.fn().mockReturnValue([0, 0, 100, 100]);
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-30, -30, 160, 160] as const,
            },
            { render: () => {}, outputRect: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        const dims = probe.mock.calls[0][0];
        expect(dims.srcRect).toEqual([-30, -30, 160, 160]);
    });

    it("element-chain canvasRect = [-elementOffsetX, -elementOffsetY, canvasW, canvasH]", () => {
        const probe = vi.fn().mockReturnValue([0, 0, 100, 100]);
        const effects: Effect[] = [
            { render: () => {}, outputRect: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(
            makeInput({
                elementBufferSize: [100, 100],
                canvasBufferSize: [400, 400],
                elementRectOnCanvasPx: { x: 150, y: 120, w: 100, h: 100 },
            }),
        );
        const dims = probe.mock.calls[0][0];
        expect(dims.canvasRect).toEqual([-150, -120, 400, 400]);
    });

    it("post-effect canvasRect = [0, 0, canvasW, canvasH] (= contentRect)", () => {
        const probe = vi.fn().mockReturnValue([0, 0, 640, 480]);
        const effects: Effect[] = [
            { render: () => {}, outputRect: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects, /* isPostEffect = */ true);
        chain.run(
            makeInput({
                elementBufferSize: [999, 999], // should be overridden
                canvasBufferSize: [640, 480],
                canvasSize: [320, 240],
            }),
        );
        const dims = probe.mock.calls[0][0];
        expect(dims.elementPixel).toEqual([640, 480]);
        expect(dims.contentRect).toEqual([0, 0, 640, 480]);
        expect(dims.canvasRect).toEqual([0, 0, 640, 480]);
        expect(dims.canvasRect).toEqual(dims.contentRect);
    });

    it("pixelRatio = canvasBufferSize[0] / canvasSize[0]", () => {
        const probe = vi.fn().mockReturnValue([0, 0, 100, 100]);
        const effects: Effect[] = [
            { render: () => {}, outputRect: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(
            makeInput({
                canvasSize: [200, 100],
                canvasBufferSize: [400, 200],
            }),
        );
        expect(probe.mock.calls[0][0].pixelRatio).toBe(2);
    });
});

describe("EffectChain: outputRect outputViewport", () => {
    it("last-stage viewport: x/y = elementRectOnCanvasPx + dstRect.xy; w/h = dstRect.wh", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-10, -10, 120, 120] as const,
            },
        ];
        const chain = makeChain(effects);
        chain.run(
            makeInput({
                elementBufferSize: [100, 100],
                elementRectOnCanvasPx: { x: 30, y: 40, w: 100, h: 100 },
            }),
        );
        // Single-stage = last stage; no intermediate.
        expect(fbs).toHaveLength(0);
        expect(chain.stages[0].outputViewport).toEqual({
            x: 30 + -10,
            y: 40 + -10,
            w: 120,
            h: 120,
        });
    });

    it("intermediate-stage viewport: full buffer (origin 0)", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-10, -10, 120, 120] as const,
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(chain.stages[0].outputViewport).toEqual({
            x: 0,
            y: 0,
            w: 120,
            h: 120,
        });
    });

    it("fullscreen via dims.canvasRect → buffer = canvas, viewport = (0, 0, canvasW, canvasH)", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: (dims) => dims.canvasRect,
            },
        ];
        const chain = makeChain(effects);
        chain.run(
            makeInput({
                elementBufferSize: [100, 100],
                canvasBufferSize: [400, 400],
                elementRectOnCanvasPx: { x: 150, y: 150, w: 100, h: 100 },
            }),
        );
        const s0 = chain.stages[0];
        // canvasRect = [-150, -150, 400, 400] in element-local; on canvas
        // the viewport is (150 + -150, 150 + -150, 400, 400) = (0,0,400,400).
        expect(s0.dstBufferSize).toEqual([400, 400]);
        expect(s0.outputViewport).toEqual({ x: 0, y: 0, w: 400, h: 400 });
    });

    it("last-stage outputRect honored (no intermediate)", () => {
        const middle = vi.fn().mockReturnValue([-5, -5, 110, 110]);
        const last = vi.fn().mockReturnValue([-12, -12, 124, 124]);
        const effects: Effect[] = [
            { render: () => {}, outputRect: middle },
            { render: () => {}, outputRect: last },
        ];
        const chain = makeChain(effects);
        chain.run(
            makeInput({
                elementBufferSize: [100, 100],
                elementRectOnCanvasPx: { x: 50, y: 60, w: 100, h: 100 },
            }),
        );
        expect(fbs).toHaveLength(1); // only middle stage
        expect(last).toHaveBeenCalled();
        expect(chain.stages[1].dstRect).toEqual([-12, -12, 124, 124]);
        expect(chain.stages[1].outputViewport).toEqual({
            x: 50 + -12,
            y: 60 + -12,
            w: 124,
            h: 124,
        });
    });
});

describe("EffectChain: outputRect non-rendering effect", () => {
    it("outputRect on a non-rendering effect is ignored", () => {
        const probe = vi.fn().mockReturnValue([-10, -10, 120, 120]);
        const effects: Effect[] = [
            { update: () => {}, outputRect: probe }, // no render → not in chain
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(probe).not.toHaveBeenCalled();
        // Single rendering stage; default rect.
        expect(chain.stages).toHaveLength(1);
        expect(chain.stages[0].dstRect).toEqual([0, 0, 100, 100]);
    });
});

// ---------------------------------------------------------------------------
// Empty effects: stageCount=0 passthrough via dedicated host
// ---------------------------------------------------------------------------

describe("EffectChain: empty effects", () => {
    it("constructs a dedicated passthrough host (separate from #hosts)", () => {
        // Construction allocates 1 host even though `effects` is empty.
        makeChain([]);
        expect(hosts).toHaveLength(1);
    });

    it("stageCount=0 passthrough renders capture → finalTarget on run()", () => {
        const chain = makeChain([]);
        chain.run(makeInput({ finalTarget: null }));
        const passthroughCalls = hosts[0]._calls.filter(
            (c) => c[0] === "passthroughCopy",
        );
        expect(passthroughCalls).toHaveLength(1);
    });

    it("dispose() releases the passthrough host", () => {
        const chain = makeChain([]);
        chain.dispose();
        expect(hosts[0]._calls.some((c) => c[0] === "dispose")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// hitTestPadBuffer: visibility margin for the host
// ---------------------------------------------------------------------------

describe("EffectChain: hitTestPadBuffer", () => {
    it("starts at zero before any frame", () => {
        const chain = makeChain([{ render: () => {} }]);
        expect(chain.hitTestPadBuffer).toMatchObject({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });

    it("derived from last stage's dstRect: how far it extends past contentRect on each side", () => {
        // Last rect [-10, -10, 120, 120] over content [0, 0, 100, 100]:
        // bottom = max(0, -y)            = 10
        // top    = max(0, (y+h) - elemH) = max(0, 110 - 100) = 10
        // left   = max(0, -x)            = 10
        // right  = max(0, (x+w) - elemW) = max(0, 110 - 100) = 10
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-20, -20, 140, 140] as const,
            },
            {
                render: () => {},
                outputRect: () => [-10, -10, 120, 120] as const,
            },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(chain.hitTestPadBuffer).toMatchObject({
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
        });
    });

    it("asymmetric rect produces asymmetric hit-test pad", () => {
        // Rect [-50, 0, 200, 100] over content [0, 0, 100, 100]:
        // bottom = max(0, -0) = 0
        // top    = max(0, 100 - 100) = 0
        // left   = max(0, 50) = 50
        // right  = max(0, 150 - 100) = 50
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [-50, 0, 200, 100] as const,
            },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(chain.hitTestPadBuffer).toMatchObject({
            top: 0,
            right: 50,
            bottom: 0,
            left: 50,
        });
    });

    it("rect inside content (no extension) → zero pad", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputRect: () => [10, 10, 80, 80] as const,
            },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementBufferSize: [100, 100] }));
        expect(chain.hitTestPadBuffer).toMatchObject({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });
});

// ---------------------------------------------------------------------------
// initAll ordering + error
// ---------------------------------------------------------------------------

describe("EffectChain: initAll", () => {
    it("awaits each effect's init sequentially in array order", async () => {
        const order: number[] = [];
        const effects: Effect[] = [
            {
                init: async () => {
                    await new Promise((r) => setTimeout(r, 5));
                    order.push(0);
                },
            },
            {
                init: () => {
                    order.push(1);
                },
            },
            {
                init: async () => {
                    await new Promise((r) => setTimeout(r, 1));
                    order.push(2);
                },
            },
        ];
        const chain = makeChain(effects);
        await chain.initAll();
        expect(order).toEqual([0, 1, 2]);
    });

    it("on throw: disposes priors in reverse; failing effect's dispose NOT called", async () => {
        const d0 = vi.fn();
        const d1 = vi.fn();
        const d2 = vi.fn();
        const order: string[] = [];
        const effects: Effect[] = [
            {
                dispose: () => {
                    d0();
                    order.push("d0");
                },
            },
            {
                init: () => {
                    throw new Error("boom");
                },
                dispose: () => {
                    d1();
                    order.push("d1");
                },
            },
            {
                dispose: () => {
                    d2();
                    order.push("d2");
                },
            },
        ];
        const chain = makeChain(effects);
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await expect(chain.initAll()).rejects.toThrow("boom");
        expect(d0).toHaveBeenCalledTimes(1);
        expect(d1).not.toHaveBeenCalled();
        expect(d2).not.toHaveBeenCalled();
        // Prior effects' hosts are disposed; failing effect's host is also
        // disposed (its init may have allocated RTs).
        expect(hosts[0]._calls.some((c) => c[0] === "dispose")).toBe(true);
        expect(hosts[1]._calls.some((c) => c[0] === "dispose")).toBe(true);
        errSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// dispose order
// ---------------------------------------------------------------------------

describe("EffectChain: dispose", () => {
    it("calls effect.dispose in reverse array order", () => {
        const order: number[] = [];
        const effects: Effect[] = [
            { dispose: () => order.push(0) },
            { dispose: () => order.push(1) },
            { dispose: () => order.push(2) },
        ];
        const chain = makeChain(effects);
        chain.dispose();
        expect(order).toEqual([2, 1, 0]);
    });

    it("continues disposing remaining effects when one throws", () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const d0 = vi.fn();
        const d2 = vi.fn();
        const effects: Effect[] = [
            { dispose: d0 },
            {
                dispose: () => {
                    throw new Error("bad");
                },
            },
            { dispose: d2 },
        ];
        const chain = makeChain(effects);
        chain.dispose();
        expect(d0).toHaveBeenCalled();
        expect(d2).toHaveBeenCalled();
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it("disposes intermediate framebuffers", () => {
        const effects: Effect[] = [
            { render: () => {} },
            { render: () => {} },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput());
        expect(fbs).toHaveLength(2);
        chain.dispose();
        expect(fbs.every((fb) => fb.disposed)).toBe(true);
    });

    it("is idempotent", () => {
        const effects: Effect[] = [{ dispose: vi.fn() }];
        const chain = makeChain(effects);
        chain.dispose();
        chain.dispose(); // must not throw
    });
});

// ---------------------------------------------------------------------------
// update / render error handling
// ---------------------------------------------------------------------------

describe("EffectChain: error handling", () => {
    it("update throw: warns once across frames, does not rethrow", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const effects: Effect[] = [
            {
                update: () => {
                    throw new Error("u-fail");
                },
                render: () => {},
            },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput());
        chain.run(makeInput());
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("middle render throw: passthrough copy + warn once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const effects: Effect[] = [
            {
                render: () => {
                    throw new Error("r-fail");
                },
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput());
        chain.run(makeInput());
        // Failing effect's host passes through on each frame.
        const passes = hosts[0]._calls.filter(
            (c) => c[0] === "passthroughCopy",
        );
        expect(passes).toHaveLength(2);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("last render throw: passthrough copy to final target (no disappear)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const effects: Effect[] = [
            { render: () => {} },
            {
                render: () => {
                    throw new Error("r-fail");
                },
            },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ finalTarget: null }));
        // host[1] is the last effect → passthroughCopy with target=null.
        const passes = hosts[1]._calls.filter(
            (c) => c[0] === "passthroughCopy",
        );
        expect(passes).toHaveLength(1);
        expect((passes[0][1] as { target: unknown }).target).toBe(null);
        warn.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// Off-viewport gate
// ---------------------------------------------------------------------------

describe("EffectChain: isVisible gate", () => {
    it("skips both update and render when isVisible is false", () => {
        const update = vi.fn();
        const render = vi.fn();
        const effects: Effect[] = [{ update, render }];
        const chain = makeChain(effects);
        chain.run(makeInput({ isVisible: false }));
        expect(update).not.toHaveBeenCalled();
        expect(render).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// ctx.uniforms reflection
// ---------------------------------------------------------------------------

describe("EffectChain: frame state", () => {
    it("passes resolvedUniforms to each host's setFrameState", () => {
        const effects: Effect[] = [{ render: () => {} }, { render: () => {} }];
        const chain = makeChain(effects);
        const uniforms: Record<string, EffectUniformValue> = {
            scroll: 42,
            color: [1, 0, 0],
        };
        chain.run(makeInput({ resolvedUniforms: uniforms }));
        for (const h of hosts) {
            const call = h._calls.find((c) => c[0] === "setFrameState");
            if (!call) {
                throw new Error("setFrameState not called");
            }
            expect((call[1] as { uniforms: unknown }).uniforms).toBe(uniforms);
        }
    });

    it("passes mouse / mouseViewport as given", () => {
        const chain = makeChain([{ render: () => {} }]);
        chain.run(
            makeInput({
                mouse: [100, 200],
                mouseViewport: [50, 75],
            }),
        );
        const call = hosts[0]._calls.find((c) => c[0] === "setFrameState");
        if (!call) {
            throw new Error("setFrameState not called");
        }
        const state = call[1] as { mouse: unknown; mouseViewport: unknown };
        expect(state.mouse).toEqual([100, 200]);
        expect(state.mouseViewport).toEqual([50, 75]);
    });
});

// ---------------------------------------------------------------------------
// Single-effect ergonomics
// ---------------------------------------------------------------------------

describe("EffectChain: single effect", () => {
    it("one Effect behaves identically to a length-1 array", () => {
        const log1: Array<{ src: unknown; target: unknown }> = [];
        const log2: Array<{ src: unknown; target: unknown }> = [];
        const chainA = makeChain([{ render: recordingRender(log1) }]);
        const chainB = makeChain([{ render: recordingRender(log2) }]);
        chainA.run(makeInput({ finalTarget: null }));
        chainB.run(makeInput({ finalTarget: null }));
        expect(log1).toEqual(log2);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Silence unused types from spot-checks.
void ({} as EffectRenderTarget);
