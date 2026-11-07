import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CanvasHarness from "./test/CanvasHarness.svelte";

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

// Svelte leaves hydration comments in the DOM.
const html = (el: Element) => el.innerHTML.replace(/<!--.*?-->/g, "");

// Run queued ops. happy-dom runs frames as immediates, so stay in microtasks.
async function flush() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

type HarnessProps = {
    props: Record<string, unknown>;
    text: string;
    onElement?: (el: HTMLElement | null) => void;
};

describe("VFXCanvas", () => {
    let container: HTMLElement;
    let app: Record<string, unknown> | null;
    let state: HarnessProps;

    async function render(
        props: Record<string, unknown>,
        onElement?: HarnessProps["onElement"],
    ) {
        const initial = $state({ props, text: "hi", onElement });
        state = initial;
        app = mount(CanvasHarness, { target: container, props: state });
        flushSync();
        await flush();
        flushSync();
        await flush();
        return container.firstElementChild as HTMLElement;
    }

    async function update(change: () => void) {
        change();
        flushSync();
        await flush();
    }

    async function destroy() {
        if (app) {
            unmount(app);
            app = null;
        }
        await flush();
    }

    beforeEach(() => {
        mock.calls.length = 0;
        vi.clearAllMocks();
        mock.supported.value = true;
        mock.capture.setupHold = null;
        container = document.createElement("div");
        document.body.appendChild(container);
        app = null;
    });
    afterEach(async () => {
        await destroy();
        container.remove();
        // Let the shared VFX go, so each test starts without one.
        await new Promise((r) => requestAnimationFrame(r));
    });

    describe("supported", () => {
        it("renders the canvas with a drawable child", async () => {
            const root = await render({ shader: "rgbShift" });
            expect(root.tagName).toBe("CANVAS");
            expect(root.getAttribute("layoutsubtree")).toBe("");
            expect(root.getAttribute("content")).toBe("drawable");
            const child = root.firstElementChild as HTMLElement;
            expect(child.tagName).toBe("DIV");
            expect(child.getAttribute("drawable")).toBe("");
            expect(html(child)).toBe("<h2>hi</h2>");
        });

        it("sets up the capture, then adds the canvas with it", async () => {
            const root = await render({ shader: "rgbShift" });
            expect(mock.calls).toEqual(["setupCapture", "add"]);
            expect(mock.vfx.add).toHaveBeenCalledWith(
                root,
                { shader: "rgbShift" },
                { name: "first capture" },
            );
        });

        it("sends each new capture to the texture", async () => {
            const root = await render({ shader: "rgbShift" });
            const next = { name: "next capture" };
            mock.capture.onCapture?.(next);
            expect(mock.vfx.updateHICTexture).toHaveBeenCalledWith(root, next);
        });

        it("re-adds with the latest capture when another key changes", async () => {
            const root = await render({ shader: "rgbShift" });
            const latest = { name: "latest capture" };
            mock.capture.onCapture?.(latest);
            await update(() => {
                state.props = { shader: "glitch" };
            });
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
            await render({ effect: { render() {} } });
            await update(() => {
                state.props = { effect: { render() {} } };
            });
            expect(mock.calls).toEqual([
                "setupCapture",
                "add",
                "updateEffects",
            ]);
        });

        it("does nothing on a text change", async () => {
            await render({ shader: "rgbShift" });
            await update(() => {
                state.text = "bye";
            });
            expect(mock.calls).toEqual(["setupCapture", "add"]);
            expect(mock.vfx.update).not.toHaveBeenCalled();
        });

        it("tears down the capture, then removes on unmount", async () => {
            await render({ shader: "rgbShift" });
            await destroy();
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
            await render({ shader: "rgbShift" });
            await destroy();
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
            const root = await render({ shader: "rgbShift" });
            expect(root.tagName).toBe("DIV");
            expect(html(root)).toBe("<h2>hi</h2>");
            expect(mock.vfx.add).toHaveBeenCalledWith(root, {
                shader: "rgbShift",
            });
            expect(mock.vfx.add).toHaveBeenCalledTimes(1);
            expect(mock.init).toHaveBeenCalledTimes(1);
            expect(mock.setupCapture).not.toHaveBeenCalled();
        });

        it("updates on a text change", async () => {
            const root = await render({ shader: "rgbShift" });
            await update(() => {
                state.text = "bye";
            });
            expect(mock.vfx.update).toHaveBeenCalledWith(root);
        });
    });

    it("puts attrs on the root element", async () => {
        for (const supported of [true, false]) {
            mock.supported.value = supported;
            const root = await render({
                shader: "rgbShift",
                class: "card",
                style: "color: red",
                "data-x": "1",
            });
            expect(root.className).toBe("card");
            expect(root.style.color).toBe("red");
            expect(root.dataset.x).toBe("1");
            await destroy();
        }
    });

    describe("element", () => {
        const record = (seen: (string | null)[]) => (el: HTMLElement | null) =>
            seen.push(el?.tagName ?? null);

        it("is the canvas only, never the div", async () => {
            const seen: (string | null)[] = [];
            const root = await render({ shader: "rgbShift" }, record(seen));
            expect(seen).toEqual(["CANVAS"]);
            expect(root.tagName).toBe("CANVAS");
        });

        it("is the div when not supported", async () => {
            mock.supported.value = false;
            const seen: (string | null)[] = [];
            await render({ shader: "rgbShift" }, record(seen));
            expect(seen).toEqual(["DIV"]);
        });

        it("is null after unmount", async () => {
            const seen: (string | null)[] = [];
            await render({ shader: "rgbShift" }, record(seen));
            await destroy();
            expect(seen).toEqual(["CANVAS", null]);
        });
    });
});
