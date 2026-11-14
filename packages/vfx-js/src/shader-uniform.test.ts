import { afterEach, describe, expect, test, vi } from "vitest";
import { createShaderUniformFilter } from "./shader-uniform";
import type {
    EffectTexture,
    VFXCapture,
    VFXPass,
    VFXPostEffect,
    VFXProps,
    VFXUniformValue,
} from "./types";

const texture = {
    __brand: "EffectTexture",
    width: 1,
    height: 1,
} as EffectTexture;

afterEach(() => {
    vi.restoreAllMocks();
});

describe("createShaderUniformFilter", () => {
    test("passes other values through", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const filter = createShaderUniformFilter();
        const values: VFXUniformValue[] = [
            1,
            [1, 2],
            [1, 2, 3, 4],
            new Float32Array(4),
            new Int32Array(1),
            new Uint32Array(1),
        ];
        for (const value of values) {
            expect(filter(value)).toBe(value);
        }
        expect(warn).not.toHaveBeenCalled();
    });

    test("drops textures and warns once per filter", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const filter = createShaderUniformFilter();
        expect(filter(texture)).toBeNull();
        expect(filter(texture)).toBeNull();
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toMatch(/effect/);

        createShaderUniformFilter()(texture);
        expect(warn).toHaveBeenCalledTimes(2);
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
