import { Backbuffer } from "./backbuffer.js";
import { shaders } from "./constants.js";
import { CopyPass } from "./copy-pass.js";
import dom2canvas from "./dom-to-canvas.js";
import { EffectChain } from "./effect-chain.js";
import { makeEffectTexture } from "./effect-host.js";
import GIFData from "./gif.js";
import { GLContext } from "./gl/context.js";
import type { Framebuffer } from "./gl/framebuffer.js";
import { type Pass, renderPass } from "./gl/pass.js";
import type { Uniform, Uniforms } from "./gl/program.js";
import { Quad } from "./gl/quad.js";
import { loadImage, Texture, type TextureWrap } from "./gl/texture.js";
import { Vec2, Vec4 } from "./gl/vec.js";
import { type GLRect, getGLRect, rectToGLRect } from "./gl-rect.js";
import { PostEffectPass } from "./post-effect-pass.js";
import {
    createMargin,
    createRect,
    getIntersection,
    growRect,
    MARGIN_ZERO,
    type Margin,
    type Rect,
    toRect,
} from "./rect.js";
import { createPassMaterial, createRenderTarget } from "./render-target.js";
import type {
    Effect,
    EffectUniformValue,
    EffectVFXProps,
    VFXElement,
    VFXElementIntersection,
    VFXElementPass,
    VFXElementType,
    VFXOptsInner,
    VFXPass,
    VFXPostEffect,
    VFXProps,
    VFXUniformValue,
    VFXWrap,
} from "./types.js";

const gifFor = new Map<HTMLElement, GIFData>();

/**
 * @internal
 */
export class VFXPlayer {
    #opts: VFXOptsInner;

