import { afterEach, describe, expect, it, vi } from "vitest";
import { fromAttr, splitProps, toAttr } from "./props";
import { registerVFX, resetRegistry } from "./registry";

describe("toAttr", () => {
    it("drops undefined fields", () => {
        expect(toAttr({ shader: "rgbShift", release: undefined })).toBe(
            '{"shader":"rgbShift"}',
        );
    });

    it("round-trips through fromAttr", () => {
        const attr = toAttr({
            shader: "uvGradient",
            uniforms: { speed: 2, color: [1, 0, 0, 1] },
            overflow: [10, 20, 10, 20],
            overlay: true,
        });
        expect(fromAttr(attr)).toEqual({
            props: {
                shader: "uvGradient",
                uniforms: { speed: 2, color: [1, 0, 0, 1] },
                overflow: [10, 20, 10, 20],
                overlay: true,
            },
        });
    });
});

describe("splitProps", () => {
    it("splits effect props from the rest", () => {
        const [effect, rest] = splitProps({
            shader: "rgbShift",
            zIndex: 1,
            src: "/a.png",
            alt: "",
        });
        expect(effect).toEqual({ shader: "rgbShift", zIndex: 1 });
        expect(rest).toEqual({ src: "/a.png", alt: "" });
    });
});

describe("fromAttr", () => {
    afterEach(() => {
        resetRegistry();
        vi.restoreAllMocks();
    });

    it("returns null props for invalid JSON", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(fromAttr("{oops")).toEqual({ props: null });
        expect(fromAttr("[1]")).toEqual({ props: null });
        expect(error).toHaveBeenCalledTimes(2);
    });

    it("keeps GLSL as is", () => {
        const glsl = "void main() { outColor = vec4(1); }";
        expect(fromAttr(toAttr({ shader: glsl })).props).toEqual({
            shader: glsl,
        });
    });

    it("resolves a registered multipass shader", () => {
        const passes = [{ frag: "a" }, { frag: "b" }];
        registerVFX({ shaders: { blur: passes } });
        expect(fromAttr(toAttr({ shader: "@blur" })).props?.shader).toBe(
            passes,
        );
    });

    it("resolves registered uniforms", () => {
        const uniforms = { time: () => 1 };
        registerVFX({ uniforms: { clock: uniforms } });
        expect(fromAttr(toAttr({ uniforms: "clock" })).props?.uniforms).toBe(
            uniforms,
        );
    });

    it("reports a name that is not registered", () => {
        expect(fromAttr(toAttr({ shader: "@nope" }))).toEqual({
            props: null,
            missing: 'shader "@nope"',
        });
        expect(fromAttr(toAttr({ uniforms: "nope" }))).toEqual({
            props: null,
            missing: 'uniforms "nope"',
        });
    });
});
