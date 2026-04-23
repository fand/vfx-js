import {
    EffectHost,
    makeEffectRenderTargetFromFb,
    makeEffectTexture,
    resolveRt,
} from "./effect-host.js";
import type { GLContext } from "./gl/context.js";
import { Framebuffer } from "./gl/framebuffer.js";
import type { Quad } from "./gl/quad.js";
import { createMargin, type Margin, type MarginOpts } from "./rect.js";
import type {
    Effect,
    EffectRenderTarget,
    EffectTexture,
    EffectUniformValue,
    EffectVFXProps,
} from "./types.js";

export type ChainMargin = {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
};

const ZERO_MARGIN: ChainMargin = { top: 0, right: 0, bottom: 0, left: 0 };

export type ChainFrameInput = {
    time: number;
    deltaTime: number;
    mouse: [number, number];
    mouseViewport: [number, number];
    intersection: number;
    enterTime: number;
    leaveTime: number;
    resolvedUniforms: Record<string, EffectUniformValue>;

    canvasPhysW: number;
    canvasPhysH: number;

    /** Element rect (inner, no overflow), logical px. Mirrors viewport for post effects. */
    elementLogical: readonly [number, number];
    /** Element rect (inner, no overflow), physical px. Mirrors viewport for post effects. */
    elementPhys: readonly [number, number];
    viewportLogical: readonly [number, number];
    viewportPhys: readonly [number, number];
    /**
     * Element's inner rect on canvas, bottom-left origin, physical px.
     * Used by the chain to compute the final-stage draw viewport after
     * pad accumulation. For post-effect chains this equals
     * `viewportRectOnCanvasPx`.
     */
    elementRectOnCanvasPx: { x: number; y: number; w: number; h: number };
    /**
     * Viewport inner rect on canvas, bottom-left origin, physical px.
     * Used with `elementRectOnCanvasPx` to derive the per-side viewport
     * edge distance → `dims.fullscreenPad`.
     */
    viewportRectOnCanvasPx: { x: number; y: number; w: number; h: number };

    /** null → canvas; otherwise the already-allocated final FBO. */
    finalTarget: Framebuffer | null;

    isVisible: boolean;
};

type StageLayout = {
    /** Src pad entering this stage (physical px per side). */
    srcPad: Margin;
    /** Src buffer size (physical px): elementPixel + srcPad sums. */
    srcBufferSize: [number, number];
    /** Dst pad produced by this stage (physical px per side). */
    dstPad: Margin;
    /** Dst buffer size (physical px): elementPixel + dstPad sums. */
    dstBufferSize: [number, number];
    /** Whether the dst buffer is float. */
    float: boolean;
    /** Src inner sub-rect in src texture UV (xy = origin, zw = size). */
    srcInnerRect: [number, number, number, number];
    /** Dst inner sub-rect in buffer UV (xy = origin, zw = size). */
    uvInnerRect: [number, number, number, number];
    /**
     * Physical-px viewport on the canvas / final FBO for this stage's
     * draw. Only meaningful for the last rendering stage; intermediate
     * stages use `(0, 0, dstBufferSize[0], dstBufferSize[1])`.
     */
    outputViewport: { x: number; y: number; w: number; h: number };
};

type IntermediateEntry = {
    fb: Framebuffer;
    /** Write handle (passed as `ctx.output`). */
    rtHandle: EffectRenderTarget;
    /** Read handle (passed as `ctx.src` to the next stage). */
    texHandle: EffectTexture;
    float: boolean;
    pad: Margin;
    bufferSize: [number, number];
};

