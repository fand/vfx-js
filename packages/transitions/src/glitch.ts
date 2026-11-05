import type { TransitionDef } from "@vfx-js/core";

/** Jittery RGB-split blocks; the content swaps halfway. */
export const glitch: TransitionDef = {
    name: "glitch",
    frag: `
float gnoise(float y) {
  return sin(y * 7.0) * sin(y * 17.0) * sin(y * 59.0);
}
vec2 gnoise(vec2 uv) {
  return vec2(gnoise(uv.x), gnoise(uv.y + 100.0));
}

vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show wrapped content outside the element.
  if (!inRange(uv)) return vec4(0.0);
  float amount = sin(floor(t * 10.0 + 0.5) / 10.0 * 3.141593);
  vec2 uvr = uv, uvg = uv, uvb = uv;
  if (gnoise(t * 3.0 + 10.0) > 0.0) {
    uvr += gnoise(vec2(floor(t * 21.0), floor(t * 31.0))) * vec2(1.0, 0.1) * amount;
    uvg += gnoise(vec2(floor(t * 22.0), floor(t * 32.0))) * vec2(1.0, 0.1) * amount;
    uvb += gnoise(vec2(floor(t * 23.0), floor(t * 33.0))) * vec2(1.0, 0.1) * amount;
  }
  // Wrap so shifted areas show content rather than holes.
  uvr = fract(uvr);
  uvg = fract(uvg);
  uvb = fract(uvb);

  vec4 c1 = splitRead(uvr, uvg, uvb, false);
  vec4 c2 = splitRead(uvr, uvg, uvb, true);
  return mix(c1, c2, step(0.5, t));
}
`,
};