    #canvas: HTMLCanvasElement;
    #ctx: GLContext;
    #gl: WebGL2RenderingContext;
    #quad: Quad;
    #copyPass: CopyPass;
    #postEffectPasses: PostEffectPass[] = [];
    #postEffectPassTargets: (string | undefined)[] = [];
    #postEffectTarget: Framebuffer | undefined;
    #postEffectUniformGeneratorsList: {
        [name: string]: () => VFXUniformValue;
    }[] = [];
    #postEffectBufferTargets: Map<string, Framebuffer | undefined> = new Map();

    #playRequest: number | undefined = undefined;
    #pixelRatio = 2;
    #elements: VFXElement[] = [];
    #initTime = Date.now() / 1000.0;

    #viewport: Rect = createRect(0);

    /** Actual viewport without padding */
    #viewportInner: Rect = createRect(0);

    #canvasSize = [0, 0];
    #paddingX = 0;
    #paddingY = 0;

    #mouseX = 0;
    #mouseY = 0;

    #isRenderingToCanvas = new WeakMap<HTMLElement, boolean>();

    constructor(opts: VFXOptsInner, canvas: HTMLCanvasElement) {
        this.#opts = opts;

        this.#canvas = canvas;
        this.#ctx = new GLContext(canvas);
        this.#gl = this.#ctx.gl;
        this.#gl.clearColor(0, 0, 0, 0);
        this.#pixelRatio = opts.pixelRatio;

        this.#quad = new Quad(this.#ctx);

        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.#resize);
            window.addEventListener("pointermove", this.#pointermove);
        }
        this.#resize();

        this.#copyPass = new CopyPass(this.#ctx);
        this.#initPostEffects(opts.postEffects);

        // Clear state that depends on frame-by-frame GPU output so the
        // scene re-renders cleanly after a context restore (persistent
        // backbuffers come back as black, then accumulate again).
        this.#ctx.onContextRestored(() => {
            this.#gl.clearColor(0, 0, 0, 0);
        });
    }

    destroy(): void {
        this.stop();
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.#resize);
            window.removeEventListener("pointermove", this.#pointermove);
        }

        this.#postEffectTarget?.dispose();
        for (const rt of this.#postEffectBufferTargets.values()) {
            rt?.dispose();
        }
        for (const pass of this.#postEffectPasses) {
            pass.dispose();
        }
        this.#copyPass.dispose();
        this.#quad.dispose();
    }

    #updateCanvasSize(): void {
        if (typeof window === "undefined") {
            return;
        }

        // Get the viewport size excluding scrollbars.
        // We need to choose the element based on the document mode (quirks / standard).
        const doc = this.#canvas.ownerDocument;
        const viewportEl =
            doc.compatMode === "BackCompat" ? doc.body : doc.documentElement;
        const width = viewportEl.clientWidth;
        const height = viewportEl.clientHeight;

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let paddingX: number;
        let paddingY: number;
        if (this.#opts.fixedCanvas) {
            paddingX = 0;
            paddingY = 0;
        } else if (this.#opts.wrapper) {
            // When a wrapper with overflow:hidden is used, no clamping needed.
            // The wrapper clips the canvas, so full padding is safe.
            paddingX = width * this.#opts.scrollPadding[0];
            paddingY = height * this.#opts.scrollPadding[1];
        } else {
            // No wrapper: clamp padding so that the canvas doesn't cause overflow
            const maxPaddingX = doc.body.scrollWidth - (scrollX + width);
            const maxPaddingY = doc.body.scrollHeight - (scrollY + height);

            paddingX = clamp(
                width * this.#opts.scrollPadding[0],
                0,
                maxPaddingX,
            );
            paddingY = clamp(
                height * this.#opts.scrollPadding[1],
                0,
                maxPaddingY,
            );
        }

        const widthWithPadding = width + paddingX * 2;
        const heightWithPadding = height + paddingY * 2;

        if (
            widthWithPadding !== this.#canvasSize[0] ||
            heightWithPadding !== this.#canvasSize[1]
        ) {
            this.#canvas.style.width = `${widthWithPadding}px`;
            this.#canvas.style.height = `${heightWithPadding}px`;
            this.#ctx.setSize(
                widthWithPadding,
                heightWithPadding,
                this.#pixelRatio,
            );
            this.#viewport = createRect({
                top: -paddingY,
                left: -paddingX,
                right: width + paddingX,
                bottom: height + paddingY,
            });
            this.#viewportInner = createRect({
                top: 0,
                left: 0,
                right: width,
                bottom: height,
            });
            this.#canvasSize = [widthWithPadding, heightWithPadding];
            this.#paddingX = paddingX;
            this.#paddingY = paddingY;
        }

        // Sync scroll
        if (!this.#opts.fixedCanvas) {
            this.#canvas.style.setProperty(
                "transform",
                `translate(${scrollX - paddingX}px, ${scrollY - paddingY}px)`,
            );
        }
    }

    #resize = async (): Promise<void> => {
        if (typeof window !== "undefined") {
            // Update dom2canvas result.
            // Render elements in viewport first, then render elements outside of the viewport.
            for (const e of this.#elements) {
                if (e.type === "text" && e.isInViewport) {
                    const rect = e.element.getBoundingClientRect();
                    if (rect.width !== e.width || rect.height !== e.height) {
                        await this.#rerenderTextElement(e);
                        e.width = rect.width;
                        e.height = rect.height;
                    }
                }
            }
            for (const e of this.#elements) {
                if (e.type === "text" && !e.isInViewport) {
                    const rect = e.element.getBoundingClientRect();
                    if (rect.width !== e.width || rect.height !== e.height) {
                        await this.#rerenderTextElement(e);
                        e.width = rect.width;
                        e.height = rect.height;
                    }
                }
            }
        }
    };

    #pointermove = (e: PointerEvent): void => {
        if (typeof window !== "undefined") {
            this.#mouseX = e.clientX;
            this.#mouseY = window.innerHeight - e.clientY;
        }
    };

    async #rerenderTextElement(e: VFXElement): Promise<void> {
        if (this.#isRenderingToCanvas.get(e.element)) {
            return;
        }
        this.#isRenderingToCanvas.set(e.element, true);

        try {
            const oldTexture = e.srcTexture;
            const oldCanvas =
                oldTexture.source instanceof OffscreenCanvas
                    ? oldTexture.source
                    : undefined;

            const canvas = await dom2canvas(
                e.element,
                e.originalOpacity,
                oldCanvas,
                this.maxTextureSize,
            );
            if (canvas.width === 0 || canvas.width === 0) {
                throw "omg";
            }

            const texture = new Texture(this.#ctx, canvas);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            texture.needsUpdate = true;
            // Effect-path uses a resolver-form EffectTexture that reads
            // `e.srcTexture` each frame, so updating the field alone is
            // enough. Shader path also needs the pass-0 src uniform
            // rewritten.
            if (!e.chain && e.passes.length > 0) {
                e.passes[0].uniforms["src"].value = texture;
            }
            e.srcTexture = texture;
            oldTexture.dispose();
        } catch (e) {
            console.error(e);
        }

        this.#isRenderingToCanvas.set(e.element, false);
    }

    async addElement(
        element: HTMLElement,
        opts: VFXProps = {},
        initialCapture?: OffscreenCanvas,
    ): Promise<void> {
        // Effect path: mutually exclusive with `shader`. See plan.md.
        if (opts.effect !== undefined) {
            return this.#addEffectElement(element, opts, initialCapture);
        }

        // Normalize shader input to VFXPass array
        const inputPasses = this.#normalizePasses(opts);

        const domRect = element.getBoundingClientRect();
        const rect = toRect(domRect);
        const [isFullScreen, overflow] = parseOverflowOpts(opts.overflow);
        const rectWithOverflow = growRect(rect, overflow);

        const intersectionOpts = parseIntersectionOpts(opts.intersection);

        const originalOpacity =
            element.style.opacity === ""
                ? 1
                : Number.parseFloat(element.style.opacity);

        // Create values for element types
        let texture: Texture;
        let type: VFXElementType;
        let isGif = false;
        if (element instanceof HTMLImageElement) {
            type = "img" as VFXElementType;
            isGif = !!element.src.match(/\.gif/i);

            if (isGif) {
                const gif = await GIFData.create(element.src, this.#pixelRatio);
                gifFor.set(element, gif);
                texture = new Texture(this.#ctx, gif.getCanvas());
            } else {
                const img = await loadImage(element.src);
                texture = new Texture(this.#ctx, img);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = new Texture(this.#ctx, element);
            type = "video" as VFXElementType;
        } else if (element instanceof HTMLCanvasElement) {
            if (element.hasAttribute("layoutsubtree") && initialCapture) {
                texture = new Texture(this.#ctx, initialCapture);
                type = "hic" as VFXElementType;
            } else {
                texture = new Texture(this.#ctx, element);
                type = "canvas" as VFXElementType;
            }
        } else {
            const canvas = await dom2canvas(
                element,
                originalOpacity,
                undefined,
                this.maxTextureSize,
            );
            texture = new Texture(this.#ctx, canvas);
            type = "text" as VFXElementType;
        }

        const [wrapS, wrapT] = parseWrap(opts.wrap);
        texture.wrapS = wrapS;
        texture.wrapT = wrapT;
        texture.needsUpdate = true;

        const autoCrop = opts.autoCrop ?? true;

        // Hide original element
        if (type === "hic") {
            /* onpaint clears the canvas — no need to hide */
        } else if (opts.overlay === true) {
            /* Overlay mode. Do not hide the element */
        } else if (typeof opts.overlay === "number") {
            element.style.setProperty("opacity", opts.overlay.toString());
        } else {
            const opacity = type === "video" ? "0.0001" : "0"; // don't hide video element completely to prevent jank frames
            element.style.setProperty("opacity", opacity.toString());
        }

        // Create shared uniforms
        const sharedUniforms: Uniforms = {
            src: { value: texture },
            resolution: { value: new Vec2() },
            offset: { value: new Vec2() },
            time: { value: 0.0 },
            enterTime: { value: -1.0 },
            leaveTime: { value: -1.0 },
            mouse: { value: new Vec2() },
            intersection: { value: 0.0 },
            viewport: { value: new Vec4() },
            autoCrop: { value: autoCrop },
        };

        const sharedUniformGenerators: {
            [name: string]: () => VFXUniformValue;
        } = {};

        if (opts.uniforms !== undefined) {
            for (const [key, value] of Object.entries(opts.uniforms)) {
                if (typeof value === "function") {
                    sharedUniforms[key] = { value: value() };
                    sharedUniformGenerators[key] = value;
                } else {
                    sharedUniforms[key] = { value };
                }
            }
        }

        // Backbuffer
        let backbuffer: VFXElement["backbuffer"];
        if (opts.backbuffer) {
            backbuffer = (() => {
                const bw =
                    (rectWithOverflow.right - rectWithOverflow.left) *
                    this.#pixelRatio;
                const bh =
                    (rectWithOverflow.bottom - rectWithOverflow.top) *
                    this.#pixelRatio;
                return new Backbuffer(
                    this.#ctx,
                    bw,
                    bh,
                    this.#pixelRatio,
                    false,
                );
            })();
            sharedUniforms["backbuffer"] = { value: backbuffer.texture };
        }

        // Create buffer targets for intermediate passes
        const bufferTargets = new Map<string, Framebuffer>();
        const passBackbuffers = new Map<string, Backbuffer>();
        for (let i = 0; i < inputPasses.length - 1; i++) {
            const targetName = inputPasses[i].target ?? `pass${i}`;
            inputPasses[i] = { ...inputPasses[i], target: targetName };
            const passSize = inputPasses[i].size;
            const bw = passSize
                ? passSize[0]
                : (rectWithOverflow.right - rectWithOverflow.left) *
                  this.#pixelRatio;
            const bh = passSize
                ? passSize[1]
                : (rectWithOverflow.bottom - rectWithOverflow.top) *
                  this.#pixelRatio;

            if (inputPasses[i].persistent) {
                // Persistent passes use double-buffered Backbuffer
                const pixelRatio = passSize ? 1 : this.#pixelRatio;
                const logicalW = passSize
                    ? passSize[0]
                    : rectWithOverflow.right - rectWithOverflow.left;
                const logicalH = passSize
                    ? passSize[1]
                    : rectWithOverflow.bottom - rectWithOverflow.top;
                passBackbuffers.set(
                    targetName,
                    new Backbuffer(
                        this.#ctx,
                        logicalW,
                        logicalH,
                        pixelRatio,
                        inputPasses[i].float,
                    ),
                );
            } else {
                bufferTargets.set(
                    targetName,
                    createRenderTarget(this.#ctx, bw, bh, {
                        float: inputPasses[i].float,
                    }),
                );
            }
        }

        // Build passes
        const passes: VFXElementPass[] = [];
        for (let i = 0; i < inputPasses.length; i++) {
            const p = inputPasses[i];
            const frag = p.frag;

            // Create per-pass uniforms
            const passUniforms: Uniforms = { ...sharedUniforms };
            const passUniformGenerators: {
                [name: string]: () => VFXUniformValue;
            } = {};

            // Auto-bind buffer targets referenced in the shader
            // Skip binding the pass's own render target to avoid feedback loops
            // (persistent passes can read their own buffer via backbuffer double-buffering)
            for (const [name, rt] of bufferTargets) {
                if (name === p.target) {
                    continue;
                }
                if (
                    frag.match(new RegExp(`uniform\\s+sampler2D\\s+${name}\\b`))
                ) {
                    passUniforms[name] = { value: rt.texture };
                }
            }
            for (const [name, bb] of passBackbuffers) {
                if (
                    frag.match(new RegExp(`uniform\\s+sampler2D\\s+${name}\\b`))
                ) {
                    // Backbuffer read texture is always safe (double-buffered)
                    passUniforms[name] = { value: bb.texture };
                }
            }

            // Add per-pass uniforms
            if (p.uniforms) {
                for (const [key, value] of Object.entries(p.uniforms)) {
                    if (typeof value === "function") {
                        passUniforms[key] = { value: value() };
                        passUniformGenerators[key] = value;
                    } else {
                        passUniforms[key] = { value };
                    }
                }
            }

            const pass = createPassMaterial(this.#ctx, {
                vertexShader: p.vert,
                fragmentShader: frag,
                uniforms: passUniforms,
                renderingToBuffer: p.target !== undefined,
                glslVersion: p.glslVersion,
            });

            passes.push({
                pass,
                uniforms: passUniforms,
                uniformGenerators: {
                    ...sharedUniformGenerators,
                    ...passUniformGenerators,
                },
                target: p.target,
                persistent: p.persistent,
                float: p.float,
                size: p.size,
                backbuffer: p.target
                    ? passBackbuffers.get(p.target)
                    : undefined,
            });
        }

        const now = Date.now() / 1000;
        const elem: VFXElement = {
            type,
            element,
            isInViewport: false,
            isInLogicalViewport: false,
            width: domRect.width,
            height: domRect.height,
            passes,
            bufferTargets,
            startTime: now,
            enterTime: now,
            leaveTime: Number.NEGATIVE_INFINITY,
            release: opts.release ?? Number.POSITIVE_INFINITY,
            isGif,
            isFullScreen,
            overflow,
            intersection: intersectionOpts,
            originalOpacity,
            srcTexture: texture,
            zIndex: opts.zIndex ?? 0,
            backbuffer,
            autoCrop,
        };

        this.#hitTest(elem, rect, now);

        // Insert element and sort elements by z-index.
        // Array.prototype.sort is stable sort, so the elements with same z
        // will be rendered by the order they are added to VFX.
        this.#elements.push(elem);
        this.#elements.sort((a, b) => a.zIndex - b.zIndex);
    }

    async #addEffectElement(
        element: HTMLElement,
        opts: VFXProps,
        initialCapture?: OffscreenCanvas,
    ): Promise<void> {
        const rawEffect = opts.effect!;

        if (opts.shader !== undefined) {
            console.warn(
                "[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence.",
            );
        }

        const effects: readonly Effect[] = Array.isArray(rawEffect)
            ? [...rawEffect]
            : [rawEffect];
        if (effects.length === 0) {
            console.warn(
                "[VFX-JS] Empty `effect` array; rendering identity capture → final target.",
            );
        }

        // Shared prelude (mirrors shader-path addElement).
        const domRect = element.getBoundingClientRect();
        const rect = toRect(domRect);
        const [isFullScreen, overflow] = parseOverflowOpts(opts.overflow);
        const intersectionOpts = parseIntersectionOpts(opts.intersection);

        const originalOpacity =
            element.style.opacity === ""
                ? 1
                : Number.parseFloat(element.style.opacity);

        let texture: Texture;
        let type: VFXElementType;
        let isGif = false;
        if (element instanceof HTMLImageElement) {
            type = "img" as VFXElementType;
            isGif = !!element.src.match(/\.gif/i);

            if (isGif) {
                const gif = await GIFData.create(element.src, this.#pixelRatio);
                gifFor.set(element, gif);
                texture = new Texture(this.#ctx, gif.getCanvas());
            } else {
                const img = await loadImage(element.src);
                texture = new Texture(this.#ctx, img);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = new Texture(this.#ctx, element);
            type = "video" as VFXElementType;
        } else if (element instanceof HTMLCanvasElement) {
            if (element.hasAttribute("layoutsubtree") && initialCapture) {
                texture = new Texture(this.#ctx, initialCapture);
                type = "hic" as VFXElementType;
            } else {
                texture = new Texture(this.#ctx, element);
                type = "canvas" as VFXElementType;
            }
        } else {
            const canvas = await dom2canvas(
                element,
                originalOpacity,
                undefined,
                this.maxTextureSize,
            );
            texture = new Texture(this.#ctx, canvas);
            type = "text" as VFXElementType;
        }

        const [wrapS, wrapT] = parseWrap(opts.wrap);
        texture.wrapS = wrapS;
        texture.wrapT = wrapT;
        texture.needsUpdate = true;

        const autoCrop = opts.autoCrop ?? true;

        if (type === "hic") {
            /* onpaint clears the canvas */
        } else if (opts.overlay === true) {
            /* overlay mode */
        } else if (typeof opts.overlay === "number") {
            element.style.setProperty("opacity", opts.overlay.toString());
        } else {
            const opacity = type === "video" ? "0.0001" : "0";
            element.style.setProperty("opacity", opacity.toString());
        }

        // Effect-path specifics.
        const now = Date.now() / 1000;
        const elem: VFXElement = {
            type,
            element,
            isInViewport: false,
            isInLogicalViewport: false,
            width: domRect.width,
            height: domRect.height,
            passes: [],
            bufferTargets: new Map(),
            startTime: now,
            enterTime: now,
            leaveTime: Number.NEGATIVE_INFINITY,
            release: opts.release ?? Number.POSITIVE_INFINITY,
            isGif,
            isFullScreen,
            overflow,
            intersection: intersectionOpts,
            originalOpacity,
            srcTexture: texture,
            zIndex: opts.zIndex ?? 0,
            backbuffer: undefined,
            autoCrop,
            effectLastRenderTime: now,
        };

        // Resolver-form EffectTexture — closure over `elem.srcTexture`
        // transparently follows text-element re-renders.
        const captureHandle = makeEffectTexture(
            () => elem.srcTexture,
            () => readTextureSourceDim(elem.srcTexture, "w"),
            () => readTextureSourceDim(elem.srcTexture, "h"),
        );

        // Split user uniforms into static + generators.
        const staticUniforms: Record<string, EffectUniformValue> = {};
        const gens: Record<string, () => EffectUniformValue> = {};
        if (opts.uniforms) {
            for (const [k, v] of Object.entries(opts.uniforms)) {
                if (typeof v === "function") {
                    gens[k] = v as () => EffectUniformValue;
                    staticUniforms[k] = v() as EffectUniformValue;
                } else {
                    staticUniforms[k] = v as EffectUniformValue;
                }
            }
        }
        elem.effectUniformGenerators = gens;
        elem.effectStaticUniforms = staticUniforms;

        const vfxProps: EffectVFXProps = {
            autoCrop,
            glslVersion: opts.glslVersion ?? "300 es",
        };
        const chain = new EffectChain(
            this.#ctx,
            this.#quad,
            this.#pixelRatio,
            effects,
            vfxProps,
            captureHandle,
            false,
        );
        try {
            await chain.initAll();
        } catch (err) {
            // Chain has already disposed prior effects + failing host.
            // Release the source texture and restore opacity.
            texture.dispose();
            element.style.setProperty(
                "opacity",
                originalOpacity.toString(),
            );
            throw err;
        }
        elem.chain = chain;

        this.#hitTest(elem, rect, now);
        this.#elements.push(elem);
        this.#elements.sort((a, b) => a.zIndex - b.zIndex);
    }

    /**
     * Normalize shader input to a VFXPass array.
     * Per-pass `glslVersion` wins; otherwise `opts.glslVersion` is inherited.
     */
    #normalizePasses(opts: VFXProps): VFXPass[] {
        const inherit = (p: VFXPass): VFXPass =>
            p.glslVersion === undefined && opts.glslVersion !== undefined
                ? { ...p, glslVersion: opts.glslVersion }
                : p;
        if (Array.isArray(opts.shader)) {
            return opts.shader.map(inherit);
        }
        const shaderCode = this.#getShader(opts.shader || "uvGradient");
        return [inherit({ frag: shaderCode })];
    }

    removeElement(element: HTMLElement): void {
        const i = this.#elements.findIndex((e) => e.element === element);
        if (i !== -1) {
            const e = this.#elements.splice(i, 1)[0] as VFXElement;

            if (e.chain) {
                // Effect path: chain disposes its effects + hosts +
                // intermediates. Source texture + opacity are ours.
                e.chain.dispose();
            } else {
                for (const rt of e.bufferTargets.values()) {
                    rt.dispose();
                }
                for (const p of e.passes) {
                    p.pass.dispose();
                    p.backbuffer?.dispose();
                }
                e.backbuffer?.dispose();
            }
            e.srcTexture.dispose();

            // Recover the original state
            element.style.setProperty("opacity", e.originalOpacity.toString());
        }
    }

    updateTextElement(element: HTMLElement): Promise<void> {
        const i = this.#elements.findIndex((e) => e.element === element);
        if (i !== -1) {
            return this.#rerenderTextElement(this.#elements[i]);
        }

        // Do nothing if the element is not found
        // This happens when addElement is still processing
        return Promise.resolve();
    }

    updateCanvasElement(element: HTMLCanvasElement): void {
        const e = this.#elements.find((e) => e.element === element);
        if (e) {
            const oldTexture = e.srcTexture;
            const texture = new Texture(this.#ctx, element);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            texture.needsUpdate = true;
            if (!e.chain && e.passes.length > 0) {
                e.passes[0].uniforms["src"].value = texture;
            }
            e.srcTexture = texture;
            oldTexture.dispose();
        }
    }

    updateHICTexture(
        canvas: HTMLCanvasElement,
        offscreen: OffscreenCanvas,
    ): void {
        const e = this.#elements.find((e) => e.element === canvas);
        if (!e || e.type !== "hic") {
            return;
        }

        const oldTexture = e.srcTexture;

        if (oldTexture.source === offscreen) {
            oldTexture.needsUpdate = true;
        } else {
            const texture = new Texture(this.#ctx, offscreen);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            texture.needsUpdate = true;
            if (!e.chain && e.passes.length > 0) {
                e.passes[0].uniforms["src"].value = texture;
            }
            e.srcTexture = texture;
            oldTexture.dispose();
        }
    }

    get maxTextureSize(): number {
        return this.#ctx.maxTextureSize;
    }

    isPlaying(): boolean {
        return this.#playRequest !== undefined;
    }

    play(): void {
        if (!this.isPlaying()) {
            this.#playRequest = requestAnimationFrame(this.#playLoop);
        }
    }

    stop(): void {
        if (this.#playRequest !== undefined) {
            cancelAnimationFrame(this.#playRequest);
            this.#playRequest = undefined;
        }
    }

    render(): void {
        const now = Date.now() / 1000;
        const gl = this.#gl;

        // This must done every frame because iOS Safari doesn't fire
        // window resize event while the address bar is transforming.
        this.#updateCanvasSize();

        // Clear the main canvas.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const viewportWidth = this.#viewport.right - this.#viewport.left;
        const viewportHeight = this.#viewport.bottom - this.#viewport.top;
        const viewportGlRect = getGLRect(0, 0, viewportWidth, viewportHeight);

        // Setup post effect render target if needed
        const shouldUsePostEffect = this.#postEffectPasses.length > 0;
        if (shouldUsePostEffect) {
            this.#setupPostEffectTarget(viewportWidth, viewportHeight);
            if (this.#postEffectTarget) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.#postEffectTarget.fbo);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
        }

        for (const e of this.#elements) {
            const domRect = e.element.getBoundingClientRect();
            const rect = toRect(domRect);
            const hit = this.#hitTest(e, rect, now);

            if (!hit.isVisible) {
                continue;
            }

            if (e.chain) {
                this.#renderEffectElement(e, rect, hit, now, viewportGlRect);
                continue;
            }

            // Update uniforms
            const u = e.passes[0].uniforms;
            u["time"].value = now - e.startTime;
            (u["resolution"].value as Vec2).set(
                domRect.width * this.#pixelRatio,
                domRect.height * this.#pixelRatio,
            );
            // #mouseX/Y are in viewport-Y-up coords, but gl_FragCoord in
            // the canvas is in canvas-Y-up coords (canvas extends paddingX/Y
            // outside the viewport). Add padding to convert.
            (u["mouse"].value as Vec2).set(
                (this.#mouseX + this.#paddingX) * this.#pixelRatio,
                (this.#mouseY + this.#paddingY) * this.#pixelRatio,
            );

            // Update uniform generators
            for (const pass of e.passes) {
                for (const [key, gen] of Object.entries(
                    pass.uniformGenerators,
                )) {
                    pass.uniforms[key].value = gen();
                }
            }

            // Update GIF / video
            gifFor.get(e.element)?.update();
            if (e.type === "video" || e.isGif) {
                (u["src"].value as Texture).needsUpdate = true;
            }

            const glRect = rectToGLRect(
                rect,
                viewportHeight,
                this.#paddingX,
                this.#paddingY,
            );
            const glRectWithOverflow = rectToGLRect(
                hit.rectWithOverflow,
                viewportHeight,
                this.#paddingX,
                this.#paddingY,
            );

            // Update backbuffer uniform before any pass
            if (e.backbuffer) {
                e.passes[0].uniforms["backbuffer"].value = e.backbuffer.texture;
            }

            // Resize buffer targets if needed (skip passes with custom size)
            {
                const targetRect = e.isFullScreen
                    ? viewportGlRect
                    : glRectWithOverflow;
                const tw = Math.max(1, targetRect.w * this.#pixelRatio);
                const th = Math.max(1, targetRect.h * this.#pixelRatio);
                const logicalW = Math.max(1, targetRect.w);
                const logicalH = Math.max(1, targetRect.h);
                for (let i = 0; i < e.passes.length - 1; i++) {
                    const pass = e.passes[i];
                    if (pass.size) {
                        continue; // fixed size, no resize
                    }
                    if (pass.backbuffer) {
                        pass.backbuffer.resize(logicalW, logicalH);
                    } else {
                        const rt = e.bufferTargets.get(pass.target as string);
                        if (rt && (rt.width !== tw || rt.height !== th)) {
                            rt.setSize(tw, th);
                        }
                    }
                }
            }

            // Track resolved buffer textures for dynamic uniform updates
            const resolvedTargets = new Map<string, Texture>();

            // Pre-register persistent backbuffer textures
            for (const pass of e.passes) {
                if (pass.backbuffer && pass.target) {
                    resolvedTargets.set(pass.target, pass.backbuffer.texture);
                }
            }

            // Render intermediate passes, chaining src between passes
            // Use local inputTexture (like post-effects) to avoid corrupting
            // the shared src uniform across frames.
            let inputTexture: Texture = e.srcTexture;
            // #mouseX/Y are in viewport-Y-up coords, but glRect is in
            // canvas-Y-up coords (canvas extends paddingX/Y outside the
            // viewport). Add padding to convert to the same space.
            const relMouseX = this.#mouseX + this.#paddingX - glRect.x;
            const relMouseY = this.#mouseY + this.#paddingY - glRect.y;

            for (let i = 0; i < e.passes.length - 1; i++) {
                const pass = e.passes[i];
                const defaultRect = e.isFullScreen
                    ? viewportGlRect
                    : glRectWithOverflow;

                // Set src from chain (not shared uniform mutation)
                pass.uniforms["src"].value = inputTexture;

                // Update auto-bound buffer uniforms from resolved targets
                for (const [name, tex] of resolvedTargets) {
                    if (pass.uniforms[name]) {
                        pass.uniforms[name].value = tex;
                    }
                }

                // Update dynamic uniforms
                for (const [key, gen] of Object.entries(
                    pass.uniformGenerators,
                )) {
                    if (pass.uniforms[key]) {
                        pass.uniforms[key].value = gen();
                    }
                }

                // Intermediate passes render to their own buffer,
                // so offset is always 0 and resolution matches buffer size.
                const bufferW = pass.size
                    ? pass.size[0]
                    : defaultRect.w * this.#pixelRatio;
                const bufferH = pass.size
                    ? pass.size[1]
                    : defaultRect.h * this.#pixelRatio;
                const bufferRect = pass.size
                    ? getGLRect(0, 0, pass.size[0], pass.size[1])
                    : getGLRect(0, 0, defaultRect.w, defaultRect.h);

                (pass.uniforms["resolution"].value as Vec2).set(
                    bufferW,
                    bufferH,
                );
                (pass.uniforms["offset"].value as Vec2).set(0, 0);
                (pass.uniforms["mouse"].value as Vec2).set(
                    (relMouseX / defaultRect.w) * bufferW,
                    (relMouseY / defaultRect.h) * bufferH,
                );

                if (pass.backbuffer) {
                    // Persistent pass: render to backbuffer, then swap
                    this.#render(
                        pass.pass,
                        pass.backbuffer.target,
                        bufferRect,
                        pass.uniforms,
                        true,
                    );
                    pass.backbuffer.swap();
                    inputTexture = pass.backbuffer.texture;
                } else {
                    const rt = e.bufferTargets.get(pass.target as string);
                    if (!rt) {
                        continue;
                    }
                    this.#render(
                        pass.pass,
                        rt,
                        bufferRect,
                        pass.uniforms,
                        true,
                    );
                    inputTexture = rt.texture;
                }

                // Update resolved target
                if (pass.target) {
                    resolvedTargets.set(pass.target, inputTexture);
                }
            }

            // Render final pass — restore element-space uniforms
            const finalPass = e.passes[e.passes.length - 1];
            finalPass.uniforms["src"].value = inputTexture;
            (finalPass.uniforms["resolution"].value as Vec2).set(
                domRect.width * this.#pixelRatio,
                domRect.height * this.#pixelRatio,
            );
            (finalPass.uniforms["offset"].value as Vec2).set(
                glRect.x * this.#pixelRatio,
                glRect.y * this.#pixelRatio,
            );
            (finalPass.uniforms["mouse"].value as Vec2).set(
                (this.#mouseX + this.#paddingX) * this.#pixelRatio,
                (this.#mouseY + this.#paddingY) * this.#pixelRatio,
            );

            // Update resolved buffer uniforms for final pass
            for (const [name, tex] of resolvedTargets) {
                if (finalPass.uniforms[name]) {
                    finalPass.uniforms[name].value = tex;
                }
            }
            // Update dynamic uniforms for final pass
            for (const [key, gen] of Object.entries(
                finalPass.uniformGenerators,
            )) {
                if (finalPass.uniforms[key]) {
                    finalPass.uniforms[key].value = gen();
                }
            }

            if (e.backbuffer) {
                // Update backbuffer
                finalPass.uniforms["backbuffer"].value = e.backbuffer.texture;

                if (e.isFullScreen) {
                    e.backbuffer.resize(viewportWidth, viewportHeight);

                    this.#setOffset(e, glRect.x, glRect.y);
                    this.#render(
                        finalPass.pass,
                        e.backbuffer.target,
                        viewportGlRect,
                        finalPass.uniforms,
                        true,
                    );
                    e.backbuffer.swap();

                    this.#copyPass.setUniforms(
                        e.backbuffer.texture,
                        this.#pixelRatio,
                        viewportGlRect,
                    );
                    this.#render(
                        this.#copyPass.pass,
                        shouldUsePostEffect
                            ? this.#postEffectTarget || null
                            : null,
                        viewportGlRect,
                        this.#copyPass.uniforms,
                        false,
                    );
                } else {
                    e.backbuffer.resize(
                        glRectWithOverflow.w,
                        glRectWithOverflow.h,
                    );

                    this.#setOffset(e, e.overflow.left, e.overflow.bottom);
                    this.#render(
                        finalPass.pass,
                        e.backbuffer.target,
                        e.backbuffer.getViewport(),
                        finalPass.uniforms,
                        true,
                    );
                    e.backbuffer.swap();

                    this.#copyPass.setUniforms(
                        e.backbuffer.texture,
                        this.#pixelRatio,
                        glRectWithOverflow,
                    );
                    this.#render(
                        this.#copyPass.pass,
                        shouldUsePostEffect
                            ? this.#postEffectTarget || null
                            : null,
                        glRectWithOverflow,
                        this.#copyPass.uniforms,
                        false,
                    );
                }
            } else {
                this.#setOffset(e, glRect.x, glRect.y);
                this.#render(
                    finalPass.pass,
                    shouldUsePostEffect ? this.#postEffectTarget || null : null,
                    e.isFullScreen ? viewportGlRect : glRectWithOverflow,
                    finalPass.uniforms,
                    false,
                );
            }
        }

        // Apply post effects
        if (shouldUsePostEffect && this.#postEffectTarget) {
            this.#renderPostEffects(viewportGlRect, now);
        }
    }

    #playLoop = (): void => {
        if (this.isPlaying()) {
            this.render();
            this.#playRequest = requestAnimationFrame(this.#playLoop);
        }
    };

    /**
     * Effect-path render. Assembles the ChainFrameInput for one visible
     * element and dispatches to its EffectChain.
     *
     * Hit-test is already done by the caller; `hit.isVisible === true`
     * here.
     */
    #renderEffectElement(
        e: VFXElement,
        rect: Rect,
        hit: { rectWithOverflow: Rect; isVisible: boolean; intersection: number },
        now: number,
        viewportGlRect: GLRect,
    ): void {
        const chain = e.chain;
        if (!chain) {
            return;
        }

        const pr = this.#pixelRatio;

        // Video / GIF per-frame re-upload (mirror shader path).
        gifFor.get(e.element)?.update();
        if (e.type === "video" || e.isGif) {
            e.srcTexture.needsUpdate = true;
        }

        // Resolve per-frame uniforms: static baseline + generator results.
        const resolvedUniforms: Record<string, EffectUniformValue> = {
            ...(e.effectStaticUniforms ?? {}),
        };
        if (e.effectUniformGenerators) {
            for (const [k, gen] of Object.entries(
                e.effectUniformGenerators,
            )) {
                resolvedUniforms[k] = gen() as EffectUniformValue;
            }
        }

        const viewportWidth = this.#viewport.right - this.#viewport.left;
        const viewportHeight = this.#viewport.bottom - this.#viewport.top;

        const glRect = rectToGLRect(
            rect,
            viewportHeight,
            this.#paddingX,
            this.#paddingY,
        );
        const glRectWithOverflow = rectToGLRect(
            hit.rectWithOverflow,
            viewportHeight,
            this.#paddingX,
            this.#paddingY,
        );
        const finalCanvasRect = e.isFullScreen
            ? viewportGlRect
            : glRectWithOverflow;

        // Mouse coordinates (bottom-left origin, physical px).
        //   mouse: element-local
        //   mouseViewport: viewport-local
        // `#mouseX/Y` are viewport-local logical px; adding padding maps
        // into canvas-local coords, subtracting glRect.x/y maps into
        // element-local coords.
        const relMouseX = this.#mouseX + this.#paddingX - glRect.x;
        const relMouseY = this.#mouseY + this.#paddingY - glRect.y;

        const elementInnerLogicalW = rect.right - rect.left;
        const elementInnerLogicalH = rect.bottom - rect.top;
        const elementLogicalW =
            hit.rectWithOverflow.right - hit.rectWithOverflow.left;
        const elementLogicalH =
            hit.rectWithOverflow.bottom - hit.rectWithOverflow.top;

        const prevT = e.effectLastRenderTime ?? now;
        const deltaTime = now - prevT;
        e.effectLastRenderTime = now;

        const shouldUsePostEffect = this.#postEffectPasses.length > 0;
        const finalTarget =
            shouldUsePostEffect && this.#postEffectTarget
                ? this.#postEffectTarget
                : null;

        chain.run({
            time: now - e.startTime,
            deltaTime,
            mouse: [relMouseX * pr, relMouseY * pr],
            mouseViewport: [this.#mouseX * pr, this.#mouseY * pr],
            intersection: hit.intersection,
            enterTime: now - e.enterTime,
            leaveTime: now - e.leaveTime,
            resolvedUniforms,
            canvasPhysW: this.#canvas.width,
            canvasPhysH: this.#canvas.height,
            elementLogical: [elementLogicalW, elementLogicalH],
            elementPhys: [elementLogicalW * pr, elementLogicalH * pr],
            elementInnerLogical: [elementInnerLogicalW, elementInnerLogicalH],
            elementInnerPhys: [
                elementInnerLogicalW * pr,
                elementInnerLogicalH * pr,
            ],
            viewportLogical: [viewportWidth, viewportHeight],
            viewportPhys: [viewportWidth * pr, viewportHeight * pr],
            overflow: {
                top: e.overflow.top * pr,
                right: e.overflow.right * pr,
                bottom: e.overflow.bottom * pr,
                left: e.overflow.left * pr,
            },
            finalViewport: {
                x: finalCanvasRect.x * pr,
                y: finalCanvasRect.y * pr,
                w: finalCanvasRect.w * pr,
                h: finalCanvasRect.h * pr,
            },
            finalTarget,
            isVisible: hit.isVisible,
        });
    }

    /**
     * Check element intersection with the viewport.
     */
    #hitTest(
        e: VFXElement,
        rect: Rect,
        now: number,
    ): { rectWithOverflow: Rect; isVisible: boolean; intersection: number } {
        const rectWithOverflow = growRect(rect, e.overflow);

        const isInViewport =
            e.isFullScreen ||
            isRectInViewport(this.#viewportInner, rectWithOverflow);

        const viewportWithMargin = growRect(
            this.#viewportInner,
            e.intersection.rootMargin,
        );
        const intersection = getIntersection(viewportWithMargin, rect);
        const isInLogicalViewport =
            e.isFullScreen ||
            checkIntersection(
                viewportWithMargin,
                rect,
                intersection,
                e.intersection.threshold,
            );

        // Update transition timing
        if (!e.isInLogicalViewport && isInLogicalViewport /* out -> in */) {
            e.enterTime = now;
            e.leaveTime = Number.POSITIVE_INFINITY;
        }
        if (e.isInLogicalViewport && !isInLogicalViewport /* in -> out */) {
            e.leaveTime = now;
        }

        e.isInViewport = isInViewport;
        e.isInLogicalViewport = isInLogicalViewport;

        // Quit if the element has left and the transition has ended
        const isVisible = isInViewport && now - e.leaveTime <= e.release;

        if (isVisible && !e.chain && e.passes.length > 0) {
            const u = e.passes[0].uniforms;
            u["intersection"].value = intersection;
            u["enterTime"].value = now - e.enterTime;
            u["leaveTime"].value = now - e.leaveTime;
        }

        return { isVisible, intersection, rectWithOverflow };
    }

    #getShader(shaderNameOrCode: string): string {
        if (shaderNameOrCode in shaders) {
            return shaders[shaderNameOrCode as keyof typeof shaders];
        } else {
            return shaderNameOrCode;
        }
    }

    #render(
        pass: Pass,
        target: Framebuffer | null,
        rect: GLRect,
        uniforms: Uniforms,
        clearTarget: boolean,
    ) {
        const gl = this.#gl;

        // Clear intermediate targets, but never touch the post-effect target
        // here (it's cleared once per frame at the top of `render`).
        if (
            clearTarget &&
            target !== null &&
            target !== this.#postEffectTarget
        ) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            gl.viewport(0, 0, target.width, target.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        // Viewport uniform uses un-clipped rect for shader uv calculation.
        const vp = uniforms["viewport"];
        if (vp && vp.value instanceof Vec4) {
            vp.value.set(
                rect.x * this.#pixelRatio,
                rect.y * this.#pixelRatio,
                rect.w * this.#pixelRatio,
                rect.h * this.#pixelRatio,
            );
        }

        try {
            renderPass(
                gl,
                this.#quad,
                pass,
                target,
                rect,
                this.#canvasSize[0],
                this.#canvasSize[1],
                this.#pixelRatio,
            );
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Set uniforms["offset"] of the given element.
     * XY must be the values from the bottom-left of the render target.
     */
    #setOffset(e: VFXElement, x: number, y: number) {
        const offset = e.passes[0].uniforms["offset"].value as Vec2;
        offset.x = x * this.#pixelRatio;
        offset.y = y * this.#pixelRatio;
    }

    #initPostEffects(postEffects: (VFXPostEffect | VFXPass)[]) {
        // Collect shader source and target names for each pass
        const shaderSources: string[] = [];
        const targetNames: (string | undefined)[] = [];

        // First pass: assign auto target names for intermediate VFXPass items
        const passItems: VFXPass[] = [];
        for (const pe of postEffects) {
            if ("frag" in pe) {
                passItems.push(pe);
            }
        }
        for (let i = 0; i < passItems.length - 1; i++) {
            if (!passItems[i].target) {
                passItems[i] = { ...passItems[i], target: `pass${i}` };
            }
        }

        // Create PostEffectPass objects
        for (const pe of postEffects) {
            let frag: string;
            let pass: PostEffectPass;

            if ("frag" in pe) {
                frag = pe.frag;
                pass = new PostEffectPass(
                    this.#ctx,
                    frag,
                    pe.uniforms,
                    pe.persistent ?? false,
                    pe.float ?? false,
                    pe.size,
                    pe.target !== undefined,
                    pe.glslVersion,
                );
                targetNames.push(pe.target);
            } else {
                if (pe.shader === undefined) {
                    throw new Error(
                        "VFXPostEffect requires `shader` (the `effect` path is not implemented yet).",
                    );
                }
                frag = this.#getShader(pe.shader);
                pass = new PostEffectPass(
                    this.#ctx,
                    frag,
                    pe.uniforms,
                    pe.persistent ?? false,
                    pe.float ?? false,
                    undefined,
                    false,
                    pe.glslVersion,
                );
                if (pe.persistent) {
                    pass.registerBufferUniform("backbuffer");
                }
                targetNames.push(undefined);
            }

            this.#postEffectPasses.push(pass);
            shaderSources.push(frag);

            const generators: { [name: string]: () => VFXUniformValue } = {};
            if (pe.uniforms) {
                for (const [key, value] of Object.entries(pe.uniforms)) {
                    if (typeof value === "function") {
                        generators[key] = value;
                    }
                }
            }
            this.#postEffectUniformGeneratorsList.push(generators);
        }

        this.#postEffectPassTargets = targetNames;

        for (const p of passItems) {
            if (p.target) {
                this.#postEffectBufferTargets.set(p.target, undefined);
            }
        }

        // Auto-bind named buffer targets referenced in shaders
        const allTargetNames = targetNames.filter(
            (n): n is string => n !== undefined,
        );
        for (let i = 0; i < this.#postEffectPasses.length; i++) {
            for (const name of allTargetNames) {
                if (
                    shaderSources[i].match(
                        new RegExp(`uniform\\s+sampler2D\\s+${name}\\b`),
                    )
                ) {
                    this.#postEffectPasses[i].registerBufferUniform(name);
                }
            }
        }
    }

    #renderPostEffects(viewportGlRect: GLRect, now: number) {
        if (!this.#postEffectTarget) {
            return;
        }

        let inputTexture: Texture = this.#postEffectTarget.texture;

        const resolvedTargets = new Map<string, Texture>();

        // Pre-register persistent backbuffer textures so that earlier passes
        // can read from later passes' previous-frame output.
        for (let i = 0; i < this.#postEffectPasses.length; i++) {
            const pass = this.#postEffectPasses[i];
            const targetName = this.#postEffectPassTargets[i];
            if (targetName && pass.backbuffer) {
                resolvedTargets.set(targetName, pass.backbuffer.texture);
            }
        }

        for (let i = 0; i < this.#postEffectPasses.length; i++) {
            const pass = this.#postEffectPasses[i];
            const isLastPass = i === this.#postEffectPasses.length - 1;
            const generators = this.#postEffectUniformGeneratorsList[i];
            const targetName = this.#postEffectPassTargets[i];

            const mouseX = this.#mouseX + this.#paddingX;
            const mouseY = this.#mouseY + this.#paddingY;

            const targetDims = pass.getTargetDimensions();
            if (targetDims) {
                const [tw, th] = targetDims;
                pass.uniforms.src.value = inputTexture;
                (pass.uniforms.resolution.value as Vec2).set(tw, th);
                (pass.uniforms.offset.value as Vec2).set(0, 0);
                pass.uniforms.time.value = now - this.#initTime;
                (pass.uniforms.mouse.value as Vec2).set(
                    (mouseX / viewportGlRect.w) * tw,
                    (mouseY / viewportGlRect.h) * th,
                );
            } else {
                pass.setUniforms(
                    inputTexture,
                    this.#pixelRatio,
                    viewportGlRect,
                    now - this.#initTime,
                    mouseX,
                    mouseY,
                );
            }
            pass.uniforms.passIndex.value = i;
            pass.updateCustomUniforms(generators);

            // Update auto-bound buffer uniforms from previously resolved targets
            for (const [name, tex] of resolvedTargets) {
                const u: Uniform | undefined = pass.uniforms[name];
                if (u) {
                    u.value = tex;
                }
            }

            if (isLastPass) {
                if (pass.backbuffer) {
                    if (pass.uniforms.backbuffer) {
                        pass.uniforms.backbuffer.value =
                            pass.backbuffer.texture;
                    }

                    this.#render(
                        pass.pass,
                        pass.backbuffer.target,
                        viewportGlRect,
                        pass.uniforms,
                        true,
                    );
                    pass.backbuffer.swap();

                    this.#copyPass.setUniforms(
                        pass.backbuffer.texture,
                        this.#pixelRatio,
                        viewportGlRect,
                    );
                    this.#render(
                        this.#copyPass.pass,
                        null,
                        viewportGlRect,
                        this.#copyPass.uniforms,
                        false,
                    );
                } else {
                    this.#render(
                        pass.pass,
                        null,
                        viewportGlRect,
                        pass.uniforms,
                        false,
                    );
                }
            } else if (pass.backbuffer) {
                if (pass.uniforms.backbuffer) {
                    pass.uniforms.backbuffer.value = pass.backbuffer.texture;
                }

                const bbRect = targetDims
                    ? getGLRect(
                          0,
                          0,
                          targetDims[0] / this.#pixelRatio,
                          targetDims[1] / this.#pixelRatio,
                      )
                    : viewportGlRect;

                this.#render(
                    pass.pass,
                    pass.backbuffer.target,
                    bbRect,
                    pass.uniforms,
                    true,
                );
                pass.backbuffer.swap();

                inputTexture = pass.backbuffer.texture;

                if (targetName) {
                    resolvedTargets.set(targetName, pass.backbuffer.texture);
                }
            } else {
                const bufferName = targetName ?? `postEffect${i}`;
                let rt = this.#postEffectBufferTargets.get(bufferName);

                const rtW = targetDims
                    ? targetDims[0]
                    : viewportGlRect.w * this.#pixelRatio;
                const rtH = targetDims
                    ? targetDims[1]
                    : viewportGlRect.h * this.#pixelRatio;

                if (!rt || rt.width !== rtW || rt.height !== rtH) {
                    rt?.dispose();
                    rt = createRenderTarget(this.#ctx, rtW, rtH, {
                        float: pass.float,
                    });
                    this.#postEffectBufferTargets.set(bufferName, rt);
                }

                const renderRect = targetDims
                    ? getGLRect(
                          0,
                          0,
                          targetDims[0] / this.#pixelRatio,
                          targetDims[1] / this.#pixelRatio,
                      )
                    : viewportGlRect;

                this.#render(pass.pass, rt, renderRect, pass.uniforms, true);

                inputTexture = rt.texture;

                if (targetName) {
                    resolvedTargets.set(targetName, rt.texture);
                }
            }
        }
    }

    #setupPostEffectTarget(width: number, height: number) {
        const targetWidth = width * this.#pixelRatio;
        const targetHeight = height * this.#pixelRatio;

        if (
            !this.#postEffectTarget ||
            this.#postEffectTarget.width !== targetWidth ||
            this.#postEffectTarget.height !== targetHeight
        ) {
            this.#postEffectTarget?.dispose();
            this.#postEffectTarget = createRenderTarget(
                this.#ctx,
                targetWidth,
                targetHeight,
            );
        }

        // Initialize/resize post effect backbuffers
        for (const pass of this.#postEffectPasses) {
            if (pass.persistent && !pass.backbuffer) {
                pass.initializeBackbuffer(
                    this.#ctx,
                    width,
                    height,
                    this.#pixelRatio,
                );
            } else if (pass.backbuffer) {
                pass.resizeBackbuffer(width, height);
            }
        }
    }
}

