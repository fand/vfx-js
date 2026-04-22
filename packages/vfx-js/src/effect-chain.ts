import {
    EffectHost,
    makeEffectRenderTargetFromFb,
    makeEffectTexture,
    resolveRt,
} from "./effect-host.js";
import type { GLContext } from "./gl/context.js";
import { Framebuffer } from "./gl/framebuffer.js";
import type { Quad } from "./gl/quad.js";
import type {
    Effect,
    EffectRenderTarget,
    EffectTexture,
    EffectUniformValue,
    EffectVFXProps,
} from "./types.js";

export type ChainOverflow = {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
};

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

    /** Element rect + overflow, logical px. For post effects, mirrors viewport. */
    elementLogical: readonly [number, number];
    /** Element rect + overflow, physical px. For post effects, mirrors viewport. */
    elementPhys: readonly [number, number];
    /** Element rect proper (no overflow), logical px. */
    elementInnerLogical: readonly [number, number];
    /** Element rect proper (no overflow), physical px. */
    elementInnerPhys: readonly [number, number];
    viewportLogical: readonly [number, number];
    viewportPhys: readonly [number, number];
    /** Physical-px margin around the element. Zero for post effects. */
    overflow: ChainOverflow;

    /** Canvas physical-px rect the final stage must draw into. */
    finalViewport: {
        x: number;
        y: number;
        w: number;
        h: number;
    };

    /** null → canvas; otherwise the already-allocated final FBO. */
    finalTarget: Framebuffer | null;

    isVisible: boolean;
};

type IntermediateEntry = {
    fb: Framebuffer;
    /** Write handle (passed as `ctx.output`). */
    rtHandle: EffectRenderTarget;
    /** Read handle (passed as `ctx.src` to the next stage). */
    texHandle: EffectTexture;
    float: boolean;
};

/**
 * Pipeline orchestrator for a single element's Effect chain.
 *
 * - Walks `renderingIndices` (indices of effects with a `render`) and
 *   allocates M-1 intermediate RTs between them.
 * - Resolves each intermediate's size + float from its owning effect's
 *   `outputSize?(dims)` every frame; reallocates only on size / float
 *   delta.
 * - Runs uniform-resolve → outputSize-resolve → update → render each
 *   frame (only when `isVisible`).
 * - M=0 identity copy: when no effect has a `render`, copies capture →
 *   finalTarget once via the first host's passthrough pass.
 * - Error handling: `init` throws → reverse-dispose prior effects, bubble
 *   rejection. `update`/`render` throws → `console.warn` once per
 *   (chain, effect), `render` failures are replaced by a passthrough copy
 *   so the output doesn't disappear.
 * - `dispose()` runs in reverse array order (effect `dispose` + host
 *   `dispose` + intermediate FBO `dispose`).
 *
 * See plan.md "Composition protocol" for the full spec.
 * @internal
 */
export class EffectChain {
    #glCtx: GLContext;
    #effects: readonly Effect[];
    #hosts: EffectHost[];
    #renderingIndices: number[];
    #intermediates: (IntermediateEntry | null)[] = [];
    #capture: EffectTexture;
    #finalFallbackHandle: EffectRenderTarget | null = null;
    #finalFallbackFb: Framebuffer | null = null;
    #warnedUpdate = new Set<number>();
    #warnedRender = new Set<number>();
    #disposed = false;
    /** Post-effect context (element/overflow mirror viewport; overflow=0). */
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
                console.error(
                    `[VFX-JS] effect[${i}].init() failed:`,
                    err,
                );
                // Dispose prior effects (reverse order): user's dispose
                // first, then their host to release any GL resources
                // allocated via ctx.createRenderTarget / wrapTexture.
                // Same ordering as the main dispose() path. The failing
                // effect's own `dispose` is NOT called (init did not
                // complete), but its host IS disposed because init may
                // have allocated RTs / textures before the throw.
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

        // 2. Resolve intermediate sizes via outputSize(), reallocate
        //    when size or float differs.
        this.#resolveIntermediates(input);

