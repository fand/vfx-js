// Jittered-grid voronoi: cells appear as a hover effect near the
// mouse. Each affected cell shrinks toward its site (perpendicular-
// bisector offset, not radial scale — keeps the polygon shape) and
// gets a black stroke; gaps fall back to bgColor.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_VORONOI = `#version 300 es
precision highp float;

in vec2 uvContent;
in vec2 uvSrc;
out vec4 outColor;

uniform sampler2D src;
// Auto-uploaded by the host; we redo the content→src remap manually
// because we sample at a UV scaled around the site.
uniform vec4 srcRectUv;
uniform vec2 mouseUv;
uniform vec2 elementPx;
uniform float cellSize;
uniform float borderWidth;
uniform float falloffRadius;
uniform float maxShrink;
uniform float seed;
uniform float flatCells;
uniform float time;
uniform float speed;
uniform vec4 bgColor;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

vec2 jitterFor(vec2 cell) {
    vec2 base = hash22(cell + vec2(seed));
    if (speed > 0.0) {
        // Amplitude capped at 0.25 so sites stay inside the 3×3
        // search neighbourhood as they orbit.
        vec2 phase = hash22(cell + vec2(seed + 100.0)) * 6.2831853;
        base += 0.25 * vec2(
            sin(time * speed + phase.x),
            cos(time * speed + phase.y)
        );
    }
    return base;
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
            vec2 site = g + jitterFor(ipart + g);
            float d = dot(site - fpart, site - fpart);
            if (d < minDistSq) {
                minDistSq = d;
                nearestSite = site;
            }
        }
    }

    // IQ's two-pass perpendicular-bisector distance — uniform-width
    // borders, unlike the cheaper d2-d1 approximation.
    float minEdge = 1e9;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 site = g + jitterFor(ipart + g);
            vec2 d = site - nearestSite;
            if (dot(d, d) > 1e-4) {
                float t = dot((site + nearestSite) * 0.5 - fpart,
                              normalize(d));
                minEdge = min(minEdge, t);
            }
        }
    }

    // Per-cell falloff (site→mouse) so the whole cell shrinks
    // uniformly rather than warping.
    vec2 siteWorldPx = (ipart + nearestSite) * cellSize;
    vec2 mousePx = mouseUv * elementPx;
    float falloff = smoothstep(falloffRadius, 0.,
                               distance(siteWorldPx, mousePx));

    float edgePx = minEdge * cellSize;
    // maxShrink ∈ [0, 1] as a fraction of the cell half-width, so 1.0
    // collapses a fully-falloff cell to its site.
    float shrinkPx = falloff * maxShrink * cellSize * 0.5;
    float wallDist = edgePx - shrinkPx;

    // Scale UV around the site so the original cell content
    // compresses into the shrunken footprint instead of being clipped.
    float cellScale = max(0.001, 1.0 - shrinkPx / (cellSize * 0.5));
    vec2 siteUvContent = (ipart + nearestSite) * cellSize / elementPx;
    vec2 scaledUvContent =
        siteUvContent + (uvContent - siteUvContent) / cellScale;
    vec2 sampleContent = mix(scaledUvContent, siteUvContent, flatCells);
    vec4 base = texture(src, srcRectUv.xy + sampleContent * srcRectUv.zw);

    float aa = fwidth(wallDist);
    float imageMask =
        smoothstep(borderWidth - aa, borderWidth + aa, wallDist);
    // One-sided: fade only into the gap, so on-wall pixels stay solid
    // when shrink is 0.
    float visibleMask = smoothstep(-aa, 0.0, wallDist);
    // Threshold on shrinkPx — must NOT be a smooth function of
    // falloff. mix(base, 0, falloff) at mid-falloff cells leaks 30%+
    // base colour through the cell outline.
    float borderActive = smoothstep(0.5, 1.5, shrinkPx);
    float borderMix = (1.0 - imageMask) * borderActive;

    vec3 cellRgb = mix(base.rgb, vec3(0.0), borderMix);
    // Force opacity to 1 in the border so black covers the gap edge
    // cleanly even when the source has alpha < 1.
    float cellAlpha = mix(base.a, 1.0, borderMix);
    vec3 rgb = mix(bgColor.rgb, cellRgb, visibleMask);
    float alpha = mix(bgColor.a, cellAlpha, visibleMask);
    outColor = vec4(rgb, alpha);
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
     * Max shrink at full falloff, as a fraction of the cell
     * half-width. 0 = no shrink, 1 = the cell collapses to its site.
     */
    maxShrink: number;
    /** Sample at the cell's site only — mosaic / stained-glass look. */
    flatCells: boolean;
    /** Hash seed; change for a different cell layout. */
    seed: number;
    /** Animation rate, rad/sec. 0 = static. */
    speed: number;
    /**
     * Hex fill for shrunk-cell gaps. `#rgb`, `#rgba`, `#rrggbb`, or
     * `#rrggbbaa`; alpha defaults to ff. Default `#00000000`.
     */
    bgColor: string;
};

const DEFAULT_PARAMS: VoronoiParams = {
    cellSize: 40,
    borderWidth: 1.5,
    falloffRadius: 200,
    maxShrink: 1,
    flatCells: false,
    seed: 0,
    speed: 0,
    bgColor: "#00000000",
};

function parseHexColor(hex: string): [number, number, number, number] {
    let s = hex.startsWith("#") ? hex.slice(1) : hex;
    if (s.length === 3 || s.length === 4) {
        s = s
            .split("")
            .map((c) => c + c)
            .join("");
    }
    if (s.length === 6) s += "ff";
    if (s.length !== 8) return [0, 0, 0, 0];
    const r = Number.parseInt(s.slice(0, 2), 16) / 255;
    const g = Number.parseInt(s.slice(2, 4), 16) / 255;
    const b = Number.parseInt(s.slice(4, 6), 16) / 255;
    const a = Number.parseInt(s.slice(6, 8), 16) / 255;
    return [r, g, b, a];
}

export class VoronoiEffect implements Effect {
    params: VoronoiParams;

    constructor(initial: Partial<VoronoiParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

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
                time: ctx.time,
                speed: Math.max(0, p.speed),
                bgColor: parseHexColor(p.bgColor),
            },
            target: ctx.target,
        });
    }
}
