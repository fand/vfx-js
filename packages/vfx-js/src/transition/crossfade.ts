import { shaderTransition } from "./shader.js";

export const crossfade = shaderTransition({
    name: "crossfade",
    frag: `
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`,
});
