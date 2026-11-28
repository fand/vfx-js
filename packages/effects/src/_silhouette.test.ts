import { describe, expect, test } from "vitest";
import { buildShape } from "./_silhouette.js";

const W = 32;
const H = 16;

/**
 * Premultiplied RGBA, bottom-up: the left half opaque and dark, the right
 * half transparent, and a bright square inside the left half.
 */
function image(): Uint8Array {
    const px = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W / 2; x++) {
            const i = (y * W + x) * 4;
            const bright = x >= 4 && x < 12 && y >= 4 && y < 12;
            const v = bright ? 255 : 20;
            px.set([v, v, v, 255], i);
        }
    }
    return px;
}

/** The pixels of the mask inside the silhouette, read back from the SDF. */
function insideCount(shape: ReturnType<typeof buildShape>) {
    if (!shape) {
        throw new Error("no shape");
    }
    const pad = (shape.sdfW - W) / 2;
    let n = 0;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = (y + pad) * shape.sdfW + x + pad;
            if (shape.sdf[i * 4] < 0) {
                n++;
            }
        }
    }
    return n;
}

// No smoothing, so the sign of the field matches the mask exactly.
const build = (
    px: Uint8Array | Float32Array,
    channel: Parameters<typeof buildShape>[3],
) => buildShape(px, W, H, channel, W / H, 0, 0);

describe("buildShape channels", () => {
    test('"alpha": where alpha ≥ 0.5', () => {
        const shape = build(image(), "alpha");
        expect(shape).not.toBeNull();
        expect(insideCount(shape)).toBe((W / 2) * H);
    });

    test('"luminance": where the premultiplied luminance ≥ 0.5', () => {
        const shape = build(image(), "luminance");
        expect(shape).not.toBeNull();
        expect(insideCount(shape)).toBe(8 * 8);

        // White at half alpha is premultiplied to 128: luminance × alpha
        // is just over 0.5. At alpha 0.4 it is under.
        const half = new Uint8Array(W * H * 4);
        for (let i = 0; i < W * H; i++) {
            half.set([128, 128, 128, 128], i * 4);
        }
        expect(insideCount(build(half, "luminance"))).toBe(W * H);
        half.fill(102);
        expect(build(half, "luminance")).toBeNull();
    });

    test('"luminance" weighs the channels (Rec. 709)', () => {
        const px = new Uint8Array(W * H * 4);
        for (let i = 0; i < W * H; i++) {
            // Pure green: 0.7152; pure red would be 0.2126.
            px.set(i % 2 ? [0, 255, 0, 255] : [255, 0, 0, 255], i * 4);
        }
        expect(insideCount(build(px, "luminance"))).toBe((W * H) / 2);
    });

    test('"none": the whole rect, even when transparent', () => {
        const shape = build(new Uint8Array(W * H * 4), "none");
        expect(shape).not.toBeNull();
        expect(insideCount(shape)).toBe(W * H);
        expect(shape?.shapeHalf).toEqual([1, H / W]);
    });

    test("float pixels are read in 0..1", () => {
        const px = new Float32Array(W * H * 4);
        for (let i = 0; i < W * H; i++) {
            px.set([0.6, 0.6, 0.6, 0.6], i * 4);
        }
        expect(insideCount(build(px, "alpha"))).toBe(W * H);
        expect(insideCount(build(px, "luminance"))).toBe(W * H);
        px.fill(0.4);
        expect(build(px, "alpha")).toBeNull();
        expect(build(px, "luminance")).toBeNull();
    });

    test("an unknown channel reads as alpha", () => {
        const shape = build(
            image(),
            "luma" as unknown as Parameters<typeof buildShape>[3],
        );
        expect(insideCount(shape)).toBe((W / 2) * H);
    });
});
