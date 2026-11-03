import type { TransitionDef } from "./types.js";

export const crossfade: TransitionDef = {
    name: "crossfade",
    frag: `
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`,
};
