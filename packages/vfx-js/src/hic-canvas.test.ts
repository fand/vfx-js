import { describe, expect, test } from "vitest";
import { isHicCanvas, markHicCanvas, nestedCanvasDest } from "./hic-canvas";

function fakeEl(tagName: string, attrs: Record<string, string> = {}) {
    const a = new Map(Object.entries(attrs));
    return {
        tagName,
        hasAttribute: (k: string) => a.has(k),
        getAttribute: (k: string) => a.get(k) ?? null,
        setAttribute: (k: string, v: string) => {
            a.set(k, v);
        },
        attrs: a,
    } as unknown as HTMLCanvasElement & { attrs: Map<string, string> };
}

describe("isHicCanvas", () => {
    test("accepts layoutsubtree and content=drawable", () => {
        expect(isHicCanvas(fakeEl("CANVAS", { layoutsubtree: "" }))).toBe(true);
        expect(isHicCanvas(fakeEl("CANVAS", { content: "drawable" }))).toBe(
            true,
        );
    });

    test("rejects plain canvases and other elements", () => {
        expect(isHicCanvas(fakeEl("CANVAS"))).toBe(false);
        expect(isHicCanvas(fakeEl("CANVAS", { content: "other" }))).toBe(false);
        expect(isHicCanvas(fakeEl("DIV", { layoutsubtree: "" }))).toBe(false);
    });
});

describe("markHicCanvas", () => {
    test("sets both markups and marks the child drawable", () => {
        const canvas = fakeEl("CANVAS");
        const child = fakeEl("DIV");
        markHicCanvas(canvas, child);
        expect([...canvas.attrs]).toStrictEqual([
            ["layoutsubtree", ""],
            ["content", "drawable"],
        ]);
        expect(child.attrs.get("drawable")).toBe("");
        expect(isHicCanvas(canvas)).toBe(true);
    });
});

describe("nestedCanvasDest", () => {
    const base = { left: 100, top: 50, width: 800, height: 600 };

    test("maps CSS px to buffer px", () => {
        const rect = { left: 260, top: 110, width: 640, height: 360 };
        expect(nestedCanvasDest(base, rect, 2, 2)).toStrictEqual([
            320, 120, 1280, 720,
        ]);
        expect(nestedCanvasDest(base, rect, 1, 1)).toStrictEqual([
            160, 60, 640, 360,
        ]);
    });

    test("keeps canvases that stick out of the base", () => {
        const rect = { left: 50, top: 600, width: 100, height: 100 };
        expect(nestedCanvasDest(base, rect, 1.5, 1.5)).toStrictEqual([
            -75, 825, 150, 150,
        ]);
    });

    test("skips empty or outside canvases", () => {
        expect(
            nestedCanvasDest(
                base,
                { left: 200, top: 100, width: 0, height: 10 },
                1,
                1,
            ),
        ).toBeNull();
        expect(
            nestedCanvasDest(
                base,
                { left: 900, top: 100, width: 10, height: 10 },
                1,
                1,
            ),
        ).toBeNull();
        expect(
            nestedCanvasDest(
                base,
                { left: 0, top: 0, width: 100, height: 50 },
                1,
                1,
            ),
        ).toBeNull();
    });
});
