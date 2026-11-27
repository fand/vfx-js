import assert from "node:assert/strict";
import { test } from "node:test";
import { saberColorRamp } from "../lib/esm/_saber-color.js";
import { saberFlickerGain } from "../lib/esm/_saber-flicker.js";
import { DEFAULT_DISTORTION } from "../lib/esm/_saber-glow.js";
import { SaberEffect } from "../lib/esm/saber.js";
import { SABER_PRESETS } from "../lib/esm/saber-presets.js";

function steadyEffect(options = {}) {
    if (options.preset) {
        return new SaberEffect(options);
    }
    return new SaberEffect({
        intensity: 1,
        gamma: 1,
        brightness: 1,
        saturation: 1,
        coreSoftness: 0,
        coreBlendOnTop: false,
        haloIntensity: 100,
        haloSize: 100,
        glowWhiteness: 0.15,
        glowBias: 1,
        glowPreGamma: 1,
        glowFlow: 0,
        glowDistortAllLayers: false,
        flickerIntensity: 0,
        coreDistortion: { ...DEFAULT_DISTORTION },
        glowDistortion: { ...DEFAULT_DISTORTION, seed: 71 },
        glowLayers: [
            { size: 3, intensity: 3 },
            { size: 12, intensity: 6 },
            { size: 36, intensity: 9 },
            { size: 96, intensity: 12 },
        ],
        color: "#3399ff",
        thickness: 2,
        coreIntensity: 1,
        coreWhiteness: 0.15,
        glow: 1,
        glowSizeMultiplier: 1,
        ...options,
    });
}

const isCore = (draw) => draw.uniforms.revealEnd !== undefined;

test("brightness flicker is bounded, deterministic, continuous and independently frozen", () => {
    for (const seed of [0, 17, -51]) {
        for (const time of [-3.7, 0, 0.01, 0.25, 1, 1234.56]) {
            const gain = saberFlickerGain(time, 0.8, 12, seed);
            assert.ok(gain >= 0.2 - 1e-12 && gain <= 1);
            assert.equal(gain, saberFlickerGain(time, 0.8, 12, seed));
            assert.equal(saberFlickerGain(time, 0, 12, seed), 1);
            assert.equal(
                saberFlickerGain(time, 1, 0, seed),
                saberFlickerGain(0, 1, 0, seed),
            );
        }
        assert.ok(
            Math.abs(
                saberFlickerGain(1 - 1e-6, 1, 12, seed) -
                    saberFlickerGain(1 + 1e-6, 1, 12, seed),
            ) < 1e-7,
        );
    }
    assert.notEqual(
        saberFlickerGain(0.27, 1, 12, 1),
        saberFlickerGain(0.27, 1, 12, 2),
    );
});

test("presets reset appearance without changing input/reveal or sharing mutable state", () => {
    const effect = steadyEffect({
        preset: "windy",
        source: false,
        edge: "luminance",
        pad: 177,
        end: 0.4,
    });
    const layers = effect.params.glowLayers;
    const first = layers[0];
    for (const name of Object.keys(SABER_PRESETS)) {
        effect.setParams({ preset: name });
        const fresh = steadyEffect({
            preset: name,
            source: false,
            edge: "luminance",
            pad: 177,
            end: 0.4,
        });
        assert.deepEqual(effect.params, fresh.params, name);
        assert.equal(effect.params.glowLayers, layers);
        assert.equal(effect.params.glowLayers[0], first);
        effect.params.coreDistortion.amount = 123;
        effect.params.glowLayers[0].size = 123;
        assert.notEqual(fresh.params.coreDistortion.amount, 123);
        assert.notEqual(SABER_PRESETS[name].glowLayers[0].size, 123);
    }
    effect.setParams({
        preset: "fire",
        coreIntensity: 2,
        glowDistortion: { amount: 7 },
    });
    assert.equal(effect.params.coreIntensity, 2);
    assert.equal(effect.params.glowDistortion.amount, 7);
    assert.equal(
        effect.params.glowDistortion.windSpeed,
        SABER_PRESETS.fire.glowDistortion.windSpeed,
    );
    assert.throws(() => effect.setParams({ preset: "missing" }), RangeError);
});

