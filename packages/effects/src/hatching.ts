// Pen-and-ink hatching. Fills the source silhouette (alpha = region
// coverage) with parallel strips of ink, with per-strip jitter on angle,
// spacing, and along-line offset for a hand-drawn look. Round or butt
// line caps, optionally animated by reseeding the jitter over time.
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

const FRAG_HATCHING = `#version 300 es
precision highp float;

in vec2 uvContent;        // 0..1 over the captured element content
out vec4 outColor;

uniform sampler2D src;    // captured element (alpha = region coverage)
uniform vec4  srcRectUv;  // content sub-rect within src texture UV (auto)
uniform vec2  resolution; // element size in physical px
uniform float pixelRatio;
uniform vec3  color;
uniform float angle;        // radians
uniform float spacing;      // CSS px between strips
uniform float lineWidth;    // CSS px
uniform float angleJitter;   // radians, per-strip
uniform float offsetJitter;  // CSS px, per-strip shift ALONG the slice (overhang)
uniform float spacingJitter; // CSS px, per-strip shift ACROSS strips (spacing wobble)
uniform float seed;          // base jitter seed
uniform float speed;         // reseed rate: floor(time*speed) steps per second
uniform float time;          // seconds since start (ctx.time)
uniform float roundCap;      // 1 = round line ends, 0 = butt (cut at region edge)
uniform float soft;          // 0..1 -> cap antialias half-width mix(0.6, 2.5) px

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }

// Region coverage at a point given in centered-pixel space.
float covAt(vec2 p) {
  vec2 contentUv = (p + resolution * 0.5) / resolution;
  return texture(src, srcRectUv.xy + contentUv * srcRectUv.zw).a;
}

void main() {
  // Centered pixel coords keep angle-jitter rotation bounded near the element.
  vec2  px = uvContent * resolution - resolution * 0.5;
  float sp = max(spacing * pixelRatio, 1.0);
  float lw = lineWidth * pixelRatio;
  float hw = lw * 0.5;
  float aa = mix(0.6, 2.5, soft);      // antialias half-width (px)
  float oj = offsetJitter * pixelRatio;
  float sj = spacingJitter * pixelRatio;

  // Perpendicular axis of the base angle -> which strip we're nominally in.
  vec2  nor = vec2(-sin(angle), cos(angle));
  float baseIndex = floor(dot(px, nor) / sp);

  // speed=0 -> static (floor(0)=0); speed=10 -> reseed every 0.1s.
  float realSeed = seed + hash(floor(time * speed)) * 100.0;

  // Evaluate the nominal strip plus +/-3 neighbours: angle jitter rotates a
  // line so it can drift into this fragment from an adjacent strip.
  float ink = 0.0;
  for (int k = -3; k <= 3; k++) {
    float idx = baseIndex + float(k);
    float a   = angle + (hash(idx * 1.37 + realSeed) - 0.5) * angleJitter;
    vec2  n2  = vec2(-sin(a), cos(a));   // strip normal
    vec2  dir = vec2( cos(a), sin(a));   // along the strip

    float center = (idx + 0.5) * sp + (hash(idx * 3.91 + realSeed) - 0.5) * 2.0 * sj;
    float dperp  = dot(px, n2) - center;

    if (abs(dperp) > hw + aa) continue;  // outside capsule radius (+AA)

    // offset jitter = translate the region-clipped slice along its own
    // direction by s -> sample the region shifted by -s*dir (endpoints overhang).
    float s    = (hash(idx * 5.23 + realSeed) - 0.5) * 2.0 * oj;
    vec2  foot = px - dperp * n2;        // nearest point on the strip's line
    vec2  base = foot - s * dir;         // overhang-shifted foot

    float ink_k;
    if (roundCap > 0.5) {
      // Capsule SDF: distance to the (region-clipped) centreline segment is
      // sqrt(dperp^2 + g^2), where g = along-line distance from base to the
      // nearest covered point. One smoothstep on that distance antialiases the
      // whole boundary -- sides AND the round cap -- uniformly.
      float g  = -1.0;
      float c0 = covAt(base);
      if (c0 > 0.5) {
        g = 0.0;                         // base already inside the region
      } else {
        float pp = c0, pn = c0;          // previous samples each direction
        for (int t = 1; t <= 24; t++) {
          float off = float(t);
          if (off > hw + aa) break;
          float cp = covAt(base + off * dir);
          float cn = covAt(base - off * dir);
          // sub-pixel crossing of the 0.5 contour keeps the circle smooth
          if (cp > 0.5) { g = off - (cp - 0.5) / max(cp - pp, 1e-3); break; }
          if (cn > 0.5) { g = off - (cn - 0.5) / max(cn - pn, 1e-3); break; }
          pp = cp; pn = cn;
        }
      }
      if (g < 0.0) continue;             // no region within cap reach
      float dist = sqrt(dperp * dperp + g * g);
      ink_k = 1.0 - smoothstep(hw - aa, hw + aa, dist);
    } else {
      // butt: infinite strip clipped to the region (region keeps its own AA).
      ink_k = (1.0 - smoothstep(hw - aa, hw + aa, abs(dperp))) * covAt(base);
    }

    ink = max(ink, ink_k);
  }

  // Premultiplied output (framework expects rgb * alpha).
  outColor = vec4(color * ink, ink);
}
`;

export type HatchingParams = {
    /** Ink colour, RGB in [0, 1]. */
    color: [number, number, number];
    /** Base hatching angle in radians. */
    angle: number;
    /** Spacing between strips, in CSS px. */
    spacing: number;
    /** Line thickness, in CSS px. */
    lineWidth: number;
    /** Per-strip angle wobble, in radians (peak-to-peak). */
    angleJitter: number;
    /**
     * Per-strip shift ALONG each line, in CSS px. Pushes the clipped
     * line ends past the region boundary so strokes overhang the
     * silhouette like hand-drawn hatching.
     */
    offsetJitter: number;
    /** Per-strip spacing wobble ACROSS strips, in CSS px. */
    spacingJitter: number;
    /** Base jitter seed. */
    seed: number;
    /**
     * Reseed rate. `0` = static; otherwise the jitter pattern is
     * re-randomised `floor(time * speed)` times per second.
     */
    speed: number;
    /** Round line ends when `true`, butt (cut at the region edge) when `false`. */
    roundCap: boolean;
    /** Cap antialias softness in [0, 1] (maps to a 0.6–2.5 px AA band). */
    soft: number;
};

const DEFAULT_PARAMS: HatchingParams = {
    color: [0.1, 0.1, 0.1],
    angle: Math.PI / 4,
    spacing: 12,
    lineWidth: 2.5,
    angleJitter: 0.25,
    offsetJitter: 4,
    spacingJitter: 0,
    seed: 0,
    speed: 0,
    roundCap: true,
    soft: 0,
};

export class HatchingEffect implements Effect {
    params: HatchingParams;

    constructor(initial: Partial<HatchingParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<HatchingParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const p = this.params;
        ctx.draw({
            frag: FRAG_HATCHING,
            uniforms: {
                src: ctx.src,
                resolution: [w || 1, h || 1],
                pixelRatio: ctx.dims.pixelRatio,
                color: p.color,
                angle: p.angle,
                spacing: p.spacing,
                lineWidth: p.lineWidth,
                angleJitter: p.angleJitter,
                offsetJitter: p.offsetJitter,
                spacingJitter: p.spacingJitter,
                seed: p.seed,
                speed: p.speed,
                roundCap: p.roundCap ? 1 : 0,
                soft: p.soft,
                time: ctx.time,
            },
            target: ctx.target,
        });
    }
}