/**
 * Pipeline orchestrator for a single element's Effect chain.
 *
 * Pad model (see plan.md "Pad model"):
 * - Each rendering stage tracks `(srcPad, srcBufferSize, dstPad, dstBufferSize)`
 *   in physical pixels per side. Stage 0's src pad is always `{0,0,0,0}`
 *   (capture is inner-only).
 * - Each effect's `outputSize(dims)` returns either `pad` (delta added to
 *   src pad), explicit `size` (absolute buffer size with pad derived),
 *   or a bare `[w, h]` tuple. Returns are clamped non-monotonic (dst pad
 *   must be >= src pad per side).
 * - `dims.fullscreenPad` is the per-side `pad` delta needed to reach the
 *   viewport edges from the current src pad (non-negative, 0 if already
 *   past the edge). Zero for post-effect chains.
 * - The last rendering effect's `outputSize` return is ignored — its dst
 *   is the fixed final target. Its src pad determines the canvas-space
 *   draw viewport.
 * - `srcInnerRect` / `uvInnerRect` are derived per stage and uploaded as
 *   uniforms so the default vertex shader can emit `uvInner` (src-sampling
 *   UV) and `uvInnerDst` (dst-space 0..1 over element).
 *
 * Error handling:
 * - `init` throws → reverse-dispose prior effects, bubble rejection.
 * - `update`/`render` throw → `console.warn` once per (chain, effect),
 *   render failures fall back to a passthrough copy so the output doesn't
 *   disappear.
 *
 * @internal
 */
export class EffectChain {
    #glCtx: GLContext;
    #effects: readonly Effect[];
    #hosts: EffectHost[];
    #renderingIndices: number[];
    #intermediates: (IntermediateEntry | null)[] = [];
    #stages: StageLayout[] = [];
    #capture: EffectTexture;
    #finalFallbackHandle: EffectRenderTarget | null = null;
    #finalFallbackFb: Framebuffer | null = null;
    #warnedUpdate = new Set<number>();
    #warnedRender = new Set<number>();
    #warnedMonotonic = new Set<number>();
    #warnedClampBuffer = new Set<number>();
    #disposed = false;
    /** Post-effect context (element mirrors viewport; fullscreenPad=0). */
    #isPostEffect: boolean;

