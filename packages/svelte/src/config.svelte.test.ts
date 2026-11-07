import type { VFXProps } from "@vfx-js/core";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VFXConfig } from "./lib/vfx.js";
import ConfigHarness from "./test/ConfigHarness.svelte";
import InstanceHarness from "./test/InstanceHarness.svelte";
import ThreeOwners from "./test/ThreeOwners.svelte";

const mock = vi.hoisted(() => {
    type Fake = ReturnType<typeof makeVFX>;
    const instances: Fake[] = [];
    const state = { fail: false, supported: false };
    const capture = {
        onCapture: null as ((capture: unknown) => void) | null,
    };
    function makeVFX(opts: object) {
        return {
            opts,
            add: vi.fn(async (..._args: unknown[]) => {}),
            remove: vi.fn((_el: HTMLElement) => {}),
            update: vi.fn(async (_el: HTMLElement) => {}),
            updateEffects: vi.fn(async () => {}),
            updateHICTexture: vi.fn(),
            maxTextureSize: 4096,
            addTransition: vi.fn(() => ({
                run: vi.fn(),
                cancel: vi.fn(),
                destroy: vi.fn(),
                running: false,
            })),
            stop: vi.fn(),
            destroy: vi.fn(),
        };
    }
    const init = vi.fn((opts: object) => {
        if (state.fail) {
            return null;
        }
        const vfx = makeVFX(opts);
        instances.push(vfx);
        return vfx;
    });
    return {
        instances,
        state,
        capture,
        init,
        supportsHtmlInCanvas: vi.fn(() => state.supported),
        setupCapture: vi.fn(
            async (
                _canvas: HTMLCanvasElement,
                opts: { onCapture: (capture: unknown) => void },
            ) => {
                capture.onCapture = opts.onCapture;
                return { name: "first capture" };
            },
        ),
        teardownCapture: vi.fn(),
    };
});

vi.mock("@vfx-js/core", () => ({
    VFX: { init: mock.init },
    supportsHtmlInCanvas: mock.supportsHtmlInCanvas,
    setupCapture: mock.setupCapture,
    teardownCapture: mock.teardownCapture,
}));

// Run queued ops and a pending replace.
async function flush() {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}
const frame = () => new Promise((r) => requestAnimationFrame(r));

type HarnessProps = {
    config: VFXConfig;
    showOwner: boolean;
    elementProps: VFXProps;
    content: "element" | "transition" | "canvas" | "none";
};

