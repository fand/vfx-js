// 24-bit float packing of the spectral tables into the RGB bytes of an opaque 8-bit canvas.
//
// vfx-js uploads only DOM sources (or a WebGLTexture it does not own), so float data travels as bytes: one value per
// canvas pixel, R = sign·128 + biased exponent (7 bits, bias 63), G·256 + B = 16-bit mantissa. Alpha stays 255, so
// neither premultiplication nor colour management changes the bytes. Zero (and anything below 2^-62) is (0, 0, 0).
// Relative precision 2^-17 ≈ 7.6e-6, finer than the half floats holospot stores.

const BIAS = 63;

/** Packs v into out[o], out[o + 1], out[o + 2]. */
export function encodeFloat24(
    v: number,
    out: Uint8ClampedArray,
    o: number,
): void {
    const a = Math.abs(v);
    if (!(a >= 2 ** (1 - BIAS)) || !Number.isFinite(v)) {
        out[o] = 0;
        out[o + 1] = 0;
        out[o + 2] = 0;
        return;
    }
    let e = Math.floor(Math.log2(a));
    let m = Math.round((a / 2 ** e - 1) * 65536);
    if (m >= 65536) {
        m = 0;
        e += 1;
    } else if (m < 0) {
        m += 65536;
        e -= 1;
    }
    const eb = Math.min(Math.max(e + BIAS, 1), 127);
    out[o] = (v < 0 ? 128 : 0) + eb;
    out[o + 1] = m >> 8;
    out[o + 2] = m & 255;
}

/** CPU twin of the GLSL decoder. */
export function decodeFloat24(b0: number, b1: number, b2: number): number {
    const e = b0 & 127;
    if (e === 0) {
        return 0;
    }
    const v = (1 + (b1 * 256 + b2) / 65536) * 2 ** (e - BIAS);
    return b0 >= 128 ? -v : v;
}

/** GLSL decoder of one canvas texel (bytes as read through a UNORM8 texture). */
export const GLSL_DECODE_FLOAT24 = `
float decodeFloat24(vec3 c) {
    vec3 b = floor(c * 255.0 + 0.5);
    float e = mod(b.x, 128.0);
    if (e < 0.5) return 0.0;
    float v = (1.0 + (b.y * 256.0 + b.z) / 65536.0) * exp2(e - ${BIAS.toFixed(1)});
    return b.x >= 128.0 ? -v : v;
}
`;

/** Half float → float. */
export function fromHalf(h: number): number {
    const s = h & 0x8000 ? -1 : 1;
    const e = (h >> 10) & 0x1f;
    const m = h & 0x3ff;
    if (e === 0) {
        return s * m * 2 ** -24;
    }
    if (e === 31) {
        return m ? Number.NaN : s * Number.POSITIVE_INFINITY;
    }
    return s * (1 + m / 1024) * 2 ** (e - 15);
}
