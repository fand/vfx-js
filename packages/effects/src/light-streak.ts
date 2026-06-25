// Anamorphic / aperture-diffraction light streaks via instanced sprite
// splatting (same technique as the depth-bokeh example's disk scatter).
//
// Instead of a fullscreen separable blur, every cell of a fixed source
// grid becomes one *instance*. The vertex shader samples the source at
// the instance's UV, gates it by luminance, and — for the bright cells —
// stretches a thin quad outward along the streak direction. The fragment
// shader shapes that quad into a streak profile (exponential length
// falloff + gaussian cross-section). Dim cells are culled in the VS by
// pushing the quad off-screen, so fragment work scales with the number of
// *highlights*, not the framebuffer area.
//
// Streaks accumulate into a float buffer and are then tone-mapped
// (1 - exp(-x)) over the source, so dense overlaps saturate toward `tint`
// instead of clipping to white. The sample grid is jittered and each
// sprite is at least ~one cell wide, so adjacent streaks merge into a
// continuous sheet rather than a row of stripes.
//
// One `streaks` value drives both looks:
//   - streaks = 2          → a single horizontal axis = anamorphic flare
//   - streaks = n (blades) → an n-ray aperture starburst
// A real aperture's diffraction spikes count is `blades` for an even
// blade count and `2 * blades` for an odd one; map that at the call site
// (e.g. `streaks: blades % 2 ? blades * 2 : blades`).
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";

// Premultiplied base copy, hard-masked to the inner rect. Used instead of
// ctx.blit (which has no bounds check and would clamp-replicate the
// capture's edge texels across the padded region as `pad` grows).
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

// Per-instance streak quad. `position.x` runs 0→1 from the source point
// to the tip; `position.y` runs -1→1 across the (thin) width. The VS
// samples the source at `instanceUv`, derives a luminance gate, and lays
// the quad down in the target's NDC. Cells below threshold collapse to a
// degenerate off-screen triangle so the rasteriser skips them entirely.
const VERT_STREAK = `#version 300 es
precision highp float;
in vec2 position;
in vec2 instanceUv;

uniform sampler2D src;
// Source buffer rect and this stage's output rect, both in element-local
// physical px. The host viewport already equals dstRect, so mapping a
// source point into [-1,1] NDC is (srcPx - dstRect.xy) / dstRect.zw.
uniform vec4 srcRect;
uniform vec4 dstRect;
uniform float angle;       // streak direction (rad)
uniform float lengthPx;    // max streak length (physical px)
uniform float softnessPx;  // streak cross-section width (physical px)
uniform float threshold;   // highlight cutoff
uniform float maxBrightness; // upper clamp on source brightness

out float v_along;
out float v_cross;
out vec3 v_color;
out float v_gate;

void main() {
    vec3 c = texture(src, instanceUv).rgb;
    // Shared highlight extraction (max-channel knee, hue preserved), with
    // an upper clamp so blown-out sources don't dominate. gate is the
    // highlight factor in [0,1]; the emitted highlight is c * gate.
    float vmax = max(max(c.r, c.g), c.b);
    if (vmax > maxBrightness) {
        c *= maxBrightness / vmax;
        vmax = maxBrightness;
    }
    float gate = max(0.0, vmax - threshold) / max(vmax, 1e-5);

    // Cull dim cells: collapse the quad to a single off-screen point.
    if (gate < 0.003) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_along = 0.0;
        v_cross = 0.0;
        v_color = vec3(0.0);
        v_gate = 0.0;
        return;
    }

    vec2 srcPx = srcRect.xy + instanceUv * srcRect.zw;
    vec2 centerNdc = (srcPx - dstRect.xy) / dstRect.zw * 2.0 - 1.0;

    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(-dir.y, dir.x);

    // Brighter highlights throw longer streaks.
    float len = lengthPx * gate;
    vec2 offPx = dir * (position.x * len)
               + perp * (position.y * softnessPx * 0.5);

    // px → NDC delta. The asymmetric divide by w/h is undone when NDC is
    // mapped back onto the viewport, so on-screen the streak stays true
    // to its px direction.
    vec2 ndc = centerNdc + offPx * 2.0 / dstRect.zw;
    gl_Position = vec4(ndc, 0.0, 1.0);

    v_along = position.x;
    v_cross = position.y;
    v_color = c;
    v_gate = gate;
}
`;

