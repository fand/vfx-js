import type { TransitionDef } from "@vfx-js/core";

/** The old content shrinks into the center while the new one grows out of it. */
export const zoom: TransitionDef = {
    name: "zoom",
    frag: `
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  return mix(readFrom(uv1), readTo(fract(uv2)), t);
}
`,
};
