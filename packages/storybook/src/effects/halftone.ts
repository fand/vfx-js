// CMYK/RGB halftone. Per-channel rotated dot grids; dot radius tracks
// channel intensity at the dot centre. SRC-OVER onto `background`.
import type { Effect, EffectContext } from "@vfx-js/core";

export type HalftoneMode = "rgb" | "cmyk";

export type HalftoneInkPalette = {
    cyan: [number, number, number];
    magenta: [number, number, number];
    yellow: [number, number, number];
    black: [number, number, number];
    red: [number, number, number];
    green: [number, number, number];
    blue: [number, number, number];
};

export type HalftoneInkPresetName =
    | "pure"
    | "newsprint"
    | "fogra51"
    | "swop"
    | "riso-fluo"
    | "riso-classic";

// FOGRA51 / SWOP values are CIELab(D50) solids from the standards
// converted to sRGB (rounded to 3dp), so they're representative not
// colorimetrically exact — the gamuts don't fit losslessly in sRGB.
export const HALFTONE_INK_PRESETS: Record<
    HalftoneInkPresetName,
    Partial<HalftoneInkPalette>
> = {
    pure: {
        cyan: [0, 1, 1],
        magenta: [1, 0, 1],
        yellow: [1, 1, 0],
        black: [0, 0, 0],
        red: [1, 0, 0],
        green: [0, 1, 0],
        blue: [0, 0, 1],
    },
    newsprint: {
        cyan: [0.15, 0.73, 0.88],
        magenta: [0.88, 0.12, 0.55],
        yellow: [0.97, 0.93, 0.08],
        black: [0.1, 0.1, 0.1],
    },
    fogra51: {
        cyan: [0.0, 0.525, 0.765],
        magenta: [0.827, 0.0, 0.486],
        yellow: [0.984, 0.91, 0.0],
        black: [0.145, 0.145, 0.145],
    },
    swop: {
        cyan: [0.0, 0.557, 0.769],
        magenta: [0.827, 0.02, 0.478],
        yellow: [0.984, 0.902, 0.027],
        black: [0.169, 0.169, 0.169],
    },
    "riso-fluo": {
        red: [1.0, 0.29, 0.59],
        green: [0.0, 0.69, 0.71],
        blue: [1.0, 0.9, 0.0],
    },
    "riso-classic": {
        red: [1.0, 0.18, 0.21],
        green: [0.24, 0.32, 0.56],
        blue: [1.0, 0.9, 0.0],
    },
};

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
uniform float blackAmount; // GCR amount: 1.0 = max GCR (k = 1 - max(rgb)), 0.0 = pure CMY (no K)
uniform int ymck;          // 0 = RGB (additive), 1 = CMYK (subtractive)
uniform int trimEdge;      // 1 = skip dots whose extent crosses the image edge
uniform vec4 background;   // SRC-OVER backdrop, RGBA in [0, 1], non-premul
uniform vec4 inkFactor;    // per-channel scale
uniform vec3 cInk, mInk, yInk, kInk;  // CMYK ink solids at 100% coverage
uniform vec3 rInk, gInk, bInk;        // RGB inks (per-channel "ink" colour)

const vec3 RGB_ANGLES = vec3(15.0, 45.0, 75.0);
const vec4 CMYK_ANGLES = vec4(15.0, 75.0, 0.0, 45.0);

const vec2 cellOffsets[9] = vec2[9](
    vec2(0),
    vec2(-1, 0), vec2(1, 0), vec2(0, -1), vec2(0, 1),
    vec2(-1, -1), vec2(1, -1), vec2(-1, 1), vec2(1)
);

// texelFetch bypasses the framework's LINEAR filter. Bilinear at a
// transparent/opaque boundary yields gray, which cmykChannel turns
// into a phantom K dot.
vec4 sampleSrcNearest(vec2 px) {
    vec2 uv = clamp(px / elementPx, 0.0, 1.0);
    vec2 texUv = srcRectUv.xy + uv * srcRectUv.zw;
    return texelFetch(src, ivec2(texUv * srcSizePx), 0);
}

// Lower blackAmount shifts ink from K to CMY (paint model still holds
// for any k <= 1 - max(rgb)), preserving hue where max-GCR collapses to K.
float cmykChannel(vec3 rgb, int i) {
    float k = blackAmount * (1.0 - max(rgb.r, max(rgb.g, rgb.b)));
    if (i == 3) return k;
    return (1.0 - rgb[i] - k) / max(1.0 - k, 1e-6);
}

vec3 inkMix(vec4 cmyk) {
    return mix(vec3(1.0), cInk, cmyk.x)
         * mix(vec3(1.0), mInk, cmyk.y)
         * mix(vec3(1.0), yInk, cmyk.z)
         * mix(vec3(1.0), kInk, cmyk.w);
}

