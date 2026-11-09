import { afterEach, describe, expect, test, vi } from "vitest";
import type { Uniforms } from "./gl/program";
import { createIntersectionState } from "./intersection-state";
import { RECT_ZERO } from "./rect";
import {
    getIntermediatePassUniforms,
    isRectInViewport,
    parseIntersectionOpts,
    parseOverflowOpts,
    setIntersectionUniforms,
    updateIntersection,
} from "./vfx-player";

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
        } as Rect;
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

describe("getIntermediatePassUniforms", () => {
    const pixelRatio = 2;
    const elementSize = { width: 100, height: 50 };
    const glRect = { x: 10, y: 20, w: 100, h: 50 };

    // Same as the toBuffer() GLSL snippet in the docs
    function toBuffer(
        uv: [number, number],
        u: { resolution: [number, number]; offset: [number, number] },
        bufferSize: [number, number],
    ): [number, number] {
        return [
            (uv[0] * u.resolution[0] + u.offset[0]) / bufferSize[0],
            (uv[1] * u.resolution[1] + u.offset[1]) / bufferSize[1],
        ];
    }

    test("no overflow", () => {
        const u = getIntermediatePassUniforms(
            elementSize,
            glRect,
            glRect,
            undefined,
            [30, 40],
            [0, 0],
            pixelRatio,
        );
        expect(u).toStrictEqual({
            resolution: [200, 100],
            offset: [0, 0],
            mouse: [40, 40],
        });
        expect(toBuffer([0, 0], u, [200, 100])).toStrictEqual([0, 0]);
        expect(toBuffer([1, 1], u, [200, 100])).toStrictEqual([1, 1]);
    });

    test("overflow", () => {
        const bufferGlRect = { x: 0, y: 10, w: 120, h: 70 };
        const u = getIntermediatePassUniforms(
            elementSize,
            glRect,
            bufferGlRect,
            undefined,
            [30, 40],
            [5, 5],
            pixelRatio,
        );
        expect(u).toStrictEqual({
            resolution: [200, 100],
            offset: [20, 20],
            mouse: [70, 70],
        });
        expect(toBuffer([0, 0], u, [240, 140])).toStrictEqual([
            20 / 240,
            20 / 140,
        ]);
        expect(toBuffer([1, 1], u, [240, 140])).toStrictEqual([
            220 / 240,
            120 / 140,
        ]);
    });

    test("fullscreen", () => {
        const bufferGlRect = { x: 0, y: 0, w: 400, h: 300 };
        const u = getIntermediatePassUniforms(
            elementSize,
            glRect,
            bufferGlRect,
            undefined,
            [30, 40],
            [5, 5],
            pixelRatio,
        );
        expect(u).toStrictEqual({
            resolution: [200, 100],
            offset: [20, 40],
            mouse: [70, 90],
        });
        expect(toBuffer([0, 0], u, [800, 600])).toStrictEqual([
            20 / 800,
            40 / 600,
        ]);
        expect(toBuffer([1, 1], u, [800, 600])).toStrictEqual([
            220 / 800,
            140 / 600,
        ]);
    });

    test("fixed size", () => {
        const bufferGlRect = { x: 0, y: 10, w: 120, h: 70 };
        const u = getIntermediatePassUniforms(
            elementSize,
            glRect,
            bufferGlRect,
            [60, 35],
            [30, 40],
            [0, 0],
            pixelRatio,
        );
        expect(u).toStrictEqual({
            resolution: [60, 35],
            offset: [0, 0],
            mouse: [15, 15],
        });
        expect(toBuffer([0, 0], u, [60, 35])).toStrictEqual([0, 0]);
        expect(toBuffer([1, 1], u, [60, 35])).toStrictEqual([1, 1]);
    });
});

