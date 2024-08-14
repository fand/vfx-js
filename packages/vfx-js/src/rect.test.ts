import { expect, describe, test } from "vitest";
import { createRect, getIntersection, growRect, shrinkRect } from "./rect";

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
