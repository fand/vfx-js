import type { TransitionDef } from "@vfx-js/core";

export type SwipeDirection = "left" | "right" | "up" | "down";

// Direction the content moves, in uv space (y up).
const MOVES: Record<SwipeDirection, [number, number]> = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, 1],
    down: [0, -1],
};

/** The content moves toward `direction` and the new content follows it in. */
export function createSwipe(
    opts: { direction?: SwipeDirection } = {},
): TransitionDef {
    const [x, y] = MOVES[opts.direction ?? "left"];
    return {
        name: "swipe",
        frag: `
const vec2 move = vec2(${x.toFixed(1)}, ${y.toFixed(1)});
vec4 transition(vec2 uv, float t) {
  vec2 p = uv - move * t;
  return inRange(p) ? readFrom(p) : readTo(p + move);
}
`,
    };
}

/** Content moves left, the new content enters from the right. */
export const swipe: TransitionDef = createSwipe();