describe("vfxConfig", () => {
    let container: HTMLElement;
    let app: Record<string, unknown> | null;
    let state: HarnessProps;

    async function render(
        config: VFXConfig,
        content: HarnessProps["content"] = "element",
    ) {
        const initial = $state<HarnessProps>({
            config,
            showOwner: true,
            elementProps: { shader: "rgbShift" },
            content,
        });
        state = initial;
        app = mount(ConfigHarness, { target: container, props: state });
        flushSync();
        await flush();
        flushSync();
        await flush();
    }

    async function change(fn: () => void) {
        fn();
        flushSync();
        await flush();
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mock.instances.length = 0;
        mock.state.fail = false;
        mock.state.supported = false;
        container = document.createElement("div");
        document.body.appendChild(container);
        app = null;
    });
    afterEach(async () => {
        if (app) {
            unmount(app);
        }
        container.remove();
        await flush();
        await frame();
    });

    it("makes one VFX with the config set by a parent", async () => {
        await render({ pixelRatio: 1, zIndex: -1 });
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.init).toHaveBeenCalledWith({ pixelRatio: 1, zIndex: -1 });
        expect(mock.instances[0].add).toHaveBeenCalledTimes(1);
    });

    it("replaces the VFX on a change and re-adds the element", async () => {
        await render({ pixelRatio: 1 });
        const [first] = mock.instances;
        await change(() => {
            state.config = { pixelRatio: 2 };
        });
        expect(first.remove).toHaveBeenCalledTimes(1);
        expect(first.destroy).toHaveBeenCalledTimes(1);
        expect(mock.init).toHaveBeenLastCalledWith({ pixelRatio: 2 });
        expect(mock.instances[1].add).toHaveBeenCalledWith(
            container.querySelector("h1"),
            { shader: "rgbShift" },
        );
    });

    it("re-adds the transition on the new VFX", async () => {
        await render({}, "transition");
        const [first] = mock.instances;
        const handle = first.addTransition.mock.results[0].value;
        await change(() => {
            state.config = { zIndex: 1 };
        });
        expect(handle.destroy).toHaveBeenCalledTimes(1);
        expect(mock.instances[1].addTransition).toHaveBeenCalledTimes(1);
        expect(mock.instances[1].add).toHaveBeenCalledTimes(1);
    });

    it("keeps the VFX for equal values", async () => {
        await render({ pixelRatio: 1 });
        await change(() => {
            state.config = { pixelRatio: 1 };
        });
        expect(mock.init).toHaveBeenCalledTimes(1);
    });

    it("compares postEffect by reference", async () => {
        // A class instance, so the test's $state does not proxy it.
        class Invert {
            shader = "invert";
        }
        const postEffect = new Invert();
        await render({ postEffect });
        await change(() => {
            state.config = { postEffect };
        });
        expect(mock.init).toHaveBeenCalledTimes(1);
        await change(() => {
            state.config = { postEffect: new Invert() };
        });
        expect(mock.init).toHaveBeenCalledTimes(2);
    });

    it("goes back to the defaults when the owner is destroyed", async () => {
        await render({ pixelRatio: 1 });
        await change(() => {
            state.showOwner = false;
        });
        expect(mock.init).toHaveBeenCalledTimes(2);
        expect(mock.init).toHaveBeenLastCalledWith({});
        expect(mock.instances[0].destroy).toHaveBeenCalledTimes(1);
    });

    it("lets the last owner win, and warns once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        app = mount(ThreeOwners, { target: container });
        flushSync();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.init).toHaveBeenCalledWith({ pixelRatio: 3 });
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("The last one mounted wins"),
        );
        warn.mockRestore();
    });

    it("makes no VFX without consumers", async () => {
        await render({ pixelRatio: 1 }, "none");
        await change(() => {
            state.config = { pixelRatio: 2 };
        });
        expect(mock.init).not.toHaveBeenCalled();
    });

    it("re-adds the latest element props", async () => {
        await render({});
        await change(() => {
            state.elementProps = { shader: "glitch" };
        });
        await change(() => {
            state.config = { pixelRatio: 2 };
        });
        expect(mock.instances[1].add).toHaveBeenCalledWith(
            container.querySelector("h1"),
            { shader: "glitch" },
        );
    });

    it("re-adds a captured VFXCanvas with the latest capture", async () => {
        mock.state.supported = true;
        await render({}, "canvas");
        const canvas = container.querySelector("canvas");
        const latest = { name: "latest capture" };
        mock.capture.onCapture?.(latest);
        expect(mock.instances[0].updateHICTexture).toHaveBeenCalledWith(
            canvas,
            latest,
        );
        await change(() => {
            state.config = { pixelRatio: 2 };
        });
        expect(mock.setupCapture).toHaveBeenCalledTimes(1);
        expect(mock.instances[1].add).toHaveBeenCalledWith(
            canvas,
            { shader: "rgbShift" },
            latest,
        );
    });
});

describe("vfxInstance", () => {
    let container: HTMLElement;
    let app: Record<string, unknown> | null;
    let state: { config: VFXConfig; showElement: boolean };
    let read: () => unknown = () => undefined;

    async function change(fn: () => void) {
        fn();
        flushSync();
        await flush();
    }

    beforeEach(async () => {
        vi.clearAllMocks();
        mock.instances.length = 0;
        mock.state.fail = false;
        container = document.createElement("div");
        document.body.appendChild(container);
        const initial = $state({
            config: {} as VFXConfig,
            showElement: false,
            onRead: (fn: () => unknown) => {
                read = fn;
            },
        });
        state = initial;
        app = mount(InstanceHarness, { target: container, props: initial });
        flushSync();
        await flush();
    });
    afterEach(async () => {
        if (app) {
            unmount(app);
        }
        container.remove();
        await flush();
        await frame();
    });

    it("is null without consumers, and reading makes no VFX", () => {
        expect(read()).toBeNull();
        expect(mock.init).not.toHaveBeenCalled();
    });

    it("is the VFX once a consumer attaches", async () => {
        await change(() => {
            state.showElement = true;
        });
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(read()).toBe(mock.instances[0]);
    });

    it("follows a config replace", async () => {
        await change(() => {
            state.showElement = true;
        });
        await change(() => {
            state.config = { pixelRatio: 2 };
        });
        expect(mock.instances).toHaveLength(2);
        expect(read()).toBe(mock.instances[1]);
    });

    it("is null a frame after the last consumer goes", async () => {
        await change(() => {
            state.showElement = true;
        });
        await change(() => {
            state.showElement = false;
        });
        expect(read()).toBe(mock.instances[0]);
        await frame();
        expect(read()).toBeNull();
        expect(mock.init).toHaveBeenCalledTimes(1);
    });
});

describe("without WebGL", () => {
    it("attaches nothing and does not retry", async () => {
        // A fresh store, so the failure does not stick to other tests.
        vi.resetModules();
        const { bindElement } = await import("./lib/element.js");
        vi.clearAllMocks();
        mock.instances.length = 0;
        mock.state.fail = true;
        const first = bindElement(document.createElement("h1"));
        first.update({ shader: "rgbShift" });
        const second = bindElement(document.createElement("h1"));
        second.update({ shader: "rgbShift" });
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        first.destroy();
        second.destroy();
        await flush();
    });
});
