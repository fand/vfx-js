import { describe, expect, test } from "vitest";
import {
    createIntersectionState,
    type IntersectionState,
    nextIsIn,
    stepIntersection,
} from "./intersection-state";

function makeState(fields: Partial<IntersectionState>): IntersectionState {
    return { ...createIntersectionState(0), ...fields };
}

function pick(s: IntersectionState) {
    return {
        phase: s.phase,
        direction: s.direction,
        enterProgress: s.enterProgress,
        leaveProgress: s.leaveProgress,
    };
}

describe("createIntersectionState", () => {
    test("starts hidden", () => {
        expect(createIntersectionState(5)).toEqual({
            phase: "hidden",
            direction: 1,
            enterProgress: 0,
            leaveProgress: 0,
            isIn: false,
            lastTime: 5,
        });
    });
});

describe("stepIntersection: transition table", () => {
    test("hidden + in → entering forward", () => {
        const s = stepIntersection(makeState({}), true, 0.25, 1);
        expect(pick(s)).toEqual({
            phase: "entering",
            direction: 1,
            enterProgress: 0.25,
            leaveProgress: 0,
        });
    });

    test("hidden + out stays hidden", () => {
        const s = stepIntersection(makeState({}), false, 0.25, 1);
        expect(s.phase).toBe("hidden");
        expect(s.enterProgress).toBe(0);
    });

    test("entering forward + out → entering backward", () => {
        const s = stepIntersection(
            makeState({ phase: "entering", enterProgress: 0.5 }),
            false,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "entering",
            direction: -1,
            enterProgress: 0.25,
            leaveProgress: 0,
        });
    });

    test("entering backward + in → entering forward", () => {
        const s = stepIntersection(
            makeState({ phase: "entering", direction: -1, enterProgress: 0.5 }),
            true,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "entering",
            direction: 1,
            enterProgress: 0.75,
            leaveProgress: 0,
        });
    });

    test("entering forward reaches 1 → shown", () => {
        const s = stepIntersection(
            makeState({ phase: "entering", enterProgress: 0.75 }),
            true,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "shown",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0,
        });
    });

    test("entering backward reaches 0 → hidden", () => {
        const s = stepIntersection(
            makeState({
                phase: "entering",
                direction: -1,
                enterProgress: 0.25,
            }),
            false,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "hidden",
            direction: 1,
            enterProgress: 0,
            leaveProgress: 0,
        });
    });

    test("shown + out → leaving forward", () => {
        const s = stepIntersection(
            makeState({ phase: "shown", enterProgress: 1 }),
            false,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "leaving",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0.25,
        });
    });

    test("shown + in stays shown", () => {
        const s = stepIntersection(
            makeState({ phase: "shown", enterProgress: 1 }),
            true,
            0.25,
            1,
        );
        expect(s.phase).toBe("shown");
        expect(s.enterProgress).toBe(1);
    });

    test("leaving forward + in → leaving backward", () => {
        const s = stepIntersection(
            makeState({
                phase: "leaving",
                enterProgress: 1,
                leaveProgress: 0.5,
            }),
            true,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "leaving",
            direction: -1,
            enterProgress: 1,
            leaveProgress: 0.25,
        });
    });

    test("leaving backward + out → leaving forward", () => {
        const s = stepIntersection(
            makeState({
                phase: "leaving",
                direction: -1,
                enterProgress: 1,
                leaveProgress: 0.5,
            }),
            false,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "leaving",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0.75,
        });
    });

    test("leaving forward reaches 1 → hidden, progress reset", () => {
        const s = stepIntersection(
            makeState({
                phase: "leaving",
                enterProgress: 1,
                leaveProgress: 0.75,
            }),
            false,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "hidden",
            direction: 1,
            enterProgress: 0,
            leaveProgress: 0,
        });
    });

    test("leaving backward reaches 0 → shown", () => {
        const s = stepIntersection(
            makeState({
                phase: "leaving",
                direction: -1,
                enterProgress: 1,
                leaveProgress: 0.25,
            }),
            true,
            0.25,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "shown",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0,
        });
    });
});

