import type { TransitionDef } from "@vfx-js/core";

/** Horizontal stripes slide sideways with RGB split; the content swaps halfway. */
export const glitchSlide: TransitionDef = {
    name: "glitch_slide",
    frag: `
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}

vec4 transition(vec2 uv, float t) {
  float y = floor(uv.y * 53.0) / 53.0;
  float n = sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0) * 0.5 + 0.5;

  // Fade the shift in over the first 5% so the start matches the idle content.
  float k = min(t * 20.0, 1.0);
  vec2 uvr = uv, uvg = uv, uvb = uv;
  uvr.x = fract(uvr.x + clamp(t * 1.8 - n * 0.2 - 0.1, 0.0, 1.0) * k);
  uvg.x = fract(uvg.x + clamp(t * 1.8 - n * 0.2, 0.0, 1.0) * k);
  uvb.x = fract(uvb.x + clamp(t * 1.8 - n * 0.2 + 0.1, 0.0, 1.0) * k);

  vec4 c1 = splitRead(uvr, uvg, uvb, false);
  vec4 c2 = splitRead(uvr, uvg, uvb, true);
  return mix(c1, c2, smoothstep(0.45, 0.55, t));
}
`,
};
