import type { Effect, TransitionDef } from "@vfx-js/core";
import type { DatamoshEffect, PixelSortEffect } from "@vfx-js/effects";
import { describe, expect, test } from "vitest";
import * as presets from "./index";

const run = { reverse: false, uniforms: {}, duration: 1 };

describe("transition presets", () => {
    const defs = Object.entries(presets).filter(
        (entry): entry is [string, TransitionDef] =>
            typeof entry[1] === "object",
    );

    test("exports every preset", () => {
        expect(defs.map(([key]) => key).sort()).toEqual([
            "crossfade",
            "crosszoom",
            "datamosh",
            "glitch",
            "glitchSlide",
            "pixelsort",
            "swipe",
            "zoom",
            "zoomBlur",
        ]);
    });

    test.each(defs)("%s declares the transition function", (_key, def) => {
        expect(def.frag).toContain("vec4 transition(vec2 uv, float t)");
    });

    test("swipe bakes the direction into the shader", () => {
        expect(presets.createSwipe({ direction: "up" }).frag).toContain(
            "vec2(0.0, 1.0)",
        );
        expect(presets.swipe.frag).toContain("vec2(-1.0, 0.0)");
    });
});

describe("pixelsort", () => {
    test("each container keeps its own state", async () => {
        const def = presets.createPixelsort({ direction: "right" });
        const fxA = (await def.effects?.()) as Effect[];
        const fxB = (await def.effects?.()) as Effect[];
        const sortA = fxA[0] as PixelSortEffect;
        const sortB = fxB[0] as PixelSortEffect;

        def.prepare?.({ ...run, reverse: true }, fxA);
        def.prepare?.(run, fxB);
        def.onFrame?.(0.2, 0.2, 0.016, fxA);
        def.onFrame?.(0.2, 0.2, 0.016, fxB);
        // Reversed, 0.2 is past the forward halfway, so A sorts back in.
        expect(sortA.params.direction).toBe("left");
        expect(sortB.params.direction).toBe("right");

        def.onEnd?.(fxA);
        expect((sortA as Effect).enabled).toBe(false);
        expect((sortB as Effect).enabled).toBe(true);
    });

    test("factories do not share state", async () => {
        const up = presets.createPixelsort();
        const left = presets.createPixelsort({ direction: "left" });
        const fxUp = (await up.effects?.()) as Effect[];
        const fxLeft = (await left.effects?.()) as Effect[];
        up.prepare?.(run, fxUp);
        left.prepare?.(run, fxLeft);
        expect((fxUp[0] as PixelSortEffect).params.direction).toBe("up");
        expect((fxLeft[0] as PixelSortEffect).params.direction).toBe("left");
    });
});

describe("datamosh", () => {
    test("each container keeps its own state", async () => {
        const def = presets.createDatamosh({ blockSize: 8 });
        const fxA = (await def.effects?.()) as Effect[];
        const fxB = (await def.effects?.()) as Effect[];
        const moshA = fxA[0] as DatamoshEffect;
        const moshB = fxB[0] as DatamoshEffect;
        expect(moshA.params.blockSize).toBe(8);

        def.prepare?.(run, fxA);
        for (let i = 0; i < 3; i++) {
            def.onFrame?.(0.1, 0.1, 0.016, fxA);
        }
        def.prepare?.({ ...run, duration: 2 }, fxB);
        def.onFrame?.(0.1, 0.1, 0.016, fxB);
        // A is past the cut frames, B just started.
        expect(moshA.params.useResidual).toBe(true);
        expect(moshB.params.useResidual).toBe(false);

        def.onEnd?.(fxA);
        expect(moshA.enabled).toBe(false);
        expect(moshB.enabled).toBe(true);
    });
});
