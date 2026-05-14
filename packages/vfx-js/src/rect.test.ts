import { describe, expect, test } from "vitest";
import {
    createMargin,
    createRect,
    getIntersection,
    growRect,
    shrinkRect,
    toCeiledRect,
} from "./rect";

describe("createRect", () => {
    test("single number", () => {
        expect(createRect(1)).toStrictEqual({
            top: 1,
            right: 1,
            bottom: 1,
            left: 1,
        });
    });

    test("array", () => {
        expect(createRect([1, 2, 3, 4])).toStrictEqual({
            top: 1,
            right: 2,
            bottom: 3,
            left: 4,
        });
    });

    test("object", () => {
        expect(
            createRect({ top: 1, right: 2, bottom: 3, left: 4 }),
        ).toStrictEqual({
            top: 1,
            right: 2,
            bottom: 3,
            left: 4,
        });
    });
});

describe("growRect", () => {
    test("positive values", () => {
        const a = createRect({
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        });
        const b = createMargin(1);
        expect(growRect(a, b)).toStrictEqual({
            top: 99,
            right: 201,
            bottom: 201,
            left: 99,
        });
    });
    test("negative values", () => {
        const a = createRect({
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        });
        const b = createMargin(-1);
        expect(growRect(a, b)).toStrictEqual({
            top: 101,
            right: 199,
            bottom: 199,
            left: 101,
        });
    });
});

describe("shrinkRect", () => {
    test("positive values", () => {
        const a = createRect({
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        });
        const b = createMargin(1);
        expect(shrinkRect(a, b)).toStrictEqual({
            top: 101,
            right: 199,
            bottom: 199,
            left: 101,
        });
    });
    test("negative values", () => {
        const a = createRect({
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        });
        const b = createMargin(-1);
        expect(shrinkRect(a, b)).toStrictEqual({
            top: 99,
            right: 201,
            bottom: 201,
            left: 99,
        });
    });
});

describe("getIntersection", () => {
    test("no intersection", () => {
        const a = createRect([0, 1, 1, 0]);
        const b = createRect([0, 2, 1, 1]);
        expect(getIntersection(a, b)).toBe(0);
    });
    test("full intersection", () => {
        expect(
            getIntersection(createRect([0, 1, 1, 0]), createRect([0, 1, 1, 0])),
        ).toBe(1);
        expect(
            getIntersection(
                createRect([0, 10, 10, 1]),
                createRect([1, 2, 2, 1]),
            ),
        ).toBe(1);
    });
    test("partial intersection", () => {
        expect(
            getIntersection(createRect([0, 2, 1, 0]), createRect([0, 1, 1, 0])),
        ).toBe(1); // target is fully covered by container
        expect(
            getIntersection(createRect([0, 1, 1, 0]), createRect([0, 2, 1, 0])),
        ).toBe(0.5); // 50% of target is covered by container
        expect(
            getIntersection(createRect([1, 2, 2, 1]), createRect([0, 2, 2, 0])),
        ).toBe(0.25); // 25%
    });
});

describe("toCeiledRect", () => {
    function fakeDomRect(
        left: number,
        top: number,
        width: number,
        height: number,
    ): DOMRect {
        return {
            left,
            top,
            right: left + width,
            bottom: top + height,
            width,
            height,
            x: left,
            y: top,
            toJSON: () => ({}),
        } as DOMRect;
    }

    test("integer dimensions are preserved", () => {
        expect(toCeiledRect(fakeDomRect(10, 20, 100, 50))).toStrictEqual({
            top: 20,
            left: 10,
            right: 110,
            bottom: 70,
        });
    });

    test("fractional width/height are ceiled", () => {
        expect(toCeiledRect(fakeDomRect(0, 0, 258.34375, 76))).toStrictEqual({
            top: 0,
            left: 0,
            right: 259,
            bottom: 76,
        });
    });

    test("fractional left/top are preserved (only right/bottom are ceiled)", () => {
        expect(
            toCeiledRect(fakeDomRect(48.5, 12.25, 258.2899, 76.32)),
        ).toStrictEqual({
            top: 12.25,
            left: 48.5,
            right: 48.5 + 259, // = left + ceil(width)
            bottom: 12.25 + 77, // = top + ceil(height)
        });
    });

    test("width/height that are already exact integers stay exact", () => {
        // No spurious +1 when the right/bottom are integers (no fractional part).
        const r = toCeiledRect(fakeDomRect(0, 0, 100, 50));
        expect(r.right - r.left).toBe(100);
        expect(r.bottom - r.top).toBe(50);
    });
});
