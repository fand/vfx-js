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

    /** Canvas size (= viewport-inner + scrollPadding on each side), CSS px. */
    canvasSize: readonly [number, number];

    /** Canvas size, device px. */
    canvasBufferSize: readonly [number, number];

    /** Element rect (inner, no overflow), CSS px. Mirrors canvas for post effects. */
    elementSize: readonly [number, number];

    /** Element rect (inner, no overflow), device px. Mirrors canvas for post effects. */
    elementBufferSize: readonly [number, number];

    /**
     * Element's content rect on canvas, bottom-left origin, device px.
     * Used to position the final-stage draw viewport (canvas-space) and
     * to derive `dims.canvasRect` in element-local coords (the canvas
     * itself is `(0, 0, canvasBufferSize)` in canvas coords).
     */
    elementRectOnCanvasPx: { x: number; y: number; w: number; h: number };

    isVisible: boolean;
};

type StageLayout = {
    /** Stage's rect in element-local device px (bottom-left). */
    dstRect: ElementRect;

    /** Dst buffer size (device px): cached for FBO sizing. */
    dstBufferSize: [number, number];

    /** Content sub-rect within dst buffer UV (xy = origin, zw = size). */
    contentRectUv: [number, number, number, number];

    /**
     * Device-px viewport on the canvas / final FBO for this stage's
     * draw. Only meaningful for the last rendering stage; intermediate
     * stages use `(0, 0, dstBufferSize[0], dstBufferSize[1])`.
     */
    outputViewport: { x: number; y: number; w: number; h: number };
};

type IntermediateEntry = {
    fb: Framebuffer;

    /** Write handle (passed as `ctx.target`). */
    rtHandle: EffectRenderTarget;

    /** Read handle (passed as `ctx.src` to the next stage). */
    texHandle: EffectTexture;
    bufferSize: [number, number];
};

