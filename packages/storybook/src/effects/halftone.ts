// CMYK / RGB halftone: per-channel rotated dot grids whose dot radii
// track the source channel intensity at the dot center. CMYK mode
// converts the source to CMYK and samples four screens (C/M/Y/K) at the
// classic newspaper angles; RGB mode is additive on three rotated
// grids. Both modes treat the dot mask as the foreground alpha and
// SRC-OVER-blend onto a user-supplied `background` (RGBA premul-style
// non-premul intermediate).
import type { Effect, EffectContext } from "@vfx-js/core";

export type HalftoneMode = "rgb" | "cmyk";

const FRAG_HALFTONE = `#version 300 es
precision highp float;

in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 srcSizePx;    // src texture size in texels
uniform vec2 elementPx;
uniform float gridSize;
uniform float dotSize;
uniform float smoothing;
uniform float angle;       // global grid rotation in degrees, added to per-channel angles
uniform int ymck;          // 0 = RGB (additive), 1 = CMYK (subtractive)
uniform int trimEdge;      // 1 = skip dots whose extent crosses the image edge
uniform vec4 background;   // SRC-OVER backdrop, RGBA in [0, 1], non-premul
uniform vec4 inkFactor;    // per-channel scale

const vec3 RGB_ANGLES = vec3(15.0, 45.0, 75.0);
const vec4 CMYK_ANGLES = vec4(15.0, 75.0, 0.0, 45.0);

const vec2 cellOffsets[9] = vec2[9](
    vec2(0),
    vec2(-1, 0), vec2(1, 0), vec2(0, -1), vec2(0, 1),
    vec2(-1, -1), vec2(1, -1), vec2(-1, 1), vec2(1)
);

// Ink target colors at 100% coverage. No paper constant — paper is
// the user-supplied background and shows through via SRC-OVER.
const vec3 cyanInk    = vec3(0.15, 0.73, 0.88);
const vec3 magentaInk = vec3(0.88, 0.12, 0.55);
const vec3 yellowInk  = vec3(0.97, 0.93, 0.08);
const vec3 blackInk   = vec3(0.1);

// NEAREST read for dot-centre samples. The framework binds src with
// LINEAR filter, but bilinear interpolation between an opaque colour
// pixel and an adjacent transparent (rgb=0, a=0) pixel produces gray
// rgb at the boundary, which cmykChannel turns into a black K dot —
// the classic non-premul filter artefact. texelFetch ignores the
// filter mode so we get the actual stored texel.
vec4 sampleSrcNearest(vec2 px) {
    vec2 uv = clamp(px / elementPx, 0.0, 1.0);
    vec2 texUv = srcRectUv.xy + uv * srcRectUv.zw;
    return texelFetch(src, ivec2(texUv * srcSizePx), 0);
}

float cmykChannel(vec3 rgb, int i) {
    float k = 1.0 - max(rgb.r, max(rgb.g, rgb.b));
    if (i == 3) return k;
    return (1.0 - rgb[i] - k) / max(1.0 - k, 1e-6);
}

vec3 inkMix(vec4 cmyk) {
    return mix(vec3(1.0), cyanInk,    cmyk.x)
         * mix(vec3(1.0), magentaInk, cmyk.y)
         * mix(vec3(1.0), yellowInk,  cmyk.z)
         * mix(vec3(1.0), blackInk,   cmyk.w);
}

void main() {
    vec2 fragCoord = uvContent * elementPx;
    // Anchor the grid at the element centre so resizing gridSize scales
    // cells around the centre instead of the bottom-left corner.
    vec2 gridCenter = elementPx * 0.5;
    bool isRgb = ymck == 0;
    int channelCount = isRgb ? 3 : 4;
    float maxDotRadius = gridSize * dotSize;

    // Axis neighbors only reach when dotSize >= 0.5,
    // diagonals only when dotSize >= 1/sqrt(2) ~= 0.7071
    int cellCount = dotSize < 0.5 ? 1 : (dotSize < 0.7071068 ? 5 : 9);

    vec4 amounts = vec4(0.0);

    for (int i = 0; i < 4; ++i) {
        if (i >= channelCount) break;

        float channelAngle = isRgb ? RGB_ANGLES[i] : CMYK_ANGLES[i];
        float rotRad = radians(channelAngle + angle);
        float c = cos(rotRad);
        float s = sin(rotRad);

        // cTrans rotates screen -> grid space; ccTrans is its inverse
        mat2 ccTrans = mat2(c, s, -s, c);
        mat2 cTrans = mat2(c, -s, s, c);

        vec2 gridFragLoc = cTrans * (fragCoord - gridCenter);
        vec2 gridOriginLoc = floor(gridFragLoc / gridSize);

        for (int j = 0; j < 9; ++j) {
            if (j >= cellCount) break;
            vec2 cell = gridOriginLoc + cellOffsets[j];
            vec2 gridDotLoc = cell * gridSize + vec2(gridSize / 2.0);
            vec2 renderDotLoc = ccTrans * gridDotLoc + gridCenter;

            // Early-exit: skip texture fetch if fragment can't be covered
            float fragDistanceToDotCenter = distance(fragCoord, renderDotLoc);
            if (fragDistanceToDotCenter > maxDotRadius) continue;

            // Skip dots whose maximum extent would cross the image edge
            if (trimEdge == 1 && (
                any(lessThan(renderDotLoc, vec2(maxDotRadius))) ||
                any(greaterThan(renderDotLoc, elementPx - vec2(maxDotRadius)))
            )) continue;

            vec4 dotColor = sampleSrcNearest(renderDotLoc);
            float channelAmount = isRgb
                ? dotColor[i]
                : cmykChannel(dotColor.rgb, i);
            // Scale by source alpha at the dot centre so dots shrink
            // (instead of getting hard-clipped) at the source silhouette.
            // Also kills the CMYK k=1 black artefact for transparent
            // pixels (rgb=0 → k=1 without this).
            float dotRadius = channelAmount * dotColor.a * maxDotRadius;
            if (fragDistanceToDotCenter < dotRadius) {
                amounts[i] += smoothstep(
                    dotRadius,
                    dotRadius - dotRadius * smoothing,
                    fragDistanceToDotCenter
                );
            }
        }
    }

    // Build the foreground (dot layer). Coverage and density are split:
    // fg.rgb is the FULL-STRENGTH ink colour (independent of how much
    // of this fragment a dot covers) and fg.a is the geometric coverage.
    // Mixing the two via SRC-OVER then gives the right perceptual blend
    // with the background, e.g. K=0.5 at an AA edge over white paper
    // becomes 0.5*black + 0.5*paper instead of getting paper-tinted
    // twice (once in inkMix, once in SRC-OVER) and going light gray.
    //
    // inkFactor scales post-clamp + re-clamp so it's a true density dial
    // (pre-clamp scaling let neighbour-dot overlap >1 absorb reductions).
    vec4 fg;
    if (isRgb) {
        vec3 rgbInks = clamp(
            clamp(amounts.rgb, 0.0, 1.0) * inkFactor.rgb,
            0.0, 1.0
        );
        // Normalise to max so the colour at AA edges stays full strength.
        float maxInk = max(max(rgbInks.r, rgbInks.g), rgbInks.b);
        vec3 inkColor = maxInk > 0.0 ? rgbInks / maxInk : vec3(0.0);
        // Multiplicative complement: probability that AT LEAST ONE
        // channel covers this fragment (channels overlap stochastically).
        float dotMask = 1.0
            - (1.0 - rgbInks.r) * (1.0 - rgbInks.g) * (1.0 - rgbInks.b);
        fg = vec4(inkColor, dotMask);
    } else {
        vec4 inks = clamp(
            clamp(amounts, 0.0, 1.0) * inkFactor,
            0.0, 1.0
        );
        float maxInk = max(max(inks.x, inks.y), max(inks.z, inks.w));
        vec4 normInks = maxInk > 0.0 ? inks / maxInk : vec4(0.0);
        vec3 inkColor = inkMix(normInks);
        float inkCoverage = 1.0
            - (1.0 - inks.x) * (1.0 - inks.y) * (1.0 - inks.z) * (1.0 - inks.w);
        fg = vec4(inkColor, inkCoverage);
    }

    // SRC-OVER, premultiplied output (the framework's canvas blend
    // expects rgb already multiplied by alpha). Background is the
    // user-supplied colour as-is — it fills the canvas; halftone-only
    // composition is just background.a = 0.
    float outA = fg.a + background.a * (1.0 - fg.a);
    vec3 outRgbPremul =
        fg.rgb * fg.a + background.rgb * background.a * (1.0 - fg.a);

    outColor = vec4(outRgbPremul, outA);
}
`;

