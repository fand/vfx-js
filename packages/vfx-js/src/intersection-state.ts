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
    /** Last frame's ratio was at or above `threshold`. */
    wasAbove: boolean;
    /** Last frame's ratio was below `leaveThreshold`. */
    wasBelow: boolean;
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
        wasAbove: false,
        wasBelow: false,
        lastTime: now,
    };
}

/**
 * In/out with hysteresis. Updates `wasAbove` / `wasBelow`, not `isIn`.
 * A threshold of 0 counts a touching element as in.
 * @internal
 */
export function nextIsIn(
    state: IntersectionState,
    ratio: number,
    touching: boolean,
    threshold: number,
    leaveThreshold: number,
): boolean {
    const above = threshold === 0 ? touching : ratio >= threshold;
    const below = leaveThreshold === 0 ? !touching : ratio < leaveThreshold;
    const justAbove = above && !state.wasAbove;
    const justBelow = below && !state.wasBelow;
    state.wasAbove = above;
    state.wasBelow = below;

    if (above && !below) {
        return true;
    }
    if (below && !above) {
        return false;
    }
    if (above && below) {
        // Both turn true at once only on add; treat it as scrolling in.
        if (justAbove) {
            return true;
        }
        if (justBelow) {
            return false;
        }
    }
    return state.isIn;
}

/**
 * Skip a frame without moving progress, e.g. while frozen.
 * The next step then starts from `now`.
 * @internal
 */
export function pauseIntersection(state: IntersectionState, now: number): void {
    state.lastTime = now;
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

    // A new enter or leave starts at 0 on this step.
    if (applyIsIn(state, isIn)) {
        return state;
    }

    // Rewinding always rolls back toward the phase start.
    const delta = (dt < 0 ? dt : state.direction * dt) / duration;

    if (state.phase === "entering") {
        const progress = state.enterProgress + delta;
        if (delta > 0 && progress >= 1) {
            setPhase(state, "shown");
        } else if (delta < 0 && progress <= 0) {
            setPhase(state, "hidden");
        } else {
            state.enterProgress = clamp01(progress);
        }
    } else if (state.phase === "leaving") {
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

/** Returns true when it starts a new enter or leave. */
function applyIsIn(state: IntersectionState, isIn: boolean): boolean {
    switch (state.phase) {
        case "hidden":
            if (isIn) {
                state.phase = "entering";
                state.direction = 1;
                return true;
            }
            return false;
        case "shown":
            if (!isIn) {
                state.phase = "leaving";
                state.direction = 1;
                return true;
            }
            return false;
        case "entering":
            state.direction = isIn ? 1 : -1;
            return false;
        case "leaving":
            state.direction = isIn ? -1 : 1;
            return false;
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
