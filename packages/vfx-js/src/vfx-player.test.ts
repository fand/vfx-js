import { expect, describe, test } from "vitest";
import { isRectInViewport, sanitizeOverflow } from "./vfx-player";
import { RECT_ZERO } from "./rect";

describe("sanitizeOverflow", () => {
    test('true => "fullscreen"', () => {
        expect(sanitizeOverflow(true)).toStrictEqual([true, RECT_ZERO]);
    });

    test("undefined => 0", () => {
        expect(sanitizeOverflow(undefined)).toStrictEqual([
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
        expect(sanitizeOverflow(100)).toStrictEqual([
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
        expect(sanitizeOverflow([0, 100, 200, 300])).toStrictEqual([
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
        expect(sanitizeOverflow({})).toStrictEqual([
            false,
            {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        ]);
        expect(sanitizeOverflow({ top: 100 })).toStrictEqual([
            false,
            {
                top: 100,
                right: 0,
                bottom: 0,
                left: 0,
            },
        ]);
        expect(sanitizeOverflow({ left: 100 })).toStrictEqual([
            false,
            {
                top: 0,
                right: 0,
                bottom: 0,
                left: 100,
            },
        ]);
        expect(sanitizeOverflow({ top: 100, left: 200 })).toStrictEqual([
            false,
            {
                top: 100,
                right: 0,
                bottom: 0,
                left: 200,
            },
        ]);
        expect(
            sanitizeOverflow({ top: 100, right: 200, bottom: 300, left: 400 }),
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
        expect(isRectInViewport(rect(0, 0, 1, 1), rect(0, 0, 1, 1), 0)).toBe(
            true,
        );

        // adjacent rects
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(-1, 0, 1, 1), // left
                0,
            ),
        ).toBe(true);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(1, 0, 1, 1), // right
                0,
            ),
        ).toBe(true);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, -1, 1, 1), // top
                0,
            ),
        ).toBe(true);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, 1, 1, 1), // bottom
                0,
            ),
        ).toBe(true);

        // distant rects
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(-2, 0, 1, 1), // 1px left
                0,
            ),
        ).toBe(false);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(2, 0, 1, 1), // 1px right
                0,
            ),
        ).toBe(false);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, -2, 1, 1), // 1px top
                0,
            ),
        ).toBe(false);
        expect(
            isRectInViewport(
                rect(0, 0, 1, 1),
                rect(0, 2, 1, 1), // 1px bottom
                0,
            ),
        ).toBe(false);
    });
});