/**
 * Pipeline orchestrator for a single element's Effect chain.
 *
 * Rect model:
 * - Each rendering stage declares its own `dstRect` in element-local
 *   device px (bottom-left). Stage 0's `srcRect` is `contentRect`
 *   (= `[0, 0, elementBufferSize[0], elementBufferSize[1]]`); stage k's `srcRect`
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
 *   viewport (the host still receives `outputBufferW/H = dstRect[2..3]`
 *   so internal RTs auto-size to include the rect).
 * - `srcRectUv` / `contentRectUv` are derived per stage from the rect map
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
    #intermediates: IntermediateEntry[] = [];
    #stages: StageLayout[] = [];
    #capture: EffectTexture;
    #finalTargetHandle: EffectRenderTarget | null = null;
    #warnedUpdate = new Set<number>();
    #warnedRender = new Set<number>();
    #disposed = false;

    /** Post-effect context (element mirrors canvas; contentRect == canvasRect). */
    #isPostEffect: boolean;

    /**
     * Hit-test pad (per side, device px) derived from the last
     * rendering stage's `dstRect`: how far the rect extends past the
     * element's content rect. Used by the host to grow the visibility
     * rect so glow / trail outside the element keeps the chain running
     * while still on-screen. Lags by one frame (initial entry uses 0);
     * acceptable since rects are typically static or `canvasRect`-derived
     * and update immediately on the next frame.
     */
    #lastHitTestPad: Margin = createMargin(0);

    /**
     * Chain-owned passthrough host, used when `effects` is empty so
     * a transparent blit still works without a special-case "no chain"
     * branch. `null` means reuse `#hosts[0]`.
     */
    #ownedPassthroughHost: EffectHost | null = null;

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
            this.#ownedPassthroughHost = new EffectHost(
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
     * Per-side pad in **device px** to grow the visibility hit-test
     * rect by, so glow / trail extending past the element rect keeps
     * the chain running while the padded region is on-screen. Reflects
     * the most recent rendered frame; empty / first-frame chains
     * return zero margins. Caller divides by `pixelRatio` to convert
     * to CSS px before passing to `growRect`.
     */
    get hitTestPadBuffer(): Margin {
        return this.#lastHitTestPad;
    }

    /**
     * Set the destination for the chain's last rendering stage. `null`
     * draws to the canvas; an FBO is used when a downstream pipeline
     * (e.g. a post-effect chain) needs to read this chain's output as
     * a texture. Caller invokes this only when the destination changes
     * (post-effect toggle, FBO realloc on resize, etc.).
     */
    setFinalTarget(fb: Framebuffer | null): void {
        const currentFb = this.#finalTargetHandle
            ? resolveRt(this.#finalTargetHandle).getWriteFbo()
            : null;
        if (fb === currentFb) {
            return;
        }
        this.#finalTargetHandle =
            fb === null ? null : makeEffectRenderTargetFromFb(fb);
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

        const stageCount = this.#renderingIndices.length;

        // Reflect state + uniforms into each host's ctx.
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

        // Resolve per-stage pad / buffers / srcRectUv / contentRectUv.
        // Allocates / reuses intermediate RTs.
        this.#resolveStages(input);

        // Apply per-host frame dims.
        for (let k = 0; k < this.#hosts.length; k++) {
            this.#hosts[k].setFrameDims(this.#hostFrameDims(k, input));
        }

        // Update phase (array order). ctx.draw() is a no-op here.
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

        // No rendering effects: passthrough copy.
        // Reuse `#hosts[0]` if any; otherwise fall back to the
        // chain-owned `#ownedPassthroughHost` (effects is empty).
        if (stageCount === 0) {
            const host = this.#ownedPassthroughHost ?? this.#hosts[0];
            host.passthroughCopy(
                this.#capture,
                this.#finalTargetHandle,
                input.elementRectOnCanvasPx,
            );
            return;
        }

        // Render phase: walk renderingIndices.
        for (let k = 0; k < stageCount; k++) {
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
                k === 0 ? this.#capture : this.#intermediates[k - 1].texHandle;
            host.setSrc(srcHandle);

            let outputHandle: EffectRenderTarget | null;
            if (k === stageCount - 1) {
                outputHandle = this.#finalTargetHandle;
            } else {
                outputHandle = this.#intermediates[k].rtHandle;
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
                } else if (k === stageCount - 1) {
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
        if (this.#ownedPassthroughHost) {
            this.#ownedPassthroughHost.dispose();
            this.#ownedPassthroughHost = null;
        }
        for (const im of this.#intermediates) {
            im.fb.dispose();
        }
        this.#intermediates = [];
        this.#stages = [];
        this.#finalTargetHandle = null;
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
     * Compute per-stage layout (dstRect, buffer size, srcRectUv,
     * contentRectUv, outputViewport) for every rendering stage. Allocates
     * / reuses intermediate RTs.
     *
     */
    #resolveStages(input: ChainFrameInput): void {
        const stageCount = this.#renderingIndices.length;
        this.#stages = new Array(stageCount);
        if (stageCount === 0) {
            return;
        }
        // Post-effect: element mirrors canvas, so contentRect spans canvasBufferSize.
        const elementPixel: readonly [number, number] = this.#isPostEffect
            ? input.canvasBufferSize
            : input.elementBufferSize;
        const contentRect: ElementRect = [
            0,
            0,
            elementPixel[0],
            elementPixel[1],
        ];
        const canvasRect = this.#canvasRectInElementLocal(input);
        let srcRect: ElementRect = contentRect;
        for (let k = 0; k < stageCount; k++) {
            const i = this.#renderingIndices[k];
            const effect = this.#effects[i];
            const isLast = k === stageCount - 1;

            const resolved = this.#callOutputRect(
                effect,
                srcRect,
                contentRect,
                canvasRect,
                input,
            );
            const dstRect: ElementRect = resolved ?? srcRect;
            const dstBufferSize: [number, number] = [dstRect[2], dstRect[3]];
            const contentRectUv = rectInRect(contentRect, dstRect);

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
                contentRectUv,
                outputViewport,
            };

            if (!isLast) {
                this.#ensureIntermediate(k, dstBufferSize);
            }
            srcRect = dstRect;
        }
        const [lx, ly, lw, lh] = this.#stages[stageCount - 1].dstRect;
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
        const pixelRatio = input.canvasBufferSize[0] / input.canvasSize[0] || 1;
        const dims = {
            element: this.#isPostEffect ? input.canvasSize : input.elementSize,
            elementPixel: this.#isPostEffect
                ? input.canvasBufferSize
                : input.elementBufferSize,
            canvas: input.canvasSize,
            canvasPixel: input.canvasBufferSize,
            pixelRatio,
            contentRect,
            srcRect,
            canvasRect,
        };
        return effect.outputRect(dims);
    }

    #ensureIntermediate(k: number, bufferSize: [number, number]): void {
        const current = this.#intermediates[k];
        if (
            current &&
            current.fb.width === bufferSize[0] &&
            current.fb.height === bufferSize[1]
        ) {
            return;
        }
        if (current) {
            current.fb.dispose();
        }
        const fb = new Framebuffer(this.#glCtx, bufferSize[0], bufferSize[1]);
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
            bufferSize,
        };
    }

    /**
     * Canvas rect in element-local device px (bottom-left). Post-effect
     * chains: canvas == element, so `[0, 0, canvasBufferSize[0], canvasBufferSize[1]]`.
     * Element chains: shifted by the element's canvas offset so the
     * element's bottom-left lies at (0, 0).
     */
    #canvasRectInElementLocal(input: ChainFrameInput): ElementRect {
        const [cw, ch] = input.canvasBufferSize;
        if (this.#isPostEffect) {
            return [0, 0, cw, ch];
        }
        const { x, y } = input.elementRectOnCanvasPx;
        return [-x, -y, cw, ch];
    }

    #hostFrameDims(
        k: number,
        input: ChainFrameInput,
    ): {
        outputBufferW: number;
        outputBufferH: number;
        canvasBufferSize: readonly [number, number];
        outputViewport: { x: number; y: number; w: number; h: number };
        elementBufferW: number;
        elementBufferH: number;
        contentRectUv: [number, number, number, number];
        srcRectUv: [number, number, number, number];
    } {
        const renderPos = this.#renderingIndices.indexOf(k);
        let outputW: number;
        let outputH: number;
        let outputViewport: { x: number; y: number; w: number; h: number };
        let contentRectUv: [number, number, number, number];
        let srcRectUv: [number, number, number, number];

        if (renderPos < 0) {
            // Not a rendering effect; placeholders.
            outputW = input.elementBufferSize[0];
            outputH = input.elementBufferSize[1];
            outputViewport = { x: 0, y: 0, w: outputW, h: outputH };
            contentRectUv = [0, 0, 1, 1];
            srcRectUv = [0, 0, 1, 1];
        } else {
            const stage = this.#stages[renderPos];
            outputW = stage.dstBufferSize[0];
            outputH = stage.dstBufferSize[1];
            outputViewport = stage.outputViewport;
            contentRectUv = stage.contentRectUv;
            // Stage k's src buffer is stage k-1's dst buffer; stage 0's
            // src is the capture (no pad), so srcRectUv = (0, 0, 1, 1).
            srcRectUv =
                renderPos === 0
                    ? [0, 0, 1, 1]
                    : this.#stages[renderPos - 1].contentRectUv;
        }

        return {
            outputBufferW: outputW,
            outputBufferH: outputH,
            canvasBufferSize: input.canvasBufferSize,
            outputViewport,
            elementBufferW: input.elementBufferSize[0],
            elementBufferH: input.elementBufferSize[1],
            contentRectUv,
            srcRectUv,
        };
    }
}