/**
 * Returns if the given rects intersect.
 * It returns true when the rects are adjacent (= intersection ratio is 0).
 */
export function isRectInViewport(viewport: Rect, rect: Rect): boolean {
    return (
        rect.left <= viewport.right &&
        rect.right >= viewport.left &&
        rect.top <= viewport.bottom &&
        rect.bottom >= viewport.top
    );
}

export function checkIntersection(
    viewport: Rect,
    rect: Rect,
    intersection: number,
    threshold: number,
): boolean {
    if (threshold === 0) {
        // if threshold === 0, consider adjacent rects to be intersecting.
        return isRectInViewport(viewport, rect);
    } else {
        return intersection >= threshold;
    }
}

export function parseOverflowOpts(
    overflow: VFXProps["overflow"],
): [isFullScreen: boolean, Margin] {
    if (overflow === true) {
        return [true, MARGIN_ZERO];
    }
    if (overflow === undefined) {
        return [false, MARGIN_ZERO];
    }
    return [false, createMargin(overflow)];
}

export function parseIntersectionOpts(
    intersectionOpts: VFXProps["intersection"],
): VFXElementIntersection {
    const threshold = intersectionOpts?.threshold ?? 0;
    const rootMargin = createMargin(intersectionOpts?.rootMargin ?? 0);
    return {
        threshold,
        rootMargin,
    };
}

