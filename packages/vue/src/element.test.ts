// @vitest-environment happy-dom
import type { VFXProps } from "@vfx-js/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    type App,
    createApp,
    h,
    nextTick,
    type Ref,
    ref,
    withDirectives,
} from "vue";
import { vVfx } from "./directive.js";
import { bindElement, updateElement } from "./element.js";
import { VFXTransition } from "./nuxt/index.js";

const mock = vi.hoisted(() => {
    const calls: string[] = [];
    let addDelay: Promise<void> | null = null;
    const vfx = {
        add: vi.fn(async () => {
            calls.push("add");
            await addDelay;
        }),
        remove: vi.fn(() => {
            calls.push("remove");
        }),
        update: vi.fn(async () => {}),
        updateEffects: vi.fn(async () => {
            calls.push("updateEffects");
        }),
        updateHICTexture: vi.fn((_el: HTMLElement, _capture: unknown) => {
            calls.push("updateHICTexture");
        }),
        maxTextureSize: 4096,
        addTransition: vi.fn(() => ({ destroy: vi.fn() })),
        stop: vi.fn(),
        destroy: vi.fn(),
    };
    const init = vi.fn(() => vfx);
    // Fake html-in-canvas capture. `setupHold` keeps setup pending.
    const capture = {
        setupHold: null as Promise<void> | null,
        onCapture: null as ((capture: unknown) => void) | null,
    };
    const setupCapture = vi.fn(
        async (
            _canvas: HTMLCanvasElement,
            opts: { onCapture: (capture: unknown) => void },
        ) => {
            calls.push("setupCapture");
            capture.onCapture = opts.onCapture;
            await capture.setupHold;
            return { name: "first capture" };
        },
    );
    const teardownCapture = vi.fn((_canvas: HTMLCanvasElement) => {
        calls.push("teardownCapture");
    });
    return {
        calls,
        vfx,
        init,
        capture,
        setupCapture,
        teardownCapture,
        delayAdd(p: Promise<void> | null) {
            addDelay = p;
        },
    };
});

vi.mock("@vfx-js/core", () => ({
    VFX: { init: mock.init },
    setupCapture: mock.setupCapture,
    teardownCapture: mock.teardownCapture,
}));

// Run queued ops. happy-dom runs frames as immediates, so stay in microtasks.
async function flush() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}
const frame = () => new Promise((r) => requestAnimationFrame(r));

describe("vVfx", () => {
    let container: HTMLElement;
    let apps: App[];

    function mount(tag: string, props: Ref<VFXProps | null>, text = "hi") {
        const app = createApp({
            render: () => withDirectives(h(tag, text), [[vVfx, props.value]]),
        });
        const root = document.createElement("div");
        container.appendChild(root);
        app.mount(root);
        apps.push(app);
        return { app, el: root.firstElementChild as HTMLElement };
    }

    beforeEach(() => {
        mock.calls.length = 0;
        mock.delayAdd(null);
        vi.clearAllMocks();
        mock.capture.setupHold = null;
        container = document.createElement("div");
        document.body.appendChild(container);
        apps = [];
    });
    afterEach(async () => {
        for (const app of apps) {
            app.unmount();
        }
        container.remove();
        // Let the queued removes run, then the shared VFX go.
        await flush();
        await frame();
    });

    it("adds once on mount with the props", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const { el } = mount("h1", props);
        await flush();
        expect(mock.vfx.add).toHaveBeenCalledTimes(1);
        expect(mock.vfx.add).toHaveBeenCalledWith(el, { shader: "rgbShift" });
    });

    it("does nothing for an equal new object", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        mount("h1", props);
        await flush();
        props.value = { shader: "rgbShift" };
        await nextTick();
        await flush();
        expect(mock.calls).toEqual(["add"]);
    });

    it("uses updateEffects when only effect changes", async () => {
        const first = { render() {} };
        const second = { render() {} };
        const props = ref<VFXProps | null>({ effect: first });
        const { el } = mount("h1", props);
        await flush();
        props.value = { effect: second };
        await nextTick();
        await flush();
        expect(mock.calls).toEqual(["add", "updateEffects"]);
        expect(mock.vfx.updateEffects).toHaveBeenCalledWith(el, second);
    });

    it("removes then adds when another key changes", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const { el } = mount("h1", props);
        await flush();
        props.value = { shader: "glitch" };
        await nextTick();
        await flush();
        expect(mock.calls).toEqual(["add", "remove", "add"]);
        expect(mock.vfx.add).toHaveBeenLastCalledWith(el, { shader: "glitch" });
    });

    it("removes on null and adds back on props", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        mount("h1", props);
        await flush();
        props.value = null;
        await nextTick();
        await flush();
        expect(mock.calls).toEqual(["add", "remove"]);
        props.value = { shader: "glitch" };
        await nextTick();
        await flush();
        expect(mock.calls).toEqual(["add", "remove", "add"]);
    });

    it("does not add while null", async () => {
        const props = ref<VFXProps | null>(null);
        mount("h1", props);
        await flush();
        expect(mock.vfx.add).not.toHaveBeenCalled();
    });

    it("removes on unmount", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const { app, el } = mount("h1", props);
        await flush();
        app.unmount();
        apps = [];
        await flush();
        expect(mock.calls).toEqual(["add", "remove"]);
        expect(mock.vfx.remove).toHaveBeenCalledWith(el);
    });

    it("removes after a slow add when unmounted during it", async () => {
        let finish!: () => void;
        mock.delayAdd(
            new Promise((r) => {
                finish = r;
            }),
        );
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const { app } = mount("h1", props);
        await flush();
        app.unmount();
        apps = [];
        await flush();
        expect(mock.vfx.remove).not.toHaveBeenCalled();
        finish();
        await flush();
        expect(mock.calls).toEqual(["add", "remove"]);
    });

    it("updates on a text change in a heading", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const text = ref("hi");
        const app = createApp({
            render: () =>
                withDirectives(h("h1", text.value), [[vVfx, props.value]]),
        });
        app.mount(container);
        apps.push(app);
        await flush();
        text.value = "bye";
        await nextTick();
        await flush();
        expect(mock.vfx.update).toHaveBeenCalledWith(
            container.firstElementChild,
        );
    });

    it("does not observe an img", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const { el } = mount("img", props, "");
        await flush();
        el.setAttribute("alt", "cat");
        await flush();
        expect(mock.vfx.update).not.toHaveBeenCalled();
    });

    it("shares one VFX and destroys it a frame after the last one goes", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const first = mount("h1", props);
        const second = mount("p", props);
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.vfx.add).toHaveBeenCalledTimes(2);
        first.app.unmount();
        second.app.unmount();
        apps = [];
        await flush();
        expect(mock.vfx.destroy).not.toHaveBeenCalled();
        await frame();
        expect(mock.vfx.destroy).toHaveBeenCalledTimes(1);
    });

    it("shares the VFX with <VFXTransition>", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const app = createApp({
            render: () =>
                h(VFXTransition, null, {
                    default: () =>
                        withDirectives(h("h1", "hi"), [[vVfx, props.value]]),
                }),
        });
        app.mount(container);
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.vfx.addTransition).toHaveBeenCalledTimes(1);
        expect(mock.vfx.add).toHaveBeenCalledTimes(1);
        app.unmount();
        await flush();
        expect(mock.vfx.remove).toHaveBeenCalledTimes(1);
        expect(mock.vfx.destroy).not.toHaveBeenCalled();
        await frame();
        expect(mock.vfx.destroy).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("updateElement calls update", async () => {
        const props = ref<VFXProps | null>({ shader: "rgbShift" });
        const { el } = mount("input", props, "");
        await flush();
        await updateElement(el);
        expect(mock.vfx.update).toHaveBeenCalledWith(el);
    });

    it("updateElement does nothing without a VFX", async () => {
        await updateElement(document.createElement("div"));
        expect(mock.vfx.update).not.toHaveBeenCalled();
    });
});

