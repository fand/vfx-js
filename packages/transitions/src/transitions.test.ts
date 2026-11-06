import type {
    ShaderTransitionDef,
    TransitionDef,
    TransitionEffect,
    TransitionEffectContext,
    TransitionRun,
} from "@vfx-js/core";
import { describe, expect, test, vi } from "vitest";
import type { DatamoshTransitionEffect } from "./datamosh";
import * as presets from "./index";
import type { JpegGlitchTransitionEffect } from "./jpeg-glitch";
import type { PixelsortTransitionEffect } from "./pixelsort";

const run: TransitionRun = { reverse: false, uniforms: {}, duration: 1 };

const frame = (t: number, x = t) =>
    ({
        progress: { t, x },
        deltaTime: 0.016,
        src: {},
        target: null,
        draw: vi.fn(),
        blit: vi.fn(),
    }) as unknown as TransitionEffectContext;

const effectsOf = (def: TransitionDef): TransitionEffect[] =>
    [def.create()].flat();

const shaderPresets: [string, ShaderTransitionDef][] = [
    ["crossfade", presets.crossfade],
    ["crosszoom", presets.crosszoom],
    ["glitch", presets.glitch],
    ["glitchSlide", presets.glitchSlide],
    ["lensDistortion", presets.lensDistortion],
    ["pixelScan", presets.pixelScan],
    ["pixelStretch", presets.pixelStretch],
    ["slitScan", presets.slitScan],
    ["swipe", presets.swipe],
    ["tile", presets.tile],
    ["zoom", presets.zoom],
    ["zoomBlur", presets.zoomBlur],
];

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
            "jpegGlitch",
            "lensDistortion",
            "pixelScan",
            "pixelStretch",
            "pixelsort",
            "slitScan",
            "swipe",
            "tile",
            "zoom",
            "zoomBlur",
        ]);
    });

    test.each(shaderPresets)(
        "%s declares the transition function",
        (_key, def) => {
            expect(def.frag).toContain("vec4 transition(vec2 uv, float t)");
        },
    );

    test.each(defs)("%s creates its effects", (_key, def) => {
        expect(effectsOf(def).length).toBeGreaterThan(0);
    });

    test.each([
        ["swipe", presets.swipe],
        ["swipe up", presets.createSwipe({ direction: "up" })],
        ["glitch", presets.glitch],
        ["glitchSlide", presets.glitchSlide],
        ["lensDistortion", presets.lensDistortion],
        ["pixelScan", presets.pixelScan],
        ["pixelStretch", presets.pixelStretch],
        ["slitScan", presets.slitScan],
        ["tile", presets.tile],
    ])("%s stays inside the element", (_key, def) => {
        expect(def.frag).toContain("if (!inRange(uv)) return vec4(0.0);");
    });

    test("swipe bakes the direction into the shader", () => {
        expect(presets.createSwipe({ direction: "up" }).frag).toContain(
            "vec2(0.0, 1.0)",
        );
        expect(presets.swipe.frag).toContain("vec2(-1.0, 0.0)");
    });

    test("tile bakes the direction and count into the shader", () => {
        const def = presets.createTile({ direction: "up", count: 8 });
        expect(def.frag).toContain("(id.y + extent.y)");
        expect(def.frag).toContain("COUNT = 8.0");
        expect(presets.tile.frag).toContain("length(id)");
    });

    test("lensDistortion bakes the options into the shader", () => {
        const def = presets.createLensDistortion({ dispersion: 0 });
        expect(def.frag).toContain("DISPERSION = 0.000");
        expect(presets.lensDistortion.frag).toContain("DISPERSION = 0.600");
    });
});

describe("pixelsort", () => {
    const sortOf = (def: TransitionDef) =>
        effectsOf(def)[1] as PixelsortTransitionEffect;

    test("each container keeps its own state", () => {
        const def = presets.createPixelsort({ direction: "right" });
        const sortA = sortOf(def);
        const sortB = sortOf(def);
        sortA.start({ ...run, reverse: true });
        sortB.start(run);
        sortA.update(frame(0.2));
        sortB.update(frame(0.2));
        // Reversed, 0.2 is past the forward halfway, so A sorts back in.
        expect(sortA.params.direction).toBe("left");
        expect(sortB.params.direction).toBe("right");

        sortA.end();
        expect(sortA.params.range[0]).toBe(1);
        expect(sortB.params.range[0]).not.toBe(1);
    });

    test("factories do not share state", () => {
        const up = sortOf(presets.createPixelsort());
        const left = sortOf(presets.createPixelsort({ direction: "left" }));
        up.start(run);
        left.start(run);
        expect(up.params.direction).toBe("up");
        expect(left.params.direction).toBe("left");
    });
});

describe("datamosh", () => {
    test("each container keeps its own state", () => {
        const def = presets.createDatamosh({ blockSize: 8 });
        const moshA = effectsOf(def)[1] as DatamoshTransitionEffect;
        const moshB = effectsOf(def)[1] as DatamoshTransitionEffect;
        expect(moshA.params.blockSize).toBe(8);

        moshA.start(run);
        for (let i = 0; i < 3; i++) {
            moshA.update(frame(0.1));
        }
        moshB.start({ ...run, duration: 2 });
        moshB.update(frame(0.1));
        // A is past the cut frames, B just started.
        expect(moshA.params.useResidual).toBe(true);
        expect(moshB.params.useResidual).toBe(false);

        moshA.end();
        expect(moshA.enabled).toBe(false);
        expect(moshB.enabled).toBe(true);
    });
});

describe("jpegGlitch", () => {
    test("glitches only in the middle and peaks at the cut", () => {
        const def = presets.createJpegGlitch({ iterations: 40 });
        expect(def.ease).toBe("linear");
        const effect = effectsOf(def)[1] as JpegGlitchTransitionEffect;

        effect.start();
        effect.render(frame(0.05));
        expect(effect.params.bypass).toBe(true);
        effect.render(frame(0.5));
        expect(effect.params.bypass).toBe(false);
        expect(effect.params.iterations).toBe(40);
        effect.render(frame(0.95));
        expect(effect.params.bypass).toBe(true);

        effect.render(frame(0.5));
        effect.end();
        expect(effect.params.bypass).toBe(true);
    });
});
