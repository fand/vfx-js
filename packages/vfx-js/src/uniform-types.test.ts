import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
    EffectTexture,
    VFXCapture,
    VFXPass,
    VFXPostEffect,
    VFXProps,
} from "./types";

const texture = {
    __brand: "EffectTexture",
    width: 1,
    height: 1,
} as EffectTexture;

afterEach(() => {
    vi.restoreAllMocks();
});

describe("skipTextureHandle", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    test("keeps other values", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { skipTextureHandle } = await import("./gl/program");
        const { Vec2 } = await import("./gl/vec");
        const values = [
            1,
            true,
            [1, 2],
            new Vec2(),
            new Float32Array(4),
            new Int32Array(1),
            new Uint32Array(1),
        ];
        for (const value of values) {
            expect(skipTextureHandle(value)).toBe(false);
        }
        expect(warn).not.toHaveBeenCalled();
    });

    test("skips a texture handle and warns once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { skipTextureHandle } = await import("./gl/program");
        expect(skipTextureHandle(texture)).toBe(true);
        expect(skipTextureHandle(texture)).toBe(true);
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toMatch(/effect/);
    });
});

describe("uniform types", () => {
    // Checked by tsc in the lint step.
    test("accept a capture texture", () => {
        const capture = { texture } as VFXCapture;
        const props: VFXProps = {
            uniforms: { page: capture.texture, amount: 1 },
        };
        const generated: VFXProps = {
            uniforms: { page: () => capture.texture },
        };
        const post: VFXPostEffect = {
            uniforms: { page: capture.texture },
        };
        const pass: VFXPass = {
            frag: "",
            uniforms: { page: capture.texture },
        };
        // @ts-expect-error the capture itself is not a uniform value
        const wrong: VFXProps = { uniforms: { page: capture } };
        expect([props, generated, post, pass, wrong]).toHaveLength(5);
    });
});
