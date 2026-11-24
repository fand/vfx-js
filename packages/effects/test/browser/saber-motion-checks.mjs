// Real WebGL transport and animation checks, independent of preset still images.
import { createSaberFixture } from "./saber-quality.mjs";
export const AE_PRESETS = [
    "arc-reactor",
    "burning",
    "electric",
    "energy",
    "fog",
    "kryptonite",
    "fire",
    "torch",
    "tractor-beam",
    "windy",
    "wormhole",
];
function difference(a, b) {
    let max = 0;
    for (let i = 0; i < a.pixels.length; i++) {
        max = Math.max(max, Math.abs(a.pixels[i] - b.pixels[i]));
    }
    return max;
}
function translatedError(a, b, dx, dy) {
    let sum = 0,
        n = 0;
    const w = a.width,
        h = a.height;
    for (let y = 32; y < h - 32; y++) {
        for (let x = 32; x < w - 32; x++) {
            sum += Math.abs(
                a.pixels[(y * w + x) * 4] -
                    b.pixels[((y + dy) * w + x + dx) * 4],
            );
            n++;
        }
    }
    return sum / n;
}
function centroid(s) {
    let sum = 0,
        ySum = 0;
    for (let y = 0; y < s.height; y++) {
        for (let x = 0; x < s.width; x++) {
            const v = s.pixels[(y * s.width + x) * 4];
            sum += v;
            ySum += y * v;
        }
    }
    return ySum / sum;
}
export async function runMotionChecks() {
    const result = { transport: [], envelope: [], animation: [], failures: [] };
    for (const pixelRatio of [1, 2]) {
        for (const type of ["fluid", "smoke", "energy"]) {
            for (const windSpeed of [96, -96]) {
                const f = await createSaberFixture({
                    width: 320,
                    height: 240,
                    sourceWidth: 200,
                    sourceHeight: 120,
                    pixelRatio,
                    options: {
                        lines: 1,
                        mainAmplitude: 0,
                        variation: 0,
                        pad: 0,
                        glowMode: "layers",
                        glowDistortion: {
                            amount: 32,
                            type,
                            composite: "multiply",
                            noiseDetail: 1,
                            noiseComplexity: 4,
                            noiseScale: 90,
                            windSpeed,
                            windDirection: 90,
                            noiseSpeed: 0,
                        },
                    },
                    // Isolate the actual shader's transported field from the stationary text envelope.
                    transformDraw: (d) =>
                        d.uniforms?.glowPass === 1
                            ? {
                                  ...d,
                                  frag: d.frag.replace(
                                      "    float light = shadeNoise(n);",
                                      "    outColor=vec4(vec3(0.5+0.5*n.x),1.0); return;\n    float light = shadeNoise(n);",
                                  ),
                              }
                            : d,
                });
                const a = await f.capture("glow-distortion", 1),
                    b = await f.capture("glow-distortion", 1.125),
                    shift = 12 * pixelRatio * Math.sign(windSpeed);
                const aligned = translatedError(a, b, 0, shift),
                    opposite = translatedError(a, b, 0, -shift);
                const row = {
                    pixelRatio,
                    type,
                    windSpeed,
                    aligned,
                    opposite,
                    glError: f.gl.getError(),
                };
                result.transport.push(row);
                if (aligned > 0.001 || opposite < aligned * 10 || row.glError) {
                    result.failures.push({ check: "transport", ...row });
                }
                f.destroy();
            }
        }
        const f = await createSaberFixture({
            pixelRatio,
            width: 320,
            height: 240,
            sourceWidth: 160,
            sourceHeight: 80,
            options: {
                lines: 1,
                mainAmplitude: 0,
                variation: 0,
                pad: 80,
                coreIntensity: 0,
                glowMode: "layers",
                glowFlow: 40,
                glowDistortion: { amount: 0, windSpeed: 0, noiseSpeed: 0 },
                glowLayers: [
                    { size: 3, intensity: 1 },
                    { size: 0, intensity: 0 },
                    { size: 0, intensity: 0 },
                    { size: 0, intensity: 0 },
                ],
            },
        });
        const up = centroid(await f.capture("glow-distortion")) / pixelRatio;
        f.effect.setParams({ glowDistortion: { windDirection: 270 } });
        const down = centroid(await f.capture("glow-distortion")) / pixelRatio;
        result.envelope.push({ pixelRatio, upMinusDown: up - down });
        if (up - down < 20) {
            result.failures.push({ check: "envelope", pixelRatio, up, down });
        }
        f.destroy();
        for (const preset of AE_PRESETS) {
            const f = await createSaberFixture({
                pixelRatio,
                options: { preset, pad: 120 },
            });
            const a = f.screen(1),
                b = f.screen(1.5),
                repeat = f.screen(1);
            f.effect.setParams({
                coreDistortion: { windSpeed: 0, noiseSpeed: 0 },
                glowDistortion: { windSpeed: 0, noiseSpeed: 0 },
            });
            const frozen = difference(f.screen(1), f.screen(1.5));
            const row = {
                preset,
                pixelRatio,
                moving: difference(a, b),
                repeat: difference(a, repeat),
                frozen,
                glError: f.gl.getError(),
            };
            result.animation.push(row);
            if (!row.moving || row.repeat || frozen || row.glError) {
                result.failures.push({ check: "animation", ...row });
            }
            f.destroy();
        }
    }
    return result;
}

