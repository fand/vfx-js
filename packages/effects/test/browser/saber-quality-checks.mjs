// Numerical GPU checks. Run from the frozen comparison page, independently of
// timing runs: await saberQualityChecks.run(). Results contain no image buffers.

import { SaberGlowPasses as BaselineGlow } from "./baseline/_saber-glow.js";
import { SaberEffect as Baseline } from "./baseline/saber.js";
import {
    createSaberFixture,
    DistortionProbe,
    GlowProbe,
    imageStats,
    STEADY_OPTIONS,
} from "./saber-quality.mjs";

function stats(image) {
    return imageStats(image.pixels, image.width, image.height);
}

function difference(a, b) {
    // Compare the shared, centered region when output padding differs.
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    let error = 0;
    let energy = 0;
    let peak = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const av =
                a.pixels[
                    ((y + (a.height - h) / 2) * a.width +
                        x +
                        (a.width - w) / 2) *
                        4
                ];
            const bv =
                b.pixels[
                    ((y + (b.height - h) / 2) * b.width +
                        x +
                        (b.width - w) / 2) *
                        4
                ];
            const delta = Math.abs(av - bv);
            error += delta;
            energy += av + bv;
            peak = Math.max(peak, delta);
        }
    }
    return {
        mae: error / (w * h),
        relativeL1: error / Math.max(energy, 1e-12),
        peak,
    };
}

async function glowChecks(renderer) {
    const rows = [];
    for (const pixelRatio of [1, 2]) {
        for (const size of [512, 513]) {
            const fixture = await createSaberFixture({
                Effect: GlowProbe,
                sourceWidth: size,
                sourceHeight: size,
                width: 640,
                height: 640,
                pixelRatio,
                options:
                    renderer === "baseline" ? { GlowPasses: BaselineGlow } : {},
            });
            try {
                for (const radius of [
                    0.25, 1, 2.99, 3, 3.01, 5.99, 6, 6.01, 11.99, 12, 12.01,
                    23.99, 24, 24.01, 47.99, 48, 48.01,
                ]) {
                    fixture.effect.params.radius = radius;
                    const result = stats(await fixture.capture("layers"));
                    rows.push({
                        renderer,
                        pixelRatio,
                        size,
                        radius,
                        ...result,
                    });
                }
            } finally {
                fixture.destroy();
            }
        }
    }
    return rows;
}

export async function coreChecks(renderer = "candidate", transformDraw) {
    const rows = [];
    const Effect = renderer === "baseline" ? Baseline : undefined;
    for (const angle of [0, 22.5, 45]) {
        for (const thickness of [0.25, 0.5, 1, 2]) {
            const sums = [];
            for (const phase of [0, 0.25, 0.5, 0.75]) {
                const fixture = await createSaberFixture({
                    Effect,
                    transformDraw,
                    sourceWidth: 256,
                    sourceHeight: 256,
                    options: { ...STEADY_OPTIONS, glow: 0, pad: 24, thickness },
                    paint(c) {
                        c.translate(128 + phase, 128);
                        c.rotate((angle * Math.PI) / 180);
                        c.fillRect(-70, -24, 140, 48);
                    },
                });
                try {
                    sums.push(stats(await fixture.capture("core")).sum);
                } finally {
                    fixture.destroy();
                }
            }
            const mean = sums.reduce((a, b) => a + b) / sums.length;
            rows.push({
                renderer,
                angle,
                thickness,
                sums,
                energyRange: (Math.max(...sums) - Math.min(...sums)) / mean,
            });
        }
    }
    const fixture = await createSaberFixture({
        Effect,
        options: { ...STEADY_OPTIONS, glow: 0, pad: 80 },
    });
    try {
        const before = await fixture.capture("core");
        fixture.effect.params.pad = 160;
        const after = await fixture.capture("core");
        rows.push({
            renderer,
            case: "padding-invariance",
            ...difference(before, after),
        });
        fixture.effect.params.edgeThreshold = 0;
        fixture.effect.invalidate();
        rows.push({
            renderer,
            case: "zero-threshold",
            ...stats(await fixture.capture("core")),
        });
    } finally {
        fixture.destroy();
    }
    return rows;
}

