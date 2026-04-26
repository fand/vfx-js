import {
    EffectHost,
    makeEffectRenderTargetFromFb,
    makeEffectTexture,
    resolveRt,
} from "./effect-host.js";
import type { GLContext } from "./gl/context.js";
import { Framebuffer } from "./gl/framebuffer.js";
import type { Quad } from "./gl/quad.js";
import {
    createMargin,
    type ElementRect,
    type Margin,
    rectInRect,
} from "./rect.js";
import type {
    Effect,
    EffectRenderTarget,
    EffectTexture,
    EffectUniformValue,
    EffectVFXProps,
} from "./types.js";

export type ChainFrameInput = {
    time: number;
    deltaTime: number;
    mouse: [number, number];
    mouseViewport: [number, number];
    intersection: number;
    enterTime: number;
    leaveTime: number;
    resolvedUniforms: Record<string, EffectUniformValue>;

    /** Canvas size (= viewport-inner + scrollPadding on each side), logical px. */
    canvasLogical: readonly [number, number];
    /** Canvas size, physical px. */
    canvasPhys: readonly [number, number];

    /** Element rect (inner, no overflow), logical px. Mirrors canvas for post effects. */
    elementLogical: readonly [number, number];
    /** Element rect (inner, no overflow), physical px. Mirrors canvas for post effects. */
    elementPhys: readonly [number, number];
    /**
     * Element's content rect on canvas, bottom-left origin, physical px.
     * Used to position the final-stage draw viewport (canvas-space) and
     * to derive `dims.canvasRect` in element-local coords (the canvas
     * itself is `(0, 0, canvasPhys)` in canvas coords).
     */
    elementRectOnCanvasPx: { x: number; y: number; w: number; h: number };

    /** null → canvas; otherwise the already-allocated final FBO. */
    finalTarget: Framebuffer | null;

    isVisible: boolean;
};

type StageLayout = {
    /** Stage's rect in element-local physical px (bottom-left). */
    dstRect: ElementRect;
    /** Dst buffer size (physical px): cached for FBO sizing. */
    dstBufferSize: [number, number];
    /** Whether the dst buffer is float. */
    float: boolean;
    /** Content sub-rect within dst buffer UV (xy = origin, zw = size). */
    rectContent: [number, number, number, number];
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
    bufferSize: [number, number];
};

