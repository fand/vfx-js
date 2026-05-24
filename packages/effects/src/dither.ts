// Zero-runtime-dep effect — imports ONLY types from @vfx-js/core.
import type { Effect, EffectContext } from "@vfx-js/core";

export type DitherAlgorithm = "bayer";

const FRAG_DITHER = `#version 300 es
precision highp float;

in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;

uniform sampler2D src;
uniform vec2 elementPx;
uniform float scale;
uniform int matrixSize;
uniform float levels;
uniform int grayscale;

const float BAYER_2[4] = float[4](0.0, 2.0, 3.0, 1.0);
const float BAYER_4[16] = float[16](
     0.0,  8.0,  2.0, 10.0,
    12.0,  4.0, 14.0,  6.0,
     3.0, 11.0,  1.0,  9.0,
    15.0,  7.0, 13.0,  5.0
);
const float BAYER_8[64] = float[64](
     0.0, 32.0,  8.0, 40.0,  2.0, 34.0, 10.0, 42.0,
    48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0,
    12.0, 44.0,  4.0, 36.0, 14.0, 46.0,  6.0, 38.0,
    60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0,
     3.0, 35.0, 11.0, 43.0,  1.0, 33.0,  9.0, 41.0,
    51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0,
    15.0, 47.0,  7.0, 39.0, 13.0, 45.0,  5.0, 37.0,
    63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0
);

// Threshold in [-0.5, 0.5). The +0.5 inside the numerator centres the
// matrix's discrete steps on each bucket so a flat 0.5 input dithers
// 50/50 instead of biasing one direction.
float bayerThreshold(ivec2 c) {
    if (matrixSize == 2) {
        int idx = (c.y & 1) * 2 + (c.x & 1);
        return (BAYER_2[idx] + 0.5) / 4.0 - 0.5;
    } else if (matrixSize == 4) {
        int idx = (c.y & 3) * 4 + (c.x & 3);
        return (BAYER_4[idx] + 0.5) / 16.0 - 0.5;
    } else {
        int idx = (c.y & 7) * 8 + (c.x & 7);
        return (BAYER_8[idx] + 0.5) / 64.0 - 0.5;
    }
}

void main() {
    if (uvContent.x < 0.0 || uvContent.x > 1.0 ||
        uvContent.y < 0.0 || uvContent.y > 1.0) {
        outColor = vec4(0.0);
        return;
    }

    vec4 srcCol = texture(src, uvSrc);

    vec2 fragCoord = uvContent * elementPx;
    ivec2 cell = ivec2(floor(fragCoord / max(scale, 1.0)));
    float threshold = bayerThreshold(cell);

    // levels = 2 collapses to 1-bit per channel. The /(L-1) scaling
    // matches the quantization step so the dither only nudges samples
    // across one threshold, not multiple.
    float L = max(2.0, levels);
    float step = 1.0 / (L - 1.0);

    vec3 rgb;
    if (grayscale == 1) {
        float lum = dot(srcCol.rgb, vec3(0.2126, 0.7152, 0.0722));
        float q = floor((lum + threshold * step) * (L - 1.0) + 0.5) * step;
        rgb = vec3(clamp(q, 0.0, 1.0));
    } else {
        vec3 dithered = srcCol.rgb + vec3(threshold) * step;
        vec3 q = floor(dithered * (L - 1.0) + 0.5) * step;
        rgb = clamp(q, 0.0, 1.0);
    }

    // Premultiplied output to match framework convention.
    outColor = vec4(rgb * srcCol.a, srcCol.a);
}
`;

export type DitherParams = {
    /** Algorithm. Currently only `"bayer"`. */
    algorithm: DitherAlgorithm;
    /** Bayer matrix size: 2, 4, or 8. Larger = finer pattern. */
    matrixSize: 2 | 4 | 8;
    /**
     * Quantization levels per channel. `2` = 1-bit per channel (pure
     * black/white in grayscale, 8 colours in RGB). Higher values
     * preserve more tonal range with subtler dithering.
     */
    levels: number;
    /** Dither pattern scale in CSS px. `1` = one matrix cell per pixel. */
    scale: number;
    /** Quantize on luminance only (grayscale output). */
    grayscale: boolean;
};

const DEFAULT_PARAMS: DitherParams = {
    algorithm: "bayer",
    matrixSize: 4,
    levels: 2,
    scale: 1,
    grayscale: false,
};

export class DitherEffect implements Effect {
    params: DitherParams;

    constructor(initial: Partial<DitherParams> = {}) {
        this.params = { ...DEFAULT_PARAMS, ...initial };
    }

    setParams(updates: Partial<DitherParams>): void {
        Object.assign(this.params, updates);
    }

    render(ctx: EffectContext): void {
        const [w, h] = ctx.dims.element;
        const p = this.params;
        ctx.draw({
            frag: FRAG_DITHER,
            uniforms: {
                src: ctx.src,
                elementPx: [Math.max(1, w), Math.max(1, h)],
                scale: Math.max(1, p.scale),
                matrixSize: p.matrixSize,
                levels: Math.max(2, p.levels),
                grayscale: p.grayscale ? 1 : 0,
            },
            target: ctx.target,
        });
    }
}