// Streak profile. Emits the *raw* (un-tinted, un-scaled) streak colour,
// premultiplied, into a float accumulation buffer with additive blend.
// Tinting and brightness control happen later in the composite so the
// accumulation can be tone-mapped before it clips.
const FRAG_STREAK = `#version 300 es
precision highp float;
in float v_along;
in float v_cross;
in vec3 v_color;
in float v_gate;

uniform float falloff;          // tip fade exponent
uniform float dispersion;       // chromatic shift toward blue at the tip
uniform float colorModulation;  // cyclic spectral hue shift along the streak

out vec4 outColor;

void main() {
    float t = max(1.0 - v_along, 0.0);
    // Per-channel length falloff (Blender-style chromatic dispersion):
    // red dims fastest and blue persists, so the streak fringes through
    // colour toward its tip. dispersion widens the channel spread; 0
    // collapses to a single uniform falloff.
    vec3 perChannel = vec3(
        pow(t, falloff + dispersion * 3.0),
        pow(t, falloff + dispersion * 1.5),
        pow(t, falloff)
    );
    // Soft gaussian cross-section so neighbouring sprites overlap into a
    // continuous sheet instead of discrete stripes.
    float crossFall = exp(-v_cross * v_cross * 2.0);
    vec3 rgb = v_color * perChannel * (crossFall * v_gate);

    // Spectral colour modulation (Blender "color modulation"): a 120°-offset
    // cosine palette cycles the hue with distance along the streak, then is
    // rescaled to the original luminance so it shifts *colour*, not
    // brightness. The amplitude ramps in from the core so the bright base
    // (the light itself) stays neutral and the rainbow fringes the body.
    // Where dispersion is a monotone tip-ward shift, this adds the cyclic
    // multi-hue fringing the iterative Glare filter produces. Stronger
    // modulation rotates the hue faster — like Blender accumulating a bigger
    // per-iteration shift — so the slider drives *both* the band count
    // (1→~5 cycles) and the saturation, not just saturation.
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
// `1 - exp(-streak * intensity)` softly saturates: dense, overlapping
// streaks (e.g. off bright text) approach `tint` instead of clipping to
// white. Added over the already-drawn base.
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
     * `n` → an n-pointed aperture starburst. For a physical aperture map
     * blade count to spikes: `blades` if even, `2 * blades` if odd.
     */
    streaks: number;
    /** Base rotation of the ray fan, in radians. */
    angle: number;
    /** Max streak length in CSS (logical) px. Brighter cells reach further. */
    length: number;
    /**
     * Streak cross-section width ("softness") in CSS (logical) px — how
     * wide/soft each streak's gaussian profile is. Raised to at least ~one
     * grid cell so neighbouring streaks merge (see `density`); increase
     * `density` for genuinely thin-yet-continuous streaks.
     */
    softness: number;
    /** Tip fade exponent. Higher = shorter visible tail. */
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
     * Chromatic dispersion, 0..1. Spreads the per-channel length falloff
     * (red dims fastest, blue persists) so the streak fringes through
     * colour toward its tip; 0 disables it.
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
    dispersion: 0.5,
    colorModulation: 0.0,
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
            this.#geometry = buildGeometry(dim);
            this.#geometryDensity = dim;
        }

        const dst = this.outputRect(ctx.dims);
        const src = ctx.dims.srcRect;
        const pr = ctx.dims.pixelRatio;

        // Full-resolution float accumulation buffer (streaks accumulate
        // past 1.0, tone-mapped at composite).
        const aw = Math.max(2, Math.round(dst[2]));
        const ah = Math.max(2, Math.round(dst[3]));
        if (aw !== this.#lastW || ah !== this.#lastH) {
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

        // Accumulate every ray's streaks into the float buffer.
        ctx.draw({ frag: FRAG_CLEAR, target: accum, blend: "none" });

        const rays = Math.max(1, Math.round(this.params.streaks));
        const lengthPx = this.params.length * pr;
        // Floor the width to ~one grid cell so adjacent streaks overlap
        // into a continuous sheet rather than a row of discrete stripes.
        const [ew, eh] = ctx.dims.elementPixel;
        const cellPx = Math.max(ew, eh) / dim;
        const softnessPx = Math.max(this.params.softness * pr, cellPx * 1.8);

        for (let k = 0; k < rays; k++) {
            const angle = this.params.angle + (k * Math.PI * 2) / rays;
            ctx.draw({
                vert: VERT_STREAK,
                frag: FRAG_STREAK,
                geometry: this.#geometry,
                blend: "additive",
                target: accum,
                uniforms: {
                    src: ctx.src,
                    srcRect: [src[0], src[1], src[2], src[3]],
                    dstRect: [dst[0], dst[1], dst[2], dst[3]],
                    angle,
                    lengthPx,
                    softnessPx,
                    threshold: this.params.threshold,
                    maxBrightness: this.params.maxBrightness,
                    falloff: this.params.falloff,
                    dispersion: this.params.dispersion,
                    colorModulation: this.params.colorModulation,
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

    outputRect(
        dims: Parameters<NonNullable<Effect["outputRect"]>>[0],
    ): readonly [number, number, number, number] {
        if (this.params.pad === "fullscreen") {
            return dims.canvasRect;
        }
        const px = this.params.pad * dims.pixelRatio;
        const [, , ew, eh] = dims.contentRect;
        return [-px, -px, ew + 2 * px, eh + 2 * px];
    }

    dispose(): void {
        this.#geometry = null;
        this.#geometryDensity = 0;
        this.#accum = null;
        this.#lastW = 0;
        this.#lastH = 0;
    }
}

// Deterministic per-instance hash in [0,1). Stable across rebuilds so the
// jitter pattern doesn't shimmer when density changes.
function hash(n: number): number {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
}

// Source-sample grid, one streak instance per cell. Cells are centred and
// jittered within their cell so a continuous bright region (a text stroke,
// a headlight) doesn't sample on a regular lattice — which would re-emit
// as evenly-spaced stripes. The quad spans length×width in a local frame
// the VS rotates.
function buildGeometry(dim: number): EffectGeometry {
    const count = dim * dim;
    const instanceUv = new Float32Array(count * 2);
    let i = 0;
    for (let y = 0; y < dim; y++) {
        for (let x = 0; x < dim; x++) {
            const jx = (hash(i * 2 + 1) - 0.5) * 0.8;
            const jy = (hash(i * 2 + 2) - 0.5) * 0.8;
            instanceUv[i * 2] = (x + 0.5 + jx) / dim;
            instanceUv[i * 2 + 1] = (y + 0.5 + jy) / dim;
            i++;
        }
    }
    return {
        attributes: {
            position: {
                data: new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]),
                itemSize: 2,
            },
            instanceUv: {
                data: instanceUv,
                itemSize: 2,
                perInstance: true,
            },
        },
        indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
        instanceCount: count,
    };
}