describe("bindElement with capture", () => {
    let canvas: HTMLCanvasElement;

    function bind(props: VFXProps) {
        const controller = bindElement(canvas, { capture: true });
        controller.update(props);
        return controller;
    }

    beforeEach(() => {
        mock.calls.length = 0;
        mock.delayAdd(null);
        vi.clearAllMocks();
        mock.capture.setupHold = null;
        canvas = document.createElement("canvas");
        canvas.appendChild(document.createElement("div"));
        document.body.appendChild(canvas);
    });
    afterEach(async () => {
        canvas.remove();
        await flush();
        await frame();
    });

    it("sets up the capture, then adds with it", async () => {
        const controller = bind({ shader: "rgbShift" });
        await flush();
        expect(mock.calls).toEqual(["setupCapture", "add"]);
        expect(mock.setupCapture).toHaveBeenCalledWith(canvas, {
            onCapture: expect.any(Function),
            maxSize: 4096,
        });
        expect(mock.vfx.add).toHaveBeenCalledWith(
            canvas,
            { shader: "rgbShift" },
            { name: "first capture" },
        );
        controller.destroy();
    });

    it("sends each new capture to the texture", async () => {
        const controller = bind({ shader: "rgbShift" });
        await flush();
        const next = { name: "next capture" };
        mock.capture.onCapture?.(next);
        expect(mock.vfx.updateHICTexture).toHaveBeenCalledWith(canvas, next);
        controller.destroy();
    });

    it("re-adds with the latest capture when another key changes", async () => {
        const controller = bind({ shader: "rgbShift" });
        await flush();
        const latest = { name: "latest capture" };
        mock.capture.onCapture?.(latest);
        controller.update({ shader: "glitch" });
        await flush();
        expect(mock.calls).toEqual([
            "setupCapture",
            "add",
            "updateHICTexture",
            "remove",
            "add",
        ]);
        expect(mock.vfx.add).toHaveBeenLastCalledWith(
            canvas,
            { shader: "glitch" },
            latest,
        );
        expect(mock.setupCapture).toHaveBeenCalledTimes(1);
        controller.destroy();
    });

    it("uses updateEffects when only effect changes", async () => {
        const first = { render() {} };
        const second = { render() {} };
        const controller = bind({ effect: first });
        await flush();
        controller.update({ effect: second });
        await flush();
        expect(mock.calls).toEqual(["setupCapture", "add", "updateEffects"]);
        controller.destroy();
    });

    it("tears down the capture, then removes", async () => {
        const controller = bind({ shader: "rgbShift" });
        await flush();
        controller.destroy();
        await flush();
        expect(mock.calls).toEqual([
            "setupCapture",
            "add",
            "teardownCapture",
            "remove",
        ]);
    });

    it("tears down after a pending setup and never adds", async () => {
        let finish!: () => void;
        mock.capture.setupHold = new Promise((r) => {
            finish = r;
        });
        const controller = bind({ shader: "rgbShift" });
        await flush();
        controller.destroy();
        await flush();
        expect(mock.teardownCapture).not.toHaveBeenCalled();
        finish();
        await flush();
        expect(mock.calls).toEqual(["setupCapture", "teardownCapture"]);
        expect(mock.vfx.add).not.toHaveBeenCalled();
    });

    it("does not observe the canvas", async () => {
        const controller = bind({ shader: "rgbShift" });
        await flush();
        canvas.firstElementChild?.append("text");
        await flush();
        expect(mock.vfx.update).not.toHaveBeenCalled();
        controller.destroy();
    });
});
