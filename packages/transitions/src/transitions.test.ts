import type {
    EffectContext,
    EffectRenderTarget,
    ShaderTransition,
    Transition,
    TransitionClass,
    TransitionEffect,
    TransitionEffectContext,
    TransitionRun,
} from "@vfx-js/core";
import { describe, expect, test, vi } from "vitest";
import { HardCut, StagedTransition } from "./_shared";
import type { DatamoshStage } from "./datamosh";
import * as presets from "./index";
import type { JpegGlitchStage } from "./jpeg-glitch";
import type { PixelsortStage } from "./pixelsort";

const run: TransitionRun = { reverse: false, duration: 1 };

const frame = (t: number, x = t) =>
    ({
        progress: { t, x },
        deltaTime: 0.016,
        src: {},
        target: null,
        draw: vi.fn(),
        blit: vi.fn(),
        clear: vi.fn(),
    }) as unknown as TransitionEffectContext;

// Exposes the stages of a staged preset.
const stagesOf = (transition: Transition) =>
    (transition as unknown as { stages: TransitionEffect[] }).stages;

const shaderPresets: [string, new () => ShaderTransition][] = [
    ["Crossfade", presets.Crossfade],
    ["Crosszoom", presets.Crosszoom],
    ["DistortFade", presets.DistortFade],
    ["Glitch", presets.Glitch],
    ["GlitchSlide", presets.GlitchSlide],
    ["LensDistortion", presets.LensDistortion],
    ["PixelScan", presets.PixelScan],
    ["PixelStretch", presets.PixelStretch],
    ["SlitScan", presets.SlitScan],
    ["Swipe", presets.Swipe],
    ["Tile", presets.Tile],
    ["Zoom", presets.Zoom],
    ["ZoomBlur", presets.ZoomBlur],
];

describe("transition presets", () => {
    const classes = Object.entries(presets as Record<string, unknown>).filter(
        (entry): entry is [string, TransitionClass] =>
            typeof entry[1] === "function" && entry[0] !== "createGLTransition",
    );

    test("exports every preset", () => {
        expect(classes.map(([key]) => key).sort()).toEqual([
            "Crossfade",
            "Crosszoom",
            "Datamosh",
            "DistortFade",
            "Glitch",
            "GlitchSlide",
            "JpegGlitch",
            "LensDistortion",
            "PixelScan",
            "PixelStretch",
            "Pixelsort",
            "SlitScan",
            "Swipe",
            "Tile",
            "Zoom",
            "ZoomBlur",
        ]);
    });

    test.each(classes)("%s makes a named transition", (_key, Class) => {
        const transition = new Class();
        expect(transition.name).toBeTruthy();
        expect(typeof transition.render).toBe("function");
    });

    test.each(shaderPresets)(
        "%s declares the transition function",
        (_key, Class) => {
            expect(new Class().frag).toContain(
                "vec4 transition(vec2 uv, float t)",
            );
        },
    );

    test.each([
        ["Swipe", presets.Swipe],
        ["Glitch", presets.Glitch],
        ["GlitchSlide", presets.GlitchSlide],
        ["DistortFade", presets.DistortFade],
        ["LensDistortion", presets.LensDistortion],
        ["PixelScan", presets.PixelScan],
        ["PixelStretch", presets.PixelStretch],
        ["SlitScan", presets.SlitScan],
        ["Tile", presets.Tile],
    ])("%s stays inside the element", (_key, Class) => {
        expect(new Class().frag).toContain(
            "if (!inRange(uv)) return vec4(0.0);",
        );
    });

    const uniformsOf = (transition: ShaderTransition) =>
        transition.uniforms(frame(0.5));

    test("glitch defaults keep the old look", () => {
        expect(uniformsOf(new presets.Glitch())).toEqual({
            amount: 1,
            speed: 1,
        });
        expect(uniformsOf(new presets.Glitch({ amount: 2 }))).toEqual({
            amount: 2,
            speed: 1,
        });
    });

    test("swipe passes the direction as a uniform", () => {
        const swipe = new presets.Swipe();
        expect(uniformsOf(swipe)).toEqual({ move: [-1, 0] });
        const up = new presets.Swipe({ direction: "up" });
        expect(uniformsOf(up)).toEqual({ move: [0, 1] });
        expect(up.frag).toBe(swipe.frag);
        // Params read each frame, so an instance can change them while it runs.
        up.params = { direction: "down" };
        expect(uniformsOf(up)).toEqual({ move: [0, -1] });
    });

    test("pixelScan passes the direction as a uniform", () => {
        expect(uniformsOf(new presets.PixelScan())).toEqual({
            blackout: 1,
            sweep: [1, 0],
        });
        expect(
            uniformsOf(
                new presets.PixelScan({ direction: "center", blackout: false }),
            ),
        ).toEqual({ blackout: 0, sweep: [0, 0] });
    });

    test("tile passes options as uniforms; the shape picks the shader", () => {
        const tile = new presets.Tile({
            direction: "up",
            shape: "square",
            count: 8.4,
            shadow: 2,
        });
        expect(uniformsOf(tile)).toEqual({
            count: 8,
            shadow: 1,
            sweep: [0, 1],
        });
        expect(tile.frag).not.toContain("HEX");
        const hex = new presets.Tile();
        expect(hex.frag).toContain("HEX");
        expect(uniformsOf(hex)).toEqual({
            count: 12,
            shadow: 0.5,
            sweep: [0, 0],
        });
    });

    test("lensDistortion passes options as uniforms", () => {
        expect(uniformsOf(new presets.LensDistortion())).toEqual({
            strength: 1,
            dispersion: 0.6,
            zoom: 3,
        });
        expect(
            uniformsOf(new presets.LensDistortion({ dispersion: -1 })),
        ).toMatchObject({ dispersion: 0 });
    });
});

