// @vitest-environment happy-dom
import type { VFXProps } from "@vfx-js/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { VFXCanvas } from "./canvas.js";

const mock = vi.hoisted(() => {
    const calls: string[] = [];
    const vfx = {
        add: vi.fn(async (..._args: unknown[]) => {
            calls.push("add");
        }),
        remove: vi.fn((_el: HTMLElement) => {
            calls.push("remove");
        }),
        update: vi.fn(async (_el: HTMLElement) => {}),
        updateEffects: vi.fn(async (_el: HTMLElement, _effect: unknown) => {
            calls.push("updateEffects");
        }),
        updateHICTexture: vi.fn((_el: HTMLElement, _capture: unknown) => {
            calls.push("updateHICTexture");
        }),
        maxTextureSize: 4096,
        stop: vi.fn(),
        destroy: vi.fn(),
    };
    const init = vi.fn(() => vfx);
    const supported = { value: true };
    // Fake html-in-canvas capture. `setupHold` keeps setup pending.
    const capture = {
        setupHold: null as Promise<void> | null,
        onCapture: null as ((capture: unknown) => void) | null,
    };
    return {
        calls,
        vfx,
        init,
        supported,
        capture,
        supportsHtmlInCanvas: vi.fn(() => supported.value),
        setupCapture: vi.fn(
            async (
                _canvas: HTMLCanvasElement,
                opts: { onCapture: (capture: unknown) => void },
            ) => {
                calls.push("setupCapture");
                capture.onCapture = opts.onCapture;
                await capture.setupHold;
                return { name: "first capture" };
            },
        ),
        teardownCapture: vi.fn((_canvas: HTMLCanvasElement) => {
            calls.push("teardownCapture");
        }),
    };
});

vi.mock("@vfx-js/core", () => ({
    VFX: { init: mock.init },
    supportsHtmlInCanvas: mock.supportsHtmlInCanvas,
    setupCapture: mock.setupCapture,
    teardownCapture: mock.teardownCapture,
}));

// Run queued ops. happy-dom runs frames as immediates, so stay in microtasks.
async function flush() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