/**
 * Inspect a Texture's source and return its native width/height.
 * Used by `ctx.src` for effect-path elements. Returns 0 if the source
 * is not yet ready (e.g. HTMLImageElement pre-load).
 */
function readTextureSourceDim(tex: Texture, axis: "w" | "h"): number {
    const src = tex.source;
    if (!src) {
        return 0;
    }
    if (
        typeof HTMLImageElement !== "undefined" &&
        src instanceof HTMLImageElement
    ) {
        return axis === "w" ? src.naturalWidth : src.naturalHeight;
    }
    if (
        typeof HTMLVideoElement !== "undefined" &&
        src instanceof HTMLVideoElement
    ) {
        return axis === "w" ? src.videoWidth : src.videoHeight;
    }
    const wc = src as { width: number; height: number };
    return axis === "w" ? wc.width : wc.height;
}

function parseWrapSingle(wrapOpt: VFXWrap): TextureWrap {
    if (wrapOpt === "repeat") {
        return "repeat";
    }
    if (wrapOpt === "mirror") {
        return "mirror";
    }
    return "clamp";
}

function parseWrap(
    wrapOpt: VFXWrap | [VFXWrap, VFXWrap] | undefined,
): [TextureWrap, TextureWrap] {
    if (!wrapOpt) {
        return ["clamp", "clamp"];
    }

    if (Array.isArray(wrapOpt)) {
        return [parseWrapSingle(wrapOpt[0]), parseWrapSingle(wrapOpt[1])];
    }
    const w = parseWrapSingle(wrapOpt);
    return [w, w];
}

function clamp(x: number, xmin: number, xmax: number): number {
    return Math.max(xmin, Math.min(xmax, x));
}
