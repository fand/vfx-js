// @vitest-environment node
import { render } from "svelte/server";
import { expect, it, vi } from "vitest";
import CanvasHarness from "./test/CanvasHarness.svelte";

const mock = vi.hoisted(() => ({
    init: vi.fn(),
    supportsHtmlInCanvas: vi.fn(() => true),
}));

vi.mock("@vfx-js/core", () => ({
    VFX: { init: mock.init },
    supportsHtmlInCanvas: mock.supportsHtmlInCanvas,
    setupCapture: vi.fn(),
    teardownCapture: vi.fn(),
}));

it("renders the div on the server, with no core calls", () => {
    const { body } = render(CanvasHarness, {
        props: { props: { shader: "rgbShift", class: "card" } },
    });
    // Drop Svelte's hydration comments.
    expect(body.replace(/<!--.*?-->/g, "")).toBe(
        '<div class="card"><h2>hi</h2></div>',
    );
    expect(mock.init).not.toHaveBeenCalled();
    expect(mock.supportsHtmlInCanvas).not.toHaveBeenCalled();
});