test("core appearance and brightness flicker preserve the glow cache", () => {
    const effect = steadyEffect({});
    const f = fixture();
    effect.init(f.ctx);
    const original = f.render(effect);
    effect.setParams({
        coreIntensity: 0.5,
        coreWhiteness: 1,
        flickerIntensity: 0.8,
        flickerSpeed: 7,
        flickerSeed: 11,
    });
    const changed = f.render(effect);
    assert.equal(f.draws.length, 1);
    assert.equal(changed.uniforms.core, original.uniforms.core);
    assert.equal(changed.uniforms.layer0, original.uniforms.layer0);
    assert.equal(changed.uniforms.coreWhiteness, 1);
    assert.ok(changed.uniforms.coreGain <= original.uniforms.coreGain * 0.5);
    assert.ok(changed.uniforms.glowGain < original.uniforms.glowGain);
    effect.params.coreSoftness = 2;
    const soft = f.render(effect);
    assert.notEqual(soft.uniforms.core, original.uniforms.core);
    assert.equal(soft.uniforms.layer0, original.uniforms.layer0);
    assert.ok(
        !f.draws.some((d) => isCore(d) || d.uniforms.payloadOn !== undefined),
    );
    f.render(effect);
    assert.equal(
        f.draws.length,
        1,
        "animated brightness reuses both cached shapes",
    );
    effect.params.coreSoftness = 0;
    assert.equal(f.render(effect).uniforms.core, original.uniforms.core);
    assert.equal(f.draws.length, 1);
    effect.params.coreSoftness = 2;
    effect.invalidate();
    f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.axis));
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("Halo scales only layer 4 and positive gains reuse the blur pyramid", () => {
    const effect = steadyEffect({ haloIntensity: 100, haloSize: 100 });
    const f = fixture();
    effect.init(f.ctx);
    const base = f.render(effect);
    effect.setParams({ haloIntensity: 200, coreBlendOnTop: true });
    const gain = f.render(effect);
    assert.equal(f.draws.length, 1);
    assert.deepEqual(
        gain.uniforms.weights.slice(0, 3),
        base.uniforms.weights.slice(0, 3),
    );
    assert.equal(gain.uniforms.weights[3], base.uniforms.weights[3] * 2);
    assert.equal(gain.uniforms.layer3, base.uniforms.layer3);
    assert.ok(!gain.frag.includes("#define CORE_OVERLAY"));
    effect.setParams({ haloSize: 200 });
    const resized = f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.axis));
    assert.equal(resized.uniforms.layer0, base.uniforms.layer0);
    assert.ok(!f.draws.some(isCore));
    effect.setParams({ haloIntensity: 0 });
    assert.equal(f.render(effect).uniforms.weights[3], 0);
    effect.setParams({ haloIntensity: 100, haloSize: 0 });
    assert.equal(f.render(effect).uniforms.weights[3], 0);
    effect.setParams({ haloSize: 100, glow: 0 });
    assert.equal(f.render(effect).uniforms.glowGain, 0);
    assert.equal(f.draws.length, 1, "disabled glow also disables Halo");
    effect.setParams({ glow: 1 });
    f.render(effect);
    effect.params.glow = 2;
    const input = f.render(effect);
    assert.equal(input.uniforms.inputGain, 2);
    assert.equal(f.draws.length, 1, "input gain does not rebuild blurs");
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("output grading and glow tint preserve cached shapes and reset with presets", () => {
    const effect = steadyEffect();
    const f = fixture();
    effect.init(f.ctx);
    const before = f.render(effect);
    effect.setParams({
        gamma: 0.7,
        brightness: 0.4,
        saturation: 0,
        glowWhiteness: 0.8,
    });
    const after = f.render(effect);
    assert.equal(f.draws.length, 1);
    assert.equal(after.uniforms.core, before.uniforms.core);
    assert.equal(after.uniforms.layer0, before.uniforms.layer0);
    assert.equal(after.uniforms.coreWhiteness, before.uniforms.coreWhiteness);
    assert.equal(after.uniforms.outputGamma, 0.7);
    assert.equal(after.uniforms.outputBrightness, 0.4);
    assert.equal(after.uniforms.outputSaturation, 0);
    assert.equal(after.uniforms.whiteMix, 0.8);
    effect.setParams({ preset: "electric" });
    for (const key of ["gamma", "brightness", "saturation"]) {
        assert.equal(effect.params[key], SABER_PRESETS.electric[key]);
    }
    assert.equal(
        effect.params.glowWhiteness,
        SABER_PRESETS.electric.glowWhiteness,
    );
    effect.dispose();
});

