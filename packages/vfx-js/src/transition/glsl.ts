/**
 * Shared GLSL around each transition body.
 * `readFrom` / `readTo` already swap roles when playing in reverse, so a
 * transition only writes the forward animation.
 * Reads outside [0, 1] return transparent black.
 */
export const PRELUDE = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D from;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float t;
uniform float reverse;
uniform vec2 resolution;
uniform float time;

bool inRange(vec2 p) {
  return all(greaterThanEqual(p, vec2(0.0))) && all(lessThanEqual(p, vec2(1.0)));
}
vec4 readOld(vec2 p) {
  return inRange(p) ? texture(from, p) : vec4(0.0);
}
vec4 readNew(vec2 p) {
  return inRange(p) ? texture(src, srcRectUv.xy + p * srcRectUv.zw) : vec4(0.0);
}
vec4 readFrom(vec2 p) {
  return reverse > 0.5 ? readNew(p) : readOld(p);
}
vec4 readTo(vec2 p) {
  return reverse > 0.5 ? readOld(p) : readNew(p);
}
`;

/**
 * A pixel partly covered (e.g. blur samples that fell outside the element)
 * becomes opaque with its average color. Fully empty stays empty.
 * Output is premultiplied, so alpha 1 keeps rgb as is.
 */
export const MAIN = `
void main() {
  vec4 c = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
  outColor = c.a > 0.0 ? vec4(c.rgb / c.a, 1.0) : vec4(0.0);
}
`;

export function buildFrag(body: string): string {
    return `${PRELUDE}\n${body}\n${MAIN}`;
}

/** Line in the full shader where the transition body starts, minus one. */
export const BODY_OFFSET = PRELUDE.split("\n").length;

/**
 * Turn a WebGL compile error into lines that point into the transition body,
 * e.g. "line 3: '}' : syntax error". Returns null if `err` is not one.
 */
export function describeGlslError(err: unknown): string[] | null {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/compile failed|link failed/i.test(msg)) {
        return null;
    }
    const lines: string[] = [];
    for (const m of msg.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)) {
        const line = Number(m[1]) - BODY_OFFSET;
        lines.push(line >= 1 ? `line ${line}: ${m[2]}` : m[2]);
    }
    return lines.length > 0 ? lines : [msg.split("\n")[0]];
}
