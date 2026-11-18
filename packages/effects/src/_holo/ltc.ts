// LTC tables (data/ltc.ts) as a float24 byte image for the GPU decode pass (FRAG_DECODE_LTC) (one value per pixel, 4 per RGBA texel; table 1 in GPU rows [0, 64), table 2 in [64, 128)).
import { LTC_1, LTC_2 } from "./data/ltc.js";

export const LTC_SIZE = 64;
export const LTC_IMAGE = { width: 4 * LTC_SIZE, height: 2 * LTC_SIZE } as const;

function decodeBase64(s: string): Uint8Array {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

/** RGBA bytes, canvas row order (row 0 = top). */
export function ltcImageBytes(): Uint8ClampedArray<ArrayBuffer> {
    const { width, height } = LTC_IMAGE;
    const img = new Uint8ClampedArray(width * height * 4).fill(255);
    [LTC_1, LTC_2].forEach((b64, t) => {
        const src = decodeBase64(b64);
        for (let j = 0; j < LTC_SIZE; j++) {
            const row = height - 1 - (t * LTC_SIZE + j);
            for (let x = 0; x < width; x++) {
                const s = 3 * (j * width + x);
                const d = 4 * (row * width + x);
                img[d] = src[s];
                img[d + 1] = src[s + 1];
                img[d + 2] = src[s + 2];
            }
        }
    });
    return img;
}

/** Decodes one 64 × 64 table (uRowOffset 0 or 64) of the byte image into an RGBA float target. */
export const FRAG_DECODE_LTC_MAIN = `
uniform sampler2D uBytes;
uniform int uRowOffset;
out vec4 outColor;
void main() {
    ivec2 t = ivec2(gl_FragCoord.xy);
    int y = t.y + uRowOffset;
    outColor = vec4(
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 1, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 2, y), 0).rgb),
        decodeFloat24(texelFetch(uBytes, ivec2(4 * t.x + 3, y), 0).rgb));
}
`;