class Recorder implements TransitionEffect {
    enabled?: boolean;
    log: string[];
    name: string;
    seen: { src: unknown; target: unknown }[] = [];

    constructor(name: string, log: string[]) {
        this.name = name;
        this.log = log;
    }

    init() {
        this.log.push(`${this.name}.init`);
    }
    start() {
        this.log.push(`${this.name}.start`);
    }
    update() {
        this.log.push(`${this.name}.update`);
    }
    render(ctx: TransitionEffectContext) {
        this.log.push(`${this.name}.render`);
        this.seen.push({ src: ctx.src, target: ctx.target });
        ctx.blit(ctx.src);
    }
    end() {
        this.log.push(`${this.name}.end`);
    }
    dispose() {
        this.log.push(`${this.name}.dispose`);
    }
}

describe("StagedTransition", () => {
    const setup = () => {
        const log: string[] = [];
        const a = new Recorder("a", log);
        const b = new Recorder("b", log);
        const c = new Recorder("c", log);
        class Three extends StagedTransition {
            readonly name = "three";
            protected readonly stages = [a, b, c];
        }
        const buffers: EffectRenderTarget[] = [];
        const initCtx = {
            createRenderTarget: () => {
                const buffer = {
                    dispose: vi.fn(),
                } as unknown as EffectRenderTarget;
                buffers.push(buffer);
                return buffer;
            },
        } as unknown as EffectContext;
        return { log, a, b, c, transition: new Three(), buffers, initCtx };
    };

    test("forwards the lifecycle to every stage in order", async () => {
        const { log, transition, initCtx, buffers } = setup();
        await transition.init(initCtx);
        transition.start(run);
        transition.update(frame(0.5));
        transition.end();
        transition.dispose();
        expect(log).toEqual([
            "a.init",
            "b.init",
            "c.init",
            "a.start",
            "b.start",
            "c.start",
            "a.update",
            "b.update",
            "c.update",
            "a.end",
            "b.end",
            "c.end",
            "a.dispose",
            "b.dispose",
            "c.dispose",
        ]);
        expect(buffers).toHaveLength(2);
        for (const buffer of buffers) {
            expect(buffer.dispose).toHaveBeenCalledOnce();
        }
    });

    test("renders the stages in order through its own buffers", async () => {
        const { a, b, c, transition, initCtx, buffers } = setup();
        await transition.init(initCtx);
        const ctx = frame(0.5);
        transition.render(ctx);
        expect(a.seen).toEqual([{ src: ctx.src, target: buffers[0] }]);
        expect(b.seen).toEqual([{ src: buffers[0], target: buffers[1] }]);
        expect(c.seen).toEqual([{ src: buffers[1], target: null }]);
        // Inner stages draw into their buffer when no target is given.
        expect(vi.mocked(ctx.blit).mock.calls).toEqual([
            [ctx.src, buffers[0], undefined],
            [buffers[0], buffers[1], undefined],
            [buffers[1]],
        ]);
        expect(vi.mocked(ctx.clear).mock.calls).toEqual([
            [buffers[0]],
            [buffers[1]],
        ]);
    });

    test("skips disabled stages", async () => {
        const { a, b, c, transition, initCtx, buffers } = setup();
        await transition.init(initCtx);
        b.enabled = false;
        c.enabled = false;
        const ctx = frame(0.5);
        transition.render(ctx);
        expect(a.seen).toEqual([{ src: ctx.src, target: null }]);
        expect(b.seen).toEqual([]);
        expect(buffers).toHaveLength(2);
        a.enabled = false;
        transition.render(ctx);
        expect(ctx.blit).toHaveBeenLastCalledWith(ctx.src);
    });

    test("uses the last active stage's outputRect", () => {
        const { a, c, transition } = setup();
        const rect = [0, 0, 1, 1] as const;
        Object.assign(c, { outputRect: () => rect });
        Object.assign(a, { outputRect: () => [9, 9, 9, 9] });
        const dims = {} as Parameters<
            NonNullable<TransitionEffect["outputRect"]>
        >[0];
        expect(transition.outputRect(dims)).toBe(rect);
        c.enabled = false;
        expect(transition.outputRect(dims)).toBeUndefined();
    });
});