export type HalftoneParams = {
    /** Grid pitch in physical px. */
    gridSize: number;
    /** Max dot radius as a fraction of `gridSize`, in [0, 1]. */
    dotSize: number;
    /** Soft-edge fraction of the dot radius, in [0, 1]. */
    smoothing: number;
    /** Global grid rotation in degrees, added to per-channel angles. */
    angle: number;
    /** `"rgb"` (additive) or `"cmyk"` (subtractive ink simulation). */
    mode: HalftoneMode;
    /** Skip dots whose maximum extent would cross the image edge. */
    trimEdge: boolean;
    /**
     * SRC-OVER backdrop behind the dots, RGBA in [0, 1] (non-premul).
     * Alpha is multiplied by the source alpha so transparent source
     * regions clear the backdrop too. Default `[0, 0, 0, 0]`.
     */
    background: [number, number, number, number];
    /**
     * Per-channel ink/intensity scale. RGB mode reads `[r, g, b]`;
     * CMYK mode reads `[c, m, y, k]`. Default `[1, 1, 1, 1]`.
     */
    inkFactor: [number, number, number, number];
};

const DEFAULT_PARAMS: HalftoneParams = {
    gridSize: 10,
    dotSize: 0.7,
    smoothing: 0.15,
    angle: 0,
    mode: "rgb",
    trimEdge: false,
    background: [0, 0, 0, 0],
    inkFactor: [1, 1, 1, 1],
};

export class HalftoneEffect implements Effect {
    params: HalftoneParams;

    constructor(initial: Partial<HalftoneParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<HalftoneParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const ew = Math.max(1, w);
        const eh = Math.max(1, h);
        const p = this.params;

        ctx.draw({
            frag: FRAG_HALFTONE,
            uniforms: {
                src: ctx.src,
                srcSizePx: [ctx.src.width || 1, ctx.src.height || 1],
                elementPx: [ew, eh],
                gridSize: Math.max(1, p.gridSize),
                dotSize: Math.max(0, p.dotSize),
                smoothing: Math.max(0, Math.min(1, p.smoothing)),
                angle: p.angle,
                ymck: p.mode === "cmyk" ? 1 : 0,
                trimEdge: p.trimEdge ? 1 : 0,
                background: p.background,
                inkFactor: p.inkFactor,
            },
            target: ctx.target,
        });
    }
}
