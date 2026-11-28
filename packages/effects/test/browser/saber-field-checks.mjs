// Frozen Stage19 vs candidate: compact field precision, reveal transitions, fallback and restore.
import { SaberEffect as Baseline } from "./baseline/saber.js";
import { SaberEffect as Candidate } from "./candidate/saber.js";
import {
    createSaberFixture,
    imageStats,
    STEADY_OPTIONS,
} from "./saber-quality.mjs";
import { contextRestoreChecks } from "./saber-quality-checks.mjs";

class Legacy extends Candidate {
    init(ctx) {
        super.init({ ...ctx, gl: { getExtension: () => null } });
    }
}
function delta(a, b) {
    let max = 0,
        sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        max = Math.max(max, d);
        sum += d;
    }
    return { max, sum };
}
export async function runFieldChecks() {
    const result = { done: false, geometry: [], modes: [], formats: [] };
    for (const blank of [false, true]) {
        const outputs = [];
        for (const Effect of [Baseline, Candidate, Legacy]) {
            const f = await createSaberFixture({
                Effect,
                pixelRatio: 2,
                sourceWidth: 64,
                sourceHeight: 64,
                options: { ...STEADY_OPTIONS, thickness: 0.25, pad: 400 },
                paint: (c) => {
                    if (!blank) {
                        c.translate(32, 32);
                        c.rotate(0.37);
                        c.fillRect(-24, -1, 48, 2);
                    }
                },
            });
            try {
                f.effect.invalidate();
                const field = await f.capture("field");
                const screen = f.screen(2);
                outputs.push({ field, screen, error: f.gl.getError() });
            } finally {
                f.destroy();
            }
        }
        const [a, b, c] = outputs;
        let distanceMax = 0,
            normalMax = 0,
            validErrors = 0;
        for (let i = 0; i < a.field.pixels.length; i += 4) {
            const x = a.field.pixels[i + 1],
                y = a.field.pixels[i + 2],
                angle = b.field.pixels[i + 1];
            distanceMax = Math.max(
                distanceMax,
                Math.abs(a.field.pixels[i] - b.field.pixels[i]),
            );
            validErrors += Number(a.field.pixels[i + 3] > 0.5 !== angle > 0);
            if (angle > 0 && angle !== 8) {
                normalMax = Math.max(
                    normalMax,
                    Math.abs(x - Math.cos(angle - 4)),
                    Math.abs(y - Math.sin(angle - 4)),
                );
            }
        }
        result.geometry.push({
            blank,
            distanceMax,
            normalMax,
            validErrors,
            screen: delta(a.screen.pixels, b.screen.pixels),
            fallback: delta(a.screen.pixels, c.screen.pixels),
            errors: outputs.map((x) => x.error),
        });
    }
    const captures = [];
    for (const Effect of [Baseline, Candidate]) {
        const f = await createSaberFixture({
            Effect,
            pixelRatio: 2,
            trackResources: true,
            options: { preset: "arc-reactor", pad: 320 },
        });
        const frames = [];
        const states = [];
        try {
            for (const end of [1, 0.55, 1, 0.55, 1]) {
                f.effect.setParams({ end });
                if (end < 1) {
                    for (let i = 0; i < 40; i++) {
                        const core = await f.capture("core", 2);
                        if (
                            imageStats(core.pixels, core.width, core.height)
                                .sum > 0
                        ) {
                            break;
                        }
                        await new Promise(requestAnimationFrame);
                    }
                }
                frames.push(f.screen(2).pixels);
                states.push({
                    end,
                    resources: f.resources.snapshot(),
                    reads: f.readbacks.length,
                    error: f.gl.getError(),
                });
            }
        } finally {
            f.destroy();
        }
        captures.push(frames);
        result.modes.push({ states, disposed: f.resources.snapshot() });
    }
    result.revealDeltas = captures[0].map((x, i) => delta(x, captures[1][i]));
    result.compactRestore = await contextRestoreChecks({ end: 1 });
    class Formats {
        init(ctx) {
            this.ctx = ctx;
            this.targets = ["ordinary", "persistent", "mipmap", "msaa"].map(
                (mode) => ({
                    mode,
                    target: ctx.createRenderTarget({
                        format: "rg32f",
                        size: [8, 8],
                        persistent: mode === "persistent",
                        mipmap: mode === "mipmap",
                        samples: mode === "msaa" ? 4 : 1,
                    }),
                }),
            );
        }
        render(ctx) {
            for (const { target } of this.targets) {
                ctx.draw({
                    frag: "#version 300 es\nprecision highp float;out vec4 outColor;void main(){outColor=vec4(0.12345679,37.12345,0.,1.);}",
                    target,
                });
            }
            ctx.blit(this.targets[0].target);
        }
    }
    const f = await createSaberFixture({
        Effect: Formats,
        trackResources: true,
    });
    try {
        for (const { mode, target } of f.effect.targets) {
            const values = await f.effect.ctx.readPixels(target);
            const actual = Array.from(values.slice(0, 4));
            result.formats.push({
                mode,
                actual,
                delta: delta(actual, [
                    Math.fround(0.12345679),
                    Math.fround(37.12345),
                    0,
                    1,
                ]),
                error: f.gl.getError(),
            });
        }
    } finally {
        f.destroy();
    }
    result.formatDisposed = f.resources.snapshot();
    result.failed =
        result.geometry.some(
            (r) =>
                r.distanceMax !== 0 ||
                r.normalMax > 0.000002 ||
                r.validErrors !== 0 ||
                r.screen.max > 1 ||
                r.fallback.max !== 0 ||
                r.errors.some((e) => e !== 0),
        ) ||
        result.revealDeltas.some((r) => r.max !== 0) ||
        result.compactRestore.failed ||
        result.modes.some(
            (r) =>
                r.states.some((s) => s.error !== 0) ||
                Object.values(r.disposed.objects).some((n) => n !== 0),
        ) ||
        result.formats.some((r) => r.error !== 0 || r.delta.max !== 0) ||
        Object.values(result.formatDisposed.objects).some((n) => n !== 0);
    result.done = true;
    return result;
}
