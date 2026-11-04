// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
    const state = {
        instances: [] as MockVFX[],
        throwOnCreate: false,
    };
    class MockVFX {
        opts: unknown;
        add = vi.fn(async () => {});
        remove = vi.fn();
        update = vi.fn();
        updateEffects = vi.fn(async () => {});
        stop = vi.fn();
        destroy = vi.fn();
        constructor(opts: unknown) {
            if (state.throwOnCreate) {
                throw new Error("no WebGL");
            }
            this.opts = opts;
            state.instances.push(this);
        }
    }
    return { state, MockVFX };
});

vi.mock("@vfx-js/core", () => ({
    VFX: mock.MockVFX,
    supportsHtmlInCanvas: () => false,
    setupCapture: vi.fn(),
    teardownCapture: vi.fn(),
}));

type Lib = typeof import("./react.js");
type ReactNS = typeof import("react");

let lib: Lib;
let React: ReactNS;
let h: ReactNS["createElement"];
let act: typeof import("react").act;
let root: import("react-dom/client").Root;
let frames: FrameRequestCallback[];
let warn: ReturnType<typeof vi.spyOn>;

function flushFrames(): void {
    const fs = frames;
    frames = [];
    for (const f of fs) {
        f(0);
    }
}

async function render(node: React.ReactNode): Promise<void> {
    await act(async () => {
        root.render(node);
    });
}

beforeEach(async () => {
    vi.resetModules();
    mock.state.instances = [];
    mock.state.throwOnCreate = false;
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        frames[id - 1] = () => {};
    });
    (
        globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    React = await import("react");
    act = React.act;
    h = React.createElement;
    lib = await import("./react.js");
    const { createRoot } = await import("react-dom/client");
    root = createRoot(document.createElement("div"));
});

afterEach(async () => {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
    warn.mockRestore();
});

describe("implicit instance", () => {
    it("shares one instance and destroys it a frame after the last unmount", async () => {
        await render(
            h(
                "div",
                null,
                h(lib.VFXSpan, { shader: "rgbShift" }, "a"),
                h(lib.VFXSpan, { shader: "rgbShift" }, "b"),
            ),
        );
        expect(mock.state.instances).toHaveLength(1);
        const [vfx] = mock.state.instances;
        expect(vfx.add).toHaveBeenCalledTimes(2);

        await render(
            h("div", null, h(lib.VFXSpan, { shader: "rgbShift" }, "a")),
        );
        flushFrames();
        expect(vfx.destroy).not.toHaveBeenCalled();

        await render(null);
        expect(vfx.destroy).not.toHaveBeenCalled();
        flushFrames();
        expect(vfx.destroy).toHaveBeenCalledTimes(1);
    });

    it("keeps one instance under StrictMode", async () => {
        await render(
            h(React.StrictMode, null, h(lib.VFXSpan, { shader: "rgbShift" })),
        );
        flushFrames();
        expect(mock.state.instances).toHaveLength(1);
        expect(mock.state.instances[0].destroy).not.toHaveBeenCalled();
    });

    it("a mount in the destroy frame cancels the destroy", async () => {
        await render(h(lib.VFXSpan, { key: "a", shader: "rgbShift" }));
        await render(null);
        await render(h(lib.VFXSpan, { key: "b", shader: "rgbShift" }));
        flushFrames();
        expect(mock.state.instances).toHaveLength(1);
        expect(mock.state.instances[0].destroy).not.toHaveBeenCalled();
    });

    it("applies useVFXConfig in a parent before creating the instance", async () => {
        function App() {
            lib.useVFXConfig({ pixelRatio: 1 });
            return h(lib.VFXSpan, { shader: "rgbShift" });
        }
        await render(h(App));
        expect(mock.state.instances).toHaveLength(1);
        expect(mock.state.instances[0].opts).toEqual({ pixelRatio: 1 });
    });

    it("replaces the instance on option change and re-adds elements", async () => {
        function App({ pixelRatio }: { pixelRatio: number }) {
            lib.useVFXConfig({ pixelRatio });
            return h(lib.VFXSpan, { shader: "rgbShift" });
        }
        await render(h(App, { pixelRatio: 1 }));
        await render(h(App, { pixelRatio: 1 }));
        expect(mock.state.instances).toHaveLength(1);

        await render(h(App, { pixelRatio: 2 }));
        expect(mock.state.instances).toHaveLength(2);
        const [a, b] = mock.state.instances;
        expect(a.destroy).toHaveBeenCalled();
        expect(b.opts).toEqual({ pixelRatio: 2 });
        expect(b.add).toHaveBeenCalledTimes(1);
    });

    it("restores defaults when useVFXConfig unmounts", async () => {
        function Config() {
            lib.useVFXConfig({ pixelRatio: 1 });
            return null;
        }
        const span = h(lib.VFXSpan, { key: "s", shader: "rgbShift" });
        await render(h("div", null, h(Config, { key: "c" }), span));
        await render(h("div", null, span));
        expect(mock.state.instances).toHaveLength(2);
        expect(mock.state.instances[1].opts).toEqual({});
    });

    it("treats undefined options as unset", async () => {
        function App({ show }: { show: boolean }) {
            return h(
                "div",
                null,
                show ? h(Config, { key: "c" }) : null,
                h(lib.VFXSpan, { key: "s", shader: "rgbShift" }),
            );
        }
        function Config() {
            lib.useVFXConfig({ zIndex: undefined });
            return null;
        }
        await render(h(App, { show: false }));
        await render(h(App, { show: true }));
        expect(mock.state.instances).toHaveLength(1);
    });

    it("warns on two useVFXConfig calls; the last mounted wins", async () => {
        function A() {
            lib.useVFXConfig({ pixelRatio: 1 });
            return null;
        }
        function B() {
            lib.useVFXConfig({ pixelRatio: 2 });
            return null;
        }
        await render(
            h("div", null, h(A), h(B), h(lib.VFXSpan, { shader: "rgbShift" })),
        );
        expect(warn).toHaveBeenCalledTimes(1);
        expect(mock.state.instances).toHaveLength(1);
        expect(mock.state.instances[0].opts).toEqual({ pixelRatio: 2 });
    });

    it("keeps elements as plain DOM when new VFX throws", async () => {
        mock.state.throwOnCreate = true;
        await render(h(lib.VFXSpan, { shader: "rgbShift" }, "text"));
        expect(mock.state.instances).toHaveLength(0);
    });

    it("useVFX alone does not create an instance", async () => {
        function App() {
            lib.useVFX();
            return null;
        }
        await render(h(App));
        expect(mock.state.instances).toHaveLength(0);
    });
});

describe("under a Provider", () => {
    it("uses the Provider's instance and ignores useVFXConfig", async () => {
        function Inner() {
            lib.useVFXConfig({ pixelRatio: 1 });
            return h(lib.VFXSpan, { shader: "rgbShift" });
        }
        await render(h(lib.VFXProvider, { pixelRatio: 3 }, h(Inner)));
        expect(mock.state.instances).toHaveLength(1);
        const [vfx] = mock.state.instances;
        expect(vfx.opts).toMatchObject({ pixelRatio: 3 });
        expect(vfx.add).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
    });
});
