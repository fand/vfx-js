// Anamorphic flare / aperture starburst light streaks.
// A pre-pass extracts highlights on a jittered grid; bright cells become
// instanced quads stretched along each ray, accumulated into a float
// buffer and tone-mapped over the source.
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";
import { padOutputRect } from "./_pad.js";

// Premultiplied base copy, hard-masked to the inner rect so the pad
// region doesn't clamp-replicate the capture's edge texels.
const FRAG_BASE = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;

void main() {
    vec2 inS = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    vec2 inC = step(vec2(0.0), uvContent) * step(uvContent, vec2(1.0));
    float m = inS.x * inS.y * inC.x * inC.y;
    vec4 base = texture(src, clamp(uvSrc, 0.0, 1.0)) * m;
    outColor = vec4(base.rgb * base.a, base.a);
}
`;

// Integer hash and the jittered sample point of a grid cell (src uv
// space). Shared by the highlight pre-pass and the streak VS so anchor
// positions and sampled colors agree.
const GLSL_CELL = `
float hash(uint n) {
    n = (n ^ 61u) ^ (n >> 16u);
    n *= 9u;
    n = n ^ (n >> 4u);
    n *= 0x27d4eb2du;
    n = n ^ (n >> 15u);
    return float(n & 0x00ffffffu) / 16777216.0;
}

vec2 cellUv(ivec2 cell, int dim) {
    uint i = uint(cell.y * dim + cell.x);
    vec2 j = vec2(hash(i * 2u + 1u), hash(i * 2u + 2u)) - 0.5;
    return (vec2(cell) + 0.5 + j * 0.8) / float(dim);
}
`;

// Highlight pre-pass into a dim×dim buffer: rgb = clamped highlight
// color, a = gate. Runs once per frame so the per-ray streak VS reads a
// tiny texture instead of re-extracting from the full-res source.
const FRAG_HIGHLIGHT = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;   // highlight cutoff
uniform float maxBrightness; // upper clamp on source brightness
uniform int dim;
${GLSL_CELL}
void main() {
    ivec2 cell = ivec2(gl_FragCoord.xy);
    vec3 c = texture(src, cellUv(cell, dim)).rgb;
    // Max-channel knee, hue preserved, clamped so blown-out sources
    // don't dominate. gate is the highlight factor in [0,1].
    float vmax = max(max(c.r, c.g), c.b);
    if (vmax > maxBrightness) {
        c *= maxBrightness / vmax;
        vmax = maxBrightness;
    }
    float gate = max(0.0, vmax - threshold) / max(vmax, 1e-5);
    outColor = vec4(c, gate);
}
`;

// Per-instance streak quad. `position.x` runs 0→1 from the source point
// to the tip; `position.y` runs -1→1 across the (thin) width. The VS
// reads the pre-extracted highlight for its cell and lays the quad down
// in the target's NDC. Cells below threshold collapse to a degenerate
// off-screen point so the rasteriser skips them entirely.
const VERT_STREAK = `#version 300 es
precision highp float;
in vec2 position;

uniform sampler2D highlight; // dim×dim pre-pass output
uniform int dim;
// Source buffer rect and this stage's output rect, in element-local
// physical px. The host viewport equals dstRect.
uniform vec4 srcRect;
uniform vec4 dstRect;
uniform float angle;       // streak direction (rad)
uniform float lengthPx;    // max streak length (physical px)
uniform float softnessPx;  // streak cross-section width (physical px)

out float v_along;
out float v_cross;
out vec3 v_color;
out float v_gate;
${GLSL_CELL}
void main() {
    ivec2 cell = ivec2(gl_InstanceID % dim, gl_InstanceID / dim);
    vec4 hl = texelFetch(highlight, cell, 0);
    vec3 c = hl.rgb;
    float gate = hl.a;

    // Cull dim cells: collapse the quad to a single off-screen point.
    if (gate < 0.003) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_along = 0.0;
        v_cross = 0.0;
        v_color = vec3(0.0);
        v_gate = 0.0;
        return;
    }

    vec2 srcPx = srcRect.xy + cellUv(cell, dim) * srcRect.zw;
    vec2 centerNdc = (srcPx - dstRect.xy) / dstRect.zw * 2.0 - 1.0;

    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);

    vec2 offPx = dir * (position.x * lengthPx)
               + perp * (position.y * softnessPx * 0.5);

    // px → NDC delta; the divide by w/h is undone by the viewport mapping.
    vec2 ndc = centerNdc + offPx * 2.0 / dstRect.zw;
    gl_Position = vec4(ndc, 0.0, 1.0);

    v_along = position.x;
    v_cross = position.y;
    v_color = c;
    v_gate = gate;
}
`;

