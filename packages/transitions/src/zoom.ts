import { type ShaderTransitionDef, shaderTransition } from "@vfx-js/core";

/** The old content zooms in while the new one grows out of the center. */
export const zoom: ShaderTransitionDef = shaderTransition({
    name: "zoom",
    overflow: true,
    frag: `
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  // Tile the new content only inside the element, so the overflow shows just the old one.
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
`,
});