describe("stepIntersection: timing", () => {
    test("uses duration", () => {
        const s = stepIntersection(makeState({}), true, 0.5, 2);
        expect(s.enterProgress).toBe(0.25);
    });

    test("updates lastTime and isIn", () => {
        const s = stepIntersection(makeState({}), true, 3, 1);
        expect(s.lastTime).toBe(3);
        expect(s.isIn).toBe(true);
    });

    test("reversal mid-enter keeps the progress", () => {
        const s = makeState({});
        stepIntersection(s, true, 0.5, 1);
        expect(s.enterProgress).toBe(0.5);
        stepIntersection(s, false, 0.5, 1);
        expect(pick(s)).toMatchObject({
            phase: "entering",
            direction: -1,
            enterProgress: 0.5,
        });
        stepIntersection(s, false, 0.75, 1);
        expect(s.enterProgress).toBe(0.25);
    });

    test("reversal mid-leave keeps the progress", () => {
        const s = makeState({ phase: "shown", enterProgress: 1 });
        stepIntersection(s, false, 0.5, 1);
        expect(s.leaveProgress).toBe(0.5);
        stepIntersection(s, true, 0.5, 1);
        expect(pick(s)).toMatchObject({
            phase: "leaving",
            direction: -1,
            enterProgress: 1,
            leaveProgress: 0.5,
        });
        stepIntersection(s, true, 0.75, 1);
        expect(s.leaveProgress).toBe(0.25);
    });

    test("large positive dt finishes the phase, no carry-over", () => {
        const s = stepIntersection(
            makeState({ phase: "entering", enterProgress: 0.1 }),
            true,
            100,
            1,
        );
        expect(pick(s)).toEqual({
            phase: "shown",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0,
        });
    });

    test("large negative dt rolls the phase back", () => {
        const entering = stepIntersection(
            makeState({ lastTime: 10, phase: "entering", enterProgress: 0.9 }),
            true,
            0,
            1,
        );
        expect(entering.phase).toBe("hidden");
        expect(entering.enterProgress).toBe(0);

        const leaving = stepIntersection(
            makeState({
                lastTime: 10,
                phase: "leaving",
                enterProgress: 1,
                leaveProgress: 0.9,
            }),
            false,
            0,
            1,
        );
        expect(pick(leaving)).toEqual({
            phase: "shown",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0,
        });
    });

    test("negative dt does nothing in hidden or shown", () => {
        const hidden = stepIntersection(
            makeState({ lastTime: 10 }),
            false,
            0,
            1,
        );
        expect(hidden.phase).toBe("hidden");

        const shown = stepIntersection(
            makeState({ lastTime: 10, phase: "shown", enterProgress: 1 }),
            true,
            0,
            1,
        );
        expect(shown.phase).toBe("shown");
        expect(shown.enterProgress).toBe(1);
    });

    test("dt = 0 changes no progress", () => {
        // Each isIn keeps the current phase and direction.
        const cases: [IntersectionState, boolean][] = [
            [makeState({ phase: "entering", enterProgress: 0.5 }), true],
            [
                makeState({
                    phase: "entering",
                    direction: -1,
                    enterProgress: 0.5,
                }),
                false,
            ],
            [makeState({ phase: "shown", enterProgress: 1 }), true],
            [
                makeState({
                    phase: "leaving",
                    enterProgress: 1,
                    leaveProgress: 0.5,
                }),
                false,
            ],
        ];
        for (const [s, isIn] of cases) {
            const before = pick(s);
            stepIntersection(s, isIn, 0, 1);
            expect(pick(s)).toEqual(before);
        }
    });

    test("dt = 0 on enter starts entering at 0", () => {
        const s = stepIntersection(makeState({}), true, 0, 1);
        expect(pick(s)).toEqual({
            phase: "entering",
            direction: 1,
            enterProgress: 0,
            leaveProgress: 0,
        });
    });
});

describe("nextIsIn", () => {
    test("enters at threshold", () => {
        expect(nextIsIn(false, 0.5, true, 0.5, 0.2)).toBe(true);
        expect(nextIsIn(false, 0.4, true, 0.5, 0.2)).toBe(false);
    });

    test("leaves below leaveThreshold", () => {
        expect(nextIsIn(true, 0.1, true, 0.5, 0.2)).toBe(false);
        expect(nextIsIn(true, 0.2, true, 0.5, 0.2)).toBe(true);
    });

    test("ratio between thresholds keeps the previous value", () => {
        expect(nextIsIn(true, 0.3, true, 0.5, 0.2)).toBe(true);
        expect(nextIsIn(false, 0.3, true, 0.5, 0.2)).toBe(false);
    });

    test("threshold 0 uses touching", () => {
        expect(nextIsIn(false, 0, true, 0, 0)).toBe(true);
        expect(nextIsIn(false, 0, false, 0, 0)).toBe(false);
        expect(nextIsIn(true, 0, true, 0, 0)).toBe(true);
        expect(nextIsIn(true, 0, false, 0, 0)).toBe(false);
    });
});