export async function run({
    renderers = ["baseline", "candidate"],
    glow = true,
    core = true,
} = {}) {
    const job = {
        startedAt: new Date().toISOString(),
        running: true,
        glow: [],
        core: [],
    };
    window.saberQualityJob = job;
    try {
        for (const renderer of renderers) {
            if (glow) {
                job.glow.push(...(await glowChecks(renderer)));
            }
            if (core) {
                job.core.push(...(await coreChecks(renderer)));
            }
        }
        job.failures = [];
        for (const row of job.glow.filter((r) => r.renderer === "candidate")) {
            if (row.invalid || Math.abs(row.sum / row.radius - 1) > 0.005) {
                job.failures.push({ check: "glow-energy", row });
            }
            if (row.radius >= 3) {
                const inputVariance =
                    (row.size * row.pixelRatio) % 2 ? 0 : 0.25;
                const expectedSigma = Math.sqrt(
                    (row.radius * row.pixelRatio) ** 2 + inputVariance,
                );
                if (
                    Math.abs(row.sigmaX / expectedSigma - 1) > 0.02 ||
                    Math.abs(row.sigmaY / expectedSigma - 1) > 0.02
                ) {
                    job.failures.push({ check: "glow-width", row });
                }
            }
        }
        for (const row of job.core.filter((r) => r.renderer === "candidate")) {
            if (
                row.energyRange > 0.01 ||
                row.relativeL1 > 0.001 ||
                row.invalid
            ) {
                job.failures.push({ check: "core-stability", row });
            }
            if (row.case === "zero-threshold" && !(row.sum > 0)) {
                job.failures.push({ check: "zero-threshold", row });
            }
        }
        job.finishedAt = new Date().toISOString();
        return job;
    } catch (error) {
        job.error = String(error);
        throw error;
    } finally {
        job.running = false;
    }
}

export async function cacheChecks() {
    const fixture = await createSaberFixture({
        options: { ...STEADY_OPTIONS, pad: 160 },
    });
    const changes = [
        { color: "#ff7a24" },
        { intensity: 0.5 },
        { thickness: 0.35 },
        { glowBias: -0.5 },
        { glowPreGamma: 0.7 },
        { glow: 0 },
        { glow: 1.5 },
        { glowSizeMultiplier: 0 },
        { glowSizeMultiplier: 1.2 },
        {
            glowLayers: [3, 6, 12, 24].map((size) => ({
                size,
                intensity: 0.5,
            })),
        },
        { glowDistortion: { amount: 24 } },
        { glowDistortion: { type: "smoke", noiseScale: 12, noiseSpeed: 0 } },
        { glowDistortion: { windSpeed: 0, noiseAspectRatio: 2, noiseBias: 2 } },
        { glowDistortion: { seed: 39, noiseComplexity: 6, windDirection: 25 } },
        {
            glowDistortion: {
                type: "energy",
                composite: "multiply",
                invert: true,
            },
        },
        { glowDistortion: { amount: 0 } },
        { coreDistortion: { amount: 5 } },
        {
            coreDistortion: {
                noiseSpeed: 0,
                windSpeed: 0,
                noiseScale: 12,
                noiseComplexity: 5,
            },
        },
        { coreDistortion: { type: "energy", invert: true, seed: 5 } },
        {
            coreDistortion: {
                composite: "multiply",
                noiseBias: 0.5,
                noiseAspectRatio: 2,
                windDirection: 10,
            },
        },
        { coreDistortion: { amount: 0 } },
        { pad: 80 },
        { pad: "fullscreen" },
        { thickness: 400 },
        { thickness: 0.35 },
        { pad: 320 },
        { pad: 160 },
        { edge: "luminance", edgeThreshold: 0.35 },
        { edge: "alpha", edgeThreshold: 0 },
        { source: true },
    ];
    const rows = [];
    try {
        for (const change of changes) {
            fixture.effect.setParams(change);
            const cached = fixture.screen(2);
            fixture.effect.invalidate();
            const fresh = fixture.screen(2);
            let changed = 0;
            let maxDifference = 0;
            for (let i = 0; i < cached.pixels.length; i++) {
                const d = Math.abs(cached.pixels[i] - fresh.pixels[i]);
                if (d) {
                    changed++;
                }
                maxDifference = Math.max(maxDifference, d);
            }
            rows.push({
                change,
                changed,
                maxDifference,
                glError: fixture.gl.getError(),
            });
            await new Promise(requestAnimationFrame);
        }
        return rows;
    } finally {
        fixture.destroy();
    }
}

