import { type ShaderTransitionDef, shaderTransition } from "@vfx-js/core";

/** Where the tiles start to shrink. `center` spreads out in rings; the others sweep toward that side. */
export type TileDirection = "center" | "left" | "right" | "up" | "down";

// Delay of the tile at `id`, in [0, 1]. `extent` is half the grid size, in tiles.
const DELAYS: Record<TileDirection, string> = {
    center: "length(id) / length(extent)",
    left: "(extent.x - id.x) / (extent.x * 2.0)",
    right: "(id.x + extent.x) / (extent.x * 2.0)",
    up: "(id.y + extent.y) / (extent.y * 2.0)",
    down: "(extent.y - id.y) / (extent.y * 2.0)",
};

/**
 * The old content splits into square tiles that shrink away and show the new content.
 * `count` is the number of tiles along the longer side.
 */
export function createTile(
    opts: { direction?: TileDirection; count?: number } = {},
): ShaderTransitionDef {
    const delay = DELAYS[opts.direction ?? "center"];
    const count = Math.max(1, Math.round(opts.count ?? 12)).toFixed(1);
    return shaderTransition({
        name: "tile",
        frag: `
const float COUNT = ${count};
const float SPREAD = 0.6;

vec4 transition(vec2 uv, float t) {
  // A container overflow must not show tiles outside the element.
  if (!inRange(uv)) return vec4(0.0);
  // Grid in tile units, centered on the element.
  float tilePx = max(resolution.x, resolution.y) / COUNT;
  vec2 extent = resolution * 0.5 / tilePx;
  vec2 g = (uv - 0.5) * resolution / tilePx;
  vec2 id = floor(g) + 0.5;

  float d = clamp(${delay}, 0.0, 1.0);
  float scale = 1.0 - smoothstep(0.0, 1.0, clamp((t - d * SPREAD) / (1.0 - SPREAD), 0.0, 1.0));
  vec2 local = g - id;
  // Distance outside the shrunk tile, in tile units.
  vec2 edge = abs(local) - 0.5 * scale;
  float inside = 1.0 - smoothstep(0.0, 1.0, max(edge.x, edge.y) * tilePx);
  vec4 to = readTo(uv);
  if (scale <= 0.0 || inside <= 0.0) return to;
  vec4 from = readFrom((id + local / scale) * tilePx / resolution + 0.5);
  from *= inside;
  return from + to * (1.0 - from.a);
}
`,
    });
}

/** Tiles shrink away from the center out. */
export const tile: ShaderTransitionDef = createTile();
