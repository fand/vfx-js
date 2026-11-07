// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
    const state = {
        instances: [] as MockVFX[],
        supported: false,
    };
    const capture = { fake: "capture" };
    class MockVFX {
        maxTextureSize = 4096;
        add = vi.fn(async (..._args: unknown[]) => {});
        remove = vi.fn();
        update = vi.fn();
        updateEffects = vi.fn(async () => {});
        updateHICTexture = vi.fn();
        stop = vi.fn();
        destroy = vi.fn();
        constructor() {
            state.instances.push(this);
        }
        static init(): MockVFX {
            return new MockVFX();
        }
    }
    return {
        state,
        capture,
        MockVFX,
        setupCapture: vi.fn(),
        teardownCapture: vi.fn(),
    };
});

vi.mock("@vfx-js/core", () => ({
    VFX: mock.MockVFX,
    supportsHtmlInCanvas: () => mock.state.supported,
    setupCapture: mock.setupCapture,
    teardownCapture: mock.teardownCapture,
}));

type Lib = typeof import("./react.js");
type ReactNS = typeof import("react");

let lib: Lib;
let React: ReactNS;
let h: ReactNS["createElement"];
let act: ReactNS["act"];
let container: HTMLDivElement;
let root: { unmount(): void } | null;
let onRecoverableError: ReturnType<typeof vi.fn<(error: unknown) => void>>;

function app(ref?: React.Ref<HTMLElement>): React.ReactElement {
    return h(lib.VFXCanvas, { shader: "rgbShift", ref }, h("h2", null, "Hi"));
}

async function flush(): Promise<void> {
    await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
    });
}

async function hydrate(node: React.ReactElement): Promise<void> {
    const { renderToString } = await import("react-dom/server");
    container.innerHTML = renderToString(node);
    const { hydrateRoot } = await import("react-dom/client");
    await act(async () => {
        root = hydrateRoot(container, node, { onRecoverableError });
    });
    await flush();
}

async function render(node: React.ReactElement): Promise<void> {
    const { createRoot } = await import("react-dom/client");
    const r = createRoot(container);
    root = r;
    await act(async () => r.render(node));
    await flush();
}

function vfx(): InstanceType<typeof mock.MockVFX> {
    expect(mock.state.instances).toHaveLength(1);
    return mock.state.instances[0];
}

beforeEach(async () => {
    vi.resetModules();
    mock.state.instances = [];
    mock.state.supported = false;
    mock.setupCapture.mockReset().mockResolvedValue(mock.capture);
    mock.teardownCapture.mockReset();
    vi.stubGlobal("requestAnimationFrame", () => 0);
    (
        globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    onRecoverableError = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;

    React = await import("react");
    act = React.act;
    h = React.createElement;
    lib = await import("./react.js");
});

afterEach(async () => {
    const r = root;
    if (r) {
        await act(async () => r.unmount());
    }
    container.remove();
    vi.unstubAllGlobals();
});

describe("VFXCanvas hydration", () => {
    it("hydrates the div, then swaps to canvas when supported", async () => {
        mock.state.supported = true;
        const { renderToString } = await import("react-dom/server");
        expect(renderToString(app())).toMatch(/^<div/);

        await hydrate(app());
        expect(onRecoverableError).not.toHaveBeenCalled();
        const el = container.firstElementChild;
        expect(el?.tagName).toBe("CANVAS");
        const { add } = vfx();
        expect(add).toHaveBeenCalledTimes(1);
        expect(add.mock.calls[0]).toEqual([
            el,
            expect.anything(),
            mock.capture,
        ]);
    });

    it("stays a div when not supported", async () => {
        await hydrate(app());
        expect(onRecoverableError).not.toHaveBeenCalled();
        const el = container.firstElementChild;
        expect(el?.tagName).toBe("DIV");
        const { add } = vfx();
        expect(add).toHaveBeenCalledTimes(1);
        expect(add.mock.calls[0][0]).toBe(el);
    });
});

describe("VFXCanvas client render", () => {
    it("renders canvas at once when supported", async () => {
        mock.state.supported = true;
        await render(app());
        expect(container.firstElementChild?.tagName).toBe("CANVAS");
        expect(vfx().add).toHaveBeenCalledTimes(1);
    });

    it("tears down without adding when unmounted during capture setup", async () => {
        mock.state.supported = true;
        let resolve: (c: unknown) => void = () => {};
        mock.setupCapture.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            }),
        );
        await render(app());
        const instance = vfx();
        const r = root;
        root = null;
        await act(async () => r?.unmount());
        resolve(mock.capture);
        await flush();
        expect(mock.teardownCapture).toHaveBeenCalled();
        expect(instance.add).not.toHaveBeenCalled();
    });
});

describe("VFXCanvas ref", () => {
    it("ends as the canvas when supported", async () => {
        mock.state.supported = true;
        const ref = React.createRef<HTMLElement>();
        await hydrate(app(ref));
        expect(ref.current?.tagName).toBe("CANVAS");
    });

    it("ends as the div when not supported", async () => {
        const ref = React.createRef<HTMLElement>();
        await hydrate(app(ref));
        expect(ref.current?.tagName).toBe("DIV");
    });
});