export async function revealChecks() {
    const fixture = await createSaberFixture({
        options: { ...STEADY_OPTIONS, pad: "fullscreen", glow: 0, end: 0.5 },
    });
    try {
        let before;
        for (let i = 0; i < 30; i++) {
            before = await fixture.capture("core");
            if (stats(before).sum > 0) {
                break;
            }
            await new Promise(requestAnimationFrame);
        }
        const initial = stats(before);
        const readsBefore = fixture.readbacks.length;
        fixture.input.style.left = `${Number.parseFloat(fixture.input.style.left) + 32}px`;
        fixture.input.style.top = `${Number.parseFloat(fixture.input.style.top) + 24}px`;
        await new Promise(requestAnimationFrame);
        const after = await fixture.capture("core");
        const moved = stats(after);
        const readsAfterMove = fixture.readbacks.length;
        let error = 0;
        for (let y = 24; y < before.height; y++) {
            for (let x = 0; x < before.width - 32; x++) {
                error += Math.abs(
                    before.pixels[(y * before.width + x) * 4] -
                        after.pixels[((y - 24) * after.width + x + 32) * 4],
                );
            }
        }
        fixture.effect.params.pad = 160;
        const padded = stats(await fixture.capture("core"));
        return {
            initial,
            moved,
            padded,
            readbacks: fixture.readbacks,
            readsBefore,
            readsAfterMove,
            readsAfterPad: fixture.readbacks.length,
            translationRelativeL1:
                error / Math.max(initial.sum + moved.sum, 1e-12),
            glError: fixture.gl.getError(),
        };
    } finally {
        fixture.destroy();
    }
}

export async function resolutionChecks({ renderer = "candidate" } = {}) {
    const images = [];
    for (const pixelRatio of [1, 2, 3]) {
        const fixture = await createSaberFixture({
            Effect: renderer === "baseline" ? Baseline : undefined,
            pixelRatio,
            options: { ...STEADY_OPTIONS, glow: 0, pad: 80 },
        });
        try {
            const source = await fixture.capture("core");
            const width = source.width / pixelRatio;
            const height = source.height / pixelRatio;
            const pixels = new Float32Array(width * height * 4);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0;
                    for (let dy = 0; dy < pixelRatio; dy++) {
                        for (let dx = 0; dx < pixelRatio; dx++) {
                            sum +=
                                source.pixels[
                                    ((y * pixelRatio + dy) * source.width +
                                        x * pixelRatio +
                                        dx) *
                                        4
                                ];
                        }
                    }
                    pixels[(y * width + x) * 4] = sum / pixelRatio ** 2;
                }
            }
            images.push({ width, height, pixels });
        } finally {
            fixture.destroy();
        }
    }
    return {
        renderer,
        comparisons: [2, 3].map((pixelRatio, i) => ({
            pixelRatio,
            ...difference(images[0], images[i + 1]),
        })),
    };
}

export async function noiseChecks() {
    const pointSampled = (draw) => {
        if (draw.uniforms.noiseType === undefined) {
            return draw;
        }
        return {
            ...draw,
            frag: draw.frag.replace(
                /if \(noiseType == 2\) \{[\s\S]*?\n {4}\}\n {4}return/,
                "if (noiseType == 2) n = 1.0 - 2.0 * sqrt(abs(n));\n    return",
            ),
        };
    };
    const rows = [];
    for (const noiseComplexity of [1, 3]) {
        for (const noiseScale of [2, 4, 8, 24]) {
            const images = [];
            for (const variant of ["reference", "point", "filtered"]) {
                const pixelRatio = variant === "reference" ? 8 : 1;
                const fixture = await createSaberFixture({
                    Effect: DistortionProbe,
                    pixelRatio,
                    sourceWidth: 64,
                    sourceHeight: 64,
                    options: { type: "energy", noiseScale, noiseComplexity },
                    transformDraw:
                        variant === "filtered" ? undefined : pointSampled,
                });
                try {
                    const image = await fixture.capture("core-distortion");
                    const pixels = new Float32Array(64 * 64);
                    for (let y = 0; y < 64; y++) {
                        for (let x = 0; x < 64; x++) {
                            let sum = 0;
                            for (let dy = 0; dy < pixelRatio; dy++) {
                                for (let dx = 0; dx < pixelRatio; dx++) {
                                    sum +=
                                        image.pixels[
                                            ((y * pixelRatio + dy) *
                                                image.width +
                                                x * pixelRatio +
                                                dx) *
                                                4
                                        ];
                                }
                            }
                            pixels[y * 64 + x] = sum / pixelRatio ** 2;
                        }
                    }
                    images.push(pixels);
                } finally {
                    fixture.destroy();
                }
            }
            const errors = images.slice(1).map((pixels) => {
                let sum = 0;
                for (let i = 0; i < pixels.length; i++) {
                    sum += (pixels[i] - images[0][i]) ** 2;
                }
                return Math.sqrt(sum / pixels.length);
            });
            rows.push({
                noiseScale,
                noiseComplexity,
                pointRms: errors[0],
                filteredRms: errors[1],
                ratio: errors[1] / errors[0],
            });
        }
    }
    return rows;
}