void main() {
    vec2 fragCoord = uvContent * elementPx;
    // Anchor the grid at the element centre so resizing gridSize scales
    // cells around the centre instead of the bottom-left corner.
    vec2 gridCenter = elementPx * 0.5;
    bool isRgb = ymck == 0;
    int channelCount = isRgb ? 3 : 4;
    float maxDotRadius = gridSize * dotSize * 0.7071068;

    // 5 cells once axis neighbours are in reach, 9 once diagonals are.
    int cellCount = dotSize < 0.7071068 ? 1 : (dotSize < 1.0 ? 5 : 9);

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

            // Skip texture fetch if fragment can't be covered.
            float fragDistanceToDotCenter = distance(fragCoord, renderDotLoc);
            if (fragDistanceToDotCenter > maxDotRadius) continue;

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

    // fg.rgb = full-strength ink, fg.a = geometric coverage. Splitting
    // these keeps AA edges from double-tinting the background.
    // inkFactor applies post-clamp + re-clamp for a true density dial.
    vec4 fg;
    if (isRgb) {
        vec3 rgbInks = clamp(
            clamp(amounts.rgb, 0.0, 1.0) * inkFactor.rgb,
            0.0, 1.0
        );
        vec3 weighted = rInk * rgbInks.r + gInk * rgbInks.g + bInk * rgbInks.b;
        // Normalise to max so the colour at AA edges stays full strength.
        float maxComp = max(max(weighted.r, weighted.g), weighted.b);
        vec3 inkColor = maxComp > 0.0 ? weighted / maxComp : vec3(0.0);
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

    // SRC-OVER, premultiplied (framework expects rgb*alpha).
    // background.a=0 disables the backdrop.
    float outA = fg.a + background.a * (1.0 - fg.a);
    vec3 outRgbPremul =
        fg.rgb * fg.a + background.rgb * background.a * (1.0 - fg.a);

    outColor = vec4(outRgbPremul, outA);
}
`;

export type HalftoneParams = {
    /** Grid pitch in physical px. */
    gridSize: number;
    /**
     * Dot size relative to the cell. 1.0 = dot exactly reaches the
     * cell corners (saturation threshold); >1.0 lets dots overlap
     * into neighbours.
     */
    dotSize: number;
    /** Soft-edge fraction of the dot radius, in [0, 1]. */
    smoothing: number;
    /** Global grid rotation in degrees, added to per-channel angles. */
    angle: number;
    /** `"rgb"` (additive) or `"cmyk"` (subtractive ink simulation). */
    mode: HalftoneMode;
    /**
     * How much black ink to use during CMYK separation, [0, 1]. CMYK
     * only: `1` = max GCR (`k = 1 - max(rgb)`); `0` = pure CMY, no K.
     * Lowering it preserves hue in dark regions that max-GCR would
     * collapse to a flat K stack.
     */
    blackAmount: number;
    /** Skip dots whose maximum extent would cross the image edge. */
    trimEdge: boolean;
    /**
     * SRC-OVER backdrop behind the dots, RGBA in [0, 1] (non-premul).
     * Default `[0, 0, 0, 0]`.
     */
    background: [number, number, number, number];
    /**
     * Per-channel ink/intensity scale. RGB mode reads `[r, g, b]`;
     * CMYK mode reads `[c, m, y, k]`. Default `[1, 1, 1, 1]`.
     */
    inkFactor: [number, number, number, number];
    /**
     * Per-channel ink colours. CMYK mode uses `cyan/magenta/yellow/black`;
     * RGB mode uses `red/green/blue`. Use {@link HalftoneEffect.setInkPreset}
     * to apply named presets, or write into the palette directly for
     * fully custom inks.
     */
    inkPalette: HalftoneInkPalette;
};

// Default: pure RGB inks + newsprint CMYK inks.
const DEFAULT_INK_PALETTE: HalftoneInkPalette = {
    ...(HALFTONE_INK_PRESETS.pure as HalftoneInkPalette),
    ...HALFTONE_INK_PRESETS.newsprint,
};

const DEFAULT_PARAMS: HalftoneParams = {
    gridSize: 10,
    dotSize: 1.0,
    smoothing: 0.15,
    angle: 0,
    mode: "rgb",
    blackAmount: 1,
    trimEdge: true,
    background: [0, 0, 0, 0],
    inkFactor: [1, 1, 1, 1],
    inkPalette: DEFAULT_INK_PALETTE,
};

export class HalftoneEffect implements Effect {
    params: HalftoneParams;

    constructor(initial: Partial<HalftoneParams> = {}) {
        this.params = {
            ...DEFAULT_PARAMS,
            ...initial,
            // Always clone the palette so each effect has its own;
            // otherwise mutating one effect's palette colours would
            // bleed into every other effect using the default.
            inkPalette: {
                ...DEFAULT_INK_PALETTE,
                ...(initial.inkPalette ?? {}),
            },
        };
    }

    setParams(updates: Partial<HalftoneParams>): void {
        Object.assign(this.params, updates);
    }

    /**
     * Apply a named ink preset. Presets are partial overlays — applying
     * a CMYK-only preset (e.g. `"fogra51"`) leaves the RGB inks alone
     * and vice versa, so a story can switch presets per mode without
     * resetting the other side.
     */
    setInkPreset(name: HalftoneInkPresetName): void {
        Object.assign(this.params.inkPalette, HALFTONE_INK_PRESETS[name]);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.elementPixel;
        const ew = Math.max(1, w);
        const eh = Math.max(1, h);
        const p = this.params;
        const ink = p.inkPalette;

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
                blackAmount: Math.max(0, Math.min(1, p.blackAmount)),
                ymck: p.mode === "cmyk" ? 1 : 0,
                trimEdge: p.trimEdge ? 1 : 0,
                background: p.background,
                inkFactor: p.inkFactor,
                cInk: ink.cyan,
                mInk: ink.magenta,
                yInk: ink.yellow,
                kInk: ink.black,
                rInk: ink.red,
                gInk: ink.green,
                bInk: ink.blue,
            },
            target: ctx.target,
        });
    }
}
