import type { VFXProps } from "@vfx-js/core";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateElement } from "./lib/element.js";
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
        addTransition: vi.fn(() => ({ destroy: vi.fn() })),
        stop: vi.fn(),
        destroy: vi.fn(),
    };
    const init = vi.fn(() => vfx);
    return {
        calls,
        vfx,
        init,
        delayAdd(p: Promise<void> | null) {
            addDelay = p;
        },
    };
});

vi.mock("@vfx-js/core", () => ({ VFX: { init: mock.init } }));

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
        for (const fn of Object.values(mock.vfx)) {
            fn.mockClear();
        }
        mock.init.mockClear();
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
