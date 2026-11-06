import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { moveNode, waitForFlush, wrapElement } from "./html-in-canvas";

describe("waitForFlush", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test("resolves when the waiter is called", async () => {
        const waiters = new Set<() => void>();
        let result: boolean | undefined;
        waitForFlush(waiters, 300).then((flushed) => {
            result = flushed;
        });
        expect(waiters.size).toBe(1);
        for (const done of [...waiters]) {
            done();
        }
        await Promise.resolve();
        expect(result).toBe(true);
        expect(waiters.size).toBe(0);
    });

    test("resolves on timeout and removes itself", async () => {
        const waiters = new Set<() => void>();
        let result: boolean | undefined;
        waitForFlush(waiters, 300).then((flushed) => {
            result = flushed;
        });
        await vi.advanceTimersByTimeAsync(299);
        expect(result).toBeUndefined();
        await vi.advanceTimersByTimeAsync(1);
        expect(result).toBe(false);
        expect(waiters.size).toBe(0);
    });
});

function fakeParent(moveBefore?: () => void) {
    const calls: string[] = [];
    const parent = {
        insertBefore: () => {
            calls.push("insertBefore");
        },
        moveBefore: moveBefore
            ? () => {
                  calls.push("moveBefore");
                  moveBefore();
              }
            : undefined,
    } as unknown as ParentNode & Node;
    return { parent, calls };
}

describe("moveNode", () => {
    const node = {} as Node;

    test("uses moveBefore when present", () => {
        const { parent, calls } = fakeParent(() => {});
        moveNode(parent, node, null);
        expect(calls).toEqual(["moveBefore"]);
    });

    test("falls back to insertBefore without moveBefore", () => {
        const { parent, calls } = fakeParent();
        moveNode(parent, node, null);
        expect(calls).toEqual(["insertBefore"]);
    });

    test("falls back to insertBefore when moveBefore throws", () => {
        const { parent, calls } = fakeParent(() => {
            throw new Error("HierarchyRequestError");
        });
        moveNode(parent, node, null);
        expect(calls).toEqual(["moveBefore", "insertBefore"]);
    });
});

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

function fakeNode(tag: string) {
    const attrs = new Map<string, string>();
    const node = {
        tag,
        className: "",
        scrollTop: 0,
        scrollLeft: 0,
        style: {
            height: "",
            width: "",
            margin: "",
            boxSizing: "",
            zIndex: "",
            setProperty(name: string, value: string) {
                if (name === "z-index") {
                    node.style.zIndex = value;
                }
            },
        },
        parentNode: null as unknown,
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 10,
            height: 10,
        }),
        querySelectorAll: () => [],
        hasAttribute: (name: string) => attrs.has(name),
        getAttribute: (name: string) => attrs.get(name) ?? null,
        setAttribute: (name: string, value: string) => attrs.set(name, value),
        removeAttribute: (name: string) => attrs.delete(name),
        insertBefore: () => {},
        cloneNode: () => fakeNode(`${tag}-clone`),
    };
    return node;
}

describe("wrapElement", () => {
    let inserted: ReturnType<typeof fakeNode>[];
    let element: ReturnType<typeof fakeNode>;

    beforeEach(() => {
        for (const name of ELEMENT_CLASSES) {
            vi.stubGlobal(name, class {});
        }
        vi.stubGlobal("document", {
            createElement: (tag: string) => fakeNode(tag),
        });
        vi.stubGlobal("window", { devicePixelRatio: 1 });
        vi.stubGlobal("getComputedStyle", () => ({
            display: "block",
            getPropertyValue: () => "",
        }));
        inserted = [];
        element = fakeNode("div");
        element.parentNode = {
            insertBefore: (node: ReturnType<typeof fakeNode>) => {
                inserted.push(node);
            },
        };
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // The clone goes in before the first await, so no capture is needed.
    const wrap = (opts: { stillCover?: { zIndex: number } }) => {
        wrapElement(element as unknown as HTMLElement, {
            onCapture: () => {},
            ...opts,
        }).catch(() => {});
        return inserted.map((node) => node.tag);
    };

    test("does not insert a still copy by default", () => {
        expect(wrap({})).toEqual(["canvas"]);
    });

    test("inserts a still copy at the given z-index", () => {
        expect(wrap({ stillCover: { zIndex: 41 } })).toEqual([
            "div-clone",
            "canvas",
        ]);
        expect(inserted[0].style.zIndex).toBe("41");
    });
});
