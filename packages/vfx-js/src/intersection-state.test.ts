import { describe, expect, test } from "vitest";
import {
    createIntersectionState,
    type IntersectionState,
    nextIsIn,
    pauseIntersection,
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
            wasAbove: false,
            wasBelow: false,
            lastTime: 5,
        });
    });
});

describe("stepIntersection: transition table", () => {
    test("hidden + in → entering forward, starting at 0", () => {
        const s = stepIntersection(makeState({}), true, 0.25, 1);
        expect(pick(s)).toEqual({
            phase: "entering",
            direction: 1,
            enterProgress: 0,
            leaveProgress: 0,
        });
        stepIntersection(s, true, 0.5, 1);
        expect(s.enterProgress).toBe(0.25);
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
            leaveProgress: 0,
        });
        stepIntersection(s, false, 0.5, 1);
        expect(s.leaveProgress).toBe(0.25);
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
        const s = stepIntersection(
            makeState({ phase: "entering" }),
            true,
            0.5,
            2,
        );
        expect(s.enterProgress).toBe(0.25);
    });

    test("a new enter or leave ignores a large dt", () => {
        const entering = stepIntersection(makeState({}), true, 100, 1);
        expect(pick(entering)).toEqual({
            phase: "entering",
            direction: 1,
            enterProgress: 0,
            leaveProgress: 0,
        });

        const leaving = stepIntersection(
            makeState({ phase: "shown", enterProgress: 1 }),
            false,
            100,
            1,
        );
        expect(pick(leaving)).toEqual({
            phase: "leaving",
            direction: 1,
            enterProgress: 1,
            leaveProgress: 0,
        });
    });

    test("negative dt rolls back toward the phase start when reversed", () => {
        const entering = stepIntersection(
            makeState({
                lastTime: 10,
                phase: "entering",
                direction: -1,
                enterProgress: 0.5,
            }),
            false,
            0,
            1,
        );
        expect(entering.phase).toBe("hidden");

        const leaving = stepIntersection(
            makeState({
                lastTime: 10,
                phase: "leaving",
                direction: -1,
                enterProgress: 1,
                leaveProgress: 0.5,
            }),
            true,
            0,
            1,
        );
        expect(leaving.phase).toBe("shown");

        const partial = stepIntersection(
            makeState({
                lastTime: 1,
                phase: "entering",
                direction: -1,
                enterProgress: 0.5,
            }),
            false,
            0.75,
            1,
        );
        expect(partial.enterProgress).toBe(0.25);
    });

    test("pauseIntersection skips the paused time", () => {
        const s = makeState({ phase: "entering", enterProgress: 0.5 });
        pauseIntersection(s, 10);
        stepIntersection(s, true, 10.25, 1);
        expect(s.enterProgress).toBe(0.75);
    });

    test("updates lastTime and isIn", () => {
        const s = stepIntersection(makeState({}), true, 3, 1);
        expect(s.lastTime).toBe(3);
        expect(s.isIn).toBe(true);
    });

    test("reversal mid-enter keeps the progress", () => {
        const s = makeState({});
        stepIntersection(s, true, 0, 1);
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
        stepIntersection(s, false, 0, 1);
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
    // Runs nextIsIn over a ratio sequence, the way the player does per frame.
    function run(
        ratios: number[],
        threshold: number,
        leaveThreshold: number,
    ): boolean[] {
        const state = createIntersectionState(0);
        return ratios.map((ratio) => {
            state.isIn = nextIsIn(
                state,
                ratio,
                ratio > 0,
                threshold,
                leaveThreshold,
            );
            return state.isIn;
        });
    }

    function stateWith(fields: Partial<IntersectionState>) {
        return { ...createIntersectionState(0), ...fields };
    }

    describe("spec table", () => {
        test("above, not below → in", () => {
            const s = stateWith({});
            expect(nextIsIn(s, 0.6, true, 0.5, 0.2)).toBe(true);
        });

        test("below, not above → out", () => {
            const s = stateWith({ isIn: true, wasAbove: true });
            expect(nextIsIn(s, 0.1, true, 0.5, 0.2)).toBe(false);
        });

        test("neither → keep", () => {
            expect(
                nextIsIn(stateWith({ isIn: true }), 0.3, true, 0.5, 0.2),
            ).toBe(true);
            expect(
                nextIsIn(stateWith({ isIn: false }), 0.3, true, 0.5, 0.2),
            ).toBe(false);
        });

        test("both, above just turned true → in", () => {
            const s = stateWith({ wasBelow: true });
            expect(nextIsIn(s, 0.4, true, 0.3, 0.5)).toBe(true);
        });

        test("both, below just turned true → out", () => {
            const s = stateWith({ isIn: true, wasAbove: true });
            expect(nextIsIn(s, 0.4, true, 0.3, 0.5)).toBe(false);
        });

        test("both, neither just turned true → keep", () => {
            const flags = { wasAbove: true, wasBelow: true };
            expect(
                nextIsIn(
                    stateWith({ ...flags, isIn: true }),
                    0.4,
                    true,
                    0.3,
                    0.5,
                ),
            ).toBe(true);
            expect(
                nextIsIn(
                    stateWith({ ...flags, isIn: false }),
                    0.4,
                    true,
                    0.3,
                    0.5,
                ),
            ).toBe(false);
        });

        test("both on add → in", () => {
            expect(nextIsIn(stateWith({}), 0.4, true, 0.3, 0.5)).toBe(true);
        });

        test("updates the flags", () => {
            const s = stateWith({});
            nextIsIn(s, 0.4, true, 0.3, 0.5);
            expect(s.wasAbove).toBe(true);
            expect(s.wasBelow).toBe(true);
            nextIsIn(s, 0.6, true, 0.3, 0.5);
            expect(s.wasAbove).toBe(true);
            expect(s.wasBelow).toBe(false);
        });
    });

    test("still ratio in the band keeps the state, leaveThreshold below", () => {
        expect(run([0.6, 0.3, 0.3, 0.3], 0.5, 0.2)).toEqual([
            true,
            true,
            true,
            true,
        ]);
        expect(run([0.1, 0.3, 0.3, 0.3], 0.5, 0.2)).toEqual([
            false,
            false,
            false,
            false,
        ]);
    });

    test("still ratio in the band keeps the state, leaveThreshold above", () => {
        expect(run([0.1, 0.4, 0.4, 0.4], 0.3, 0.5)).toEqual([
            false,
            true,
            true,
            true,
        ]);
        expect(run([0.6, 0.4, 0.4, 0.4], 0.3, 0.5)).toEqual([
            true,
            false,
            false,
            false,
        ]);
    });

    test("scroll in enters at threshold, scroll out leaves at leaveThreshold", () => {
        // threshold 0.3, leaveThreshold 0.5
        expect(run([0, 0.2, 0.3, 0.4, 0.6, 1], 0.3, 0.5)).toEqual([
            false,
            false,
            true,
            true,
            true,
            true,
        ]);
        expect(run([1, 0.6, 0.5, 0.4, 0.2, 0], 0.3, 0.5)).toEqual([
            true,
            true,
            true,
            false,
            false,
            false,
        ]);
    });

    test("big jump across both lines", () => {
        expect(run([0, 1], 0.3, 0.5)).toEqual([false, true]);
        expect(run([1, 0], 0.3, 0.5)).toEqual([true, false]);
        expect(run([0, 1], 0.5, 0.2)).toEqual([false, true]);
        expect(run([1, 0], 0.5, 0.2)).toEqual([true, false]);
    });

    test("threshold 0 uses touching", () => {
        const s = stateWith({});
        expect(nextIsIn(s, 0, true, 0, 0)).toBe(true);
        s.isIn = true;
        expect(nextIsIn(s, 0, false, 0, 0)).toBe(false);
        s.isIn = false;
        expect(nextIsIn(s, 0, false, 0, 0)).toBe(false);
    });

    test("threshold 0 with a leaveThreshold above it", () => {
        // touching enters, leaves below 0.5
        expect(run([0, 0.1, 0.6, 0.4], 0, 0.5)).toEqual([
            false,
            true,
            true,
            false,
        ]);
    });
});
