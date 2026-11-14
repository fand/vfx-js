import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    moveNode,
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
            width: "10px",
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

    // A content-box element without padding or border.
    const plainBox = {
        position: "static",
        "box-sizing": "content-box",
        "padding-left": "0px",
        "padding-right": "0px",
        "border-left-width": "0px",
        "border-right-width": "0px",
        "max-width": "none",
    };

    test("keeps a replaced element at its own size", () => {
        element.tagName = "IMG";
        stubComputed({
            ...plainBox,
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

    // #264: a width from a stylesheet rule, not the style attribute.
    test("keeps a px width that comes from a stylesheet", () => {
        stubComputed({ ...plainBox, width: "600px" });
        wrap({});
        expect(canvasStyle().width).toBe("600px");
        expect(canvasStyle().minWidth).toBe("auto");
        expect(canvasStyle().maxWidth).toBe("none");
        expect(element.style.width).toBe("100%");
    });

    test("keeps a px width from the style attribute", () => {
        element.style.width = "600px";
        stubComputed({ ...plainBox, width: "600px" });
        wrap({});
        expect(canvasStyle().width).toBe("600px");
    });

    // The rect is scaled by a transformed ancestor; computed values aren't.
    test("takes the width from computed values, not the rect", () => {
        element.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            width: 300,
            height: 10,
        });
        stubComputed({ ...plainBox, width: "600px" });
        wrap({});
        expect(canvasStyle().width).toBe("600px");
    });

    test("adds padding and border to a content-box width", () => {
        vi.stubGlobal("getComputedStyle", () => ({
            display: "block",
            width: "10px",
            getPropertyValue: (prop: string) =>
                prop === "border-left-width" ? "1px" : "0px",
        }));
        stubComputed({
            ...plainBox,
            width: "600px",
            "padding-left": "20px",
            "padding-right": "5%",
            "min-width": "100px",
            "max-width": "100%",
        });
        wrap({});
        expect(canvasStyle().width).toBe("calc(600px + 20px + 5% + 1px)");
        expect(canvasStyle().minWidth).toBe("calc(100px + 20px + 5% + 1px)");
        expect(canvasStyle().maxWidth).toBe("calc(100% + 20px + 5% + 1px)");
    });

    // `width: 1200px; max-width: 100%` keeps tracking the parent.
    test("copies min/max-width of a border-box element as is", () => {
        stubComputed({
            ...plainBox,
            "box-sizing": "border-box",
            "padding-left": "20px",
            width: "1200px",
            "max-width": "100%",
        });
        wrap({});
        expect(canvasStyle().width).toBe("1200px");
        expect(canvasStyle().maxWidth).toBe("100%");
    });

    test("keeps the rect width of an inline element", () => {
        stubComputed({ ...plainBox, display: "inline", width: "600px" });
        wrap({});
        expect(canvasStyle().width).toBe("10px");
    });

    test("keeps 100% for an auto width", () => {
        stubComputed({ ...plainBox, width: "auto" });
        wrap({});
        expect(canvasStyle().width).toBe("100%");
        expect(canvasStyle().maxWidth).toBeFalsy();
    });

    test("keeps 100% for a percent or calc width", () => {
        stubComputed({ ...plainBox, width: "50%" });
        wrap({});
        expect(canvasStyle().width).toBe("100%");

        inserted = [];
        stubComputed({ ...plainBox, width: "calc(100% - 20px)" });
        wrap({});
        expect(canvasStyle().width).toBe("100%");
    });

    test("copies auto and % margins as computed values", () => {
        stubComputed({
            ...plainBox,
            width: "600px",
            "margin-top": "10%",
            "margin-right": "auto",
            "margin-bottom": "0px",
            "margin-left": "auto",
        });
        wrap({});
        expect(canvasStyle().marginTop).toBe("10%");
        expect(canvasStyle().marginRight).toBe("auto");
        expect(canvasStyle().marginBottom).toBe("0px");
        expect(canvasStyle().marginLeft).toBe("auto");
    });

    test("falls back to resolved margins without computedStyleMap", () => {
        vi.stubGlobal("getComputedStyle", () => ({
            display: "block",
            width: "10px",
            getPropertyValue: (prop: string) =>
                prop === "margin-left" ? "200px" : "",
        }));
        wrap({});
        expect(canvasStyle().marginLeft).toBe("200px");
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
