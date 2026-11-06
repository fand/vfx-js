import { type ShaderTransitionDef, shaderTransition } from "@vfx-js/core";
import { SPLIT_READ } from "./_shared";

/** Horizontal stripes slide sideways with RGB split; the content swaps halfway. */
export const glitchSlide: ShaderTransitionDef = shaderTransition({
    name: "glitch_slide",
    frag: `
${SPLIT_READ}
// Each stripe slows down as it lands, so the end does not snap.
float shift(float x) {
  x = clamp(x, 0.0, 1.0);
  return 1.0 - (1.0 - x) * (1.0 - x);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show wrapped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float y = floor(uv.y * 53.0) / 53.0;
  float n = sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0) * 0.5 + 0.5;

  // Fade the shift in over the first 5% so the start matches the idle content.
  float k = min(t * 20.0, 1.0);
  vec2 uvr = uv, uvg = uv, uvb = uv;
  uvr.x = fract(uvr.x + shift(t * 1.8 - n * 0.2 - 0.1) * k);
  uvg.x = fract(uvg.x + shift(t * 1.8 - n * 0.2) * k);
  uvb.x = fract(uvb.x + shift(t * 1.8 - n * 0.2 + 0.1) * k);

  vec4 c1 = splitRead(uvr, uvg, uvb, false);
  vec4 c2 = splitRead(uvr, uvg, uvb, true);
  return mix(c1, c2, smoothstep(0.45, 0.55, t));
}
`,
});