    constructor(
        glCtx: GLContext,
        quad: Quad,
        pixelRatio: number,
        effects: readonly Effect[],
        vfxProps: EffectVFXProps,
        capture: EffectTexture,
        isPostEffect: boolean,
    ) {
        this.#glCtx = glCtx;
        this.#effects = effects;
        this.#capture = capture;
        this.#isPostEffect = isPostEffect;
        this.#hosts = effects.map(
            () => new EffectHost(glCtx, quad, pixelRatio, capture, vfxProps),
        );
        this.#renderingIndices = effects
            .map((e, i) => (typeof e.render === "function" ? i : -1))
            .filter((i) => i >= 0);
        const M = this.#renderingIndices.length;
        this.#intermediates = new Array(Math.max(0, M - 1)).fill(null);
    }

    get hosts(): readonly EffectHost[] {
        return this.#hosts;
    }

    get renderingIndices(): readonly number[] {
        return this.#renderingIndices;
    }

    /** Test-only accessor for per-stage layout data. @internal */
    get stages(): readonly StageLayout[] {
        return this.#stages;
    }

    /**
     * Sequentially run each effect's `init`. On throw, dispose prior
     * effects in reverse order (the failing effect's own `dispose` is
     * NOT called) and rethrow.
     */
    async initAll(): Promise<void> {
        for (let i = 0; i < this.#effects.length; i++) {
            const e = this.#effects[i];
            const host = this.#hosts[i];
            host.setPhase("init");
            try {
                if (e.init) {
                    await e.init(host.ctx);
                }
            } catch (err) {
                console.error(`[VFX-JS] effect[${i}].init() failed:`, err);
                for (let j = i - 1; j >= 0; j--) {
                    this.#safeDispose(j);
                    this.#hosts[j].dispose();
                }
                this.#hosts[i].dispose();
                throw err;
            }
            host.setPhase("update");
        }
    }

    /** One frame. No-op when `!isVisible`. */
    run(input: ChainFrameInput): void {
        if (this.#disposed) {
            return;
        }
        if (!input.isVisible) {
            return;
        }

        const M = this.#renderingIndices.length;

        // 1. Reflect state + uniforms into each host's ctx.
        for (const host of this.#hosts) {
            host.setFrameState({
                time: input.time,
                deltaTime: input.deltaTime,
                mouse: input.mouse,
                mouseViewport: input.mouseViewport,
                intersection: input.intersection,
                enterTime: input.enterTime,
                leaveTime: input.leaveTime,
                uniforms: input.resolvedUniforms,
            });
        }

        // 2. Resolve per-stage pad / buffers / srcInnerRect / uvInnerRect.
        //    Allocates / reuses intermediate RTs.
        this.#resolveStages(input);

        // 3. Apply per-host frame dims.
        for (let k = 0; k < this.#hosts.length; k++) {
            this.#hosts[k].setFrameDims(this.#hostFrameDims(k, input));
        }

        // 4. Update phase (array order). ctx.draw() is a no-op here.
        for (let i = 0; i < this.#effects.length; i++) {
            const e = this.#effects[i];
            if (!e.update) {
                continue;
            }
            const host = this.#hosts[i];
            host.setPhase("update");
            try {
                e.update(host.ctx);
            } catch (err) {
                if (!this.#warnedUpdate.has(i)) {
                    this.#warnedUpdate.add(i);
                    console.warn(
                        `[VFX-JS] effect[${i}].update() threw; skipping this frame's update:`,
                        err,
                    );
                }
            }
        }

        // 5. M = 0 identity copy special case.
        if (M === 0) {
            const srcHandle = this.#capture;
            const canvasVp = this.#postEffectTargetViewport(input);
            if (input.finalTarget === null) {
                this.#hosts[0]?.passthroughCopy(srcHandle, null, canvasVp);
            } else {
                const target = this.#getFinalHandle(input.finalTarget);
                this.#hosts[0]?.passthroughCopy(srcHandle, target, canvasVp);
            }
            return;
        }

        // 6. Render phase: walk renderingIndices.
        const requireIntermediate = (idx: number): IntermediateEntry => {
            const entry = this.#intermediates[idx];
            if (!entry) {
                throw new Error(
                    `[VFX-JS] intermediate[${idx}] missing during render`,
                );
            }
            return entry;
        };
        for (let k = 0; k < M; k++) {
            const i = this.#renderingIndices[k];
            const host = this.#hosts[i];
            const effect = this.#effects[i];
            const render = effect.render;
            if (!render) {
                // renderingIndices filters on render presence — unreachable
                // unless the Effect mutated its own shape post-construction.
                continue;
            }
            host.setPhase("render");
            host.tickAutoUpdates();

            const srcHandle =
                k === 0 ? this.#capture : requireIntermediate(k - 1).texHandle;
            host.setSrc(srcHandle);

            let outputHandle: EffectRenderTarget | null;
            if (k === M - 1) {
                outputHandle =
                    input.finalTarget === null
                        ? null
                        : this.#getFinalHandle(input.finalTarget);
            } else {
                outputHandle = requireIntermediate(k).rtHandle;
                host.clearRt(outputHandle);
            }
            host.setOutput(outputHandle);

            try {
                render(host.ctx);
            } catch (err) {
                if (!this.#warnedRender.has(i)) {
                    this.#warnedRender.add(i);
                    console.warn(
                        `[VFX-JS] effect[${i}].render() threw; falling back to passthrough:`,
                        err,
                    );
                }
                const vp = this.#stages[k].outputViewport;
                if (outputHandle === null) {
                    host.passthroughCopy(srcHandle, null, vp);
                } else if (k === M - 1) {
                    host.passthroughCopy(srcHandle, outputHandle, vp);
                } else {
                    host.passthroughCopy(srcHandle, outputHandle, {
                        x: 0,
                        y: 0,
                        w: outputHandle.width,
                        h: outputHandle.height,
                    });
                }
            }

            host.setPhase("update");
        }
    }

    dispose(): void {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        for (let i = this.#effects.length - 1; i >= 0; i--) {
            this.#safeDispose(i);
            this.#hosts[i].dispose();
        }
        for (const im of this.#intermediates) {
            im?.fb.dispose();
        }
        this.#intermediates = [];
        this.#stages = [];
        if (this.#finalFallbackFb) {
            this.#finalFallbackFb.dispose();
            this.#finalFallbackFb = null;
        }
    }

    // -- internals ----------------------------------------------------------

    #safeDispose(i: number): void {
        const e = this.#effects[i];
        if (!e.dispose) {
            return;
        }
        try {
            e.dispose();
        } catch (err) {
            console.error(`[VFX-JS] effect[${i}].dispose() threw:`, err);
        }
    }

    /**
     * Compute per-stage layout (pad, buffer size, srcInnerRect, uvInnerRect,
     * outputViewport) for every rendering stage. Allocates / reuses
     * intermediate RTs.
     */
    #resolveStages(input: ChainFrameInput): void {
        const M = this.#renderingIndices.length;
        this.#stages = new Array(M);
        if (M === 0) {
            return;
        }
        const elementPixel: [number, number] = [
            input.elementPhys[0],
            input.elementPhys[1],
        ];
        let srcPad: Margin = createMargin(0);
        let srcBufferSize: [number, number] = [
            elementPixel[0],
            elementPixel[1],
        ];
        for (let k = 0; k < M; k++) {
            const i = this.#renderingIndices[k];
            const effect = this.#effects[i];
            const isLast = k === M - 1;

            // Compute fullscreenPad from src pad for the dims input.
            const fullscreenPad = this.#fullscreenPadFor(input, srcPad);

            let dstPad: Margin;
            let dstBufferSize: [number, number];
            let float: boolean;

            if (isLast) {
                // Last effect's outputSize return is ignored — dst is the
                // fixed final target. Carry src pad forward for uniforms /
                // canvas viewport.
                dstPad = srcPad;
                dstBufferSize = srcBufferSize;
                float = false;
            } else {
                const resolved = this.#callOutputSize(
                    effect,
                    i,
                    srcPad,
                    srcBufferSize,
                    elementPixel,
                    fullscreenPad,
                    input,
                );
                dstPad = resolved.pad;
                dstBufferSize = resolved.bufferSize;
                float = resolved.float;
            }

            const srcInnerRect = rectForPad(
                srcPad,
                srcBufferSize,
                elementPixel,
            );
            const uvInnerRect = rectForPad(dstPad, dstBufferSize, elementPixel);

            // Stage outputViewport: where the draw lands on its dst buffer.
            let outputViewport: { x: number; y: number; w: number; h: number };
            if (isLast) {
                // Draw onto canvas / final FBO at the element's canvas rect
                // grown by src pad. For post-effect chains, srcPad = 0 and
                // the rect equals viewportRectOnCanvasPx.
                outputViewport = {
                    x: input.elementRectOnCanvasPx.x - srcPad.left,
                    y: input.elementRectOnCanvasPx.y - srcPad.bottom,
                    w: dstBufferSize[0],
                    h: dstBufferSize[1],
                };
            } else {
                outputViewport = {
                    x: 0,
                    y: 0,
                    w: dstBufferSize[0],
                    h: dstBufferSize[1],
                };
            }

            this.#stages[k] = {
                srcPad,
                srcBufferSize,
                dstPad,
                dstBufferSize,
                float,
                srcInnerRect,
                uvInnerRect,
                outputViewport,
            };

            if (!isLast) {
                this.#ensureIntermediate(k, dstBufferSize, dstPad, float);
            }

            srcPad = dstPad;
            srcBufferSize = dstBufferSize;
        }
    }

    #callOutputSize(
        effect: Effect,
        effectIndex: number,
        srcPad: Margin,
        srcBufferSize: [number, number],
        elementPixel: [number, number],
        fullscreenPad: ChainMargin,
        input: ChainFrameInput,
    ): { pad: Margin; bufferSize: [number, number]; float: boolean } {
        if (!effect.outputSize) {
            // Default: no pad added. dst pad = src pad, dst buffer = src buffer.
            return {
                pad: srcPad,
                bufferSize: srcBufferSize,
                float: false,
            };
        }
        const pixelRatio =
            input.viewportPhys[0] / input.viewportLogical[0] || 1;
        const dims = {
            input: srcBufferSize as readonly [number, number],
            element: this.#isPostEffect
                ? input.viewportLogical
                : input.elementLogical,
            elementPixel: this.#isPostEffect
                ? input.viewportPhys
                : input.elementPhys,
            viewport: input.viewportLogical,
            viewportPixel: input.viewportPhys,
            pixelRatio,
            fullscreenPad,
        };
        const ret = effect.outputSize(dims);

        let dstPad: Margin;
        let dstBufferSize: [number, number];
        let float = false;

        if (Array.isArray(ret) || !("pad" in (ret as object))) {
            // Explicit-size variant: `[w, h]` or `{ size, float? }`.
            const rawSize: readonly [number, number] = Array.isArray(ret)
                ? [ret[0], ret[1]]
                : (ret as { size: readonly [number, number] }).size;
            if (!Array.isArray(ret)) {
                float = (ret as { float?: boolean }).float ?? false;
            }
            if (rawSize[0] < elementPixel[0] || rawSize[1] < elementPixel[1]) {
                if (!this.#warnedClampBuffer.has(effectIndex)) {
                    this.#warnedClampBuffer.add(effectIndex);
                    console.warn(
                        `[VFX-JS] effect[${effectIndex}].outputSize(): buffer smaller than elementPixel; clamped.`,
                    );
                }
            }
            dstBufferSize = [
                Math.max(rawSize[0], elementPixel[0]),
                Math.max(rawSize[1], elementPixel[1]),
            ];
            dstPad = distributePad(dstBufferSize, elementPixel, srcPad);
        } else {
            // pad variant (delta added to src pad).
            const obj = ret as { pad: MarginOpts; float?: boolean };
            float = obj.float ?? false;
            const delta = createMargin(obj.pad);
            dstPad = createMargin({
                top: srcPad.top + delta.top,
                right: srcPad.right + delta.right,
                bottom: srcPad.bottom + delta.bottom,
                left: srcPad.left + delta.left,
            });
            dstBufferSize = [
                elementPixel[0] + dstPad.left + dstPad.right,
                elementPixel[1] + dstPad.top + dstPad.bottom,
            ];
        }

        // Monotonic clamp: dst pad >= src pad per side.
        const clampedPad = createMargin({
            top: Math.max(dstPad.top, srcPad.top),
            right: Math.max(dstPad.right, srcPad.right),
            bottom: Math.max(dstPad.bottom, srcPad.bottom),
            left: Math.max(dstPad.left, srcPad.left),
        });
        const violated =
            clampedPad.top !== dstPad.top ||
            clampedPad.right !== dstPad.right ||
            clampedPad.bottom !== dstPad.bottom ||
            clampedPad.left !== dstPad.left;
        if (violated && !this.#warnedMonotonic.has(effectIndex)) {
            this.#warnedMonotonic.add(effectIndex);
            console.warn(
                `[VFX-JS] effect[${effectIndex}].outputSize(): pad non-monotonic (dst < src); clamped.`,
            );
        }
        if (violated) {
            dstPad = clampedPad;
            dstBufferSize = [
                elementPixel[0] + dstPad.left + dstPad.right,
                elementPixel[1] + dstPad.top + dstPad.bottom,
            ];
        }

        return { pad: dstPad, bufferSize: dstBufferSize, float };
    }

    #ensureIntermediate(
        k: number,
        bufferSize: [number, number],
        pad: Margin,
        float: boolean,
    ): void {
        const current = this.#intermediates[k];
        if (
            current !== null &&
            current.fb.width === bufferSize[0] &&
            current.fb.height === bufferSize[1] &&
            current.float === float
        ) {
            // Size / float unchanged — reuse. Pad is diagnostic only.
            current.pad = pad;
            return;
        }
        if (current) {
            current.fb.dispose();
        }
        const fb = new Framebuffer(this.#glCtx, bufferSize[0], bufferSize[1], {
            float,
        });
        const rtHandle = makeEffectRenderTargetFromFb(fb);
        const texHandle = makeEffectTexture(
            () => fb.texture,
            () => fb.width,
            () => fb.height,
        );
        this.#intermediates[k] = {
            fb,
            rtHandle,
            texHandle,
            float,
            pad,
            bufferSize,
        };
    }

    #fullscreenPadFor(input: ChainFrameInput, srcPad: Margin): ChainMargin {
        if (this.#isPostEffect) {
            return ZERO_MARGIN;
        }
        const el = input.elementRectOnCanvasPx;
        const vp = input.viewportRectOnCanvasPx;
        const distLeft = Math.max(0, el.x - vp.x);
        const distRight = Math.max(0, vp.x + vp.w - (el.x + el.w));
        const distBottom = Math.max(0, el.y - vp.y);
        const distTop = Math.max(0, vp.y + vp.h - (el.y + el.h));
        return {
            top: Math.max(0, distTop - srcPad.top),
            right: Math.max(0, distRight - srcPad.right),
            bottom: Math.max(0, distBottom - srcPad.bottom),
            left: Math.max(0, distLeft - srcPad.left),
        };
    }

    /** Canvas-space viewport used by the M=0 passthrough copy. */
    #postEffectTargetViewport(input: ChainFrameInput): {
        x: number;
        y: number;
        w: number;
        h: number;
    } {
        // M=0: src = capture (no pad). Copy fills element's inner rect.
        return {
            x: input.elementRectOnCanvasPx.x,
            y: input.elementRectOnCanvasPx.y,
            w: input.elementRectOnCanvasPx.w,
            h: input.elementRectOnCanvasPx.h,
        };
    }

    #hostFrameDims(
        k: number,
        input: ChainFrameInput,
    ): {
        outputPhysW: number;
        outputPhysH: number;
        canvasPhysW: number;
        canvasPhysH: number;
        outputViewport: { x: number; y: number; w: number; h: number };
        elementPhysW: number;
        elementPhysH: number;
        uvInnerRect: [number, number, number, number];
        srcInnerRect: [number, number, number, number];
    } {
        const renderPos = this.#renderingIndices.indexOf(k);
        let outputW: number;
        let outputH: number;
        let outputViewport: { x: number; y: number; w: number; h: number };
        let uvInnerRect: [number, number, number, number];
        let srcInnerRect: [number, number, number, number];

        if (renderPos < 0) {
            // Not a rendering effect; placeholders.
            outputW = input.elementPhys[0];
            outputH = input.elementPhys[1];
            outputViewport = { x: 0, y: 0, w: outputW, h: outputH };
            uvInnerRect = [0, 0, 1, 1];
            srcInnerRect = [0, 0, 1, 1];
        } else {
            const stage = this.#stages[renderPos];
            outputW = stage.dstBufferSize[0];
            outputH = stage.dstBufferSize[1];
            outputViewport = stage.outputViewport;
            uvInnerRect = stage.uvInnerRect;
            srcInnerRect = stage.srcInnerRect;
        }

        return {
            outputPhysW: outputW,
            outputPhysH: outputH,
            canvasPhysW: input.canvasPhysW,
            canvasPhysH: input.canvasPhysH,
            outputViewport,
            elementPhysW: input.elementPhys[0],
            elementPhysH: input.elementPhys[1],
            uvInnerRect,
            srcInnerRect,
        };
    }

    #getFinalHandle(fb: Framebuffer): EffectRenderTarget {
        if (
            this.#finalFallbackFb !== fb ||
            this.#finalFallbackHandle === null
        ) {
            this.#finalFallbackFb = fb;
            this.#finalFallbackHandle = makeEffectRenderTargetFromFb(fb);
        }
        return this.#finalFallbackHandle;
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a per-side pad from an absolute dst buffer size. The excess
 * `(buffer - elementPixel)` is distributed across sides proportionally
 * to src pad ratios; equal split when src pad is zero everywhere.
 */
