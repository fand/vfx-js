import { expect, describe, test } from "vitest";
import { sanitizeOverflow } from "./vfx-player";

describe("sanitizeOverflow", () => {
    test('true => "fullscreen"', () => {
        expect(sanitizeOverflow(true)).toBe("fullscreen");
    });

    test("undefined => 0", () => {
        expect(sanitizeOverflow(undefined)).toStrictEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });

    test("number", () => {
        expect(sanitizeOverflow(100)).toStrictEqual({
            top: 100,
            right: 100,
            bottom: 100,
            left: 100,
        });
    });

    test("number array", () => {
        expect(sanitizeOverflow([0, 100, 200, 300])).toStrictEqual({
            top: 0,
            right: 100,
            bottom: 200,
            left: 300,
        });
    });

    test("object", () => {
        expect(sanitizeOverflow({})).toStrictEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
        expect(sanitizeOverflow({ top: 100 })).toStrictEqual({
            top: 100,
            right: 0,
            bottom: 0,
            left: 0,
        });
        expect(sanitizeOverflow({ left: 100 })).toStrictEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 100,
        });
        expect(sanitizeOverflow({ top: 100, left: 200 })).toStrictEqual({
            top: 100,
            right: 0,
            bottom: 0,
            left: 200,
        });
        expect(
            sanitizeOverflow({ top: 100, right: 200, bottom: 300, left: 400 }),
        ).toStrictEqual({
            top: 100,
            right: 200,
            bottom: 300,
            left: 400,
        });
    });
});
