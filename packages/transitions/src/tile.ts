import { ShaderTransition } from "@vfx-js/core";

/** Where the tiles start to shrink. `center` spreads out in rings; the others sweep toward that side. */
export type TileDirection = "center" | "left" | "right" | "up" | "down";

export type TileShape = "hex" | "square";

export type TileParams = {
    /** Default `"center"`. */
    direction?: TileDirection;
    /** Default `"hex"`. */
    shape?: TileShape;
    /** Tiles along the longer side. Default 12. */
    count?: number;
    /** Opacity of the drop shadow under the shrinking tiles; 0 turns it off. Default 0.5. */
    shadow?: number;
};

// The side the sweep moves toward, in tile space (y up). Zero spreads out in rings.
const SWEEPS: Record<TileDirection, [number, number]> = {
    center: [0, 0],
    left: [-1, 0],
    right: [1, 0],
    up: [0, 1],
    down: [0, -1],
};

// `cellOf` returns the point relative to its tile center, then the center.
// `cellDist` is 0.5 on the tile edge.
const SHAPES: Record<TileShape, string> = {
    hex: `
const vec2 HEX = vec2(1.0, 1.7320508);
vec4 cellOf(vec2 g) {
  vec4 ids = floor(vec4(g, g - vec2(0.5, 1.0)) / HEX.xyxy) + 0.5;
  vec2 a = g - ids.xy * HEX;
  vec2 b = g - (ids.zw + 0.5) * HEX;
  vec2 local = dot(a, a) < dot(b, b) ? a : b;
  return vec4(local, g - local);
}
float cellDist(vec2 p) {
  p = abs(p);
  return max(dot(p, vec2(0.5, 0.8660254)), p.x);
}
`,
    square: `
vec4 cellOf(vec2 g) {
  vec2 center = floor(g) + 0.5;
  return vec4(g - center, center);
}
float cellDist(vec2 p) {
  p = abs(p);
  return max(p.x, p.y);
}
`,
};

const fragOf = (shape: TileShape) => `
uniform float count;
uniform float shadow;
// Zero spreads out in rings; otherwise the side the sweep moves toward.
uniform vec2 sweep;
const float SPREAD = 0.6;
// Shadow offset and blur at full lift, in tiles.
const vec2 SHADOW_OFFSET = vec2(0.05, -0.08);
const float SHADOW_BLUR = 0.12;
${SHAPES[shape]}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show tiles outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Grid in tile units, centered on the element.
  float tilePx = max(resolution.x, resolution.y) / count;
  vec2 extent = resolution * 0.5 / tilePx;
  vec4 cell = cellOf((uv - 0.5) * resolution / tilePx);
  vec2 local = cell.xy;
  vec2 center = cell.zw;

  // Delay of this tile, in [0, 1]. The extent is half the grid size, in tiles.
  float d = sweep == vec2(0.0)
    ? length(center) / length(extent)
    : 0.5 + dot(center / (extent * 2.0), sweep);
  d = clamp(d, 0.0, 1.0);
  float scale = 1.0 - smoothstep(0.0, 1.0, clamp((t - d * SPREAD) / (1.0 - SPREAD), 0.0, 1.0));
  // Distance outside the shrunk tile, in pixels.
  float edge = (cellDist(local) - 0.5 * scale) * tilePx;
  float inside = 1.0 - smoothstep(0.0, 1.0, edge);
  vec4 to = readTo(uv);
  if (scale <= 0.0) return to;

  // The tile lifts as it shrinks, so its shadow moves away and softens.
  float lift = 1.0 - scale;
  float blur = SHADOW_BLUR * lift * tilePx + 1.0;
  float shadowEdge = (cellDist(local - SHADOW_OFFSET * lift) - 0.5 * scale) * tilePx;
  float shade = shadow * smoothstep(0.0, 0.2, lift) * (1.0 - smoothstep(-blur, blur, shadowEdge));
  to = vec4(to.rgb * (1.0 - shade), max(to.a, shade));
  if (inside <= 0.0) return to;

  vec4 from = readFrom((center + local / scale) * tilePx / resolution + 0.5);
  from *= inside;
  return from + to * (1.0 - from.a);
}
`;

// The shape changes the shader, so each one is its own.
const FRAGS: Record<TileShape, string> = {
    hex: fragOf("hex"),
    square: fragOf("square"),
};

/** The old content splits into tiles that shrink away and show the new content. */
export class Tile extends ShaderTransition<TileParams> {
    readonly name = "tile";

    get frag(): string {
        return FRAGS[this.params.shape ?? "hex"];
    }

    uniforms() {
        return {
            count: Math.max(1, Math.round(this.params.count ?? 12)),
            shadow: Math.min(Math.max(this.params.shadow ?? 0.5, 0), 1),
            sweep: SWEEPS[this.params.direction ?? "center"],
        };
    }
}
