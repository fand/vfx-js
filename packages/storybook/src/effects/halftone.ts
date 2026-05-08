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

// Ink target colors at 100% coverage on white paper
const vec3 cyanInk    = vec3(0.15, 0.73, 0.88);
const vec3 magentaInk = vec3(0.88, 0.12, 0.55);
const vec3 yellowInk  = vec3(0.97, 0.93, 0.08);
const vec3 blackInk   = vec3(0.1);
const vec3 paper      = vec3(0.99);

vec4 sampleSrc(vec2 px) {
    vec2 uv = clamp(px / elementPx, 0.0, 1.0);
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

float cmykChannel(vec3 rgb, int i) {
    float k = 1.0 - max(rgb.r, max(rgb.g, rgb.b));
    if (i == 3) return k;
    return (1.0 - rgb[i] - k) / max(1.0 - k, 1e-6);
}

vec3 inkMix(vec4 cmyk) {
    return paper
        * mix(vec3(1.0), cyanInk,    cmyk.x)
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

            vec4 dotColor = sampleSrc(renderDotLoc);
            float channelAmount = isRgb
                ? dotColor[i]
                : cmykChannel(dotColor.rgb, i);
            float dotRadius = channelAmount * maxDotRadius;
            if (fragDistanceToDotCenter < dotRadius) {
                amounts[i] += smoothstep(
                    dotRadius,
                    dotRadius - dotRadius * smoothing,
                    fragDistanceToDotCenter
                );
            }
        }
    }

    vec4 original = sampleSrc(fragCoord);

    // Build the foreground (dot layer). Alpha is the dot coverage so
    // SRC-OVER lets the background show through between dots.
    // inkFactor scales the per-channel ink AFTER the saturation clamp:
    // pre-clamp scaling let neighbour-dot overlap "boost" the visible
    // density past 1.0 before the clamp ate it, so lowering the factor
    // gave less reduction than expected. Post-clamp + re-clamp makes
    // it a true density dial.
    vec4 fg;
    if (isRgb) {
        vec3 rgbInks = clamp(
            clamp(amounts.rgb, 0.0, 1.0) * inkFactor.rgb,
            0.0, 1.0
        );
        float dotMask = clamp(rgbInks.r + rgbInks.g + rgbInks.b, 0.0, 1.0);
        fg = vec4(rgbInks, dotMask);
    } else {
        vec4 inks = clamp(
            clamp(amounts, 0.0, 1.0) * inkFactor,
            0.0, 1.0
        );
        float inkCoverage = max(max(inks.r, inks.g), max(inks.b, inks.a));
        fg = vec4(inkMix(inks), inkCoverage);
    }
    // Gate by source alpha so transparent regions of the source clear
    // the dots — without this, CMYK turns transparent pixels black (k=1).
    fg.a *= original.a;

    // Background is also masked by the source alpha so the halftone
    // respects holes in transparent source images.
    vec4 bg = vec4(background.rgb, background.a * original.a);

    // SRC-OVER, premultiplied output (the framework's canvas blend
    // expects rgb already multiplied by alpha).
    float outA = fg.a + bg.a * (1.0 - fg.a);
    vec3 outRgbPremul = fg.rgb * fg.a + bg.rgb * bg.a * (1.0 - fg.a);

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
