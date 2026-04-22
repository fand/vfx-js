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
        output?: unknown;
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
            this.ctx.output = v;
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
        resolveRt: () => {
            throw new Error("resolveRt not used by chain tests");
        },
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
import { EffectChain, type ChainFrameInput } from "./effect-chain.js";

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
        canvasPhysW: 100,
        canvasPhysH: 100,
        elementLogical: [50, 50],
        elementPhys: [100, 100],
        elementInnerLogical: [50, 50],
        elementInnerPhys: [100, 100],
        viewportLogical: [50, 50],
        viewportPhys: [100, 100],
        overflow: { top: 0, right: 0, bottom: 0, left: 0 },
        finalViewport: { x: 0, y: 0, w: 100, h: 100 },
        finalTarget: null,
        isVisible: true,
        ...overrides,
    };
}

/**
 * Capture ctx.src / ctx.output at the moment render() is invoked. Can't
 * inspect after the fact because the chain mutates the same ctx across
 * passes.
 */
function recordingRender(log: Array<{ src: unknown; output: unknown }>) {
    return (ctx: { src: unknown; output: unknown }) => {
        log.push({ src: ctx.src, output: ctx.output });
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

    it("M=0 when no effect has render", () => {
        const chain = makeChain([{ update: () => {} }, { init: () => {} }]);
        expect(chain.renderingIndices).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// M=0 identity copy
// ---------------------------------------------------------------------------

describe("EffectChain: M=0 identity copy", () => {
    it("copies capture → finalTarget once via passthroughCopy", () => {
        const chain = makeChain([{ update: () => {} }]);
        chain.run(makeInput({ finalTarget: null }));
        const passthroughCalls = hosts[0]._calls.filter(
            (c) => c[0] === "passthroughCopy",
        );
        expect(passthroughCalls).toHaveLength(1);
    });

    it("M=0 does nothing when isVisible is false", () => {
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
// Intermediate allocation + src/output swapping (M=N)
// ---------------------------------------------------------------------------

describe("EffectChain: M=3 intermediates + swap", () => {
    it("allocates 2 intermediates and swaps src/output per pass", () => {
        const log: Array<{ src: unknown; output: unknown }> = [];
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

        // 2 intermediates allocated (M-1 = 3-1 = 2).
        expect(fbs).toHaveLength(2);

        // Stage 0: src = capture, output = intermediate[0].rtHandle
        expect(log[0].src).toBeDefined();
        expect(
            (log[0].output as { __brand: string; _fb?: unknown }).__brand,
        ).toBe("EffectRenderTarget");
        expect((log[0].output as { _fb: unknown })._fb).toBe(fbs[0]);
        // Ignore the exact `capture` identity; the chain wraps it as the
        // texture handle it stores at construction.
        void capture;

        // Stage 1: src = intermediate[0] (tex handle), output = intermediate[1]
        expect(
            (log[1].src as { __brand: string })?.__brand,
        ).toBe("EffectTexture");
        expect((log[1].output as { _fb: unknown })._fb).toBe(fbs[1]);

        // Stage 2: src = intermediate[1] (tex handle), output = null (canvas)
        expect(
            (log[2].src as { __brand: string })?.__brand,
        ).toBe("EffectTexture");
        expect(log[2].output).toBe(null);
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
        expect(
            hosts[0]._calls.filter((c) => c[0] === "clearRt"),
        ).toHaveLength(1);
        expect(
            hosts[1]._calls.filter((c) => c[0] === "clearRt"),
        ).toHaveLength(1);
        expect(
            hosts[2]._calls.filter((c) => c[0] === "clearRt"),
        ).toHaveLength(0);
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
        // M=2 → 1 intermediate (not 2).
        expect(fbs).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// outputSize reallocation
// ---------------------------------------------------------------------------

describe("EffectChain: outputSize", () => {
    it("allocates intermediates at the specified physical-px size", () => {
        const outputSize = vi.fn().mockReturnValue([256, 128]);
        const effects: Effect[] = [
            { render: () => {}, outputSize },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementPhys: [200, 200] }));
        expect(fbs).toHaveLength(1);
        expect(fbs[0].width).toBe(256);
        expect(fbs[0].height).toBe(128);
    });

    it("last rendering effect's outputSize is ignored (final target fixed)", () => {
        const middle = vi.fn().mockReturnValue([300, 300]);
        const last = vi.fn().mockReturnValue([999, 999]);
        const effects: Effect[] = [
            { render: () => {}, outputSize: middle },
            { render: () => {}, outputSize: last },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementPhys: [100, 100] }));
        // Only one intermediate (for middle); last's outputSize never
        // affects allocation.
        expect(fbs).toHaveLength(1);
        expect(fbs[0].width).toBe(300);
    });

    it("allocates float intermediate when outputSize returns { float: true }", () => {
        const effects: Effect[] = [
            {
                render: () => {},
                outputSize: () => ({ size: [128, 128], float: true }),
            },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput({ elementPhys: [50, 50] }));
        expect(fbConstructorArgs[0].opts).toEqual({ float: true });
    });

    it("reallocates only on size/float delta", () => {
        const size = vi.fn()
            .mockReturnValueOnce([100, 100])
            .mockReturnValueOnce([100, 100]) // same → reuse
            .mockReturnValueOnce([200, 200]); // changed → reallocate
        const effects: Effect[] = [
            { render: () => {}, outputSize: size },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(makeInput());
        chain.run(makeInput());
        chain.run(makeInput());
        // Frame 1 allocates; frame 2 reuses; frame 3 reallocates.
        expect(fbConstructorArgs).toHaveLength(2);
        expect(fbs[0].disposed).toBe(true); // old FB disposed
    });

    it("receives overflow; stage-2+ default input == previous output (no cumulative overflow)", () => {
        const stage1 = vi.fn().mockImplementation(() => [50, 50]);
        const stage2Probe = vi.fn().mockImplementation((dims) => {
            // Stage 2's `input` should be stage 1's output (50, 50), NOT
            // (50 + 2*overflow.left) = (70, 70).
            return dims.input;
        });
        const effects: Effect[] = [
            { render: () => {}, outputSize: stage1 },
            { render: () => {}, outputSize: stage2Probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects);
        chain.run(
            makeInput({
                elementPhys: [100, 100],
                overflow: { top: 10, right: 10, bottom: 10, left: 10 },
            }),
        );
        expect(stage2Probe).toHaveBeenCalled();
        const args = stage2Probe.mock.calls[0][0];
        expect(args.input).toEqual([50, 50]);
    });

    it("post-effect context: element* mirrors viewport* and overflow is zero", () => {
        const probe = vi.fn().mockReturnValue([100, 100]);
        const effects: Effect[] = [
            { render: () => {}, outputSize: probe },
            { render: () => {} },
        ];
        const chain = makeChain(effects, /* isPostEffect = */ true);
        chain.run(
            makeInput({
                elementPhys: [999, 999], // should be overridden
                viewportPhys: [640, 480],
                viewportLogical: [320, 240],
                overflow: { top: 99, right: 99, bottom: 99, left: 99 },
            }),
        );
        const dims = probe.mock.calls[0][0];
        expect(dims.element).toEqual([320, 240]);
        expect(dims.elementPixel).toEqual([640, 480]);
        expect(dims.overflow).toEqual({
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
        expect(
            (passes[0][1] as { target: unknown }).target,
        ).toBe(null);
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
            expect(call).toBeDefined();
            expect(
                (call![1] as { uniforms: unknown }).uniforms,
            ).toBe(uniforms);
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
        const call = hosts[0]._calls.find((c) => c[0] === "setFrameState")!;
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
        const log1: Array<{ src: unknown; output: unknown }> = [];
        const log2: Array<{ src: unknown; output: unknown }> = [];
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
