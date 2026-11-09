/** @internal */
export type Phase = "hidden" | "entering" | "shown" | "leaving";

/** @internal */
export type IntersectionState = {
    phase: Phase;
    direction: 1 | -1;
    enterProgress: number;
    leaveProgress: number;
    /** Logical in/out after hysteresis. */
    isIn: boolean;
    /** Virtual time of the last step. */
    lastTime: number;
};

/** @internal */
export function createIntersectionState(now: number): IntersectionState {
    return {
        phase: "hidden",
        direction: 1,
        enterProgress: 0,
        leaveProgress: 0,
        isIn: false,
        lastTime: now,
    };
}

/**
 * In/out with hysteresis.
 * A threshold of 0 counts a touching element as in.
 * @internal
 */
export function nextIsIn(
    wasIn: boolean,
    ratio: number,
    touching: boolean,
    threshold: number,
    leaveThreshold: number,
): boolean {
    const limit = wasIn ? leaveThreshold : threshold;
    return limit === 0 ? touching : ratio >= limit;
}

/**
 * Advance the state. Mutates and returns it.
 * `duration` must be above 0.
 * @internal
 */
export function stepIntersection(
    state: IntersectionState,
    isIn: boolean,
    now: number,
    duration: number,
): IntersectionState {
    const dt = now - state.lastTime;
    state.lastTime = now;
    state.isIn = isIn;

    applyIsIn(state, isIn);

    if (state.phase === "entering") {
        const delta = (state.direction * dt) / duration;
        const progress = state.enterProgress + delta;
        if (delta > 0 && progress >= 1) {
            setPhase(state, "shown");
        } else if (delta < 0 && progress <= 0) {
            setPhase(state, "hidden");
        } else {
            state.enterProgress = clamp01(progress);
        }
    } else if (state.phase === "leaving") {
        const delta = (state.direction * dt) / duration;
        const progress = state.leaveProgress + delta;
        if (delta > 0 && progress >= 1) {
            setPhase(state, "hidden");
        } else if (delta < 0 && progress <= 0) {
            setPhase(state, "shown");
        } else {
            state.leaveProgress = clamp01(progress);
        }
    }

    return state;
}

function applyIsIn(state: IntersectionState, isIn: boolean): void {
    switch (state.phase) {
        case "hidden":
            if (isIn) {
                state.phase = "entering";
                state.direction = 1;
            }
            break;
        case "shown":
            if (!isIn) {
                state.phase = "leaving";
                state.direction = 1;
            }
            break;
        case "entering":
            state.direction = isIn ? 1 : -1;
            break;
        case "leaving":
            state.direction = isIn ? -1 : 1;
            break;
    }
}

// Set the phase and the progress values the phase table requires.
function setPhase(state: IntersectionState, phase: "hidden" | "shown"): void {
    state.phase = phase;
    state.direction = 1;
    state.enterProgress = phase === "shown" ? 1 : 0;
    state.leaveProgress = 0;
}

function clamp01(x: number): number {
    return Math.min(Math.max(x, 0), 1);
}