// Compare thin directional warps against a 4x raster reference. This catches
// missing streaks which a live/fresh equality check cannot detect.
export async function shutterChecks() {
    const rows = [];
    for (const pixelRatio of [1, 2]) {
        for (const group of ["coreDistortion", "glowDistortion"]) {
            const f = await createSaberFixture({
                pixelRatio,
                width: 240,
                height: 160,
                sourceWidth: 160,
                sourceHeight: 100,
                options: {
                    preset: "fire",
                    source: false,
                    pad: 0,
                    coreDistortion: {
                        windSpeed: 0,
                        noiseSpeed: 0,
                        motionBlur: 0,
                    },
                    glowDistortion: {
                        windSpeed: 0,
                        noiseSpeed: 0,
                        motionBlur: 0,
                    },
                },
            });
            const sharp = f.screen(1);
            f.effect.setParams({ [group]: { motionBlur: 0.05 } });
            const frozen = difference(sharp, f.screen(3));
            f.effect.setParams({
                [group]: { windSpeed: 160, noiseSpeed: 0.12 },
            });
            const a = f.screen(1.5);
            f.screen(3.5);
            const seek = difference(a, f.screen(1.5));
            f.effect.setParams({ [group]: { motionBlur: 0 } });
            const changed = difference(a, f.screen(1.5));
            rows.push({
                pixelRatio,
                group,
                frozen,
                seek,
                changed,
                glError: f.gl.getError(),
            });
            f.destroy();
        }
    }
    return {
        rows,
        failures: rows.filter(
            (r) => r.frozen || r.seek || !r.changed || r.glError,
        ),
    };
}

export async function directionalCoreChecks() {
    const rows = [];
    for (const pixelRatio of [1, 2]) {
        const config = {
            width: 240,
            height: 160,
            sourceWidth: 160,
            sourceHeight: 100,
            pixelRatio,
            paint: (c) => c.fillRect(20, 20, 120, 60),
            options: {
                source: false,
                pad: 0,
                lines: 1,
                mainAmplitude: 0,
                variation: 0,
                thickness: 0.7,
                glow: 0,
                coreDistortion: {
                    type: "fluid",
                    amount: 35,
                    noiseScale: 120,
                    noiseAspectRatio: 0.2,
                    noiseComplexity: 1,
                    noiseDetail: 0.1,
                    directionality: 1,
                    windSpeed: 40,
                    noiseSpeed: 0,
                },
            },
        };
        const high = await createSaberFixture({ ...config, pixelRatio: 4 });
        const reference = await high.capture("core-distortion", 1.5);
        high.destroy();
        const scale = 4 / pixelRatio;
        for (const mode of ["analytic", "raster"]) {
            const f = await createSaberFixture({
                ...config,
                transformDraw: (d) =>
                    mode === "raster"
                        ? {
                              ...d,
                              frag: d.frag.replace("#define ANALYTIC_CORE", ""),
                          }
                        : d,
            });
            const a = await f.capture("core-distortion", 1.5);
            let error = 0,
                energy = 0;
            for (let y = 0; y < a.height; y++) {
                for (let x = 0; x < a.width; x++) {
                    let v = 0;
                    for (let j = 0; j < scale; j++) {
                        for (let i = 0; i < scale; i++) {
                            v +=
                                reference.pixels[
                                    ((y * scale + j) * reference.width +
                                        x * scale +
                                        i) *
                                        4
                                ] /
                                (scale * scale);
                        }
                    }
                    error += Math.abs(a.pixels[(y * a.width + x) * 4] - v);
                    energy += v;
                }
            }
            rows.push({
                pixelRatio,
                mode,
                relativeError: error / energy,
                glError: f.gl.getError(),
            });
            f.destroy();
        }
    }
    const failures = [1, 2].filter((dpr) => {
        const [analytic, raster] = rows.filter((r) => r.pixelRatio === dpr);
        return (
            analytic.glError ||
            raster.glError ||
            analytic.relativeError >= raster.relativeError * 0.75
        );
    });
    return { rows, failures };
}
