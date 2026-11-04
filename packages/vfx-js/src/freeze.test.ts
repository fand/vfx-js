import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FreezeTracker } from "./freeze";
import type { VFXElement } from "./types";

type FakeNode = { style: { opacity: string }; parent?: FakeNode };

function fakeNode(parent?: FakeNode, opacity = ""): FakeNode {
    return { style: { opacity }, parent };
}

function contains(root: FakeNode, node: FakeNode): boolean {
    for (let n: FakeNode | undefined = node; n; n = n.parent) {
        if (n === root) {
            return true;
        }
    }
    return false;
}

function asElement(node: FakeNode): HTMLElement {
    return {
        get style() {
            return node.style;
        },
        contains: (other: HTMLElement) =>
            contains(node, (other as unknown as { node: FakeNode }).node),
        node,
    } as unknown as HTMLElement;
}

function vfxElement(element: HTMLElement): VFXElement {
    return { type: "text", element, originalOpacity: 1 } as VFXElement;
}

function setup() {
    const registered: VFXElement[] = [];
    const log: string[] = [];
    const tracker = new FreezeTracker({
        showPlain: () => log.push("showPlain"),
        hidePlain: (e, opacity) => {
            e.element.style.opacity = opacity;
        },
        isRegistered: (e) => registered.includes(e),
    });
    return { tracker, registered, log };
}

describe("FreezeTracker", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal("requestAnimationFrame", (fn: () => void) =>
            setTimeout(fn, 0),
        );
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    test("an element added under a frozen root starts frozen", async () => {
        const { tracker, registered, log } = setup();
        const rootNode = fakeNode();
        const root = asElement(rootNode);
        const undo = tracker.freezeInside(root, registered);

        const child = vfxElement(asElement(fakeNode(rootNode, "0.5")));
        expect(tracker.adopt(child, "0")).toBe(true);
        registered.push(child);
        expect(child.frozen).toBe(true);
        expect(child.element.style.opacity).toBe("0.5");
        expect(log).toEqual([]);

        undo();
        expect(child.frozen).toBe(false);
        await vi.advanceTimersByTimeAsync(0);
        expect(child.element.style.opacity).toBe("0");
    });

    test("an element outside the root, or after the undo, is not frozen", () => {
        const { tracker, registered } = setup();
        const rootNode = fakeNode();
        const undo = tracker.freezeInside(asElement(rootNode), registered);
        expect(tracker.adopt(vfxElement(asElement(fakeNode())), "0")).toBe(
            false,
        );
        undo();
        const child = vfxElement(asElement(fakeNode(rootNode)));
        expect(tracker.adopt(child, "0")).toBe(false);
        expect(child.frozen).toBeUndefined();
    });

    test("freezes registered elements inside the root, not the root itself", () => {
        const { tracker, log } = setup();
        const rootNode = fakeNode();
        const root = asElement(rootNode);
        const self = vfxElement(root);
        const inner = vfxElement(asElement(fakeNode(rootNode)));
        tracker.freezeInside(root, [self, inner]);
        expect(self.frozen).toBeUndefined();
        expect(inner.frozen).toBe(true);
        expect(log).toEqual(["showPlain"]);
    });
});
