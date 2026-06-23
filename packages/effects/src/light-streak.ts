// Anamorphic / aperture-diffraction light streaks via instanced sprite
// splatting (same technique as the depth-bokeh example's disk scatter).
//
// Instead of a fullscreen separable blur, every cell of a fixed source
// grid becomes one *instance*. The vertex shader samples the source at
// the instance's UV, gates it by luminance, and — for the bright cells —
// stretches a thin quad outward along the streak direction. The fragment
// shader shapes that quad into a streak profile (exponential length
// falloff + gaussian cross-section) and emits it additively. Dim cells
// are culled in the VS by pushing the quad off-screen, so fragment work
// scales with the number of *highlights*, not the framebuffer area.
//
// One `streaks` value drives both looks:
//   - streaks = 2          → a single horizontal axis = anamorphic flare
//   - streaks = n (blades) → an n-ray aperture starburst
// A real aperture's diffraction spikes count is `blades` for an even
// blade count and `2 * blades` for an odd one; map that at the call site
// (e.g. `streaks: blades % 2 ? blades * 2 : blades`).
//
// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext, EffectGeometry } from "@vfx-js/core";

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
uniform float thicknessPx; // streak width (physical px)
uniform float threshold;   // luminance gate
uniform float gamma;       // gate response curve

out float v_along;
out float v_cross;
out vec3 v_color;
out float v_gate;

void main() {
    vec3 c = texture(src, instanceUv).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float gate = pow(smoothstep(threshold, 1.0, lum), gamma);

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
               + perp * (position.y * thicknessPx * 0.5);

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

// Streak profile + additive emission. Premultiplied output paired with an
// additive blend so overlapping streaks (and overlapping rays of a
// starburst) accumulate into highlights instead of clipping.
const FRAG_STREAK = `#version 300 es
precision highp float;
in float v_along;
in float v_cross;
in vec3 v_color;
in float v_gate;

uniform float falloff;     // tip fade exponent
uniform float intensity;   // additive gain
uniform vec3 tint;
uniform float dispersion;  // chromatic shift toward blue at the tip

out vec4 outColor;

void main() {
    // Exponential-ish fade to the tip × gaussian cross-section.
    float lineFall = pow(max(1.0 - v_along, 0.0), falloff);
    float crossFall = exp(-v_cross * v_cross * 4.0);
    float a = lineFall * crossFall * v_gate * intensity;
    if (a < 1e-4) {
        discard;
    }

    // Cheap dispersion: drift the streak toward blue along its length,
    // the way real anamorphic flares fringe toward their tips.
    vec3 col = v_color * tint;
    col = mix(col, col * vec3(0.5, 0.7, 1.0), clamp(v_along * dispersion, 0.0, 1.0));

    outColor = vec4(col * a, a);
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
    /** Streak width in CSS (logical) px. */
    thickness: number;
    /** Tip fade exponent. Higher = shorter visible tail. */
    falloff: number;
    /** Luminance gate in [0,1]. Only highlights above this throw streaks. */
    threshold: number;
    /** Gate response curve. Higher = sharper highlight selection. */
    gamma: number;
    /** Additive gain on the streaks. */
    intensity: number;
    /** Per-channel multiplier on the streak colour. */
    tint: readonly [number, number, number];
    /** Chromatic shift toward blue at the tip, 0..1. */
    dispersion: number;
    /**
     * Source sampling grid dimension (instance count = `density²`).
     * Higher resolves finer highlights at more vertex cost.
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
    thickness: 2,
    falloff: 1.5,
    threshold: 0.75,
    gamma: 2.0,
    intensity: 1.0,
    tint: [0.6, 0.8, 1.0],
    dispersion: 0.5,
    density: 160,
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

        // Base image first, then streaks additively over it.
        ctx.blit(ctx.src, ctx.target);

        const rays = Math.max(1, Math.round(this.params.streaks));
        const lengthPx = this.params.length * pr;
        const thicknessPx = this.params.thickness * pr;

        for (let k = 0; k < rays; k++) {
            const angle = this.params.angle + (k * Math.PI * 2) / rays;
            ctx.draw({
                vert: VERT_STREAK,
                frag: FRAG_STREAK,
                geometry: this.#geometry,
                blend: "additive",
                target: ctx.target,
                uniforms: {
                    src: ctx.src,
                    srcRect: [src[0], src[1], src[2], src[3]],
                    dstRect: [dst[0], dst[1], dst[2], dst[3]],
                    angle,
                    lengthPx,
                    thicknessPx,
                    threshold: this.params.threshold,
                    gamma: this.params.gamma,
                    falloff: this.params.falloff,
                    intensity: this.params.intensity,
                    tint: [
                        this.params.tint[0],
                        this.params.tint[1],
                        this.params.tint[2],
                    ],
                    dispersion: this.params.dispersion,
                },
            });
        }
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
    }
}

// Regular grid of source-sample points, one streak instance per cell.
// Cells are centred (`+0.5`) so coverage is even and stable as density
// changes. The quad spans length×width in a local frame the VS rotates.
function buildGeometry(dim: number): EffectGeometry {
    const count = dim * dim;
    const instanceUv = new Float32Array(count * 2);
    let i = 0;
    for (let y = 0; y < dim; y++) {
        for (let x = 0; x < dim; x++) {
            instanceUv[i * 2] = (x + 0.5) / dim;
            instanceUv[i * 2 + 1] = (y + 0.5) / dim;
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