// Streak profile. Emits raw premultiplied color into the float
// accumulation buffer; tint and tone map happen in the composite.
const FRAG_STREAK = `#version 300 es
precision highp float;
in float v_along;
in float v_cross;
in vec3 v_color;
in float v_gate;

uniform float falloff;          // length fade decay rate
uniform float dispersion;       // -1 = blue tip, +1 = red tip
uniform float colorModulation;  // cyclic spectral hue shift along the streak
uniform float fringe;           // diffraction fringe contrast
uniform float fringeCount;      // fringes along the streak (green reference)

out vec4 outColor;

void main() {
    // Normalized exponential length falloff, pinned to 1 at the source
    // and 0 at the tip. Floor k so falloff -> 0 approaches the linear
    // limit instead of degenerating to zero output.
    float k = max(falloff, 1e-3);
    float eEnd = exp(-k);
    float base = max((exp(-k * v_along) - eEnd) / max(1.0 - eEnd, 1e-4), 0.0);
    // Dispersion: per-channel exponential reach ratio pivoting on green,
    // applied over the normalized profile so the tip fringe survives.
    float spread = dispersion * 0.8;
    vec3 perChannel = base * exp(k * spread * vec3(1.0, 0.0, -1.0) * v_along);
    // Soft gaussian cross-section so neighbouring sprites overlap into a
    // continuous sheet instead of discrete stripes.
    float crossFall = exp(-v_cross * v_cross * 2.0);
    vec3 rgb = v_color * perChannel * (crossFall * v_gate);

    // Diffraction fringes: per-channel intensity modulation whose period
    // scales with wavelength (630/530/465 nm), so all channels peak at the
    // source (white core) and separate into rainbow bands further out.
    if (fringe > 1e-4) {
        vec3 freq = fringeCount * vec3(0.8413, 1.0, 1.1398);
        vec3 m = 0.5 + 0.5 * cos(6.2831853 * freq * v_along);
        rgb *= mix(vec3(1.0), m, fringe);
    }

    // Cyclic, luminance-preserving hue shift along the streak; the slider
    // drives both cycle count and saturation.
    if (colorModulation > 1e-4) {
        const vec3 luma = vec3(0.2126, 0.7152, 0.0722);
        float lo = dot(rgb, luma);
        vec3 phase = vec3(0.0, 2.0944, 4.1888);
        float amp = colorModulation * smoothstep(0.0, 0.1, v_along);
        float cycles = 1.0 + colorModulation * 4.0;
        vec3 spec = vec3(1.0) + amp * cos(6.2831853 * v_along * cycles + phase);
        vec3 modded = max(rgb * spec, 0.0);
        float lm = dot(modded, luma);
        rgb = modded * (lm > 1e-6 ? lo / lm : 1.0);
    }

    if (max(max(rgb.r, rgb.g), rgb.b) < 1e-4) {
        discard;
    }
    outColor = vec4(rgb, 1.0);
}
`;

// Zero the accumulation buffer at the start of each frame.
const FRAG_CLEAR = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }
`;

// Tone-mapped composite of the accumulated streaks over the source.
// `1 - exp(-x)` softly saturates dense overlaps toward `tint`.
const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D accum;
uniform vec3 tint;
uniform float intensity;
uniform float norm;        // core-gain normalisation (cross-method calibration)

void main() {
    vec3 acc = max(texture(accum, uv).rgb, vec3(0.0));
    vec3 s = (1.0 - exp(-acc * norm * intensity)) * tint;
    float a = clamp(dot(s, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    outColor = vec4(s, a);
}
`;

