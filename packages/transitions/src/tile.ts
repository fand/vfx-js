import { type ShaderTransitionDef, shaderTransition } from "@vfx-js/core";

/** Where the tiles start to shrink. `center` spreads out in rings; the others sweep toward that side. */
export type TileDirection = "center" | "left" | "right" | "up" | "down";

export type TileShape = "hex" | "square";

// Delay of the tile at `center`, in [0, 1]. `extent` is half the grid size, in tiles.
const DELAYS: Record<TileDirection, string> = {
    center: "length(center) / length(extent)",
    left: "(extent.x - center.x) / (extent.x * 2.0)",
    right: "(center.x + extent.x) / (extent.x * 2.0)",
    up: "(center.y + extent.y) / (extent.y * 2.0)",
    down: "(extent.y - center.y) / (extent.y * 2.0)",
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

/**
 * The old content splits into tiles that shrink away and show the new content.
 * `count` is the number of tiles along the longer side.
 * `shadow` is the opacity of the drop shadow under the shrinking tiles; 0 turns it off.
 */
export function createTile(
    opts: {
        direction?: TileDirection;
        shape?: TileShape;
        count?: number;
        shadow?: number;
    } = {},
): ShaderTransitionDef {
    const delay = DELAYS[opts.direction ?? "center"];
    const shape = SHAPES[opts.shape ?? "hex"];
    const count = Math.max(1, Math.round(opts.count ?? 12)).toFixed(1);
    const shadow = Math.min(Math.max(opts.shadow ?? 0.5, 0), 1).toFixed(3);
    return shaderTransition({
        name: "tile",
        frag: `
const float COUNT = ${count};
const float SPREAD = 0.6;
const float SHADOW = ${shadow};
// Shadow offset and blur at full lift, in tiles.
const vec2 SHADOW_OFFSET = vec2(0.05, -0.08);
const float SHADOW_BLUR = 0.12;
${shape}
vec4 transition(vec2 uv, float t) {
  // A container overflow must not show tiles outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Grid in tile units, centered on the element.
  float tilePx = max(resolution.x, resolution.y) / COUNT;
  vec2 extent = resolution * 0.5 / tilePx;
  vec4 cell = cellOf((uv - 0.5) * resolution / tilePx);
  vec2 local = cell.xy;
  vec2 center = cell.zw;

  float d = clamp(${delay}, 0.0, 1.0);
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
  float shade = SHADOW * smoothstep(0.0, 0.2, lift) * (1.0 - smoothstep(-blur, blur, shadowEdge));
  to = vec4(to.rgb * (1.0 - shade), max(to.a, shade));
  if (inside <= 0.0) return to;

  vec4 from = readFrom((center + local / scale) * tilePx / resolution + 0.5);
  from *= inside;
  return from + to * (1.0 - from.a);
}
`,
    });
}

/** Hex tiles shrink away from the center out. */
export const tile: ShaderTransitionDef = createTile();