export async function lifecycleChecks({ repeats = 2, steps = 36 } = {}) {
    const rows = [];
    for (const renderer of ["baseline", "candidate"]) {
        const fixture = await createSaberFixture({
            Effect: renderer === "baseline" ? Baseline : undefined,
            pixelRatio: 2,
            trackResources: true,
            options: { ...STEADY_OPTIONS, pad: 320 },
        });
        const initial = fixture.resources.snapshot();
        const rounds = [];
        let glError;
        try {
            for (let round = 0; round < repeats; round++) {
                for (let i = 0; i < steps; i++) {
                    fixture.effect.setParams({
                        pad: [80, 160, 320][i % 3],
                        glowSizeMultiplier: 0.5 + (i % 6) * 0.25,
                        glowPreGamma: i % 3 === 0 ? 0.8 : 1,
                        coreDistortion: { amount: i % 5 === 0 ? 8 : 0 },
                        glowDistortion: { amount: i % 2 === 0 ? 32 : 0 },
                        glowLayers: [3, 12, 36, 96].map((size) => ({
                            size: size + (i % 4),
                            intensity: 0.5,
                        })),
                    });
                    fixture.render(i / 60);
                    await new Promise(requestAnimationFrame);
                }
                fixture.effect.setParams({
                    pad: 320,
                    glowSizeMultiplier: 1,
                    glowPreGamma: 1,
                    coreDistortion: { amount: 0 },
                    glowDistortion: { amount: 0 },
                    glowLayers: [3, 12, 36, 96].map((size) => ({
                        size,
                        intensity: 0.5,
                    })),
                });
                fixture.render(2);
                rounds.push(fixture.resources.snapshot());
            }
            glError = fixture.gl.getError();
        } finally {
            fixture.destroy();
        }
        const disposed = fixture.resources.snapshot();
        rows.push({
            renderer,
            initial,
            rounds,
            disposed,
            glError,
            sourceOpacity: fixture.input.style.opacity,
            failed:
                glError !== 0 ||
                Object.values(disposed.objects).some((count) => count !== 0) ||
                rounds.some((r) => r.textureBytes !== rounds[0].textureBytes),
        });
    }
    return rows;
}

export async function curvedCoreChecks({
    renderer = "candidate",
    transformDraw,
    pixelRatio = 1,
    sourceResolution = pixelRatio,
} = {}) {
    const rows = [];
    for (const radius of [2, 5, 20]) {
        for (const thickness of [0.25, 0.5, 1]) {
            const sums = [];
            for (const phase of [0, 0.25, 0.5, 0.75]) {
                const fixture = await createSaberFixture({
                    Effect: renderer === "baseline" ? Baseline : undefined,
                    transformDraw,
                    sourceWidth: 64,
                    sourceHeight: 64,
                    pixelRatio,
                    width: 128,
                    height: 128,
                    options: { ...STEADY_OPTIONS, pad: 8, glow: 0, thickness },
                    paint(c) {
                        c.canvas.width = 64 * sourceResolution;
                        c.canvas.height = 64 * sourceResolution;
                        c.scale(sourceResolution, sourceResolution);
                        c.fillStyle = "white";
                        c.beginPath();
                        c.arc(32 + phase, 32 + phase, radius, 0, Math.PI * 2);
                        c.fill();
                    },
                });
                try {
                    sums.push(stats(await fixture.capture("core")).sum);
                } finally {
                    fixture.destroy();
                }
            }
            const mean = sums.reduce((a, b) => a + b) / sums.length;
            rows.push({
                renderer,
                pixelRatio,
                sourceResolution,
                radius,
                thickness,
                sums,
                energyRange: (Math.max(...sums) - Math.min(...sums)) / mean,
                idealArea: 2 * Math.PI * radius * thickness * pixelRatio ** 2,
                mean,
            });
        }
    }
    return rows;
}

