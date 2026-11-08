// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { install, uninstall } from "./elements";
import { registerVFX, resetRegistry } from "./registry";

const mock = vi.hoisted(() => {
    const calls: string[] = [];
    const vfx = {
        add: vi.fn(async (_el: HTMLElement, _props: unknown) => {
            calls.push("add");
        }),
        remove: vi.fn((_el: HTMLElement) => {
            calls.push("remove");
        }),
        update: vi.fn(async (_el: HTMLElement) => {
            calls.push("update");
        }),
    };
    const init = vi.fn(() => vfx);
    return { calls, vfx, init };
});

vi.mock("@vfx-js/core", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    VFX: { init: mock.init },
}));

// Let the observer and the op queue run.
async function flush() {
    await new Promise((r) => setTimeout(r));
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

function span(attr: string | null, text = "hi"): HTMLElement {
    const el = document.createElement("span");
    el.textContent = text;
    if (attr !== null) {
        el.setAttribute("data-vfx", attr);
    }
    return el;
}

describe("element runtime", () => {
    beforeEach(() => {
        mock.calls.length = 0;
        vi.clearAllMocks();
        document.body.innerHTML = "";
    });
    afterEach(async () => {
        uninstall();
        resetRegistry();
        await flush();
        vi.restoreAllMocks();
    });

    it("adds elements already in the page on install", async () => {
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el);
        install();
        await flush();
        expect(mock.vfx.add).toHaveBeenCalledWith(el, { shader: "rgbShift" });
    });

    it("installs once", async () => {
        document.body.append(span('{"shader":"rgbShift"}'));
        install();
        install();
        await flush();
        document.body.append(span('{"shader":"glitch"}'));
        await flush();
        expect(mock.calls).toEqual(["add", "add"]);
    });

    it("adds an element added later, nested or not", async () => {
        install();
        const wrapper = document.createElement("div");
        const el = span('{"shader":"glitch"}');
        wrapper.append(el);
        document.body.append(wrapper);
        await flush();
        expect(mock.vfx.add).toHaveBeenCalledWith(el, { shader: "glitch" });
    });

    it("does not make the VFX without elements", async () => {
        document.body.append(span(null));
        install();
        await flush();
        expect(mock.init).not.toHaveBeenCalled();
    });

    it("removes then adds on an attribute change", async () => {
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el);
        install();
        await flush();
        el.setAttribute("data-vfx", '{"shader":"glitch"}');
        await flush();
        expect(mock.calls).toEqual(["add", "remove", "add"]);
        expect(mock.vfx.add).toHaveBeenLastCalledWith(el, { shader: "glitch" });
    });

    it("ignores the same attribute value set again", async () => {
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el);
        install();
        await flush();
        el.setAttribute("data-vfx", '{"shader":"rgbShift"}');
        await flush();
        expect(mock.calls).toEqual(["add"]);
    });

    it("removes when the attribute goes", async () => {
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el);
        install();
        await flush();
        el.removeAttribute("data-vfx");
        await flush();
        expect(mock.calls).toEqual(["add", "remove"]);
        expect(mock.vfx.remove).toHaveBeenCalledWith(el);
    });

    it("removes when the element or its parent leaves the page", async () => {
        const wrapper = document.createElement("div");
        const nested = span('{"shader":"rgbShift"}');
        const direct = span('{"shader":"glitch"}');
        wrapper.append(nested);
        document.body.append(wrapper, direct);
        install();
        await flush();
        wrapper.remove();
        direct.remove();
        await flush();
        expect(mock.vfx.remove).toHaveBeenCalledWith(nested);
        expect(mock.vfx.remove).toHaveBeenCalledWith(direct);
    });

    it("keeps an element moved within the page", async () => {
        const target = document.createElement("div");
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el, target);
        install();
        await flush();
        target.append(el);
        await flush();
        expect(mock.calls).toEqual(["add"]);
    });

    it("re-captures text on a content change", async () => {
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el);
        install();
        await flush();
        el.textContent = "changed";
        await flush();
        expect(mock.vfx.update).toHaveBeenCalledWith(el);
    });

    it("waits for a name until it is registered", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const el = span('{"shader":"rgbShift","uniforms":"mouse"}');
        document.body.append(el);
        install();
        await flush();
        expect(mock.vfx.add).not.toHaveBeenCalled();
        const uniforms = { pos: () => [0, 0] };
        registerVFX({ uniforms: { mouse: uniforms } });
        await flush();
        expect(mock.vfx.add).toHaveBeenCalledWith(el, {
            shader: "rgbShift",
            uniforms,
        });
    });

    it("removes everything on uninstall", async () => {
        const el = span('{"shader":"rgbShift"}');
        document.body.append(el);
        install();
        await flush();
        uninstall();
        await flush();
        expect(mock.vfx.remove).toHaveBeenCalledWith(el);
        document.body.append(span('{"shader":"glitch"}'));
        await flush();
        expect(mock.calls).toEqual(["add", "remove"]);
    });
});
