// Browser-only quality/performance fixture. Import through the Storybook Vite
// server; no dependency on test runners or GPU timing in the unit-test suite.
import { VFX } from "@vfx-js/core";
import { DEFAULT_DISTORTION, SaberGlowPasses } from "../../src/_saber-glow.ts";
import { trackGLResources } from "./track-gl-resources.mjs";

// Keep ongoing measurements alive while editing shader sources. Re-import this
// module with a fresh query string to create fixtures from the latest revision.
import.meta.hot?.accept();

import { SaberEffect } from "../../src/saber.ts";

// Neutral diagnostic appearance: explicit so default-preset changes cannot
// accidentally animate coverage, cache, or halo probes. Also accepted by baseline.
export const STEADY_OPTIONS = Object.freeze({
    gamma: 1,
    brightness: 1,
    saturation: 1,
    coreSoftness: 0,
    coreBlendOnTop: false,
    haloIntensity: 100,
    haloSize: 100,
    glowBias: 1,
    glowPreGamma: 1,
    flickerIntensity: 0,
    coreDistortion: { ...DEFAULT_DISTORTION },
    glowDistortion: { ...DEFAULT_DISTORTION, composite: "distort", seed: 71 },
    glowLayers: [
        { size: 3, intensity: 3 },
        { size: 12, intensity: 6 },
        { size: 36, intensity: 9 },
        { size: 96, intensity: 12 },
    ],
    color: "#3399ff",
    thickness: 2,
    glow: 1,
    glowSizeMultiplier: 1,
});

const frame = () => new Promise(requestAnimationFrame);

function passName({ uniforms: u = {} }) {
    if (u.seed && u.edgeMode !== undefined) {
        return "field";
    }
    if (u.payloadOn !== undefined) {
        return "seed";
    }
    if (u.maskSize) {
        return "trace-mask";
    }
    if (u.probeCenter) {
        return "probe";
    }
    if (u.coreGain !== undefined) {
        return "composite";
    }
    if (u.revealEnd !== undefined) {
        return "core";
    }
    if (u.noiseFieldPass) {
        return "noise-field";
    }
    if (u.haloPass === 1) {
        return "halo-distortion";
    }
    if (u.noiseType !== undefined) {
        return u.glowPass ? "glow-distortion" : "core-distortion";
    }
    if (u.layer0) {
        return "layers";
    }
    if (u.axis) {
        return "blur";
    }
    if (u.stepSize) {
        return "flood";
    }
    return "other";
}

export function summarize(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return {
        median: sorted[Math.floor(sorted.length * 0.5)] ?? null,
        p95: sorted[Math.floor(sorted.length * 0.95)] ?? null,
        min: sorted[0] ?? null,
        max: sorted.at(-1) ?? null,
        samples: sorted.length,
    };
}

export function imageStats(pixels, width, height, channel = 0) {
    let sum = 0;
    let xSum = 0;
    let ySum = 0;
    let peak = 0;
    let invalid = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = pixels[(y * width + x) * 4 + channel];
            if (!Number.isFinite(v)) {
                invalid++;
            }
            sum += v;
            xSum += x * v;
            ySum += y * v;
            peak = Math.max(peak, v);
        }
    }
    const cx = xSum / sum;
    const cy = ySum / sum;
    let vx = 0;
    let vy = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = pixels[(y * width + x) * 4 + channel];
            vx += (x - cx) ** 2 * v;
            vy += (y - cy) ** 2 * v;
        }
    }
    return {
        sum,
        peak,
        cx,
        cy,
        sigmaX: Math.sqrt(vx / sum),
        sigmaY: Math.sqrt(vy / sum),
        invalid,
    };
}