export async function regionChecks() {
    const rows = [];
    for (const pixelRatio of [1, 1.5, 2, 3]) {
        for (const pad of [320, "fullscreen"]) {
            for (const thickness of [2, 80]) {
                const images = [];
                for (const full of [true, false]) {
                    const fixture = await createSaberFixture({
                        pixelRatio,
                        options: { ...STEADY_OPTIONS, pad, thickness, glow: 0 },
                        transformDraw: full
                            ? (draw) =>
                                  draw.geometry?.attributes?.position
                                      ?.itemSize === 2
                                      ? { ...draw, geometry: undefined }
                                      : draw
                            : undefined,
                    });
                    try {
                        images.push(await fixture.capture("core"));
                    } finally {
                        fixture.destroy();
                    }
                }
                rows.push({
                    pixelRatio,
                    pad,
                    thickness,
                    ...difference(images[0], images[1]),
                });
            }
        }
    }
    return rows;
}

export async function sourceChecks() {
    const rows = [];
    for (const source of [true, false]) {
        let output;
        const fixture = await createSaberFixture({
            sourceWidth: 8,
            sourceHeight: 8,
            width: 64,
            height: 64,
            options: { ...STEADY_OPTIONS, source, intensity: 0, pad: 8 },
            paint(c) {
                c.fillStyle = "rgba(255,64,0,0.5)";
                c.fillRect(0, 0, 4, 4);
                c.fillStyle = "rgba(0,128,255,0.25)";
                c.fillRect(4, 4, 4, 4);
            },
            transformDraw(draw, ctx) {
                if (draw.uniforms.coreGain !== undefined) {
                    output ??= ctx.createRenderTarget({ float: true });
                    return { ...draw, target: output };
                }
                return draw;
            },
        });
        try {
            const original = fixture.input
                .getContext("2d")
                .getImageData(0, 0, 8, 8).data;
            const actual = await fixture.capture("composite");
            let maxError = 0;
            for (let y = 0; y < actual.height; y++) {
                for (let x = 0; x < actual.width; x++) {
                    const sx = x - 8;
                    const sy = 15 - y;
                    const inside =
                        source && sx >= 0 && sx < 8 && sy >= 0 && sy < 8;
                    const offset = (sy * 8 + sx) * 4;
                    for (let channel = 0; channel < 4; channel++) {
                        const expected = inside
                            ? (original[offset + channel] / 255) *
                              (channel === 3 ? 1 : original[offset + 3] / 255)
                            : 0;
                        maxError = Math.max(
                            maxError,
                            Math.abs(
                                actual.pixels[
                                    (y * actual.width + x) * 4 + channel
                                ] - expected,
                            ),
                        );
                    }
                }
            }
            rows.push({
                source,
                maxError,
                glError: fixture.gl.getError(),
                failed: maxError > 1 / 255,
            });
        } finally {
            fixture.destroy();
        }
    }
    for (const edge of ["alpha", "luminance"]) {
        const fixture = await createSaberFixture({
            sourceWidth: 32,
            sourceHeight: 32,
            width: 64,
            height: 64,
            options: {
                ...STEADY_OPTIONS,
                edge,
                edgeThreshold: 0,
                source: false,
                pad: 8,
            },
            paint() {},
        });
        try {
            const image = fixture.screen();
            const maximum = image.pixels.reduce((a, b) => Math.max(a, b), 0);
            rows.push({
                edge,
                transparent: true,
                maximum,
                glError: fixture.gl.getError(),
                failed: maximum !== 0,
            });
        } finally {
            fixture.destroy();
        }
    }
    return rows;
}