export type LightStreakParams = {
    /**
     * Number of rays. `2` → a single horizontal axis (anamorphic flare);
     * `n` → an n-pointed aperture starburst.
     */
    streaks: number;
    /** Base rotation of the ray fan, in degrees. */
    angle: number;
    /** Max streak length in CSS (logical) px. */
    length: number;
    /**
     * Streak cross-section width ("softness") in CSS (logical) px — how
     * wide/soft each streak's gaussian profile is. Raised to at least ~one
     * grid cell so neighbouring streaks merge (see `density`); increase
     * `density` for genuinely thin-yet-continuous streaks.
     */
    softness: number;
    /**
     * Exponential length fade decay rate. Higher concentrates the
     * brightness into a tighter core near the source and trails a fainter
     * tail; lower flattens toward an even streak.
     */
    falloff: number;
    /** Highlight cutoff in [0,1]. Only highlights above this throw streaks. */
    threshold: number;
    /**
     * Upper clamp on source brightness (per Blender's highlight
     * "Maximum"), so blown-out sources don't dominate the accumulation.
     */
    maxBrightness: number;
    /**
     * Streak brightness. Drives a soft-saturating tone map
     * (`1 - exp(-acc * intensity)`), so raising it brightens without
     * clipping accumulated highlights to white.
     */
    intensity: number;
    /** Per-channel multiplier on the streak colour. */
    tint: readonly [number, number, number];
    /**
     * Chromatic dispersion, -1..1. Gives each channel a different reach so
     * the streak fringes through colour toward its tip. `+1` lets red
     * persist furthest (warm tip, like aperture diffraction); `-1` lets blue
     * persist (cool tip, refractive look); `0` is achromatic.
     */
    dispersion: number;
    /**
     * Spectral colour modulation, 0..1 (Blender's "color modulation"). A
     * cyclic hue shift along the streak — rainbow fringing layered over the
     * base colour, luminance-preserving so it tints rather than brightens.
     * Higher values rotate the hue faster (1→~5 cycles along the streak) as
     * well as more saturated. Distinct from `dispersion` (a monotone
     * tip-ward shift); 0 disables it.
     */
    colorModulation: number;
    /**
     * Diffraction fringe contrast, 0..1. Periodic brightness modulation
     * along the streak whose period scales with wavelength, so bands
     * converge to white at the source and separate into rainbow further
     * out. `0` disables it.
     */
    fringe: number;
    /** Number of fringes along the streak (green channel reference). */
    fringeCount: number;
    /**
     * Source sampling grid dimension (instance count = `density²`).
     * Higher resolves finer highlights, lets streaks be thinner without
     * banding, and costs more vertex work (most instances are culled, so
     * fragment cost stays tied to highlight count).
     */
    density: number;
    /**
     * Extra pad around the element in CSS px so streaks aren't clipped at
     * the element edge. Should be ≥ `length`. `"fullscreen"` reaches the
     * viewport edges.
     */
    pad: number | "fullscreen";
};

const DEFAULT_PARAMS: LightStreakParams = {
    streaks: 2,
    angle: 0,
    length: 160,
    softness: 2,
    falloff: 1.5,
    threshold: 0.75,
    maxBrightness: 1.0,
    intensity: 3.0,
    tint: [0.6, 0.8, 1.0],
    dispersion: -0.5,
    colorModulation: 0.0,
    fringe: 0.0,
    fringeCount: 8,
    density: 256,
    pad: 160,
};

/**
 * Light-streak effect (anamorphic flare / aperture starburst) built from
 * instanced streak sprites. Mutate `params` directly or via `setParams`;
 * uniforms are read live each frame, so a reactive UI (e.g. Tweakpane)
 * can bind straight to `effect.params`.
 */
export class LightStreakEffect implements Effect {
    params: LightStreakParams;

    #geometry: EffectGeometry | null = null;
    #geometryDensity = 0;
    #accum: EffectRenderTarget | null = null;
    #highlight: EffectRenderTarget | null = null;
    #lastW = 0;
    #lastH = 0;

    constructor(initial: Partial<LightStreakParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<LightStreakParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const dim = Math.max(2, Math.floor(this.params.density));
        if (!this.#geometry || this.#geometryDensity !== dim) {
            if (this.#geometry) {
                ctx.releaseGeometry(this.#geometry);
            }
            this.#geometry = buildGeometry(dim);
            this.#geometryDensity = dim;
            this.#highlight?.dispose();
            this.#highlight = ctx.createRenderTarget({
                size: [dim, dim] as [number, number],
                float: true,
                filter: "nearest" as const,
            });
        }
        const highlight = this.#highlight;
        if (!highlight) {
            return;
        }

