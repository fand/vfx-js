// @vitest-environment happy-dom
import type { VFXProps } from "@vfx-js/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    type App,
    createApp,
    defineComponent,
    h,
    nextTick,
    type PropType,
    ref,
    withDirectives,
} from "vue";
import { VFXCanvas } from "./canvas.js";
import { useVFXConfig } from "./config.js";
import { vVfx } from "./directive.js";
import { VFXTransition } from "./nuxt/index.js";
import type { VFXConfig } from "./vfx.js";

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

const ConfigOwner = defineComponent({
    props: { config: { type: Object as PropType<VFXConfig>, required: true } },
    setup(props, { slots }) {
        useVFXConfig(() => props.config);
        return () => slots.default?.();
    },
});

describe("useVFXConfig", () => {
    let container: HTMLElement;
    let app: App | null;
    const config = ref<VFXConfig>({});
    const showOwner = ref(true);
    const elementProps = ref<VFXProps>({ shader: "rgbShift" });

    // A layout with the config, an element, and optionally a transition.
    function mount(children: "element" | "transition" | "none" = "element") {
        app = createApp({
            render: () => {
                const element = withDirectives(h("h1", "hi"), [
                    [vVfx, elementProps.value],
                ]);
                const content =
                    children === "transition"
                        ? h(VFXTransition, null, { default: () => element })
                        : children === "element"
                          ? element
                          : null;
                return showOwner.value
                    ? h(ConfigOwner, { config: config.value }, () => content)
                    : content;
            },
        });
        app.mount(container);
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mock.instances.length = 0;
        mock.state.fail = false;
        mock.state.supported = false;
        config.value = {};
        showOwner.value = true;
        elementProps.value = { shader: "rgbShift" };
        container = document.createElement("div");
        document.body.appendChild(container);
        app = null;
    });
    afterEach(async () => {
        app?.unmount();
        container.remove();
        await flush();
        await frame();
    });

    it("makes one VFX with the config set by a parent", async () => {
        config.value = { pixelRatio: 1, zIndex: -1 };
        mount();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        expect(mock.init).toHaveBeenCalledWith({ pixelRatio: 1, zIndex: -1 });
        expect(mock.instances[0].add).toHaveBeenCalledTimes(1);
    });

    it("replaces the VFX on a change and re-adds the element", async () => {
        config.value = { pixelRatio: 1 };
        mount();
        await flush();
        const [first] = mock.instances;
        config.value = { pixelRatio: 2 };
        await nextTick();
        await flush();
        expect(first.remove).toHaveBeenCalledTimes(1);
        expect(first.destroy).toHaveBeenCalledTimes(1);
        expect(mock.init).toHaveBeenLastCalledWith({ pixelRatio: 2 });
        const second = mock.instances[1];
        expect(second.add).toHaveBeenCalledWith(container.querySelector("h1"), {
            shader: "rgbShift",
        });
    });

    it("re-adds the transition on the new VFX", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mount("transition");
        await flush();
        const [first] = mock.instances;
        const handle = first.addTransition.mock.results[0].value;
        config.value = { zIndex: 1 };
        await nextTick();
        await flush();
        expect(handle.destroy).toHaveBeenCalledTimes(1);
        expect(mock.instances[1].addTransition).toHaveBeenCalledTimes(1);
        expect(mock.instances[1].add).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("keeps the VFX for equal values", async () => {
        config.value = { pixelRatio: 1 };
        mount();
        await flush();
        config.value = { pixelRatio: 1 };
        await nextTick();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
    });

    it("compares postEffect by reference", async () => {
        const postEffect = { shader: "invert" };
        config.value = { postEffect };
        mount();
        await flush();
        config.value = { postEffect };
        await nextTick();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(1);
        config.value = { postEffect: { shader: "invert" } };
        await nextTick();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(2);
    });

    it("goes back to the defaults when the owner unmounts", async () => {
        config.value = { pixelRatio: 1 };
        mount();
        await flush();
        showOwner.value = false;
        await nextTick();
        await flush();
        expect(mock.init).toHaveBeenCalledTimes(2);
        expect(mock.init).toHaveBeenLastCalledWith({});
        expect(mock.instances[0].destroy).toHaveBeenCalledTimes(1);
    });

    it("lets the last owner win, and warns once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        app = createApp({
            render: () => [
                h(ConfigOwner, { config: { pixelRatio: 1 } }),
                h(ConfigOwner, { config: { pixelRatio: 2 } }),
                h(ConfigOwner, { config: { pixelRatio: 3 } }),
                withDirectives(h("h1", "hi"), [[vVfx, { shader: "x" }]]),
            ],
        });
        app.mount(container);
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
        config.value = { pixelRatio: 1 };
        mount("none");
        await flush();
        config.value = { pixelRatio: 2 };
        await nextTick();
        await flush();
        expect(mock.init).not.toHaveBeenCalled();
    });

    it("re-adds the latest element props", async () => {
        mount();
        await flush();
        elementProps.value = { shader: "glitch" };
        await nextTick();
        await flush();
        config.value = { pixelRatio: 2 };
        await nextTick();
        await flush();
        expect(mock.instances[1].add).toHaveBeenCalledWith(
            container.querySelector("h1"),
            { shader: "glitch" },
        );
    });

    it("re-adds a captured VFXCanvas with the latest capture", async () => {
        mock.state.supported = true;
        app = createApp({
            render: () =>
                h(ConfigOwner, { config: config.value }, () =>
                    h(VFXCanvas, { shader: "rgbShift" }, () => "hi"),
                ),
        });
        app.mount(container);
        await nextTick();
        await flush();
        const canvas = container.querySelector("canvas");
        const latest = { name: "latest capture" };
        mock.capture.onCapture?.(latest);
        expect(mock.instances[0].updateHICTexture).toHaveBeenCalledWith(
            canvas,
            latest,
        );
        config.value = { pixelRatio: 2 };
        await nextTick();
        await flush();
        expect(mock.setupCapture).toHaveBeenCalledTimes(1);
        expect(mock.instances[1].add).toHaveBeenCalledWith(
            canvas,
            { shader: "rgbShift" },
            latest,
        );
    });
});

describe("without WebGL", () => {
    it("attaches nothing and does not retry", async () => {
        // A fresh store, so the failure does not stick to other tests.
        vi.resetModules();
        const { bindElement } = await import("./element.js");
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