describe("parseIntersectionOpts", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Fresh module, so the once-per-page warning flags start unset.
    async function importFresh() {
        vi.resetModules();
        return (await import("./vfx-player")).parseIntersectionOpts;
    }

    test("defaults", () => {
        expect(parseIntersectionOpts(undefined)).toEqual({
            threshold: 0,
            leaveThreshold: 0,
            rootMargin: { top: 0, right: 0, bottom: 0, left: 0 },
            duration: 1,
        });
    });

    test("leaveThreshold defaults to threshold", () => {
        expect(parseIntersectionOpts({ threshold: 0.5 }).leaveThreshold).toBe(
            0.5,
        );
    });

    test("keeps leaveThreshold below threshold", () => {
        const opts = parseIntersectionOpts({
            threshold: 0.5,
            leaveThreshold: 0.2,
        });
        expect(opts.leaveThreshold).toBe(0.2);
    });

    test("keeps leaveThreshold above threshold", () => {
        const opts = parseIntersectionOpts({
            threshold: 0.2,
            leaveThreshold: 0.5,
        });
        expect(opts.leaveThreshold).toBe(0.5);
    });

    test("keeps a valid duration", () => {
        expect(parseIntersectionOpts({ duration: 0.5 }).duration).toBe(0.5);
    });

    test("falls back to duration 1, warns once", async () => {
        const parse = await importFresh();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(parse({ duration: 0 }).duration).toBe(1);
        expect(parse({ duration: -1 }).duration).toBe(1);
        expect(parse({ duration: Number.NaN }).duration).toBe(1);
        expect(parse({ duration: Number.POSITIVE_INFINITY }).duration).toBe(1);
        expect(warn).toHaveBeenCalledOnce();
    });
});

describe("updateIntersection", () => {
    function makeElement(now: number) {
        return {
            intersectionState: createIntersectionState(now),
            intersection: parseIntersectionOpts({ threshold: 0.5 }),
            isFullScreen: false,
            enterTime: now,
            leaveTime: Number.NEGATIVE_INFINITY,
        };
    }

    test("sets enterTime and resets leaveTime on enter", () => {
        const e = makeElement(0);
        updateIntersection(e, 1, true, 2);
        expect(e.enterTime).toBe(2);
        expect(e.leaveTime).toBe(Number.POSITIVE_INFINITY);
        expect(e.intersectionState.phase).toBe("entering");
    });

    test("sets leaveTime on leave", () => {
        const e = makeElement(0);
        updateIntersection(e, 1, true, 0);
        updateIntersection(e, 0, false, 3);
        expect(e.enterTime).toBe(0);
        expect(e.leaveTime).toBe(3);
    });

    test("resets leaveTime to +Infinity on re-enter", () => {
        const e = makeElement(0);
        updateIntersection(e, 1, true, 0);
        updateIntersection(e, 0, false, 1);
        updateIntersection(e, 1, true, 2);
        expect(e.enterTime).toBe(2);
        expect(e.leaveTime).toBe(Number.POSITIVE_INFINITY);
    });

    test("keeps the times while in/out does not change", () => {
        const e = makeElement(0);
        updateIntersection(e, 1, true, 1);
        updateIntersection(e, 1, true, 2);
        expect(e.enterTime).toBe(1);
        expect(e.leaveTime).toBe(Number.POSITIVE_INFINITY);
    });

    test("moves the progress", () => {
        const e = makeElement(0);
        updateIntersection(e, 1, true, 0);
        updateIntersection(e, 1, true, 0.25);
        expect(e.intersectionState.enterProgress).toBe(0.25);
    });

    test("full screen is always in", () => {
        const e = { ...makeElement(0), isFullScreen: true };
        updateIntersection(e, 0, false, 0);
        expect(e.intersectionState.isIn).toBe(true);
    });
});

describe("setIntersectionUniforms", () => {
    function makeUniforms(): Uniforms {
        return {
            intersection: { value: 0 },
            enterTime: { value: 0 },
            leaveTime: { value: 0 },
            enterProgress: { value: 0 },
            leaveProgress: { value: 0 },
        };
    }

    test("writes the progress and times", () => {
        const u = makeUniforms();
        const state = {
            ...createIntersectionState(0),
            enterProgress: 1,
            leaveProgress: 0.5,
        };
        setIntersectionUniforms(
            u,
            { intersectionState: state, enterTime: 1, leaveTime: 2 },
            0.75,
            3,
        );
        expect(u.intersection.value).toBe(0.75);
        expect(u.enterTime.value).toBe(2);
        expect(u.leaveTime.value).toBe(1);
        expect(u.enterProgress.value).toBe(1);
        expect(u.leaveProgress.value).toBe(0.5);
    });

    test("clamps infinite times", () => {
        const u = makeUniforms();
        setIntersectionUniforms(
            u,
            {
                intersectionState: createIntersectionState(0),
                enterTime: Number.NEGATIVE_INFINITY,
                leaveTime: Number.POSITIVE_INFINITY,
            },
            0,
            0,
        );
        expect(u.enterTime.value).toBe(1e6);
        expect(u.leaveTime.value).toBe(-1e6);
    });
});