/**
 * Pipeline orchestrator for a single element's Effect chain.
 *
 * Rect model:
 * - Each rendering stage declares its own `dstRect` in element-local
 *   physical px (bottom-left). Stage 0's `srcRect` is `contentRect`
 *   (= `[0, 0, elementPhys[0], elementPhys[1]]`); stage k's `srcRect`
 *   = stage k-1's `dstRect`.
 * - Each effect's `outputRect(dims)` returns the dst rect, or `undefined`
 *   to inherit `srcRect` (no growth). Stages are independent — no
 *   accumulation, no monotonic clamp.
 * - `dims.canvasRect` is the canvas rect in element-local px (= viewport
 *   + scrollPadding from element bottom-left). Use it directly for
 *   "reach canvas edges" effects.
 * - The last rendering effect's `outputRect` is honored too, but no
 *   intermediate buffer is allocated — the dst remains the fixed final
 *   target, and `dstRect` only positions / sizes the canvas-space draw
 *   viewport (the host still receives `outputPhysW/H = dstRect[2..3]`
 *   so internal RTs auto-size to include the rect).
 * - `rectSrc` / `rectContent` are derived per stage from the rect map
 *   (`rectInRect(content, dst)` and `rectInRect(srcRect, dst)`) and
 *   uploaded as uniforms so the default vertex shader can emit `uvSrc`
 *   (src-sampling UV) and `uvContent` (dst-space 0..1 over element).
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
    #disposed = false;
    /** Post-effect context (element mirrors canvas; contentRect == canvasRect). */
    #isPostEffect: boolean;
    /**
     * Hit-test pad (per side, physical px) derived from the last
     * rendering stage's `dstRect`: how far the rect extends past the
     * element's content rect. Used by the host to grow the visibility
     * rect so glow / trail outside the element keeps the chain running
     * while still on-screen. Lags by one frame (initial entry uses 0);
     * acceptable since rects are typically static or `canvasRect`-derived
     * and update immediately on the next frame.
     */
    #lastHitTestPad: Margin = createMargin(0);
    /**
     * Dedicated host used for the M=0 passthrough copy when `effects`
     * is empty (no per-effect host exists). Owned by the chain so user-
     * driven `vfx.add(el, { effect: [] })` works as a transparent
     * blit of the captured source — supports dynamic add/remove without
     * a special-case "no chain" branch.
     */
    #emptyPassthroughHost: EffectHost | null = null;

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
        if (effects.length === 0) {
            this.#emptyPassthroughHost = new EffectHost(
                glCtx,
                quad,
                pixelRatio,
                capture,
                vfxProps,
            );
        }
        this.#renderingIndices = effects
            .map((e, i) => (typeof e.render === "function" ? i : -1))
            .filter((i) => i >= 0);
        const M = this.#renderingIndices.length;
        this.#intermediates = new Array(Math.max(0, M - 1)).fill(null);
    }

    get effects(): readonly Effect[] {
        return this.#effects;
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
     * Per-side pad in **physical px** to grow the visibility hit-test
     * rect by, so glow / trail extending past the element rect keeps
     * the chain running while the padded region is on-screen. Reflects
     * the most recent rendered frame; empty / first-frame chains
     * return zero margins. Caller divides by `pixelRatio` to convert
     * to logical px before passing to `growRect`.
     */
    get hitTestPadPhys(): Margin {
        return this.#lastHitTestPad;
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

        // 2. Resolve per-stage pad / buffers / rectSrc / rectContent.
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
        //    `host` is `#hosts[0]` when effects has non-rendering entries,
        //    or the dedicated `#emptyPassthroughHost` when effects is
        //    empty.
        if (M === 0) {
            const host = this.#hosts[0] ?? this.#emptyPassthroughHost;
            if (!host) {
                return;
            }
            const srcHandle = this.#capture;
            const canvasVp = this.#postEffectTargetViewport(input);
            if (input.finalTarget === null) {
                host.passthroughCopy(srcHandle, null, canvasVp);
            } else {
                const target = this.#getFinalHandle(input.finalTarget);
                host.passthroughCopy(srcHandle, target, canvasVp);
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
            if (!effect.render) {
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
                // Call on the effect (not a destructured ref) so class-based
                // Effects keep their `this` binding.
                effect.render(host.ctx);
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
        if (this.#emptyPassthroughHost) {
            this.#emptyPassthroughHost.dispose();
            this.#emptyPassthroughHost = null;
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
     * Compute per-stage layout (dstRect, buffer size, rectSrc,
     * rectContent, outputViewport) for every rendering stage. Allocates
     * / reuses intermediate RTs.
     *
     */
    #resolveStages(input: ChainFrameInput): void {
        const M = this.#renderingIndices.length;
        this.#stages = new Array(M);
        if (M === 0) {
            return;
        }
        // Post-effect: element mirrors canvas, so contentRect spans canvasPhys.
        const elementPixel: readonly [number, number] = this.#isPostEffect
            ? input.canvasPhys
            : input.elementPhys;
        const contentRect: ElementRect = [
            0,
            0,
            elementPixel[0],
            elementPixel[1],
        ];
        const canvasRect = this.#canvasRectInElementLocal(input);
        let srcRect: ElementRect = contentRect;
        for (let k = 0; k < M; k++) {
            const i = this.#renderingIndices[k];
            const effect = this.#effects[i];
            const isLast = k === M - 1;

            const resolved = this.#callOutputRect(
                effect,
                srcRect,
                contentRect,
                canvasRect,
                input,
            );
            const dstRect: ElementRect = resolved ?? srcRect;
            const dstBufferSize: [number, number] = [dstRect[2], dstRect[3]];
            const rectContent = rectInRect(contentRect, dstRect);

            const outputViewport = isLast
                ? {
                      x: input.elementRectOnCanvasPx.x + dstRect[0],
                      y: input.elementRectOnCanvasPx.y + dstRect[1],
                      w: dstBufferSize[0],
                      h: dstBufferSize[1],
                  }
                : { x: 0, y: 0, w: dstBufferSize[0], h: dstBufferSize[1] };

            this.#stages[k] = {
                dstRect,
                dstBufferSize,
                float: false,
                rectContent,
                outputViewport,
            };

            if (!isLast) {
                this.#ensureIntermediate(k, dstBufferSize, false);
            }
            srcRect = dstRect;
        }
        const [lx, ly, lw, lh] = this.#stages[M - 1].dstRect;
        this.#lastHitTestPad = createMargin({
            top: Math.max(0, ly + lh - elementPixel[1]),
            right: Math.max(0, lx + lw - elementPixel[0]),
            bottom: Math.max(0, -ly),
            left: Math.max(0, -lx),
        });
    }

    /**
     * Invoke `effect.outputRect` and return the resolved rect, or
     * `undefined` to inherit `srcRect`.
     */
    #callOutputRect(
        effect: Effect,
        srcRect: ElementRect,
        contentRect: ElementRect,
        canvasRect: ElementRect,
        input: ChainFrameInput,
    ): ElementRect | undefined {
        if (!effect.outputRect) {
            return undefined;
        }
        const pixelRatio = input.canvasPhys[0] / input.canvasLogical[0] || 1;
        const dims = {
            element: this.#isPostEffect
                ? input.canvasLogical
                : input.elementLogical,
            elementPixel: this.#isPostEffect
                ? input.canvasPhys
                : input.elementPhys,
            canvas: input.canvasLogical,
            canvasPixel: input.canvasPhys,
            pixelRatio,
            contentRect,
            srcRect,
            canvasRect,
        };
        return effect.outputRect(dims);
    }

    #ensureIntermediate(
        k: number,
        bufferSize: [number, number],
        float: boolean,
    ): void {
        const current = this.#intermediates[k];
        if (
            current !== null &&
            current.fb.width === bufferSize[0] &&
            current.fb.height === bufferSize[1] &&
            current.float === float
        ) {
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
            bufferSize,
        };
    }

    /**
     * Canvas rect in element-local physical px (bottom-left). Post-effect
     * chains: canvas == element, so `[0, 0, canvasPhys[0], canvasPhys[1]]`.
     * Element chains: shifted by the element's canvas offset so the
     * element's bottom-left lies at (0, 0).
     */
    #canvasRectInElementLocal(input: ChainFrameInput): ElementRect {
        const [cw, ch] = input.canvasPhys;
        if (this.#isPostEffect) {
            return [0, 0, cw, ch];
        }
        const { x, y } = input.elementRectOnCanvasPx;
        return [-x, -y, cw, ch];
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
        canvasPhys: readonly [number, number];
        outputViewport: { x: number; y: number; w: number; h: number };
        elementPhysW: number;
        elementPhysH: number;
        rectContent: [number, number, number, number];
        rectSrc: [number, number, number, number];
    } {
        const renderPos = this.#renderingIndices.indexOf(k);
        let outputW: number;
        let outputH: number;
        let outputViewport: { x: number; y: number; w: number; h: number };
        let rectContent: [number, number, number, number];
        let rectSrc: [number, number, number, number];

        if (renderPos < 0) {
            // Not a rendering effect; placeholders.
            outputW = input.elementPhys[0];
            outputH = input.elementPhys[1];
            outputViewport = { x: 0, y: 0, w: outputW, h: outputH };
            rectContent = [0, 0, 1, 1];
            rectSrc = [0, 0, 1, 1];
        } else {
            const stage = this.#stages[renderPos];
            outputW = stage.dstBufferSize[0];
            outputH = stage.dstBufferSize[1];
            outputViewport = stage.outputViewport;
            rectContent = stage.rectContent;
            // Stage k's src buffer is stage k-1's dst buffer; stage 0's
            // src is the capture (no pad), so rectSrc = (0, 0, 1, 1).
            rectSrc =
                renderPos === 0
                    ? [0, 0, 1, 1]
                    : this.#stages[renderPos - 1].rectContent;
        }

        return {
            outputPhysW: outputW,
            outputPhysH: outputH,
            canvasPhys: input.canvasPhys,
            outputViewport,
            elementPhysW: input.elementPhys[0],
            elementPhysH: input.elementPhys[1],
            rectContent,
            rectSrc,
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

// Silence unused-import warnings; resolveRt is exported for chain tests.
export { resolveRt };
