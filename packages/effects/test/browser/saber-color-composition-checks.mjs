import { createSaberFixture, STEADY_OPTIONS } from "./saber-quality.mjs";

// Native AE samples: replace only texture inputs, retaining the production
// compositor, color ramp, output controls and dithering. This isolates color
// ordering from our deliberately different noise seed and contour geometry.
export async function runColorCompositionChecks({ Effect } = {}) {
    const cases = await (
        await fetch(new URL("./saber-color-composition.json", import.meta.url))
    ).json();
    let sample = cases[0];
    const f = await createSaberFixture({
        ...(Effect ? { Effect } : {}),
        width: 64,
        height: 64,
        sourceWidth: 64,
        sourceHeight: 64,
        pixelRatio: 1,
        options: {
            ...STEADY_OPTIONS,
            coreWhiteness: 0,
            glowWhiteness: 0,
            coreBlendOnTop: true,
            coreDistortion: { ...STEADY_OPTIONS.coreDistortion, amount: 0.1 },
            pad: 0,
        },
        transformDraw(draw) {
            if (draw.uniforms?.coreGain === undefined) {
                return draw;
            }
            const frag = draw.frag
                .replace(
                    "precision highp float;",
                    "precision highp float;\nuniform float probeCore;\nuniform vec4 probeGlow;\nuniform float probeOverlay;",
                )
                .replaceAll("texture(core, uv).r", "probeCore")
                .replaceAll("texture(originalCore, uv).r", "probeOverlay")
                .replace(
                    "lights = max(lights, 0.0) * glowGain;",
                    "lights = probeGlow;",
                );
            return {
                ...draw,
                frag,
                uniforms: {
                    ...draw.uniforms,
                    coreGain: 1,
                    glowGain: 1,
                    outputBrightness: 1,
                    glowOutputBrightness: 1,
                    probeCore: sample.core,
                    probeGlow: sample.glow,
                    probeOverlay: sample.overlay,
                },
            };
        },
    });
    const rows = [],
        failures = [];
    try {
        for (sample of cases) {
            f.effect.setParams({
                color: sample.color,
                gamma: sample.gamma,
                saturation: sample.saturation,
            });
            const shot = f.screen(2);
            const offset = ((shot.height - 33) * shot.width + 32) * 4;
            const actual = [...shot.pixels.subarray(offset, offset + 3)].map(
                (v) => v / 255,
            );
            const maximum = Math.max(
                ...actual.map((v, c) => Math.abs(v - sample.expected[c])),
            );
            const row = {
                name: sample.name,
                actual,
                expected: sample.expected,
                maximum,
                glError: f.gl.getError(),
            };
            rows.push(row);
            // Native reference inputs are decoded to 8-bit; interpolation near
            // dark knees plus two independent dithers needs several LSB.
            if (maximum > 0.025 || row.glError) {
                failures.push(row);
            }
        }
        return { rows, failures };
    } finally {
        f.destroy();
    }
}