function distributePad(
    bufferSize: readonly [number, number],
    elementPixel: readonly [number, number],
    srcPad: Margin,
): Margin {
    const excessX = Math.max(0, bufferSize[0] - elementPixel[0]);
    const excessY = Math.max(0, bufferSize[1] - elementPixel[1]);
    const totalH = srcPad.left + srcPad.right;
    const totalV = srcPad.top + srcPad.bottom;
    let left: number;
    let right: number;
    let top: number;
    let bottom: number;
    if (totalH > 0) {
        left = (excessX * srcPad.left) / totalH;
        right = excessX - left;
    } else {
        left = excessX / 2;
        right = excessX - left;
    }
    if (totalV > 0) {
        bottom = (excessY * srcPad.bottom) / totalV;
        top = excessY - bottom;
    } else {
        bottom = excessY / 2;
        top = excessY - bottom;
    }
    return createMargin({ top, right, bottom, left });
}

/**
 * Inner sub-rect (origin + size) in buffer UV for a buffer sized
 * `elementPixel + pad sums` with the inner region positioned at
 * `(pad.left, pad.bottom)` (GL bottom-left origin).
 */
function rectForPad(
    pad: Margin,
    bufferSize: readonly [number, number],
    elementPixel: readonly [number, number],
): [number, number, number, number] {
    if (bufferSize[0] <= 0 || bufferSize[1] <= 0) {
        return [0, 0, 1, 1];
    }
    return [
        pad.left / bufferSize[0],
        pad.bottom / bufferSize[1],
        elementPixel[0] / bufferSize[0],
        elementPixel[1] / bufferSize[1],
    ];
}

// Silence unused-import warnings; resolveRt is exported for chain tests.
export { resolveRt };