// Analytic one-pixel impulse / vertical line for measuring the blur separately
// from contour extraction, line coverage, tone mapping, and 8-bit quantization.
export class GlowProbe {
    constructor({ GlowPasses = SaberGlowPasses, ...options } = {}) {
        this.params = {
            radius: 3,
            spread: 1,
            offset: [0, 0],
            line: false,
            normalized: false,
            preGamma: 1,
            layerBias: [1, 1, 1, 1],
            response: 0,
            inputGain: 1,
            layers: null,
            ...options,
        };
        this.passes = new GlowPasses();
        this.legacyLayers = GlowPasses !== SaberGlowPasses;
    }
    init(ctx) {
        this.input = ctx.createRenderTarget({ float: true });
    }
    render(ctx) {
        const { radius, spread, offset, line } = this.params;
        ctx.draw({
            frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 probeCenter;
uniform int line;
void main() {
    vec2 coverage = max(vec2(1.0) - abs(gl_FragCoord.xy - probeCenter), 0.0);
    float light = line == 1 ? coverage.x : coverage.x * coverage.y;
    outColor = vec4(vec3(light), 1.0);
}`,
            uniforms: {
                probeCenter: [
                    this.input.width / 2 + offset[0],
                    this.input.height / 2 + offset[1],
                ],
                line: line ? 1 : 0,
            },
            target: this.input,
        });
        const layers = this.params.layers ?? [
            { size: radius, intensity: 1 },
            { size: 0, intensity: 0 },
            { size: 0, intensity: 0 },
            { size: 0, intensity: 0 },
        ];
        if (this.params.normalized) {
            const prepared = this.passes.prepareLayers(
                ctx,
                this.input,
                layers,
                spread,
                true,
            );
            const output = this.passes.combineLayers(ctx, {
                ...prepared,
                preGamma: this.params.preGamma,
                layerBias: this.params.layerBias,
                response: this.params.response,
                inputGain: this.params.inputGain,
            });
            ctx.blit(output);
            return;
        }
        const output = this.passes.layers(
            ctx,
            this.input,
            layers,
            // Frozen baselines retain the removed spread argument.
            ...(this.legacyLayers ? [spread, 1, 48] : [spread]),
        );
        ctx.blit(output);
    }
    dispose() {
        this.passes.dispose();
    }
}

// White input isolates the distortion's brightness field from line geometry.
export class DistortionProbe {
    constructor({ GlowPasses = SaberGlowPasses, ...options } = {}) {
        this.params = {
            ...DEFAULT_DISTORTION,
            composite: "multiply",
            amount: 32,
            windSpeed: 0,
            noiseSpeed: 0,
            ...options,
        };
        this.passes = new GlowPasses();
    }
    init(ctx) {
        this.input = ctx.createRenderTarget({ float: true });
    }
    render(ctx) {
        ctx.draw({
            frag: `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(1.0); }`,
            uniforms: {},
            target: this.input,
        });
        const result = this.passes.distort(
            ctx,
            this.input,
            this.params,
            "glow",
        );
        ctx.blit(result);
    }
    dispose() {
        this.passes.dispose();
    }
}

export async function createSaberFixture({
    Effect = SaberEffect,
    options = {},
    pixelRatio = 1,
    width = 640,
    height = 400,
    sourceWidth = 300,
    sourceHeight = 140,
    paint,
    transformDraw,
    isolateGlow = false,
    trackResources = false,
} = {}) {
    // Context loss is dispatched asynchronously. Let a preceding fixture's
    // teardown reach the browser before allocating the next context; otherwise
    // large matrices can evict a still-live comparison fixture.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;overflow:hidden;background:#000;z-index:99999`;
    const input = document.createElement("canvas");
    input.width = sourceWidth;
    input.height = sourceHeight;
    input.style.cssText = `position:absolute;left:${(width - sourceWidth) / 2}px;top:${(height - sourceHeight) / 2}px;width:${sourceWidth}px;height:${sourceHeight}px`;
    wrapper.append(input);
    document.body.append(wrapper);
    const c = input.getContext("2d");
    c.fillStyle = "white";
    if (paint) {
        paint(c, sourceWidth, sourceHeight);
    } else {
        c.font = "bold 80px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("Saber", sourceWidth / 2, sourceHeight / 2);
    }
    const effect = new Effect({ source: false, ...options });
    const targets = [];
    const readbacks = [];
    const lastPasses = new Map();
    let context;
    let resources;
    let captureName;
    let capturePromise;
    let capturedSize;
    let record = false;
    let draws = [];
    let rendered = false;
    function instrument(ctx) {
        context = ctx;
        if (trackResources && !resources) {
            resources = trackGLResources(ctx.gl);
        }
        return {
            ...ctx,
            createRenderTarget(opts) {
                const target = ctx.createRenderTarget(opts);
                targets.push({ target, opts });
                return target;
            },
            readPixels(target, opts) {
                readbacks.push({ width: target.width, height: target.height });
                return ctx.readPixels(target, opts);
            },
            createProgram(opts) {
                return ctx.createProgram(
                    transformDraw ? transformDraw(opts, ctx) : opts,
                );
            },
            draw(opts) {
                if (opts.uniforms?.coreGain !== undefined) {
                    rendered = true;
                }
                if (transformDraw) {
                    opts = transformDraw(opts, ctx);
                }
                if (isolateGlow && opts.uniforms?.coreGain !== undefined) {
                    opts = {
                        ...opts,
                        uniforms: { ...opts.uniforms, coreGain: 0 },
                    };
                }
                ctx.draw(opts);
                if (opts.target) {
                    lastPasses.set(passName(opts), opts.target);
                }
                if (record) {
                    draws.push({ name: passName(opts), ...opts });
                }
                if (captureName === passName(opts) && opts.target) {
                    capturePromise = ctx.readPixels(opts.target);
                    capturedSize = [opts.target.width, opts.target.height];
                    captureName = null;
                }
            },
        };
    }
    const adapter = {
        init: (ctx) => effect.init?.(instrument(ctx)),
        render: (ctx) => effect.render(instrument(ctx)),
        outputRect: (dims) => effect.outputRect?.(dims),
        dispose: () => effect.dispose?.(),
    };
    // VFX availability probes create detached contexts. Release those probes
    // during large matrices, before Chrome evicts the live comparison context.
    const createdContexts = new Set();
    const getContext = HTMLCanvasElement.prototype.getContext;
    let vfx;
    HTMLCanvasElement.prototype.getContext = function (...args) {
        const result = getContext.apply(this, args);
        if (result && (args[0] === "webgl" || args[0] === "webgl2")) {
            createdContexts.add(result);
        }
        return result;
    };
    try {
        vfx = new VFX({
            autoplay: false,
            pixelRatio,
            wrapper,
            scrollPadding: false,
        });
    } finally {
        HTMLCanvasElement.prototype.getContext = getContext;
        for (const context of createdContexts) {
            if (!context.canvas.isConnected) {
                context.getExtension("WEBGL_lose_context")?.loseContext();
            }
        }
    }
    await vfx.add(input, { effect: adapter });
    await frame();
    const render = (time = 2) => {
        vfx.setTime(time);
        vfx.render();
    };
    const settle = async (time = 2) => {
        const deadline = performance.now() + 30000;
        for (;;) {
            rendered = false;
            render(time);
            if (
                rendered ||
                (!(effect instanceof SaberEffect) &&
                    !effect.params?.coreDistortion)
            ) {
                return;
            }
            if (performance.now() > deadline) {
                throw new Error("Saber preparation timed out");
            }
            await frame();
        }
    };
    await settle();
    const gl = context.gl;
    const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    const fixture = {
        effect,
        input,
        wrapper,
        vfx,
        gl,
        targets,
        readbacks,
        get dims() {
            return context.dims;
        },
        get resources() {
            return resources;
        },
        render,
        settle,
        async capture(name = "core", time = 2) {
            await settle(time);
            captureName = name;
            capturePromise = null;
            record = true;
            draws = [];
            render(time);
            record = false;
            if (!capturePromise && lastPasses.has(name)) {
                const target = lastPasses.get(name);
                capturePromise = context.readPixels(target);
                capturedSize = [target.width, target.height];
            }
            captureName = null;
            if (!capturePromise) {
                throw new Error(`Missing pass: ${name}`);
            }
            const pixels = await capturePromise;
            return {
                pixels,
                width: capturedSize[0],
                height: capturedSize[1],
                draws,
            };
        },
        screen(time = 2) {
            render(time);
            const pixels = new Uint8Array(
                gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
            );
            gl.readPixels(
                0,
                0,
                gl.drawingBufferWidth,
                gl.drawingBufferHeight,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixels,
            );
            return {
                pixels,
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight,
            };
        },
        async benchmark({
            warmup = 20,
            samples = 90,
            dynamic = false,
            batch = 1,
        } = {}) {
            for (let i = 0; i < warmup; i++) {
                if (dynamic) {
                    effect.invalidate();
                }
                render(i / 60);
                await frame();
            }
            const cpu = [];
            const pending = [];
            const gpu = [];
            for (let i = 0; i < samples; i++) {
                const query = timer && gl.createQuery();
                if (query) {
                    gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
                }
                const start = performance.now();
                for (let j = 0; j < batch; j++) {
                    if (dynamic) {
                        effect.invalidate();
                    }
                    render((warmup + i + j / batch) / 60);
                }
                cpu.push((performance.now() - start) / batch);
                if (query) {
                    gl.endQuery(timer.TIME_ELAPSED_EXT);
                    pending.push(query);
                }
                await frame();
                while (
                    pending.length &&
                    gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)
                ) {
                    const q = pending.shift();
                    if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
                        gpu.push(
                            gl.getQueryParameter(q, gl.QUERY_RESULT) /
                                1e6 /
                                batch,
                        );
                    }
                    gl.deleteQuery(q);
                }
            }
            // Avoid indefinite polling on a lost context or unsupported timer.
            for (let i = 0; pending.length && i < 60; i++) {
                await frame();
                if (
                    gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)
                ) {
                    const q = pending.shift();
                    if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
                        gpu.push(
                            gl.getQueryParameter(q, gl.QUERY_RESULT) /
                                1e6 /
                                batch,
                        );
                    }
                    gl.deleteQuery(q);
                }
            }
            for (const q of pending) {
                gl.deleteQuery(q);
            }
            return {
                cpuMs: summarize(cpu),
                gpuMs: summarize(gpu),
                glError: gl.getError(),
            };
        },
        destroy() {
            vfx.destroy();
            wrapper.remove();
            resources?.detach();
            // A matrix creates hundreds of independent contexts. Release each
            // after checking normal disposal instead of waiting for browser GC
            // to evict an arbitrary old context during a later measurement.
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        },
    };
    return fixture;
}