        // 3. Apply per-host frame dims (canvas + element + uvInnerRect).
        //    Must come AFTER #resolveIntermediates so auto-tracking RTs
        //    see the current size.
        for (let k = 0; k < this.#hosts.length; k++) {
            this.#hosts[k].setFrameDims(
                this.#hostFrameDims(k, input),
            );
        }

        // 4. Update phase (array order). ctx.draw() is a no-op here.
        for (let i = 0; i < this.#effects.length; i++) {
            const e = this.#effects[i];
            if (!e.update) continue;
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
            if (input.finalTarget === null) {
                this.#hosts[0]?.passthroughCopy(
                    srcHandle,
                    null,
                    input.finalViewport,
                );
            } else {
                const target = this.#getFinalHandle(input.finalTarget);
                this.#hosts[0]?.passthroughCopy(
                    srcHandle,
                    target,
                    {
                        x: 0,
                        y: 0,
                        w: input.finalTarget.width,
                        h: input.finalTarget.height,
                    },
                );
            }
            return;
        }

        // 6. Render phase: walk renderingIndices.
        for (let k = 0; k < M; k++) {
            const i = this.#renderingIndices[k];
            const host = this.#hosts[i];
            host.setPhase("render");
            host.tickAutoUpdates();

            // src: capture for k=0, else previous intermediate's read.
            const srcHandle =
                k === 0
                    ? this.#capture
                    : this.#intermediates[k - 1]!.texHandle;
            host.setSrc(srcHandle);

            // output: final target for k=M-1, else intermediate[k]'s write.
            let outputHandle: EffectRenderTarget | null;
            if (k === M - 1) {
                outputHandle =
                    input.finalTarget === null
                        ? null
                        : this.#getFinalHandle(input.finalTarget);
            } else {
                outputHandle = this.#intermediates[k]!.rtHandle;
                // Clear intermediate to (0,0,0,0) before write.
                host.clearRt(outputHandle);
            }
            host.setOutput(outputHandle);

            const effect = this.#effects[i];
            try {
                effect.render!(host.ctx);
            } catch (err) {
                if (!this.#warnedRender.has(i)) {
                    this.#warnedRender.add(i);
                    console.warn(
                        `[VFX-JS] effect[${i}].render() threw; falling back to passthrough:`,
                        err,
                    );
                }
                // Passthrough src → output so the chain keeps flowing.
                if (outputHandle === null) {
                    host.passthroughCopy(
                        srcHandle,
                        null,
                        input.finalViewport,
                    );
                } else {
                    host.passthroughCopy(
                        srcHandle,
                        outputHandle,
                        {
                            x: 0,
                            y: 0,
                            w: outputHandle.width,
                            h: outputHandle.height,
                        },
                    );
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
        // Reverse array order: effect.dispose then host.dispose.
        for (let i = this.#effects.length - 1; i >= 0; i--) {
            this.#safeDispose(i);
            this.#hosts[i].dispose();
        }
        for (const im of this.#intermediates) {
            im?.fb.dispose();
        }
        this.#intermediates = [];
        if (this.#finalFallbackFb) {
            this.#finalFallbackFb.dispose();
            this.#finalFallbackFb = null;
        }
    }

    // -- internals ----------------------------------------------------------

    #safeDispose(i: number): void {
        const e = this.#effects[i];
        if (!e.dispose) return;
        try {
            e.dispose();
        } catch (err) {
            console.error(`[VFX-JS] effect[${i}].dispose() threw:`, err);
        }
    }

    #resolveIntermediates(input: ChainFrameInput): void {
        const M = this.#renderingIndices.length;
        if (M <= 1) {
            return;
        }
        let stageInput: readonly [number, number] = [
            input.elementPhys[0],
            input.elementPhys[1],
        ];
        for (let k = 0; k < M - 1; k++) {
            const i = this.#renderingIndices[k];
            const effect = this.#effects[i];
            const { size, float } = callOutputSize(
                effect,
                stageInput,
                input,
                this.#isPostEffect,
            );
            const current = this.#intermediates[k];
            if (
                current === null ||
                current.fb.width !== size[0] ||
                current.fb.height !== size[1] ||
                current.float !== float
            ) {
                if (current) {
                    current.fb.dispose();
                }
                const fb = new Framebuffer(
                    this.#glCtx,
                    size[0],
                    size[1],
                    { float },
                );
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
                };
            }
            stageInput = size;
        }
    }

    #hostFrameDims(
        k: number,
        input: ChainFrameInput,
    ): {
        outputPhysW: number;
        outputPhysH: number;
        canvasPhysW: number;
        canvasPhysH: number;
        canvasViewportX: number;
        canvasViewportY: number;
        canvasViewportW: number;
        canvasViewportH: number;
        elementPhysW: number;
        elementPhysH: number;
        uvInnerRect: [number, number, number, number];
    } {
        const M = this.#renderingIndices.length;
        // Find whether host k is a rendering effect and its position.
        const renderPos = this.#renderingIndices.indexOf(k);
        let outputW: number;
        let outputH: number;
        if (renderPos < 0) {
            // Not a rendering effect; use element phys as a placeholder.
            outputW = input.elementPhys[0];
            outputH = input.elementPhys[1];
        } else if (renderPos === M - 1) {
            outputW =
                input.finalTarget === null
                    ? input.finalViewport.w
                    : input.finalTarget.width;
            outputH =
                input.finalTarget === null
                    ? input.finalViewport.h
                    : input.finalTarget.height;
        } else {
            const im = this.#intermediates[renderPos]!;
            outputW = im.fb.width;
            outputH = im.fb.height;
        }

        // uvInnerRect: inner region / buffer size. The inner region is
        // the element rect proper; the buffer is the element rect +
        // overflow. For post effects overflow is zero → uvInnerRect is
        // [0, 0, 1, 1].
        const bufW = input.elementPhys[0];
        const bufH = input.elementPhys[1];
        const innerW = input.elementInnerPhys[0];
        const innerH = input.elementInnerPhys[1];
        const innerOriginX =
            bufW > 0 ? input.overflow.left / bufW : 0;
        const innerOriginY =
            bufH > 0 ? input.overflow.bottom / bufH : 0;
        const innerSizeX = bufW > 0 ? innerW / bufW : 1;
        const innerSizeY = bufH > 0 ? innerH / bufH : 1;

        return {
            outputPhysW: outputW,
            outputPhysH: outputH,
            canvasPhysW: input.canvasPhysW,
            canvasPhysH: input.canvasPhysH,
            canvasViewportX: input.finalViewport.x,
            canvasViewportY: input.finalViewport.y,
            canvasViewportW: input.finalViewport.w,
            canvasViewportH: input.finalViewport.h,
            elementPhysW: input.elementPhys[0],
            elementPhysH: input.elementPhys[1],
            uvInnerRect: [
                innerOriginX,
                innerOriginY,
                innerSizeX,
                innerSizeY,
            ],
        };
    }

    #getFinalHandle(fb: Framebuffer): EffectRenderTarget {
        // Cached at the chain level and regenerated only when the
        // underlying Framebuffer instance changes (viewport resize
        // reallocates it). Keeps ctx.output reference-stable across
        // frames.
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

