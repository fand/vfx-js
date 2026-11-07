import type { VFXProps } from "@vfx-js/core";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindElement, updateElement } from "./lib/element.js";
import Element from "./test/Element.svelte";
import ElementPage from "./test/ElementPage.svelte";
import Harness from "./test/Harness.svelte";
import Image from "./test/Image.svelte";

const mock = vi.hoisted(() => {
    const calls: string[] = [];
    let addDelay: Promise<void> | null = null;
    const vfx = {
        add: vi.fn(async (_el: HTMLElement, _props: object) => {
            calls.push("add");
            await addDelay;
        }),
        remove: vi.fn((_el: HTMLElement) => {
            calls.push("remove");
        }),
        update: vi.fn(async (_el: HTMLElement) => {}),
        updateEffects: vi.fn(async (_el: HTMLElement, _effect: object) => {
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

type ElementProps = { value: VFXProps | null; text?: string; getter?: boolean };

describe("vfx", () => {
    let container: HTMLElement;
    let apps: Record<string, unknown>[];

    function render(initial: ElementProps) {
        const props = $state(initial);
        const app = mount(Element, { target: container, props });
        apps.push(app);
        flushSync();
        return {
            props,
            app,
            el: container.lastElementChild as HTMLElement,
        };
    }

    function unmountAll() {
        for (const app of apps) {
            unmount(app);
        }
        apps = [];
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
        unmountAll();
        container.remove();
        // Let the queued removes run, then the shared VFX go.
        await flush();
        await frame();
    });

    for (const getter of [false, true]) {
        describe(getter ? "getter" : "plain object", () => {
            it("adds once on mount with the props", async () => {
                const { el } = render({
                    value: { shader: "rgbShift" },
                    getter,
                });
                await flush();
                expect(mock.calls).toEqual(["add"]);
                expect(mock.vfx.add).toHaveBeenCalledWith(el, {
                    shader: "rgbShift",
                });
            });

            it("removes then adds when another key changes", async () => {
                const { props, el } = render({
                    value: { shader: "rgbShift" },
                    getter,
                });
                await flush();
                props.value = { shader: "glitch" };
                flushSync();
                await flush();
                expect(mock.calls).toEqual(["add", "remove", "add"]);
                expect(mock.vfx.add).toHaveBeenLastCalledWith(el, {
                    shader: "glitch",
                });
            });

            it("removes on null and adds back on props", async () => {
                const { props } = render({
                    value: { shader: "rgbShift" },
                    getter,
                });
                await flush();
                props.value = null;
                flushSync();
                await flush();
                expect(mock.calls).toEqual(["add", "remove"]);
                props.value = { shader: "glitch" };
                flushSync();
                await flush();
                expect(mock.calls).toEqual(["add", "remove", "add"]);
            });

            it("removes on unmount", async () => {
                const { el } = render({
                    value: { shader: "rgbShift" },
                    getter,
                });
                await flush();
                unmountAll();
                await flush();
                expect(mock.calls).toEqual(["add", "remove"]);
                expect(mock.vfx.remove).toHaveBeenCalledWith(el);
            });
        });
    }

    it("getter: does nothing for an equal new object", async () => {
        const { props } = render({
            value: { shader: "rgbShift" },
            getter: true,
        });
        await flush();
        props.value = { shader: "rgbShift" };
        flushSync();
        await flush();
        expect(mock.calls).toEqual(["add"]);
    });

    it("getter: uses updateEffects when only effect changes", async () => {
        const first = { render() {} };
        const second = { render() {} };
        const { props, el } = render({
            value: { effect: first },
            getter: true,
        });
        await flush();
        props.value = { effect: second };
        flushSync();
        await flush();
        expect(mock.calls).toEqual(["add", "updateEffects"]);
        expect(mock.vfx.updateEffects).toHaveBeenCalledWith(el, second);
    });

    it("plain object: re-runs the attachment on a change", async () => {
        const first = { render() {} };
        const second = { render() {} };
        const { props } = render({ value: { effect: first } });
        await flush();
        props.value = { effect: second };
        flushSync();
        await flush();
        expect(mock.calls).toEqual(["add", "remove", "add"]);
    });

    it("removes after a slow add when unmounted during it", async () => {
        let finish!: () => void;
        mock.delayAdd(
            new Promise((r) => {
                finish = r;
            }),
        );
        render({ value: { shader: "rgbShift" } });
        await flush();
        unmountAll();
        await flush();
        expect(mock.vfx.remove).not.toHaveBeenCalled();
        finish();
        await flush();
        expect(mock.calls).toEqual(["add", "remove"]);
    });

    it("updates on a text change in a heading", async () => {
        const { props, el } = render({ value: { shader: "rgbShift" } });
        await flush();
        props.text = "bye";
        flushSync();
        await flush();
        expect(mock.vfx.update).toHaveBeenCalledWith(el);
    });

    it("does not observe an img", async () => {
        apps.push(mount(Image, { target: container }));
        flushSync();
        await flush();
        container.querySelector("img")?.setAttribute("alt", "cat");
        await flush();
        expect(mock.vfx.add).toHaveBeenCalledTimes(1);
        expect(mock.vfx.update).not.toHaveBeenCalled();
    });

    it("shares one VFX and destroys it a frame after the last one goes", async () => {
        render({ value: { shader: "rgbShift" } });
        render({ value: { shader: "glitch" } });
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.vfx.add).toHaveBeenCalledTimes(2);
        unmountAll();
        await flush();
        expect(mock.vfx.destroy).not.toHaveBeenCalled();
        await frame();
        expect(mock.vfx.destroy).toHaveBeenCalledTimes(1);
    });

    it("shares the VFX with <VFXTransition>", async () => {
        apps.push(
            mount(Harness, { target: container, props: { page: ElementPage } }),
        );
        flushSync();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.vfx.addTransition).toHaveBeenCalledTimes(1);
        expect(mock.vfx.add).toHaveBeenCalledTimes(1);
        unmountAll();
        await flush();
        expect(mock.vfx.remove).toHaveBeenCalledTimes(1);
        expect(mock.vfx.destroy).not.toHaveBeenCalled();
        await frame();
        expect(mock.vfx.destroy).toHaveBeenCalledTimes(1);
    });

    it("updateElement calls update", async () => {
        const { el } = render({ value: { shader: "rgbShift" } });
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
