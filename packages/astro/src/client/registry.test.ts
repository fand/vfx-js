import { Crossfade, Glitch, Pixelsort, Swipe } from "@vfx-js/transitions";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    onRegister,
    registerVFX,
    resetRegistry,
    resolveEase,
    resolveShader,
    resolveTransition,
    resolveUniforms,
    takeVFXOpts,
} from "./registry";

describe("registry", () => {
    afterEach(() => {
        resetRegistry();
        vi.restoreAllMocks();
    });

    it("has built-in transitions by lowercase class name", () => {
        expect(resolveTransition("crossfade")).toBe(Crossfade);
        expect(resolveTransition("swipe")).toBe(Swipe);
        expect(resolveTransition("glitch")).toBe(Glitch);
        expect(resolveTransition("pixelsort")).toBe(Pixelsort);
        expect(resolveTransition("Swipe")).toBeUndefined();
        expect(resolveTransition("createGLTransition")).toBeUndefined();
        expect(resolveTransition("creategltransition")).toBeUndefined();
    });

    it("lets a registered transition win over a built-in one", () => {
        const custom = new Swipe();
        registerVFX({ transitions: { swipe: custom } });
        expect(resolveTransition("swipe")).toBe(custom);
    });

    it("resolves each kind by name", () => {
        const uniforms = { a: 1 };
        const passes = [{ frag: "x" }];
        const ease = (x: number) => x * x;
        registerVFX({
            uniforms: { u: uniforms },
            shaders: { s: passes },
            eases: { e: ease },
        });
        expect(resolveUniforms("u")).toBe(uniforms);
        expect(resolveShader("s")).toBe(passes);
        expect(resolveEase("e")).toBe(ease);
        expect(resolveUniforms("s")).toBeUndefined();
    });

    it("merges later registrations", () => {
        registerVFX({ uniforms: { a: { x: 1 } } });
        registerVFX({ uniforms: { b: { x: 2 } } });
        expect(resolveUniforms("a")).toEqual({ x: 1 });
        expect(resolveUniforms("b")).toEqual({ x: 2 });
    });

    it("warns when vfx options come after the VFX is made", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        registerVFX({ vfx: { pixelRatio: 1 } });
        expect(takeVFXOpts()).toEqual({ pixelRatio: 1 });
        expect(warn).not.toHaveBeenCalled();
        registerVFX({ vfx: { zIndex: 2 } });
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it("calls listeners after each registration", () => {
        const listener = vi.fn();
        const unsubscribe = onRegister(listener);
        registerVFX({});
        unsubscribe();
        registerVFX({});
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
