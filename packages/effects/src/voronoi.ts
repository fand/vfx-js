// Jittered-grid voronoi: cells appear as a hover effect near the
// mouse. Each affected cell scales uniformly around its site
// (preserves polygon shape); gaps fall back to bgColor.
import type { Effect, EffectContext } from "@vfx-js/core";
import { GLSL_SIMPLEX3 } from "./_simplex3.js";

const FRAG_VORONOI = `#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
// Auto-uploaded by the host; we redo the content→src remap manually
// because we sample at a UV scaled around the site.
uniform vec4 srcRectUv;
uniform vec2 mouseUv;
uniform vec2 elementPx;
uniform float cellSize;
uniform float pressRadius;
uniform float press;
uniform float seed;
uniform float flatCells;
uniform float time;
uniform float speed;
uniform float breatheSpeed;
uniform float breathe;
uniform float breatheScale;
uniform vec4 bgColor;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

${GLSL_SIMPLEX3}
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

    // Get grid-cell info for 9 neighbors
    vec2 sites[9];
    vec2 nearestSite = vec2(0.0);
    vec2 nearestG = vec2(0.0);
    float minDistSq = 1e9;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(i, j);
            vec2 site = g + jitterFor(ipart + g);
            sites[(j + 1) * 3 + (i + 1)] = site;
            float d = dot(site - fpart, site - fpart);
            if (d < minDistSq) {
                minDistSq = d;
                nearestSite = site;
                nearestG = g;
            }
        }
    }
    vec2 ownerCell = ipart + nearestG;

    // Mouse falloff + per-cell breathe noise → total shrink.
    vec2 siteWorldPx = (ipart + nearestSite) * cellSize;
    vec2 mousePx = mouseUv * elementPx;
    float falloff = smoothstep(pressRadius, 0.,
                               distance(siteWorldPx, mousePx));

    float noiseShrink = 0.0;
    if (breathe > 0.0) {
        vec3 noisePos = vec3(
            ownerCell * cellSize / breatheScale + vec2(seed + 200.0),
            time * breatheSpeed
        );
        noiseShrink = breathe * max(0.0, snoise(noisePos));
    }
    float shrink = noiseShrink + press * falloff;

    // Distance to original cell edge (for stable AA), and to the
    // edge of the cell scaled uniformly around its site by
    // (1 - shrink) — per-neighbour offset preserves polygon shape.
    float minEdgeOrig = 1e9;
    float minEdgeShrunk = 1e9;
    for (int k = 0; k < 9; k++) {
        vec2 site = sites[k];
        vec2 d = site - nearestSite;
        float dlen2 = dot(d, d);
        if (dlen2 > 1e-4) {
            float dlen = sqrt(dlen2);
            float t = dot((site + nearestSite) * 0.5 - fpart, d / dlen);
            minEdgeOrig = min(minEdgeOrig, t);
            minEdgeShrunk = min(minEdgeShrunk, t - dlen * 0.5 * shrink);
        }
    }
    float edgePx = minEdgeOrig * cellSize;
    float wallDist = minEdgeShrunk * cellSize;

    // Scale UV around the site
    float cellScale = max(0.001, 1.0 - shrink);
    vec2 siteUvContent = siteWorldPx / elementPx;
    vec2 scaledUvContent =
        siteUvContent + (uvContent - siteUvContent) / cellScale;
    vec2 sampleContent = mix(scaledUvContent, siteUvContent, flatCells);
    vec4 base = texture(src, srcRectUv.xy + sampleContent * srcRectUv.zw);

    // fwidth on edgePx, not wallDist: shrink jumps at cell seams and
    // would spike fwidth there, leaking src through 1 px of bgColor.
    float aa = fwidth(edgePx);
    float visibleMask = smoothstep(-aa, 0.0, wallDist);

    // src is premultiplied; premultiply bgColor to match.
    vec4 bg = vec4(bgColor.rgb * bgColor.a, bgColor.a);
    outColor = mix(bg, base, visibleMask);
}
`;

export type VoronoiParams = {
    /** Cell pitch in physical px. */
    cellSize: number;
    /** Distance from mouse at which `press` fades to 0, in physical px. */
    pressRadius: number;
    /**
     * Mouse-driven shrink, as a fraction of the cell half-width.
     * 0 = no shrink, 1 = the cell collapses to its site.
     */
    press: number;
    /** Sample at the cell's site only — mosaic / stained-glass look. */
    flatCells: boolean;
    /** Hash seed; change for a different cell layout. */
    seed: number;
    /** Animation rate, rad/sec. 0 = static. */
    speed: number;
    /** Noise-driven shrink for cells outside mouse falloff, in [0, 1]. */
    breathe: number;
    /** Animation rate of `breathe`. 0 = static. */
    breatheSpeed: number;
    /** Spatial scale of `breathe` noise, in physical px. */
    breatheScale: number;
    /**
     * Hex fill for shrunk-cell gaps. `#rgb`, `#rgba`, `#rrggbb`, or
     * `#rrggbbaa`; alpha defaults to ff. Default `#00000000`.
     */
    bgColor: string;
};

const DEFAULT_PARAMS: VoronoiParams = {
    cellSize: 40,
    pressRadius: 200,
    press: 1,
    flatCells: false,
    seed: 0,
    speed: 0,
    breathe: 0,
    breatheSpeed: 0,
    breatheScale: 40,
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
    if (s.length === 6) {
        s += "ff";
    }
    if (s.length !== 8) {
        return [0, 0, 0, 0];
    }
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
                pressRadius: p.pressRadius,
                press: p.press,
                flatCells: p.flatCells ? 1 : 0,
                seed: p.seed,
                time: ctx.time,
                speed: Math.max(0, p.speed),
                breathe: Math.max(0, p.breathe),
                breatheSpeed: Math.max(0, p.breatheSpeed),
                breatheScale: Math.max(1, p.breatheScale),
                bgColor: parseHexColor(p.bgColor),
            },
            target: ctx.target,
        });
    }
}
