import { expect, test } from "vitest";
import { ATLAS, SpectralAtlas } from "./atlas.js";
import { decodeFloat24, encodeFloat24, fromHalf } from "./float24.js";
import { materialFactor } from "./spd.js";
import { buildCmfLayer } from "./tables.js";

test("float24 round trip", () => {
    const b = new Uint8ClampedArray(3);
    for (const v of [
        0, 1, -1, 0.5, 3.25159, -2.5e-3, 1e-12, 123456.789, 6.1e-5, 0.9999999,
    ]) {
        encodeFloat24(v, b, 0);
        const back = decodeFloat24(b[0], b[1], b[2]);
        expect(Math.abs(back - v)).toBeLessThanOrEqual(Math.abs(v) * 8e-6);
    }
    encodeFloat24(Number.NaN, b, 0);
    expect(decodeFloat24(b[0], b[1], b[2])).toBe(0);
    encodeFloat24(1e-30, b, 0);
    expect(decodeFloat24(b[0], b[1], b[2])).toBe(0);
});

test("atlas bytes decode to the CPU tables (layer 0, conv and cum)", () => {
    const a = new SpectralAtlas();
    const { conv, cum } = buildCmfLayer(
        "equal",
        materialFactor({ type: "clear", edgeNm: 550, widthNm: 50, floor: 1 }),
    );
    const read = (row: number, i: number, c: number) => {
        const canvasRow = ATLAS.imageHeight - 1 - row;
        const o = (canvasRow * ATLAS.imageWidth + 3 * i + c) * 4;
        return decodeFloat24(a.bytes[o], a.bytes[o + 1], a.bytes[o + 2]);
    };
    for (const [j, i, c] of [
        [0, 100, 0],
        [10, 200, 1],
        [40, 511, 2],
        [20, 0, 1],
    ]) {
        const k = (j * ATLAS.width + i) * 4 + c;
        expect(read(j, i, c)).toBeCloseTo(conv[k], 5);
        expect(read(ATLAS.height + j, i, c)).toBeCloseTo(cum[k], 5);
    }
    // alpha stays opaque everywhere
    expect(a.bytes.every((v, n) => n % 4 !== 3 || v === 255)).toBe(true);
});

test("atlas builds layers lazily and bumps its version", () => {
    const a = new SpectralAtlas();
    const v = a.version;
    a.ensureLayer("tungsten");
    expect(a.version).toBe(v + 1);
    a.ensureLayer("tungsten");
    expect(a.version).toBe(v + 1);
});

test("fromHalf decodes IEEE half floats", () => {
    expect(fromHalf(0x3c00)).toBe(1);
    expect(fromHalf(0xc000)).toBe(-2);
    expect(fromHalf(0x0000)).toBe(0);
    expect(fromHalf(0x0001)).toBe(2 ** -24); // the smallest subnormal
    expect(fromHalf(0x7bff)).toBe(65504); // the largest normal
    expect(fromHalf(0x7c00)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(fromHalf(0x7e00))).toBe(true);
});
