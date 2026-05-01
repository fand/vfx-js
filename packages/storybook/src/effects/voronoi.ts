// Jittered-grid voronoi where the cells exist only as a hover effect
// near the mouse. Far from the cursor the input passes through
// unchanged; near the cursor each cell shrinks toward its site
// (perpendicular-bisector offset, *not* radial scale — keeps the
// polygonal shape) leaving transparent gaps, and the shrunken walls
// are stroked black.
//
// Border distance uses IQ's two-pass perpendicular-bisector metric (one
// pass to find the nearest site, one to take the min distance to any
// neighbour's bisector) — gives uniform-thickness borders regardless of
// site distribution, unlike the cheaper `d2 - d1` approximation.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_VORONOI = `#version 300 es
precision highp float;

in vec2 uvContent;
in vec2 uvSrc;
out vec4 outColor;

uniform sampler2D src;
// Auto-uploaded by the host; needed here because we sample src at a
// non-default UV (scaled around the cell site) and have to redo the
// content→src remap that the default vertex shader handles.
uniform vec4 srcRectUv;
uniform vec2 mouseUv;
uniform vec2 elementPx;
uniform float cellSize;
uniform float borderWidth;
uniform float falloffRadius;
uniform float maxShrink;
uniform float seed;
uniform float flatCells;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

void main() {
    vec2 contentPx = uvContent * elementPx;
    vec2 p = contentPx / cellSize;
    vec2 ipart = floor(p);
    vec2 fpart = fract(p);

    vec2 nearestSite = vec2(0.0);
    float minDistSq = 1e9;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 site = g + hash22(ipart + g + vec2(seed));
            float d = dot(site - fpart, site - fpart);
            if (d < minDistSq) {
                minDistSq = d;
                nearestSite = site;
            }
        }
    }

    // Min distance to any neighbour's perpendicular bisector — the
    // actual nearest cell wall. Skip the nearest site itself.
    float minEdge = 1e9;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 site = g + hash22(ipart + g + vec2(seed));
            vec2 d = site - nearestSite;
            if (dot(d, d) > 1e-4) {
                float t = dot((site + nearestSite) * 0.5 - fpart,
                              normalize(d));
                minEdge = min(minEdge, t);
            }
        }
    }

    // Per-cell mouse falloff. Distance is measured site→mouse so every
    // pixel in a cell shrinks by the same amount (otherwise the cell
    // would warp instead of shrinking uniformly).
    vec2 siteWorldPx = (ipart + nearestSite) * cellSize;
    vec2 mousePx = mouseUv * elementPx;
    float distMouseToSitePx = distance(siteWorldPx, mousePx);
    float falloff = 1.0 - smoothstep(falloffRadius * 0.5,
                                     falloffRadius,
                                     distMouseToSitePx);

    // Move the wall inward by shrinkPx → cells contract; gaps where
    // wallDist goes negative become transparent.
    float edgePx = minEdge * cellSize;
    float shrinkPx = falloff * maxShrink;
    float wallDist = edgePx - shrinkPx;

    // Scale the source UV around the site so the cell's original
    // content gets compressed into the shrunken footprint instead of
    // being clipped. cellScale ∈ (0, 1]: 1 → no scale, → 0 as the
    // cell collapses to its site.
    float cellScale = max(0.001, 1.0 - shrinkPx / (cellSize * 0.5));
    vec2 siteUvContent = (ipart + nearestSite) * cellSize / elementPx;
    vec2 scaledUvContent =
        siteUvContent + (uvContent - siteUvContent) / cellScale;
    // flatCells = 1 → sample at the site only; whole cell takes that
    // single colour. Useful for a stained-glass / mosaic look.
    vec2 sampleContent = mix(scaledUvContent, siteUvContent, flatCells);
    vec2 sampleUv = srcRectUv.xy + sampleContent * srcRectUv.zw;
    vec4 base = texture(src, sampleUv);

    float cellAlpha = smoothstep(-0.5, 0.5, wallDist);
    // Border = 1px-AA band of borderWidth just inside the wall. Gated
    // by cellAlpha (no border in the gap) and falloff (no borders far
    // from the mouse, so the input passes through cleanly).
    float borderMask =
        (1.0 - smoothstep(borderWidth, borderWidth + 1.0, wallDist))
        * cellAlpha * falloff;

    vec3 rgb = mix(base.rgb, vec3(0.0), borderMask);
    outColor = vec4(rgb, base.a * cellAlpha);
}
`;

export type VoronoiParams = {
    /** Cell pitch in physical px. */
    cellSize: number;
    /** Border half-width in physical px. */
    borderWidth: number;
    /** Distance from mouse at which the effect fades to 0, in physical px. */
    falloffRadius: number;
    /**
     * Max wall offset toward the cell centre at full mouse-falloff, in
     * physical px. Cells whose half-width is smaller fully collapse —
     * useful for "hole around the cursor" feel.
     */
    maxShrink: number;
    /**
     * Sample the source at the cell's site only — every pixel in a cell
     * gets the same colour (mosaic / stained-glass look).
     */
    flatCells: boolean;
    /** Hash seed; change to get a different cell layout. */
    seed: number;
};

const DEFAULT_PARAMS: VoronoiParams = {
    cellSize: 40,
    borderWidth: 1.5,
    falloffRadius: 200,
    maxShrink: 20,
    flatCells: false,
    seed: 0,
};

export class VoronoiEffect implements Effect {
    params: VoronoiParams;

    constructor(initial: Partial<VoronoiParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    /** Live-update params without recreating the effect or VFX. */
    setParams(updates: Partial<VoronoiParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const ew = Math.max(1, w);
        const eh = Math.max(1, h);
        const p = this.params;

        ctx.draw({
            frag: FRAG_VORONOI,
            uniforms: {
                src: ctx.src,
                mouseUv: [ctx.mouse[0] / ew, ctx.mouse[1] / eh],
                elementPx: [ew, eh],
                cellSize: p.cellSize,
                borderWidth: p.borderWidth,
                falloffRadius: p.falloffRadius,
                maxShrink: p.maxShrink,
                flatCells: p.flatCells ? 1 : 0,
                seed: p.seed,
            },
            target: ctx.target,
        });
    }
}