describe("Pixelsort", () => {
    const sortOf = (transition: Transition) =>
        stagesOf(transition)[1] as PixelsortStage;

    test("cuts at halfway under the sort", () => {
        expect(stagesOf(new presets.Pixelsort())[0]).toBeInstanceOf(HardCut);
    });

    test("each instance keeps its own state", () => {
        const sortA = sortOf(new presets.Pixelsort({ direction: "right" }));
        const sortB = sortOf(new presets.Pixelsort({ direction: "right" }));
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

    test("reads the direction from params", () => {
        const pixelsort = new presets.Pixelsort();
        const sort = sortOf(pixelsort);
        sort.start(run);
        expect(sort.params.direction).toBe("up");
        pixelsort.params = { direction: "left" };
        sort.start(run);
        expect(sort.params.direction).toBe("left");
    });
});

describe("Datamosh", () => {
    test("each instance keeps its own state", () => {
        const moshA = stagesOf(
            new presets.Datamosh({ blockSize: 8 }),
        )[1] as DatamoshStage;
        const moshB = stagesOf(new presets.Datamosh())[1] as DatamoshStage;
        expect(moshA.params.blockSize).toBe(8);
        expect(moshB.params.blockSize).toBe(32);

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

    test("ignores a bad block size", () => {
        const mosh = stagesOf(
            new presets.Datamosh({ blockSize: 1 }),
        )[1] as DatamoshStage;
        expect(mosh.params.blockSize).toBe(32);
    });
});

describe("JpegGlitch", () => {
    test("glitches only in the middle and peaks at the cut", () => {
        const jpegGlitch = new presets.JpegGlitch({ iterations: 40 });
        expect(jpegGlitch.ease).toBe("linear");
        const effect = stagesOf(jpegGlitch)[1] as JpegGlitchStage;

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