test("distorted glow applies brightness before masking without rebuilding blur", () => {
    const effect = steadyEffect({
        glowDistortion: {
            amount: 100,
            composite: "multiply",
            windSpeed: 0,
            noiseSpeed: 0,
        },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    effect.setParams({ brightness: 0.25 });
    const result = f.render(effect);
    assert.equal(result.uniforms.glowOutputBrightness, 1);
    assert.equal(result.uniforms.outputBrightness, 0.25);
    assert.equal(
        f.draws.find((d) => d.uniforms.distortionBrightness !== undefined)
            .uniforms.distortionBrightness,
        0.25,
    );
    assert.ok(f.draws.some((d) => d.uniforms.glowPass === 1));
    assert.ok(!f.draws.some((d) => d.uniforms.axis || isCore(d)));
    effect.setParams({ gamma: 0.7, saturation: 0.8 });
    f.render(effect);
    assert.equal(f.draws.length, 1);
    effect.setParams({ glowDistortion: { amount: 0 } });
    assert.equal(f.render(effect).uniforms.glowOutputBrightness, 0.25);
    effect.setParams({ brightness: 0.5 });
    assert.equal(f.render(effect).uniforms.glowOutputBrightness, 0.5);
    assert.equal(f.draws.length, 1);
    effect.dispose();
});

test("output grading bounds also apply to live parameter mutations", () => {
    const effect = steadyEffect();
    const f = fixture();
    effect.init(f.ctx);
    for (const [input, expected] of [
        [
            [0, -2, -1],
            [0.1, 0, 0],
        ],
        [
            [20, 8, 3],
            [10, 5, 2],
        ],
        [
            [NaN, Infinity, -Infinity],
            [1, 1, 1],
        ],
    ]) {
        [
            effect.params.gamma,
            effect.params.brightness,
            effect.params.saturation,
        ] = input;
        const { uniforms } = f.render(effect);
        assert.deepEqual(
            [
                uniforms.outputGamma,
                uniforms.outputBrightness,
                uniforms.outputSaturation,
            ],
            expected,
        );
    }
    effect.dispose();
});

test("original core overlay requires both Glow and Core Distortion", () => {
    const effect = steadyEffect({ coreBlendOnTop: true });
    const f = fixture();
    effect.init(f.ctx);
    const enabled = () =>
        f.render(effect).frag.includes("#define CORE_OVERLAY");
    assert.equal(enabled(), false);
    effect.setParams({ coreDistortion: { amount: 0.001 } });
    assert.equal(enabled(), true);
    effect.setParams({ glow: 0 });
    assert.equal(enabled(), false);
    effect.setParams({
        glow: 1,
        glowLayers: Array.from({ length: 4 }, () => ({
            size: 20,
            intensity: 0,
        })),
    });
    assert.equal(enabled(), false);
    effect.dispose();
});

test("noise uses a fixed content grid while light retains full resolution", () => {
    const effect = steadyEffect({
        glowLayers: Array.from({ length: 4 }, () => ({
            size: 20,
            intensity: 1,
        })),
        glowDistortion: {
            amount: 50,
            noiseScale: 256,
            type: "fluid",
            composite: "multiply",
        },
    });
    const f = fixture();
    effect.init(f.ctx);
    const a = f.render(effect);
    const pass = f.draws.find((d) => d.uniforms.noiseFieldPass === 1);
    assert.equal((pass.target.width - 2) * 2, a.uniforms.glowTex.width);
    assert.deepEqual(pass.uniforms.bufferSize, [128, 96]);
    const previous = pass.target;
    effect.setParams({ glowDistortion: { noiseScale: 16 } });
    const b = f.render(effect);
    assert.equal(b.uniforms.glowTex.width, 128);
    assert.equal(
        f.draws.find((d) => d.uniforms.noiseFieldPass).target,
        previous,
    );
    assert.equal(previous.disposed, false);
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("soft original overlay stays soft and cached while distorted core animates", () => {
    const effect = steadyEffect({
        coreBlendOnTop: true,
        coreSoftness: 3,
        coreDistortion: { amount: 12, noiseDetail: 1 },
    });
    const f = fixture();
    effect.init(f.ctx);
    const initial = f.render(effect);
    const original = initial.uniforms.originalCore;
    assert.notEqual(original, initial.uniforms.core);
    assert.ok(f.draws.some((d) => d.target === original));
    const animated = f.render(effect);
    assert.equal(animated.uniforms.originalCore, original);
    assert.ok(!f.draws.some((d) => d.target === original));
    assert.ok(
        !f.draws.some((d) => d.uniforms.axis),
        "animation reuses the softened source",
    );
    effect.params.coreSoftness = 0;
    const sharp = f.render(effect);
    assert.notEqual(sharp.uniforms.originalCore, original);
    effect.params.coreSoftness = 3;
    effect.invalidate();
    f.render(effect);
    assert.ok(f.draws.some((d) => d.target === original));
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("shutter settings invalidate distortion but preserve the contour field", () => {
    const effect = steadyEffect({
        coreDistortion: { amount: 12, windSpeed: 0, noiseSpeed: 0 },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    f.render(effect);
    assert.equal(f.draws.length, 1);
    effect.setParams({ coreDistortion: { motionBlur: 0.05 } });
    f.render(effect);
    const frozen = f.draws.find((d) => d.uniforms.glowPass === 0);
    assert.equal(frozen.uniforms.motionBlur, 0);
    assert.ok(
        !f.draws.some((d) => isCore(d) || d.uniforms.payloadOn !== undefined),
    );
    effect.setParams({ coreDistortion: { windSpeed: 100, motionBlur: 1 } });
    f.render(effect);
    const animated = f.draws.find((d) => d.uniforms.glowPass === 0);
    assert.equal(animated.uniforms.motionBlur, 0.25);
    assert.ok(animated.uniforms.windVelocity[1] > 0);
    effect.dispose();
});

test("fine noise changes invalidate static distortion without rebuilding the field", () => {
    const effect = steadyEffect({
        coreDistortion: { amount: 5, windSpeed: 0, noiseSpeed: 0 },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    f.render(effect);
    assert.equal(f.draws.length, 1);
    effect.setParams({
        coreDistortion: { noiseDetail: 1, noiseComplexity: 8 },
    });
    f.render(effect);
    assert.ok(
        f.draws.some(
            (d) => d.uniforms.noiseDetail === 1 && d.uniforms.complexity === 8,
        ),
    );
    assert.ok(
        !f.draws.some((d) => isCore(d) || d.uniforms.payloadOn !== undefined),
    );
    effect.dispose();
});

test("turbulent advection invalidates only the glow result and clamps its strength", () => {
    const effect = steadyEffect({
        glowDistortion: { amount: 32, windSpeed: 0, noiseSpeed: 0 },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    for (const [strength, expected] of [
        [0.7, 0.7],
        [2, 1],
        [-1, 0],
    ]) {
        effect.setParams({ glowDistortion: { noiseTurbulence: strength } });
        f.render(effect);
        const distortion = f.draws.filter((d) => d.uniforms.glowPass === 1);
        assert.equal(distortion.length, 2);
        assert.equal(distortion[0].uniforms.noiseTurbulence, expected);
        assert.equal(f.draws.length, 3); // Noise grid + distortion + composition; no new light blur.
        f.render(effect);
        assert.equal(f.draws.length, 1);
    }
    effect.dispose();
});

test("flow-only glow caches blurs while reach, direction and wind sign stay live", () => {
    const effect = steadyEffect({
        glowFlow: 24,
        glowDistortion: { amount: 0, windSpeed: 0, noiseSpeed: 0 },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.flowOffset?.[1] > 0));
    f.render(effect);
    assert.equal(f.draws.length, 1);
    for (const options of [
        { glowFlow: 48 },
        { glowDistortion: { windDirection: 270 } },
        { glowDistortion: { windSpeed: -20 } },
    ]) {
        effect.setParams(options);
        f.render(effect);
        const distortion = f.draws.find((d) => d.uniforms.flowOffset);
        assert.ok(
            distortion,
            "flow changes redraw distortion even with amount zero",
        );
        assert.ok(
            !f.draws.some((d) => d.uniforms.axis),
            "base blurs are reused",
        );
    }
    effect.setParams({ glowFlow: 0 });
    f.render(effect);
    assert.ok(!f.draws.some((d) => d.uniforms.flowOffset));
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("directionality invalidates a static core without rebuilding the field", () => {
    const effect = steadyEffect({
        coreDistortion: { amount: 20, windSpeed: 0, noiseSpeed: 0 },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    effect.setParams({ coreDistortion: { directionality: 1 } });
    f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.directionality === 1));
    assert.ok(!f.draws.some((d) => d.uniforms.payloadOn !== undefined));
    effect.dispose();
});

test("analytic directional core falls back during reveals and returns afterward", () => {
    const effect = steadyEffect({
        coreDistortion: { amount: 20, directionality: 1, noiseDetail: 1 },
    });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    assert.ok(f.draws.some((d) => d.frag.includes("#define ANALYTIC_CORE")));
    effect.setParams({ end: 0.5 });
    f.render(effect);
    assert.ok(!f.draws.some((d) => d.frag.includes("#define ANALYTIC_CORE")));
    effect.setParams({ end: 1 });
    f.render(effect);
    assert.ok(f.draws.some((d) => d.frag.includes("#define ANALYTIC_CORE")));
    effect.dispose();
});

function fixture({ width = 128, height = 96, pixelRatio = 1 } = {}) {
    const targets = [];
    const draws = [];
    const reads = [];
    const released = [];
    const clears = [];
    let restored;
    const ctx = {
        time: 2,
        gl: { getExtension: () => ({}) },
        src: { width, height },
        target: null,
        dims: {
            pixelRatio,
            element: [width / pixelRatio, height / pixelRatio],
            elementPixel: [width, height],
            canvas: [width / pixelRatio, height / pixelRatio],
            canvasPixel: [width, height],
            contentRect: [0, 0, width, height],
            srcRect: [0, 0, width, height],
            canvasRect: [0, 0, width, height],
        },
        createRenderTarget(opts = {}) {
            const target = {
                width: opts.size?.[0] ?? width,
                height: opts.size?.[1] ?? height,
                explicit: !!opts.size,
                format: opts.format,
                disposed: false,
                dispose() {
                    this.disposed = true;
                },
            };
            targets.push(target);
            return target;
        },
        onContextRestored(callback) {
            restored = callback;
        },
        clear(target) {
            clears.push(target);
        },
        releaseGeometry(geometry) {
            released.push(geometry);
        },
        readPixels(target) {
            return new Promise((resolve, reject) => {
                reads.push({ target, resolve, reject });
            });
        },
        draw(draw) {
            assert.ok(!draw.target?.disposed, "writes to a disposed target");
            for (const value of Object.values(draw.uniforms)) {
                if (!targets.includes(value)) {
                    continue;
                }
                assert.notEqual(value, draw.target, "samples its own output");
                assert.ok(!value.disposed, "samples a disposed target");
            }
            draws.push(draw);
        },
    };
    return {
        ctx,
        targets,
        draws,
        reads,
        released,
        clears,
        restore: () => restored(),
        render(effect) {
            draws.length = 0;
            ctx.time += 1 / 60;
            effect.render(ctx);
            return draws.at(-1);
        },
        resize() {
            for (const t of targets) {
                if (!t.explicit && !t.disposed) {
                    t.width = 256;
                    t.height = 192;
                }
            }
            ctx.dims.element = [256, 192];
            ctx.dims.elementPixel = [256, 192];
            ctx.dims.contentRect = [0, 0, 256, 192];
            ctx.dims.srcRect = [0, 0, 256, 192];
        },
    };
}

function rectangleMask(width, height) {
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            pixels[(y * width + x) * 4] = 255;
        }
    }
    return pixels;
}

test("reveal traces the source once and keeps its arc while the output moves", async () => {
    const f = fixture({ width: 300, height: 200 });
    f.ctx.dims.srcRect = [10, 20, 40, 30];
    const effect = steadyEffect({ end: 0.5, glow: 0, pad: "fullscreen" });
    effect.init(f.ctx);
    f.render(effect);
    assert.equal(f.reads.length, 1);
    assert.equal(f.reads[0].target.width, 40);
    assert.equal(f.reads[0].target.height, 30);
    f.reads[0].resolve(rectangleMask(40, 30));
    await Promise.resolve();
    f.render(effect);
    const splat = f.draws.find((d) => d.geometry);
    assert.ok(splat);
    const positions = splat.geometry.attributes.position.data;
    assert.ok(positions[0] >= 10 && positions[0] <= 50);
    assert.ok(positions[1] >= 20 && positions[1] <= 50);
    assert.equal(f.draws.find((d) => isCore(d)).uniforms.revealEnd, 0.5);
    f.ctx.dims.canvasRect = [-35, -70, 300, 200];
    f.render(effect);
    const moved = f.draws.find((d) => d.geometry);
    assert.equal(moved.geometry, splat.geometry);
    assert.deepEqual(moved.uniforms.outputRect, [-35, -70, 300, 200]);
    assert.equal(f.reads.length, 1, "translation reuses the trace");
    assert.equal(f.draws.find((d) => isCore(d)).uniforms.revealEnd, 0.5);
    effect.params.pad = 50;
    f.render(effect);
    assert.equal(f.reads.length, 1, "padding also reuses the trace");
    effect.invalidate();
    f.render(effect);
    assert.equal(f.reads.length, 2, "changed content requests a fresh trace");
    assert.equal(f.draws.find((d) => isCore(d)).uniforms.revealEnd, 0);
    effect.dispose();
    assert.ok(f.reads.every((r) => r.target.disposed));
});

test("a readback from a disposed instance cannot disturb a subsequent init", async () => {
    const f = fixture({ width: 20, height: 16 });
    const effect = steadyEffect({ end: 0.5, glow: 0 });
    effect.init(f.ctx);
    f.render(effect);
    effect.dispose();
    effect.init(f.ctx);
    f.render(effect);
    f.reads[0].reject(new Error("old context lost"));
    await Promise.resolve();
    f.render(effect);
    assert.equal(f.reads.length, 2, "the current readback remains in flight");
    f.reads[1].resolve(rectangleMask(20, 16));
    await Promise.resolve();
    f.render(effect);
    assert.ok(f.draws.some((d) => d.geometry));
    assert.equal(f.reads.length, 2);
    effect.dispose();
});

test("nested options are isolated; partial updates preserve independent groups", () => {
    const options = { glowDistortion: { amount: 10, windSpeed: 40 } };
    const a = steadyEffect(options);
    const b = steadyEffect();
    a.setParams({ glowDistortion: { amount: 20 } });
    assert.equal(a.params.glowDistortion.windSpeed, 40);
    assert.equal(a.params.coreDistortion.amount, 0);
    assert.equal(b.params.glowDistortion.amount, 0);
    assert.equal(options.glowDistortion.amount, 10);
    a.params.glowLayers[0].size = 99;
    assert.equal(b.params.glowLayers[0].size, 3);
    a.setParams({ glowLayers: b.params.glowLayers });
    a.params.glowLayers[0].size = 22;
    assert.equal(b.params.glowLayers[0].size, 3);
});

test("undistorted layers compose directly; disabled glow skips all glow work", () => {
    const f = fixture();
    const effect = steadyEffect();
    effect.init(f.ctx);
    const composite = f.render(effect);
    assert.ok(composite.uniforms.layer0);
    assert.equal(f.draws.filter((d) => d.uniforms.layer0).length, 1);
    for (const params of [
        { glow: 0 },
        { glow: 1, glowSizeMultiplier: 0 },
        {
            glowSizeMultiplier: 1,
            glowLayers: [0, 0, 0, 0].map((size) => ({ size, intensity: 1 })),
        },
    ]) {
        effect.setParams(params);
        assert.equal(f.render(effect).uniforms.glowGain, 0);
        assert.equal(
            f.draws.length,
            1,
            "cached steady core needs only final composition",
        );
    }
});

test("static light is reused while glow distortion and composition stay live", () => {
    const f = fixture();
    const effect = steadyEffect({
        glowDistortion: { amount: 20 },
    });
    effect.init(f.ctx);
    f.render(effect);
    f.render(effect);
    assert.equal(
        f.draws.length,
        3,
        "animated noise grid, glow distortion and final composition",
    );
    assert.equal(f.draws[0].uniforms.glowPass, 1);
    effect.params.color = "#ff8800";
    effect.params.glowBias = 1;
    const composite = f.render(effect);
    assert.equal(f.draws.length, 3);
    assert.equal(composite.uniforms.glowBias, undefined);
    assert.deepEqual(
        composite.uniforms.colorRamp,
        saberColorRamp([1, 136 / 255, 0]),
    );
    effect.setParams({ glowDistortion: { windSpeed: 0, noiseSpeed: 0 } });
    f.render(effect);
    f.render(effect);
    assert.equal(
        f.draws.length,
        1,
        "fully static light only needs composition",
    );
    effect.params.thickness += 0.25;
    f.render(effect);
    assert.ok(f.draws.some((d) => isCore(d)));
    assert.ok(f.draws.some((d) => d.uniforms.axis));
    assert.ok(f.draws.some((d) => d.uniforms.glowPass === 1));
    f.render(effect);
    assert.equal(f.draws.length, 1);
    effect.params.glowLayers[0].size += 1;
    f.render(effect);
    assert.ok(!f.draws.some((d) => isCore(d)));
    assert.ok(f.draws.some((d) => d.uniforms.axis));
    effect.setParams({ coreDistortion: { amount: 5 } });
    f.render(effect);
    f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.glowPass === 0));
    assert.ok(
        !f.draws.some((d) => d.uniforms.axis),
        "animated Core and Halo reuse their original blur pyramid",
    );
    assert.ok(!f.draws.some((d) => isCore(d)));
    assert.ok(f.draws.some((d) => d.uniforms.haloPass === 1));
    effect.setParams({ haloIntensity: 0 });
    f.render(effect);
    f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.glowPass === 0));
    assert.ok(
        !f.draws.some((d) => d.uniforms.axis),
        "Core animation cannot invalidate independent Glow layers",
    );
    f.restore();
    f.render(effect);
    assert.ok(f.draws.some((d) => d.uniforms.payloadOn !== undefined));
    assert.ok(f.draws.some((d) => isCore(d)));
    assert.ok(f.draws.some((d) => d.uniforms.axis));
});

test("clock changes refresh animated light, and unchanged frames reuse it", () => {
    const f = fixture();
    const effect = steadyEffect({ coreDistortion: { amount: 8 } });
    effect.init(f.ctx);
    f.render(effect);
    f.draws.length = 0;
    effect.render(f.ctx);
    assert.equal(f.draws.length, 1);
    f.ctx.time = 42;
    f.draws.length = 0;
    effect.render(f.ctx);
    assert.ok(f.draws.some((d) => d.uniforms.glowPass === 0));
    assert.ok(!f.draws.some(isCore), "base contour is time independent");
    effect.setParams({ coreDistortion: { windSpeed: 0, noiseSpeed: 0 } });
    f.render(effect);
    f.render(effect);
    assert.equal(f.draws.length, 1);
    effect.params.dynamic = true;
    f.render(effect);
    assert.ok(f.draws.some((d) => isCore(d)));
    assert.ok(f.draws.some((d) => d.uniforms.axis));
});

test("crossing a glow mip boundary preserves unaffected layer targets", () => {
    const f = fixture();
    const effect = steadyEffect({
        glowLayers: [1, 2, 3, 6].map((size) => ({ size, intensity: 1 })),
    });
    effect.init(f.ctx);
    f.render(effect);
    const old = f.draws.filter((d) => d.uniforms.axis).map((d) => d.target);
    effect.params.glowLayers[3].size = 6.1;
    f.render(effect);
    const next = f.draws.filter((d) => d.uniforms.axis).map((d) => d.target);
    assert.deepEqual(next.slice(0, 6), old.slice(0, 6));
    assert.ok(old.slice(6).every((target) => target.disposed));
});

test("glow size redistributes energy and Pre Gamma reuses the blur pyramid", () => {
    for (const amount of [0, 20]) {
        const f = fixture();
        const effect = steadyEffect({
            glowSizeMultiplier: 1,
            glowLayers: [8, 16, 32, 64].map((size) => ({ size, intensity: 2 })),
            glowDistortion: { amount, windSpeed: 0, noiseSpeed: 0 },
        });
        effect.init(f.ctx);
        f.render(effect);
        const layerDraw = () => f.draws.find((draw) => draw.uniforms.layer0);
        assert.deepEqual(layerDraw().uniforms.weights, [2, 2, 2, 2]);
        effect.params.glowSizeMultiplier = 2;
        f.render(effect);
        assert.deepEqual(layerDraw().uniforms.weights, [2, 2, 2, 2]);
        const target = layerDraw().uniforms.layer0;
        effect.params.glowPreGamma = 2;
        f.render(effect);
        assert.equal(layerDraw().uniforms.layer0, target);
        assert.equal(layerDraw().uniforms.preGamma, 2);
        assert.ok(!f.draws.some((draw) => draw.uniforms.axis || isCore(draw)));
        effect.params.glowPreGamma = 0;
        f.render(effect);
        assert.equal(layerDraw().uniforms.preGamma, 0.1);
        effect.params.glowBias = 0;
        f.render(effect);
        assert.deepEqual(layerDraw().uniforms.layerBias, [
            0,
            1 / 3,
            3 / 5,
            4 / 5,
        ]);
        assert.equal(layerDraw().uniforms.layer0, target);
        assert.ok(!f.draws.some((draw) => draw.uniforms.axis || isCore(draw)));
        effect.params.glowBias = Number.NaN;
        f.render(effect);
        assert.deepEqual(layerDraw().uniforms.layerBias, [1, 1, 1, 1]);
        effect.dispose();
    }
});

test("equal radii share a blur, including a tiny target with a very wide glow", () => {
    const f = fixture({ width: 1, height: 1 });
    const effect = steadyEffect({
        glowLayers: [1, 0.5, 0.25, 0.125].map((intensity) => ({
            size: 1000,
            intensity,
        })),
    });
    effect.init(f.ctx);
    const result = f.render(effect);
    assert.equal(f.draws.filter((d) => d.uniforms.axis).length, 2);
    assert.equal(f.targets.filter((t) => t.explicit).length, 2);
    assert.equal(result.uniforms.layer0, result.uniforms.layer3);
    assert.deepEqual(result.uniforms.weights, [1, 0.5, 0.25, 0.125]);
    const weights = f.draws.find((d) => d.uniforms.axis).uniforms.weights;
    assert.ok(weights.every((x) => Number.isFinite(x) && x >= 0));
    effect.params.glowLayers[1].size = 500;
    f.render(effect);
    assert.equal(f.draws.filter((d) => d.uniforms.axis).length, 4);
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("glow distortion leaves the visible core target unchanged", () => {
    const f = fixture();
    const effect = steadyEffect();
    effect.init(f.ctx);
    const original = f.render(effect);
    effect.setParams({ glowDistortion: { amount: 20 }, glowPreGamma: 0.8 });
    const glow = f.render(effect);
    assert.equal(glow.uniforms.core, original.uniforms.core);
    assert.notEqual(glow.uniforms.glowTex, original.uniforms.glowTex);
    effect.setParams({ coreDistortion: { amount: 8 } });
    const core = f.render(effect);
    assert.notEqual(core.uniforms.core, original.uniforms.core);
    assert.equal(core.uniforms.coreGain, original.uniforms.coreGain);
    effect.setParams({
        coreDistortion: { amount: 0 },
        glowDistortion: { amount: 0 },
        glowPreGamma: 1,
    });
    assert.equal(f.render(effect).uniforms.core, original.uniforms.core);
});

test("large padding restricts field draws, clearing scratch once and rebuilding for wide lines", () => {
    const f = fixture({ width: 1000, height: 800 });
    f.ctx.dims.element = [200, 100];
    f.ctx.dims.elementPixel = [200, 100];
    f.ctx.dims.contentRect = [0, 0, 200, 100];
    f.ctx.dims.srcRect = [0, 0, 200, 100];
    f.ctx.dims.canvasRect = [-400, -350, 1000, 800];
    const effect = steadyEffect({
        pad: "fullscreen",
        glow: 0,
    });
    effect.init(f.ctx);
    f.render(effect);
    const region = f.draws.find(
        (draw) => draw.uniforms.payloadOn !== undefined,
    ).geometry;
    assert.ok(region);
    assert.equal(f.clears.length, 3);
    assert.equal(f.draws.find((draw) => isCore(draw)).geometry, region);
    f.render(effect);
    assert.equal(f.draws.length, 1, "unchanged light only composites");
    assert.equal(
        f.clears.length,
        3,
        "scratch stays clear between cached frames",
    );

    effect.params.thickness = 400;
    f.render(effect);
    const full = f.draws.find((draw) => draw.uniforms.payloadOn !== undefined);
    assert.ok(
        full,
        "expanding the line rebuilds the formerly restricted field",
    );
    assert.equal(full.geometry, undefined);
    assert.ok(f.released.includes(region));
    effect.params.thickness = 2;
    f.render(effect);
    assert.equal(f.clears.length, 6);
    assert.ok(
        f.draws.find((draw) => draw.uniforms.payloadOn !== undefined).geometry,
    );
    effect.dispose();
});

test("minified alpha uses the same area footprint for field and reveal, bypassing native resolution", () => {
    for (const pixelRatio of [1, 2, 4]) {
        const f = fixture({
            width: 256 * pixelRatio,
            height: 192 * pixelRatio,
            pixelRatio,
        });
        f.ctx.src = { width: 512, height: 256 };
        f.ctx.dims.element = [128, 64];
        f.ctx.dims.elementPixel = [128 * pixelRatio, 64 * pixelRatio];
        f.ctx.dims.contentRect = [0, 0, ...f.ctx.dims.elementPixel];
        f.ctx.dims.srcRect = [...f.ctx.dims.contentRect];
        const effect = steadyEffect({ pad: 64, end: 0.5, glow: 0 });
        effect.init(f.ctx);
        f.render(effect);
        const seed = f.draws.find(
            (draw) => draw.uniforms.payloadOn !== undefined,
        );
        const trace = f.draws.find((draw) => draw.uniforms.maskSize);
        const expected =
            pixelRatio === 4
                ? [0, 0]
                : [1 / (128 * pixelRatio), 1 / (64 * pixelRatio)];
        assert.deepEqual(seed.uniforms.maskFilterStep, expected);
        assert.deepEqual(trace.uniforms.maskFilterStep, expected);
        effect.dispose();
    }
});

test("layout changes invalidate the field even when target dimensions stay fixed", () => {
    const f = fixture();
    const effect = steadyEffect({ glow: 0 });
    effect.init(f.ctx);
    f.render(effect);
    const builtField = () =>
        f.draws.some((d) => d.uniforms.payloadOn !== undefined);
    f.render(effect);
    assert.equal(builtField(), false);
    f.ctx.dims.canvasRect[0] -= 10;
    f.render(effect);
    assert.equal(
        builtField(),
        false,
        "local padding does not rebuild on scrolling",
    );
    effect.params.pad = "fullscreen";
    f.render(effect);
    f.ctx.dims.canvasRect[0] -= 10;
    f.render(effect);
    assert.equal(builtField(), true, "fullscreen field follows the element");
    f.render(effect);
    assert.equal(builtField(), false);
    f.ctx.dims.pixelRatio = 2;
    f.render(effect);
    assert.equal(builtField(), true);
    f.ctx.dims.srcRect[0] -= 1;
    f.render(effect);
    assert.equal(
        builtField(),
        true,
        "a preceding effect changed its source rect",
    );
});

test("layer radii are independent of pad; zero size multiplier bypasses glow passes", () => {
    const f = fixture();
    const effect = steadyEffect({ pad: 100 });
    effect.init(f.ctx);
    f.render(effect);
    const axes = () =>
        f.draws.filter((d) => d.uniforms.axis).map((d) => d.uniforms.axis);
    const original = axes();
    effect.params.pad = 200;
    f.render(effect);
    assert.deepEqual(axes(), original);
    effect.params.glowSizeMultiplier = 0;
    assert.equal(f.render(effect).uniforms.glowGain, 0);
    assert.equal(
        f.draws.some((d) => d.uniforms.weights || d.uniforms.axis),
        false,
    );
});

test("glow protects wide halos by effective radius, independent of layer order", () => {
    const f = fixture();
    const effect = steadyEffect({
        glowDistortion: { amount: 20, noiseScale: 48 },
        glowLayers: [96, 3, 48, 12].map((size) => ({ size, intensity: 1 })),
    });
    effect.init(f.ctx);
    f.render(effect);
    const shares = () =>
        f.draws.find((d) => d.uniforms.nearShares).uniforms.nearShares;
    assert.deepEqual(shares(), [0, 1, 0, 1]);
    assert.equal(
        f.draws.find((d) => d.uniforms.glowPass === 1).uniforms.layered,
        1,
    );
    effect.params.glowSizeMultiplier = 4;
    f.render(effect);
    assert.deepEqual(shares(), [0, 1, 0, 0]);
    effect.params.glowDistortAllLayers = true;
    f.render(effect);
    assert.deepEqual(shares(), [1, 1, 1, 1]);
    effect.params.glowDistortAllLayers = false;
    f.render(effect);
    assert.deepEqual(shares(), [0, 1, 0, 0]);
});

test("resize, layer changes and disposal release explicit targets without feedback", () => {
    const f = fixture();
    const effect = steadyEffect({
        coreSoftness: 12,
        coreDistortion: { amount: 8, windSpeed: 100, motionBlur: 0.05 },
        glowDistortion: { amount: 20 },
    });
    effect.init(f.ctx);
    f.render(effect);
    assert.ok(
        f.draws.some(
            (d) => d.uniforms.haloPass === 1 && d.uniforms.noiseFieldPass === 1,
        ),
    );
    const first = f.targets.filter((t) => t.explicit);
    f.resize();
    f.render(effect);
    assert.ok(first.every((t) => t.disposed));
    const resized = f.targets.filter((t) => t.explicit && !t.disposed);
    effect.setParams({
        glowLayers: [1, 2, 3, 4].map((size) => ({ size, intensity: 1 })),
    });
    f.render(effect);
    assert.ok(resized.some((t) => t.disposed));
    f.restore();
    f.render(effect);
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});

test("default is Electric, with explicit constructor overrides applied last", () => {
    assert.deepEqual(
        new SaberEffect().params,
        new SaberEffect({ preset: "electric" }).params,
    );
    const custom = new SaberEffect({
        color: "#123456",
        glow: 0,
        coreDistortion: { amount: 7 },
    });
    assert.equal(custom.params.color, "#123456");
    assert.equal(custom.params.glow, 0);
    assert.equal(custom.params.coreDistortion.amount, 7);
    assert.equal(
        custom.params.coreDistortion.noiseScale,
        SABER_PRESETS.electric.coreDistortion.noiseScale,
    );
});

test("removed and unknown options fail before any preset or parameter mutation", () => {
    const removed = [
        "toneMapping",
        "amplitude",
        "mainAmplitude",
        "scale",
        "sharpness",
        "burst",
        "speed",
        "flicker",
        "lines",
        "variation",
        "glowMode",
        "glowFalloff",
        "glowSpread",
        "glowIntensityMultiplier",
    ];
    const effect = new SaberEffect({ preset: "fire" });
    const original = structuredClone(effect.params);
    for (const key of [...removed, "typo"]) {
        assert.throws(() => new SaberEffect({ [key]: 1 }), new RegExp(key));
        assert.throws(
            () =>
                effect.setParams({ preset: "fog", color: "#000000", [key]: 1 }),
            new RegExp(key),
        );
        assert.deepEqual(effect.params, original, key);
        assert.ok(!(key in effect.params));
        for (const recipe of Object.values(SABER_PRESETS)) {
            assert.ok(!(key in recipe));
        }
    }
});

test("only AE-inspired preset names and the Burning alias remain", () => {
    assert.equal(Object.keys(SABER_PRESETS).length, 12);
    assert.equal(SABER_PRESETS.embers, SABER_PRESETS.burning);
    const effect = new SaberEffect({ preset: "fire" });
    const original = structuredClone(effect.params);
    for (const preset of [
        "neon",
        "plasma",
        "ice",
        "toxic",
        "spectral",
        "laser",
        "unstable",
    ]) {
        assert.throws(
            () => new SaberEffect({ preset }),
            /Unknown Saber preset/,
        );
        assert.throws(
            () => effect.setParams({ preset, color: "#000000" }),
            /Unknown Saber preset/,
        );
        assert.deepEqual(effect.params, original);
    }
});

test("dynamic fields reuse flood scratch and release it when frozen", () => {
    const effect = steadyEffect({ dynamic: true, glow: 0 });
    const f = fixture();
    effect.init(f.ctx);
    f.render(effect);
    const created = f.targets.length;
    for (let i = 0; i < 10; i++) {
        f.render(effect);
    }
    assert.equal(f.targets.length, created);
    const live = f.targets.filter((t) => !t.disposed).length;
    effect.params.dynamic = false;
    f.render(effect);
    assert.equal(f.targets.filter((t) => !t.disposed).length, live - 1);
    effect.invalidate();
    f.render(effect);
    assert.equal(f.targets.filter((t) => !t.disposed).length, live - 1);
    effect.dispose();
});

test("compact fields fall back for reveal and return without retracing the source", async () => {
    const f = fixture();
    const effect = steadyEffect({ dynamic: true, glow: 0 });
    effect.init(f.ctx);
    f.render(effect);
    const field = () => f.draws.find(isCore).uniforms.field;
    assert.equal(field().format, "rg32f");
    const compact = field();
    effect.setParams({ end: 0.5, dynamic: false });
    f.render(effect);
    assert.equal(compact.disposed, true);
    assert.equal(field().format, undefined);
    const expanded = field();
    f.reads[0].resolve(
        rectangleMask(f.reads[0].target.width, f.reads[0].target.height),
    );
    await Promise.resolve();
    f.render(effect);
    assert.equal(f.draws.find(isCore).uniforms.revealEnd, 0.5);
    effect.setParams({ end: 1, dynamic: false });
    f.render(effect);
    assert.equal(field().format, "rg32f");
    assert.equal(expanded.disposed, true);
    effect.setParams({ end: 0.5 });
    f.render(effect);
    assert.equal(field().format, undefined);
    assert.equal(f.draws.find(isCore).uniforms.revealEnd, 0.5);
    assert.equal(f.reads.length, 1);
    effect.dispose();
});

test("devices without linear float filtering keep the legacy field", () => {
    const f = fixture();
    f.ctx.gl.getExtension = () => null;
    const effect = steadyEffect({ glow: 0 });
    effect.init(f.ctx);
    f.render(effect);
    const core = f.draws.find(isCore);
    assert.equal(core.uniforms.field.format, undefined);
    assert.equal(core.uniforms.compactField, 0);
    effect.dispose();
});

test("noise grids retain precision with RG32F and fall back without float extensions", () => {
    for (const missing of [
        null,
        "OES_texture_float_linear",
        "EXT_float_blend",
    ]) {
        const f = fixture();
        f.ctx.gl.getExtension = (name) => (name === missing ? null : {});
        const effect = steadyEffect({
            coreDistortion: { amount: 8 },
            glowDistortion: { amount: 20 },
        });
        effect.init(f.ctx);
        f.render(effect);
        const grids = f.draws.filter((d) => d.uniforms.noiseFieldPass === 1);
        assert.equal(grids.length, 3);
        for (const { target } of grids) {
            assert.equal(target.format, missing ? undefined : "rg32f");
        }
        const count = f.targets.length;
        f.render(effect);
        assert.equal(f.targets.length, count);
        effect.dispose();
        assert.ok(grids.every((d) => d.target.disposed));
    }
});

test("scalar glow switches between warped, flow-only and unwarped composition", () => {
    const f = fixture({ width: 256, height: 192, pixelRatio: 2 });
    const effect = steadyEffect({ glowDistortion: { amount: 20 } });
    effect.init(f.ctx);
    const warped = f.render(effect);
    assert.equal(warped.uniforms.glowTex.format, "r16f");
    assert.equal(warped.uniforms.glowTex.width, 256);
    assert.equal(warped.uniforms.glowBase.format, "rgba16f");
    assert.equal(warped.uniforms.glowBase.width, 128);
    assert.ok(warped.frag.includes("#define SCALAR_GLOW"));
    effect.setParams({ glowDistortion: { amount: 0 }, glowFlow: 40 });
    const flow = f.render(effect);
    assert.equal(flow.uniforms.glowTex, warped.uniforms.glowTex);
    assert.ok(flow.frag.includes("#define SCALAR_GLOW"));
    effect.setParams({ glowFlow: 0, coreDistortion: { amount: 5 } });
    const halo = f.render(effect);
    assert.equal(halo.uniforms.glowTex.format, "rgba16f");
    assert.ok(!halo.frag.includes("#define SCALAR_GLOW"));
    assert.ok(halo.frag.includes("#define WARPED_HALO"));
    effect.setParams({ coreDistortion: { amount: 0 } });
    assert.ok(f.render(effect).frag.includes("#define LAYERED_GLOW"));
    effect.setParams({ glowDistortion: { amount: 20 } });
    assert.equal(f.render(effect).uniforms.glowTex, warped.uniforms.glowTex);
    effect.setParams({ glow: 0 });
    assert.ok(!f.render(effect).frag.includes("#define SCALAR_GLOW"));
    effect.dispose();
    assert.ok(f.targets.filter((t) => t.explicit).every((t) => t.disposed));
});