export async function contextRestoreChecks() {
    const fixture = await createSaberFixture({
        pixelRatio: 2,
        trackResources: true,
        options: {
            ...STEADY_OPTIONS,
            pad: 320,
            end: 0.65,
            glowDistortion: { amount: 32 },
        },
    });
    const extension = fixture.gl.getExtension("WEBGL_lose_context");
    if (!extension) {
        fixture.destroy();
        return { skipped: "WEBGL_lose_context unavailable" };
    }
    const events = [];
    const nextEvent = (name) =>
        new Promise((resolve, reject) => {
            const canvas = fixture.gl.canvas;
            const receive = () => {
                clearTimeout(timeout);
                events.push(name);
                resolve();
            };
            const timeout = setTimeout(() => {
                canvas.removeEventListener(name, receive);
                reject(new Error(`Timed out waiting for ${name}`));
            }, 5000);
            canvas.addEventListener(name, receive, { once: true });
        });
    const revealedScreen = async () => {
        for (let i = 0; i < 60; i++) {
            const core = await fixture.capture("core", 2);
            if (stats(core).sum > 0) {
                return fixture.screen(2);
            }
            await new Promise(requestAnimationFrame);
        }
        throw new Error("Reveal did not become visible");
    };
    let result;
    try {
        const before = await revealedScreen();
        const lost = nextEvent("webglcontextlost");
        extension.loseContext();
        await lost;
        // Restoration must happen after the loss event has been delivered.
        await new Promise(requestAnimationFrame);
        const restored = nextEvent("webglcontextrestored");
        extension.restoreContext();
        await restored;
        await new Promise(requestAnimationFrame);
        const after = await revealedScreen();
        let changed = 0;
        let maxDifference = 0;
        for (let i = 0; i < before.pixels.length; i++) {
            const delta = Math.abs(before.pixels[i] - after.pixels[i]);
            changed += delta > 0 ? 1 : 0;
            maxDifference = Math.max(maxDifference, delta);
        }
        const glError = fixture.gl.getError();
        result = {
            events,
            changed,
            maxDifference,
            readbacks: fixture.readbacks,
            glError,
            failed: changed !== 0 || glError !== 0,
        };
    } finally {
        fixture.destroy();
    }
    result.disposed = fixture.resources.snapshot();
    result.failed ||= Object.values(result.disposed.objects).some(
        (count) => count !== 0,
    );
    return result;
}

// Exercise actual CSS element resizes, not just padding/uniform changes.
// A round trip at fixed time must restore pixels and allocated texture bytes.
export async function resizeChecks() {
    const rows = [];
    for (const pixelRatio of [1, 2]) {
        for (const preset of ["fire", "arc-reactor", "windy", "torch"]) {
            const fixture = await createSaberFixture({
                pixelRatio,
                trackResources: true,
                options: { preset, pad: 160 },
            });
            const row = { pixelRatio, preset, rounds: [], failures: [] };
            try {
                const initial = fixture.screen(2);
                for (let round = 0; round < 2; round++) {
                    for (const [width, height] of [
                        [240, 112],
                        [420, 196],
                        [300, 140],
                    ]) {
                        Object.assign(fixture.input.style, {
                            width: `${width}px`,
                            height: `${height}px`,
                            left: `${(640 - width) / 2}px`,
                            top: `${(400 - height) / 2}px`,
                        });
                        await new Promise(requestAnimationFrame);
                        fixture.render(2);
                        await new Promise(requestAnimationFrame);
                        const shot = fixture.screen(2);
                        if (
                            fixture.dims.element[0] !== width ||
                            fixture.dims.element[1] !== height
                        ) {
                            row.failures.push({
                                width,
                                height,
                                error: "stale dimensions",
                                dims: fixture.dims.element,
                            });
                        }
                        if (
                            !shot.pixels.some(
                                (value, i) => i % 4 !== 3 && value > 0,
                            )
                        ) {
                            row.failures.push({
                                width,
                                height,
                                error: "empty output",
                            });
                        }
                    }
                    const restored = fixture.screen(2);
                    let peak = 0,
                        square = 0;
                    for (let i = 0; i < initial.pixels.length; i++) {
                        const delta = Math.abs(
                            initial.pixels[i] - restored.pixels[i],
                        );
                        peak = Math.max(peak, delta);
                        square += delta * delta;
                    }
                    const state = {
                        peak,
                        rms: Math.sqrt(square / initial.pixels.length),
                        textureBytes: fixture.resources.snapshot().textureBytes,
                    };
                    row.rounds.push(state);
                    if (peak > 1) {
                        row.failures.push({
                            round,
                            error: "round-trip pixels",
                            ...state,
                        });
                    }
                }
                row.glError = fixture.gl.getError();
                if (row.glError) {
                    row.failures.push({ error: "WebGL" });
                }
                if (row.rounds[0].textureBytes !== row.rounds[1].textureBytes) {
                    row.failures.push({ error: "texture allocation grew" });
                }
            } finally {
                fixture.destroy();
            }
            row.disposed = fixture.resources.snapshot();
            if (
                Object.values(row.disposed.objects).some((count) => count !== 0)
            ) {
                row.failures.push({ error: "resources not released" });
            }
            rows.push(row);
        }
    }
    return rows;
}