function callOutputSize(
    effect: Effect,
    inputSize: readonly [number, number],
    input: ChainFrameInput,
    isPostEffect: boolean,
): { size: [number, number]; float: boolean } {
    if (!effect.outputSize) {
        return { size: [inputSize[0], inputSize[1]], float: false };
    }
    const dims = {
        input: inputSize,
        element: isPostEffect
            ? input.viewportLogical
            : input.elementInnerLogical,
        elementPixel: isPostEffect
            ? input.viewportPhys
            : input.elementInnerPhys,
        viewport: input.viewportLogical,
        viewportPixel: input.viewportPhys,
        // 8-2 will compute the real fullscreenPad (viewport-edge distance
        // per side minus src pad). Until then, zero stub keeps the types
        // aligned with the new `dims` shape.
        fullscreenPad: { top: 0, right: 0, bottom: 0, left: 0 },
        pixelRatio: input.viewportPhys[0] / input.viewportLogical[0] || 1,
    };
    const ret = effect.outputSize(dims);
    if (Array.isArray(ret)) {
        return { size: [ret[0], ret[1]], float: false };
    }
    const obj = ret as
        | { size: readonly [number, number]; float?: boolean }
        | { padAdd: unknown; float?: boolean };
    if ("padAdd" in obj) {
        // padAdd variant: real handling lands in 8-2. For now, fall back
        // to input size so behaviour is unchanged.
        return {
            size: [inputSize[0], inputSize[1]],
            float: obj.float ?? false,
        };
    }
    return { size: [obj.size[0], obj.size[1]], float: obj.float ?? false };
}

// Silence unused-import warnings; resolveRt is exported for chain tests.
export { resolveRt };