describe("VFXCanvas", () => {
    let container: HTMLElement;
    let app: App | null;
    const props = ref<VFXProps & Record<string, unknown>>({});
    const text = ref("hi");

    async function mount(initial: VFXProps & Record<string, unknown>) {
        props.value = initial;
        app = createApp({
            render: () =>
                h(VFXCanvas, props.value, {
                    default: () => [h("h2", text.value)],
                }),
        });
        app.mount(container);
        await nextTick();
        await flush();
        return container.firstElementChild as HTMLElement;
    }

    async function unmount() {
        app?.unmount();
        app = null;
        await flush();
    }

    beforeEach(() => {
        mock.calls.length = 0;
        vi.clearAllMocks();
        mock.supported.value = true;
        mock.capture.setupHold = null;
        props.value = {};
        text.value = "hi";
        container = document.createElement("div");
        document.body.appendChild(container);
        app = null;
    });
    afterEach(async () => {
        await unmount();
        container.remove();
        // Let the shared VFX go, so each test starts without one.
        await new Promise((r) => requestAnimationFrame(r));
    });

    describe("supported", () => {
        it("renders the canvas with a drawable child", async () => {
            const root = await mount({ shader: "rgbShift" });
            expect(root.tagName).toBe("CANVAS");
            expect(root.getAttribute("layoutsubtree")).toBe("");
            expect(root.getAttribute("content")).toBe("drawable");
            const child = root.firstElementChild as HTMLElement;
            expect(child.tagName).toBe("DIV");
            expect(child.getAttribute("drawable")).toBe("");
            expect(child.innerHTML).toBe("<h2>hi</h2>");
        });

        it("sets up the capture, then adds the canvas with it", async () => {
            const root = await mount({ shader: "rgbShift" });
            expect(mock.calls).toEqual(["setupCapture", "add"]);
            expect(mock.vfx.add).toHaveBeenCalledWith(
                root,
                { shader: "rgbShift" },
                { name: "first capture" },
            );
        });

        it("sends each new capture to the texture", async () => {
            const root = await mount({ shader: "rgbShift" });
            const next = { name: "next capture" };
            mock.capture.onCapture?.(next);
            expect(mock.vfx.updateHICTexture).toHaveBeenCalledWith(root, next);
        });

        it("re-adds with the latest capture when another key changes", async () => {
            const root = await mount({ shader: "rgbShift" });
            const latest = { name: "latest capture" };
            mock.capture.onCapture?.(latest);
            props.value = { shader: "glitch" };
            await nextTick();
            await flush();
            expect(mock.calls).toEqual([
                "setupCapture",
                "add",
                "updateHICTexture",
                "remove",
                "add",
            ]);
            expect(mock.vfx.add).toHaveBeenLastCalledWith(
                root,
                { shader: "glitch" },
                latest,
            );
        });

        it("uses updateEffects when only effect changes", async () => {
            await mount({ effect: { render() {} } });
            props.value = { effect: { render() {} } };
            await nextTick();
            await flush();
            expect(mock.calls).toEqual([
                "setupCapture",
                "add",
                "updateEffects",
            ]);
        });

        it("does nothing on a re-render with the same props", async () => {
            await mount({ shader: "rgbShift" });
            text.value = "bye";
            await nextTick();
            await flush();
            expect(mock.calls).toEqual(["setupCapture", "add"]);
            expect(mock.vfx.update).not.toHaveBeenCalled();
        });

        it("tears down the capture, then removes on unmount", async () => {
            await mount({ shader: "rgbShift" });
            await unmount();
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
            await mount({ shader: "rgbShift" });
            await unmount();
            expect(mock.teardownCapture).not.toHaveBeenCalled();
            finish();
            await flush();
            expect(mock.calls).toEqual(["setupCapture", "teardownCapture"]);
            expect(mock.vfx.add).not.toHaveBeenCalled();
        });
    });

    describe("not supported", () => {
        beforeEach(() => {
            mock.supported.value = false;
        });

        it("renders the div and adds it without a capture", async () => {
            const root = await mount({ shader: "rgbShift" });
            expect(root.tagName).toBe("DIV");
            expect(root.innerHTML).toBe("<h2>hi</h2>");
            expect(mock.vfx.add).toHaveBeenCalledWith(root, {
                shader: "rgbShift",
            });
            expect(mock.setupCapture).not.toHaveBeenCalled();
        });

        it("updates on a text change", async () => {
            const root = await mount({ shader: "rgbShift" });
            text.value = "bye";
            await nextTick();
            await flush();
            expect(mock.vfx.update).toHaveBeenCalledWith(root);
        });
    });

    it("puts attrs on the root element", async () => {
        for (const supported of [true, false]) {
            mock.supported.value = supported;
            const root = await mount({
                shader: "rgbShift",
                class: "card",
                style: "color: red",
                "data-x": "1",
            });
            expect(root.className).toBe("card");
            expect(root.style.color).toBe("red");
            expect(root.dataset.x).toBe("1");
            await unmount();
        }
    });

    it("exposes the div first, then the canvas", async () => {
        const canvasRef = ref<{ el: HTMLElement | null } | null>(null);
        app = createApp({
            render: () =>
                h(
                    VFXCanvas,
                    { ref: canvasRef, shader: "rgbShift" },
                    { default: () => "hi" },
                ),
        });
        app.mount(container);
        expect(canvasRef.value?.el?.tagName).toBe("DIV");
        await nextTick();
        expect(canvasRef.value?.el?.tagName).toBe("CANVAS");
        expect(canvasRef.value?.el).toBe(container.firstElementChild);
    });

    it("renders the div on the server, with no core calls", async () => {
        const html = await renderToString(
            createSSRApp({
                render: () =>
                    h(
                        VFXCanvas,
                        { shader: "rgbShift", class: "card" },
                        { default: () => [h("h2", "hi")] },
                    ),
            }),
        );
        expect(html).toBe('<div class="card"><h2>hi</h2></div>');
        expect(mock.init).not.toHaveBeenCalled();
        expect(mock.supportsHtmlInCanvas).not.toHaveBeenCalled();
    });
});
