import { ShaderTransition } from "@vfx-js/core";
import { IGN } from "./_shared";

export type SwipeDirection = "left" | "right" | "up" | "down";

export type SwipeParams = {
    /** Where the content moves. Default `"left"`. */
    direction?: SwipeDirection;
};

// Direction the content moves, in uv space (y up).
const MOVES: Record<SwipeDirection, [number, number]> = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, 1],
    down: [0, -1],
};

/**
 * The content moves toward `direction` and the new content follows it in.
 * Mid-way it stretches along the move and blurs with the motion.
 */
export class Swipe extends ShaderTransition<SwipeParams> {
    readonly name = "swipe";
    readonly frag = `
uniform vec2 move;
const float STRETCH = 0.6;
const float BLUR = 0.2;
const float TAPS = 16.0;

${IGN}
// The old and new content as one strip along the move.
vec4 strip(vec2 p) {
  return inRange(p) ? readFrom(p) : readTo(p + move);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show shifted content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Peaks halfway, when the content moves fastest.
  float speed = sin(t * 3.141593);
  vec2 scale = 1.0 + abs(move) * speed * STRETCH;
  vec2 p = (uv - 0.5) / scale + 0.5 - move * t;
  float jitter = ign(gl_FragCoord.xy);
  vec4 c = vec4(0.0);
  for (float i = 0.0; i < TAPS; i += 1.0) {
    float k = (i + jitter) / TAPS - 0.5;
    c += strip(p + move * k * speed * BLUR);
  }
  return c / TAPS;
}
`;

    uniforms() {
        return { move: MOVES[this.params.direction ?? "left"] };
    }
}