window.saberQualityChecks = {
    run,
    difference,
    cacheChecks,
    revealChecks,
    resolutionChecks,
    noiseChecks,
    lifecycleChecks,
    sourceChecks,
    curvedCoreChecks,
    regionChecks,
    contextRestoreChecks,
    resizeChecks,
};

// Freeze Stage17 as baseline. Tracks effect textures, not total driver VRAM.
// Include invalidation/dynamic peaks: steady-state alone hides flood scratch.
export async function memoryChecks({ paint } = {}) {
    const rows = [];
    for (const pixelRatio of [1, 2]) {
        for (const preset of [
            "arc-reactor",
            "burning",
            "energy",
            "fog",
            "kryptonite",
            "torch",
            "tractor-beam",
            "windy",
            "wormhole",
            "electric",
            "fire",
            "embers",
        ]) {
            const captures = [];
            const resources = [];
            for (const Effect of [Baseline, undefined]) {
                const f = await createSaberFixture({
                    Effect,
                    width: 960,
                    height: 540,
                    sourceWidth: 960,
                    sourceHeight: 540,
                    pixelRatio,
                    trackResources: true,
                    paint,
                    options: {
                        preset,
                        pad: 320,
                        edgeThreshold: preset === "wormhole" ? 1 : 0.5,
                    },
                });
                const record = {};
                try {
                    captures.push([1, 1.5, 2].map((t) => f.screen(t)));
                    record.static = f.resources.snapshot();
                    f.effect.invalidate();
                    f.render(2);
                    record.rebuilt = f.resources.snapshot();
                    f.effect.setParams({ dynamic: true });
                    f.render(2);
                    f.render(2.1);
                    record.dynamic = f.resources.snapshot();
                    f.effect.setParams({ dynamic: false });
                    f.render(2.1);
                    record.frozen = f.resources.snapshot();
                    record.glError = f.gl.getError();
                } finally {
                    f.destroy();
                    record.disposed = f.resources.snapshot();
                }
                resources.push(record);
            }
            const errors = captures[0].map((before, k) => {
                const after = captures[1][k];
                let sum = 0,
                    squared = 0,
                    energy = 0,
                    max = 0,
                    count = 0;
                for (let i = 0; i < before.pixels.length; i++) {
                    if (i % 4 === 3) {
                        continue;
                    }
                    const delta = Math.abs(before.pixels[i] - after.pixels[i]);
                    sum += delta;
                    squared += delta * delta;
                    energy += before.pixels[i];
                    max = Math.max(max, delta);
                    count++;
                }
                return {
                    mae: sum / count,
                    rms: Math.sqrt(squared / count),
                    relativeL1: sum / Math.max(1, energy),
                    max,
                };
            });
            const candidate = resources[1];
            const baseline = resources[0];
            rows.push({
                preset,
                pixelRatio,
                errors,
                resources,
                failed:
                    errors.some((e) => e.relativeL1 > 0.01 || e.rms > 1) ||
                    resources.some(
                        (r) =>
                            r.glError !== 0 ||
                            Object.values(r.disposed.objects).some(
                                (n) => n !== 0,
                            ),
                    ) ||
                    candidate.frozen.textureBytes !==
                        candidate.static.textureBytes ||
                    candidate.static.textureBytes >
                        baseline.static.textureBytes * 0.5 ||
                    candidate.dynamic.peakTextureBytes >
                        baseline.dynamic.peakTextureBytes * 0.65,
            });
        }
    }
    return rows;
}
