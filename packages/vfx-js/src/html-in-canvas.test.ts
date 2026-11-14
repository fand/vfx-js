import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    moveNode,
    setupCapture,
    teardownCapture,
    unwrapElement,
    waitForFlush,
    wrapElement,
} from "./html-in-canvas";

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
    const values: Record<string, string> = {
        height: "",
        width: "",
        margin: "",
        boxSizing: "",
        zIndex: "",
        position: "",
    };
    const style = Object.assign(values, {
        setProperty(name: string, value: string) {
            const key = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            values[key] = value;
        },
    });
    const node = {
        tag,
        tagName: tag.toUpperCase(),
        className: "",
        scrollTop: 0,
        scrollLeft: 0,
        style,
        computedStyleMap: undefined as unknown,
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
        remove: () => {},
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

    // Missing props read as `auto`, like unset insets and sizes.
    const stubComputed = (values: Record<string, string>) => {
        element.computedStyleMap = () => ({
            get: (prop: string) => ({
                toString: () => values[prop] ?? "auto",
            }),
        });
    };
    const canvasStyle = () => inserted[0].style;

    test("sizes the canvas from all four insets of a fixed element", () => {
        stubComputed({
            position: "fixed",
            top: "10px",
            right: "10px",
            bottom: "10px",
            left: "10px",
            "margin-top": "0px",
            "margin-right": "3%",
            "margin-bottom": "0px",
            "margin-left": "2px",
        });
        wrap({});
        expect(canvasStyle().width).toBe("calc(100% - 10px - 10px - 2px - 3%)");
        expect(canvasStyle().height).toBe(
            "calc(100% - 10px - 10px - 0px - 0px)",
        );
        expect(element.style.position).toBe("static");
        expect(element.style.height).toBe("100%");
    });

    test("sizes only the width of an absolute element with left/right", () => {
        stubComputed({
            position: "absolute",
            right: "5%",
            left: "1em",
            "margin-right": "0px",
            "margin-left": "0px",
        });
        wrap({});
        expect(canvasStyle().width).toBe("calc(100% - 1em - 5% - 0px - 0px)");
        expect(canvasStyle().height).toBe("10px");
        expect(element.style.position).toBe("static");
        expect(element.style.height).toBe("");
    });

    test("unwrap restores the old inline position and height", () => {
        element.style.position = "fixed";
        element.style.height = "auto";
        stubComputed({
            position: "fixed",
            top: "0px",
            right: "0px",
            bottom: "0px",
            left: "0px",
        });
        wrap({});
        unwrapElement(
            inserted[0] as unknown as HTMLCanvasElement,
            element as unknown as HTMLElement,
        );
        expect(element.style.position).toBe("fixed");
        expect(element.style.height).toBe("auto");
    });

    test("uses px for percent vertical margins in the height", () => {
        vi.stubGlobal("getComputedStyle", () => ({
            display: "block",
            getPropertyValue: (prop: string) =>
                prop.startsWith("margin-") ? "30px" : "",
        }));
        stubComputed({
            position: "absolute",
            top: "0px",
            right: "0px",
            bottom: "0px",
            left: "0px",
            "margin-top": "5%",
            "margin-right": "5%",
            "margin-bottom": "5%",
            "margin-left": "5%",
        });
        wrap({});
        expect(canvasStyle().width).toBe("calc(100% - 0px - 0px - 5% - 5%)");
        expect(canvasStyle().height).toBe(
            "calc(100% - 0px - 0px - 30px - 30px)",
        );
    });

    test("keeps a replaced element at its own size", () => {
        element.tagName = "IMG";
        stubComputed({
            position: "absolute",
            top: "0px",
            right: "0px",
            bottom: "0px",
            left: "0px",
        });
        wrap({});
        expect(canvasStyle().width).toBe("10px");
        expect(canvasStyle().height).toBe("10px");
        expect(element.style.position).toBe("");
        expect(element.style.height).toBe("");
    });

    test("keeps 100% for a replaced element with a set width", () => {
        element.tagName = "IMG";
        stubComputed({ position: "static", width: "100%" });
        wrap({});
        expect(canvasStyle().width).toBe("100%");
    });

    test("leaves a non-positioned element as is", () => {
        stubComputed({ position: "static", top: "10px", bottom: "10px" });
        wrap({});
        expect(canvasStyle().width).toBe("100%");
        expect(canvasStyle().height).toBe("10px");
        expect(element.style.position).toBe("");
        expect(element.style.height).toBe("");
    });
});

function fakeHicCanvas() {
    const ops: string[] = [];
    const ctx = {
        clearRect: () => ops.push("clear"),
        drawElementImage: () => ops.push("draw"),
    };
    const child = fakeNode("div");
    const canvas = {
        width: 10,
        height: 10,
        firstElementChild: Object.assign(child, {
            getClientRects: () => [{}],
        }),
        onpaint: null as ((e?: Event) => void) | null,
        setAttribute: () => {},
        getContext: () => ctx,
        addEventListener: () => {},
        removeEventListener: () => {},
        requestPaint: () => {},
    };
    return { canvas, ops };
}

describe("setupCapture", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "OffscreenCanvas",
            class {
                constructor(
                    public width: number,
                    public height: number,
                ) {}
                getContext() {
                    return { clearRect: () => {}, drawImage: () => {} };
                }
            },
        );
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                disconnect() {}
            },
        );
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const paintTwice = async (keepDrawn?: boolean) => {
        const { canvas, ops } = fakeHicCanvas();
        const onCapture = vi.fn();
        const el = canvas as unknown as HTMLCanvasElement;
        const first = setupCapture(el, { onCapture, keepDrawn });
        canvas.onpaint?.();
        await first;
        const afterFirst = [...ops];
        ops.length = 0;
        canvas.onpaint?.();
        teardownCapture(el);
        return { afterFirst, afterLater: ops, onCapture };
    };

    test("clears the canvas after a later capture by default", async () => {
        const { afterFirst, afterLater, onCapture } = await paintTwice();
        expect(afterFirst).toEqual(["clear", "draw"]);
        expect(afterLater).toEqual(["clear", "draw", "clear"]);
        expect(onCapture).toHaveBeenCalledOnce();
    });

    test("keeps the drawing after a later capture with keepDrawn", async () => {
        const { afterFirst, afterLater, onCapture } = await paintTwice(true);
        expect(afterFirst).toEqual(["clear", "draw"]);
        expect(afterLater).toEqual(["clear", "draw"]);
        expect(onCapture).toHaveBeenCalledOnce();
    });
});
