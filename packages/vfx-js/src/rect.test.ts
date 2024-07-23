import { expect, describe, test } from "vitest";
import { createRect, growRect, shrinkRect } from "./rect";

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
        const a = {
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        };
        const b = createRect(1);
        expect(growRect(a, b)).toStrictEqual({
            top: 99,
            right: 201,
            bottom: 201,
            left: 99,
        });
    });
    test("negative values", () => {
        const a = {
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        };
        const b = createRect(-1);
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
        const a = {
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        };
        const b = createRect(1);
        expect(shrinkRect(a, b)).toStrictEqual({
            top: 101,
            right: 199,
            bottom: 199,
            left: 101,
        });
    });
    test("negative values", () => {
        const a = {
            top: 100,
            right: 200,
            bottom: 200,
            left: 100,
        };
        const b = createRect(-1);
        expect(shrinkRect(a, b)).toStrictEqual({
            top: 99,
            right: 201,
            bottom: 201,
            left: 99,
        });
    });
});
