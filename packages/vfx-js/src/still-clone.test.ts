import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { coverWithStill } from "./still-clone";

const ELEMENT_CLASSES = [
    "HTMLScriptElement",
    "HTMLCanvasElement",
    "HTMLVideoElement",
    "HTMLIFrameElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "HTMLMediaElement",
];

type FakeElement = {
    getAttribute(name: string): string | null;
};

function fakeElement(
    attributes: Record<string, string>,
    onInsert?: (node: FakeElement) => void,
): FakeElement {
    const attrs = new Map(Object.entries(attributes));
    return {
        scrollTop: 0,
        scrollLeft: 0,
        style: { setProperty: () => {} },
        parentNode: { insertBefore: (node: FakeElement) => onInsert?.(node) },
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 10,
            height: 10,
        }),
        querySelectorAll: () => [],
        getAttribute: (name: string) => attrs.get(name) ?? null,
        setAttribute: (name: string, value: string) => attrs.set(name, value),
        removeAttribute: (name: string) => attrs.delete(name),
        remove: () => {},
        cloneNode: () => fakeElement(Object.fromEntries(attrs)),
    } as FakeElement;
}

describe("coverWithStill", () => {
    beforeEach(() => {
        for (const name of ELEMENT_CLASSES) {
            vi.stubGlobal(name, class {});
        }
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("the clone keeps the source id", () => {
        let clone: FakeElement | undefined;
        const source = fakeElement({ id: "app" }, (node) => {
            clone = node;
        });
        coverWithStill(source as unknown as HTMLElement, 9998);
        expect(clone?.getAttribute("id")).toBe("app");
        expect(clone?.getAttribute("aria-hidden")).toBe("true");
    });
});
