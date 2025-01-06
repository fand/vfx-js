import { describe, expect, test } from "vitest";
import { RECT_ZERO } from "./rect";
import { isRectInViewport, parseOverflowOpts } from "./vfx-player";

describe("parseOverflowOpts", () => {
    test('true => "fullscreen"', () => {
        expect(parseOverflowOpts(true)).toStrictEqual([true, RECT_ZERO]);
    });

    test("undefined => 0", () => {
        expect(parseOverflowOpts(undefined)).toStrictEqual([
            false,
            {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        ]);
    });

    test("number", () => {
        expect(parseOverflowOpts(100)).toStrictEqual([
            false,
            {
                top: 100,
                right: 100,
                bottom: 100,
                left: 100,
            },
        ]);
    });

    test("number array", () => {
        expect(parseOverflowOpts([0, 100, 200, 300])).toStrictEqual([
            false,
            {
                top: 0,
                right: 100,
                bottom: 200,
                left: 300,
            },
        ]);
    });

    test("object", () => {
        expect(parseOverflowOpts({})).toStrictEqual([
            false,
            {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        ]);
        expect(parseOverflowOpts({ top: 100 })).toStrictEqual([
            false,
            {
                top: 100,
                right: 0,
                bottom: 0,
                left: 0,
            },
        ]);
        expect(parseOverflowOpts({ left: 100 })).toStrictEqual([
            false,
            {
                top: 0,
                right: 0,
                bottom: 0,
                left: 100,
            },
        ]);
        expect(parseOverflowOpts({ top: 100, left: 200 })).toStrictEqual([
            false,
            {
                top: 100,
                right: 0,
                bottom: 0,
                left: 200,
            },
        ]);
        expect(
            parseOverflowOpts({ top: 100, right: 200, bottom: 300, left: 400 }),
        ).toStrictEqual([
            false,
            {
                top: 100,
                right: 200,
                bottom: 300,
                left: 400,
            },
        ]);
    });
});

describe("isRectInViewport", () => {
    type Rect = Parameters<typeof isRectInViewport>[0];
    const rect = (x: number, y: number, w: number, h: number): Rect => {
        return {
            left: x,
            top: y,
            right: x + w,
            bottom: y + h,
        };
    };

    test("no overflow", () => {
        expect(isRectInViewport(rect(0, 0, 1, 1), rect(0, 0, 1, 1))).toBe(true);

        // adjacent rects
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(-1, 0, 1, 1), // left
            ),
        ).toBe(true);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(1, 0, 1, 1), // right
            ),
        ).toBe(true);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, -1, 1, 1), // top
            ),
        ).toBe(true);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, 1, 1, 1), // bottom
            ),
        ).toBe(true);

        // distant rects
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(-2, 0, 1, 1), // 1px left
            ),
        ).toBe(false);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(2, 0, 1, 1), // 1px right
            ),
        ).toBe(false);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, -2, 1, 1), // 1px top
            ),
        ).toBe(false);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, 2, 1, 1), // 1px bottom
            ),
        ).toBe(false);
    });
});
