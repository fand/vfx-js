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
    // Svelte adds hydration comments, so check the parts.
    expect(body).toContain('<div class="card">');
    expect(body).toContain("<h2>hi</h2>");
    expect(body).not.toContain("<canvas");
    expect(mock.init).not.toHaveBeenCalled();
    expect(mock.supportsHtmlInCanvas).not.toHaveBeenCalled();
});