        const dst = this.outputRect(ctx.dims);
        const src = ctx.dims.srcRect;
        const pr = ctx.dims.pixelRatio;

        // Full-resolution float accumulation buffer (streaks accumulate
        // past 1.0, tone-mapped at composite).
        const aw = Math.max(2, Math.round(dst[2]));
        const ah = Math.max(2, Math.round(dst[3]));
        if (aw !== this.#lastW || ah !== this.#lastH) {
            this.#accum?.dispose();
            this.#accum = ctx.createRenderTarget({
                size: [aw, ah] as [number, number],
                float: true,
                filter: "linear" as const,
            });
            this.#lastW = aw;
            this.#lastH = ah;
        }
        const accum = this.#accum;
        if (!accum) {
            return;
        }

        // Base image into the output (masked copy, not ctx.blit).
        ctx.draw({
            frag: FRAG_BASE,
            target: ctx.target,
            uniforms: { src: ctx.src },
        });

        // Extract highlights once; every ray reads this small buffer.
        ctx.draw({
            frag: FRAG_HIGHLIGHT,
            target: highlight,
            blend: "none",
            uniforms: {
                src: ctx.src,
                threshold: this.params.threshold,
                maxBrightness: this.params.maxBrightness,
                dim,
            },
        });

        // Accumulate every ray's streaks into the float buffer.
        ctx.draw({ frag: FRAG_CLEAR, target: accum, blend: "none" });

        const rays = Math.max(1, Math.round(this.params.streaks));
        const lengthPx = this.params.length * pr;
        // Floor the width to ~one grid cell so adjacent streaks overlap
        // into a continuous sheet rather than a row of discrete stripes.
        // The grid spans the src buffer, so a cell is srcRect-sized.
        const cellPx = Math.max(src[2], src[3]) / dim;
        const softnessPx = Math.max(this.params.softness * pr, cellPx * 1.8);

        const baseAngle = (this.params.angle * Math.PI) / 180;
        for (let k = 0; k < rays; k++) {
            const angle = baseAngle + (k * Math.PI * 2) / rays;
            ctx.draw({
                vert: VERT_STREAK,
                frag: FRAG_STREAK,
                geometry: this.#geometry,
                blend: "additive",
                target: accum,
                uniforms: {
                    highlight,
                    dim,
                    srcRect: [src[0], src[1], src[2], src[3]],
                    dstRect: [dst[0], dst[1], dst[2], dst[3]],
                    angle,
                    lengthPx,
                    softnessPx,
                    falloff: this.params.falloff,
                    dispersion: this.params.dispersion,
                    colorModulation: this.params.colorModulation,
                    fringe: this.params.fringe,
                    fringeCount: this.params.fringeCount,
                },
            });
        }

        // Tone-mapped, tinted composite of the accumulation over the base.
        // `norm` cancels the method's core gain (≈ rays × overlap) so the
        // streak core brightness stays stable as the ray count changes.
        ctx.draw({
            frag: FRAG_COMPOSITE,
            target: ctx.target,
            blend: "additive",
            uniforms: {
                accum,
                intensity: this.params.intensity,
                norm: 1 / (rays * 0.9),
                tint: [
                    this.params.tint[0],
                    this.params.tint[1],
                    this.params.tint[2],
                ],
            },
        });
    }

    outputRect(dims: EffectDims): readonly [number, number, number, number] {
        return padOutputRect(this.params.pad, dims);
    }

    dispose(): void {
        this.#geometry = null;
        this.#geometryDensity = 0;
        this.#accum?.dispose();
        this.#accum = null;
        this.#highlight?.dispose();
        this.#highlight = null;
        this.#lastW = 0;
        this.#lastH = 0;
    }
}

// One thin quad, instanced per grid cell. The VS derives each cell (and
// its jittered sample point) from gl_InstanceID.
function buildGeometry(dim: number): EffectGeometry {
    return {
        attributes: {
            position: {
                data: new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]),
                itemSize: 2,
            },
        },
        indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
        instanceCount: dim * dim,
    };
}
