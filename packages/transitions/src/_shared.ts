import { shaderTransition } from "@vfx-js/core";

/** Reads R, G and B at their own uvs from the old or new content. */
export const SPLIT_READ = `
vec4 splitRead(vec2 uvr, vec2 uvg, vec2 uvb, bool to) {
  vec4 r = to ? readTo(uvr) : readFrom(uvr);
  vec4 g = to ? readTo(uvg) : readFrom(uvg);
  vec4 b = to ? readTo(uvb) : readFrom(uvb);
  return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}
`;

/** Interleaved gradient noise: a per-pixel offset that hides the bands between blur taps. */
export const IGN = `
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`;

/** Mirrors reads past the edge, so a warp shows content instead of holes. */
export const MIRROR = `
vec2 mirror(vec2 p) {
  return 1.0 - abs(1.0 - mod(p, 2.0));
}
`;

/** Hard cut at halfway, under effects that draw the glitch on top. */
export const hardCut = shaderTransition({
    name: "hard_cut",
    frag: `
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
`,
});
