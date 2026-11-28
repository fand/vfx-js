// LTC tables (data/ltc.ts) as a float24 byte image for the GPU decode pass (FRAG_DECODE_RGBA) (one value per pixel, 4 per RGBA texel; table 1 in GPU rows [0, 64), table 2 in [64, 128)).
import { LTC_1, LTC_2 } from "./data/ltc.js";
import { encodeFloat24, fromHalf } from "./spectral/float24.js";

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
        // half floats stored as differences from the row above, high bytes then low bytes (gen-holo-ltc.mjs) →
        // float24 bytes
        const src = decodeBase64(b64);
        const n = src.length / 2;
        const h = new Uint16Array(n);
        for (let i = 0; i < n; i++) {
            const d = (src[i] << 8) | src[n + i];
            h[i] = (d + (i >= width ? h[i - width] : 0)) & 0xffff;
        }
        for (let j = 0; j < LTC_SIZE; j++) {
            const row = height - 1 - (t * LTC_SIZE + j);
            for (let x = 0; x < width; x++) {
                encodeFloat24(
                    fromHalf(h[j * width + x]),
                    img,
                    4 * (row * width + x),
                );
            }
        }
    });
    return img;
}

/** Decodes the float24 byte image (4 values per output texel, from row uRowOffset) into an RGBA float target: one LTC table (uRowOffset 0 or 64), and the logo and paper maps. */
export const FRAG_DECODE_RGBA_MAIN = `
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
