import { expect, test } from "vitest";
import { reliefHeight, reliefUniform } from "../physics/emboss.js";
import { logoKernel, logoLayout } from "./logo.js";
import { paperKernel } from "./paper-maps.js";

const disc = (w: number, h: number, r: number) => {
    const cov = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
            cov[y * w + x] = Math.min(Math.max(r - d + 0.5, 0), 1);
        }
    }
    return cov;
};

test("logo kernel: signed distance of a disc", () => {
    const k = logoKernel();
    const w = 96;
    const r = 30;
    const sd = k.signedDistance(disc(w, w, r), w, w);
    for (const [x, y] of [
        [48, 48],
        [48, 20],
        [10, 48],
        [80, 80],
    ]) {
        const exact = r - Math.hypot(x + 0.5 - w / 2, y + 0.5 - w / 2);
        expect(Math.abs(sd[y * w + x] - exact)).toBeLessThan(1);
    }
});

test("logo kernel: membrane of a disc peaks at r²/4 in the middle", () => {
    const k = logoKernel();
    const w = 128;
    const r = 50;
    const m = k.membrane(disc(w, w, r), w, w, 1);
    const peak = Math.max(...m.u);
    expect(peak / ((r * r) / 4)).toBeGreaterThan(0.9);
    expect(peak / ((r * r) / 4)).toBeLessThan(1.1);
});

test("logo kernel: build levels and layout", () => {
    const L = logoLayout(0.5);
    expect(L.W % 16).toBe(0);
    expect(L.H % 16).toBe(0);
    const k = logoKernel();
    const cov = new Float32Array(L.aw * L.ah);
    const [x0, y0, x1, y1] = L.box;
    for (let y = Math.ceil(y0); y < y1; y++) {
        for (let x = Math.ceil(x0); x < x1; x++) {
            cov[y * L.aw + x] = 1;
        }
    }
    const b = k.build({ cov, aw: L.aw, ah: L.ah, box: L.box, f: 2 });
    expect(b.w).toBe(L.W);
    expect(b.levels.at(-1)).toMatchObject({ w: 1, h: 1 });
    expect(b.areaFrac).toBeGreaterThan(0.95);
});

test("paper kernel: unit-RMS height and mip chain", () => {
    const k = paperKernel();
    const b = k.build({
        n: 128,
        tileMm: 1.28,
        stock: 0,
        fibreAmount: 0.55,
        fibreScale: 1,
        seed: 7,
    });
    expect(b.levels[0].w).toBe(128);
    expect(b.levels.at(-1)?.w).toBe(1);
    expect(b.rmsSlope).toBeGreaterThan(0);
});

test("relief: round profile reaches the height inside, 0 far outside", () => {
    const r = {
        heightMm: 0.45,
        shoulderMm: 0.6,
        profile: "round" as const,
        puff: 0,
    };
    expect(reliefHeight(2, 0, r).h).toBeCloseTo(0.45, 6);
    expect(reliefHeight(-2, 0, r).h).toBeCloseTo(0, 6);
    expect(reliefUniform(r).H).toBeCloseTo(0.45, 6);
});

test("emboss assets: half-float level → float24 byte image (rows flipped for upload)", async () => {
    const { byteImageOfHalf } = await import("../emboss-assets.js");
    const { decodeFloat24 } = await import("../spectral/float24.js");
    const k = logoKernel();
    // 1 × 2 texels, RGBA: row 0 = (1, −2, 0.5, 0), row 1 = (3, 0, 0, 0.25)
    const data = new Uint16Array(
        [1, -2, 0.5, 0, 3, 0, 0, 0.25].map((x) => k.half(x)),
    );
    const img = byteImageOfHalf(data, 1, 2);
    expect(img.w).toBe(1);
    const at = (canvasRow: number, i: number) => {
        const o = (canvasRow * 4 + i) * 4;
        return decodeFloat24(img.bytes[o], img.bytes[o + 1], img.bytes[o + 2]);
    };
    // GPU row 0 is the canvas's last row
    expect([0, 1, 2, 3].map((i) => at(1, i))).toEqual([1, -2, 0.5, 0]);
    expect([0, 1, 2, 3].map((i) => at(0, i))).toEqual([3, 0, 0, 0.25]);
});
