// Jittered-grid voronoi where cells exist only as a border overlay,
// revealed inside a falloff radius around the mouse. The image passes
// through unchanged outside that radius.
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
uniform vec2 mouseUv;
uniform vec2 elementPx;
uniform float cellSize;
uniform float borderWidth;
uniform float falloffRadius;
uniform float seed;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

void main() {
    vec4 base = texture(src, uvSrc);

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

    float edgePx = minEdge * cellSize;
    float borderMask = 1.0 - smoothstep(borderWidth, borderWidth + 1.0,
                                        edgePx);

    vec2 mousePx = mouseUv * elementPx;
    float distFromMouse = distance(contentPx, mousePx);
    float falloff = 1.0 - smoothstep(falloffRadius * 0.7,
                                     falloffRadius,
                                     distFromMouse);

    float k = borderMask * falloff;
    outColor = vec4(mix(base.rgb, vec3(0.0), k), base.a);
}
`;

export type VoronoiOptions = {
    /** Cell pitch in physical px. Default 40. */
    cellSize?: number;
    /** Border half-width in physical px. Default 1.5. */
    borderWidth?: number;
    /** Distance from mouse at which borders fade to 0, in physical px. Default 200. */
    falloffRadius?: number;
    /** Hash seed; change to get a different cell layout. Default 0. */
    seed?: number;
};

/**
 * Stateful voronoi effect — do NOT reuse across elements; construct a
 * new instance via this factory per `vfx.add()` call.
 */
export function createVoronoiEffect(opts: VoronoiOptions = {}): Effect {
    const cellSize = opts.cellSize ?? 40;
    const borderWidth = opts.borderWidth ?? 1.5;
    const falloffRadius = opts.falloffRadius ?? 200;
    const seed = opts.seed ?? 0;
    return {
        render(ctx: EffectContext) {
            const [w, h] = ctx.dims.elementPixel;
            const ew = Math.max(1, w);
            const eh = Math.max(1, h);
            ctx.draw({
                frag: FRAG_VORONOI,
                uniforms: {
                    src: ctx.src,
                    mouseUv: [ctx.mouse[0] / ew, ctx.mouse[1] / eh],
                    elementPx: [ew, eh],
                    cellSize,
                    borderWidth,
                    falloffRadius,
                    seed,
                },
                target: ctx.target,
            });
        },
    };
}
