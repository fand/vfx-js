import * as THREE from "three";
import { Backbuffer } from "./backbuffer.js";
import {
    DEFAULT_VERTEX_SHADER,
    DEFAULT_VERTEX_SHADER_100,
    shaders,
} from "./constants.js";
import { CopyPass } from "./copy-pass.js";
import dom2canvas from "./dom-to-canvas.js";
import { captureElement } from "./html-in-canvas.js";
import GIFData from "./gif.js";
import { type GLRect, getGLRect, rectToGLRect } from "./gl-rect.js";
import { PostEffectPass } from "./post-effect-pass.js";
import {
    MARGIN_ZERO,
    type Margin,
    type Rect,
    createMargin,
    createRect,
    getIntersection,
    growRect,
    toRect,
} from "./rect.js";
import { createPassMaterial, createRenderTarget } from "./render-target.js";
import type {
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
} from "./types";

const gifFor = new Map<HTMLElement, GIFData>();

/**
 * @internal
 */
export class VFXPlayer {
    #opts: VFXOptsInner;

    #canvas: HTMLCanvasElement;
    #renderer: THREE.WebGLRenderer;
    #camera: THREE.Camera;
    #copyPass: CopyPass;
    #postEffectPasses: PostEffectPass[] = [];
    #postEffectPassTargets: (string | undefined)[] = [];
    #postEffectTarget: THREE.WebGLRenderTarget | undefined;
    #postEffectUniformGeneratorsList: {
        [name: string]: () => VFXUniformValue;
    }[] = [];
    #postEffectBufferTargets: Map<string, THREE.WebGLRenderTarget | undefined> =
        new Map();

    #playRequest: number | undefined = undefined;
    #pixelRatio = 2;
    #elements: VFXElement[] = [];
    #initTime = Date.now() / 1000.0;

    #textureLoader = new THREE.TextureLoader();

    #viewport: Rect = createRect(0);

    /** Actual viewport without padding */
    #viewportInner: Rect = createRect(0);

    #canvasSize = [0, 0];
    #paddingX = 0;
    #paddingY = 0;

    #mouseX = 0;
    #mouseY = 0;

    /** Float RT data type: FP32 if OES_texture_float_linear, else FP16. */
    #floatRTType!: THREE.TextureDataType;

    #isRenderingToCanvas = new WeakMap<HTMLElement, boolean>();

    constructor(opts: VFXOptsInner, canvas: HTMLCanvasElement) {
        this.#opts = opts;

        this.#canvas = canvas;
        this.#renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
        });
        this.#renderer.autoClear = false;
        this.#renderer.setClearAlpha(0);
        const gl = this.#renderer.getContext() as WebGL2RenderingContext;
        gl.getExtension("EXT_color_buffer_float");
        gl.getExtension("EXT_color_buffer_half_float");
        this.#floatRTType = gl.getExtension("OES_texture_float_linear")
            ? THREE.FloatType
            : THREE.HalfFloatType;
        this.#pixelRatio = opts.pixelRatio;

        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.#resize);
            window.addEventListener("pointermove", this.#pointermove);
        }
        this.#resize();

        this.#camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.#camera.position.set(0, 0, 1);

        // Setup copyScene
        this.#copyPass = new CopyPass();

        // Setup post effect passes
        this.#initPostEffects(opts.postEffects);
    }

    destroy(): void {
        this.stop();
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.#resize);
            window.removeEventListener("pointermove", this.#pointermove);
        }

        // Clean up post effect resources
        if (this.#postEffectTarget) {
            this.#postEffectTarget.dispose();
        }
        for (const rt of this.#postEffectBufferTargets.values()) {
            rt?.dispose();
        }
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
            this.#canvas.width = widthWithPadding;
            this.#canvas.height = heightWithPadding;
            this.#renderer.setSize(widthWithPadding, heightWithPadding);
            this.#renderer.setPixelRatio(this.#pixelRatio);
            this.#viewport = createRect({
                top: -paddingY,
                left: -paddingX,
                right: widthWithPadding,
                bottom: heightWithPadding,
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

            // Re-capture hic elements on resize.
            // Pixel buffer update happens inside captureElement (no race with ResizeObserver).
            for (const e of this.#elements) {
                if (e.type === "hic") {
                    await this.updateHICElement(
                        e.element as HTMLCanvasElement,
                    );
                    const rect = e.element.getBoundingClientRect();
                    e.width = rect.width;
                    e.height = rect.height;
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
            const srcUniform = e.passes[0].uniforms["src"];
            const oldTexture: THREE.CanvasTexture = srcUniform.value;
            const oldCanvas = oldTexture.image;

            const canvas = await dom2canvas(
                e.element,
                e.originalOpacity,
                oldCanvas,
                this.#renderer.capabilities.maxTextureSize,
            );
            if (canvas.width === 0 || canvas.width === 0) {
                throw "omg";
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            srcUniform.value = texture;
            e.srcTexture = texture;
            oldTexture.dispose();
        } catch (e) {
            console.error(e);
        }

        this.#isRenderingToCanvas.set(e.element, false);
    }

    async addElement(element: HTMLElement, opts: VFXProps = {}): Promise<void> {
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
        let texture: THREE.Texture;
        let type: VFXElementType;
        let isGif = false;
        if (element instanceof HTMLImageElement) {
            type = "img" as VFXElementType;
            isGif = !!element.src.match(/\.gif/i);

            if (isGif) {
                const gif = await GIFData.create(element.src, this.#pixelRatio);
                gifFor.set(element, gif);
                texture = new THREE.Texture(gif.getCanvas());
            } else {
                texture = await this.#textureLoader.loadAsync(element.src);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = new THREE.VideoTexture(element);
            type = "video" as VFXElementType;
        } else if (element instanceof HTMLCanvasElement) {
            if (element.hasAttribute("layoutsubtree")) {
                // html-in-canvas: capture first child via drawElementImage
                const target = element.firstElementChild;
                if (!target) {
                    throw new Error(
                        "layoutsubtree canvas must have a child element",
                    );
                }
                const offscreen = await captureElement(
                    element,
                    target,
                    undefined,
                    this.#renderer.capabilities.maxTextureSize,
                );
                texture = new THREE.CanvasTexture(offscreen);
                type = "hic" as VFXElementType;
            } else {
                texture = new THREE.CanvasTexture(element);
                type = "canvas" as VFXElementType;
            }
        } else {
            const canvas = await dom2canvas(
                element,
                originalOpacity,
                undefined,
                this.#renderer.capabilities.maxTextureSize,
            );
            texture = new THREE.CanvasTexture(canvas);
            type = "text" as VFXElementType;
        }

        const [wrapS, wrapT] = parseWrap(opts.wrap);
        texture.wrapS = wrapS;
        texture.wrapT = wrapT;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.needsUpdate = true;

        const autoCrop = opts.autoCrop ?? true;

        // Hide original element
        if (opts.overlay === true) {
            /* Overlay mode. Do not hide the element */
        } else if (typeof opts.overlay === "number") {
            element.style.setProperty("opacity", opts.overlay.toString());
        } else {
            const opacity = type === "video" ? "0.0001" : "0"; // don't hide video element completely to prevent jank frames
            element.style.setProperty("opacity", opacity.toString());
        }

        // Create shared uniforms
        const sharedUniforms: { [name: string]: THREE.IUniform } = {
            src: { value: texture },
            resolution: { value: new THREE.Vector2() },
            offset: { value: new THREE.Vector2() },
            time: { value: 0.0 },
            enterTime: { value: -1.0 },
            leaveTime: { value: -1.0 },
            mouse: { value: new THREE.Vector2() },
            intersection: { value: 0.0 },
            viewport: { value: new THREE.Vector4() },
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
        let backbuffer: VFXElement["backbuffer"] = undefined;
        if (opts.backbuffer) {
            backbuffer = (() => {
                const bw =
                    (rectWithOverflow.right - rectWithOverflow.left) *
                    this.#pixelRatio;
                const bh =
                    (rectWithOverflow.bottom - rectWithOverflow.top) *
                    this.#pixelRatio;
                return new Backbuffer(
                    bw,
                    bh,
                    this.#pixelRatio,
                    false,
                    this.#floatRTType,
                );
            })();
            sharedUniforms["backbuffer"] = { value: backbuffer.texture };
        }

        // Create buffer targets for intermediate passes
        const bufferTargets = new Map<string, THREE.WebGLRenderTarget>();
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
                        logicalW,
                        logicalH,
                        pixelRatio,
                        inputPasses[i].float,
                        this.#floatRTType,
                    ),
                );
            } else {
                bufferTargets.set(
                    targetName,
                    createRenderTarget(this.#floatRTType, bw, bh, {
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
            const glslVersion = this.#getGLSLVersion(opts.glslVersion, frag);
            const vertexShader = p.vert
                ? p.vert
                : glslVersion === "100"
                  ? DEFAULT_VERTEX_SHADER_100
                  : DEFAULT_VERTEX_SHADER;

            // Create per-pass uniforms
            const passUniforms: { [name: string]: THREE.IUniform } = {
                ...sharedUniforms,
            };
            const passUniformGenerators: {
                [name: string]: () => VFXUniformValue;
            } = {};

            // Auto-bind buffer targets referenced in the shader
            // Skip binding the pass's own render target to avoid feedback loops
            // (persistent passes can read their own buffer via backbuffer double-buffering)
            for (const [name, rt] of bufferTargets) {
                if (name === p.target) continue;
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

            const scene = new THREE.Scene();
            const geometry = new THREE.PlaneGeometry(2, 2);
            const material = createPassMaterial({
                vertexShader,
                fragmentShader: frag,
                uniforms: passUniforms,
                glslVersion,
                renderingToBuffer: p.target !== undefined,
            });
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            passes.push({
                scene,
                mesh,
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

    /**
     * Normalize shader input to a VFXPass array.
     */
    #normalizePasses(opts: VFXProps): VFXPass[] {
        if (Array.isArray(opts.shader)) {
            return opts.shader;
        }
        const shaderCode = this.#getShader(opts.shader || "uvGradient");
        return [{ frag: shaderCode }];
    }

    removeElement(element: HTMLElement): void {
        const i = this.#elements.findIndex((e) => e.element === element);
        if (i !== -1) {
            const e = this.#elements.splice(i, 1)[0] as VFXElement;

            // Dispose buffer targets
            for (const rt of e.bufferTargets.values()) {
                rt.dispose();
            }

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
            const srcUniform = e.passes[0].uniforms["src"];
            const oldTexture = srcUniform.value;
            const texture = new THREE.CanvasTexture(element);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            srcUniform.value = texture;
            e.srcTexture = texture;
            oldTexture.dispose();
        }
    }

    async updateHICElement(canvas: HTMLCanvasElement): Promise<void> {
        const e = this.#elements.find((e) => e.element === canvas);
        if (!e || e.type !== "hic") return;

        const target = canvas.firstElementChild;
        if (!target) return;

        const srcUniform = e.passes[0].uniforms["src"];
        const oldTexture: THREE.CanvasTexture = srcUniform.value;
        const oldOffscreen: OffscreenCanvas = oldTexture.image;

        const offscreen = await captureElement(
            canvas,
            target,
            oldOffscreen,
            this.#renderer.capabilities.maxTextureSize,
        );

        if (offscreen !== oldOffscreen) {
            const texture = new THREE.CanvasTexture(offscreen);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            srcUniform.value = texture;
            e.srcTexture = texture;
            oldTexture.dispose();
        } else {
            oldTexture.needsUpdate = true;
        }
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

        this.#renderer.clear();

        // This must done every frame because iOS Safari doesn't fire
        // window resize event while the address bar is transforming.
        this.#updateCanvasSize();

        const viewportWidth = this.#viewport.right - this.#viewport.left;
        const viewportHeight = this.#viewport.bottom - this.#viewport.top;
        const viewportGlRect = getGLRect(0, 0, viewportWidth, viewportHeight);

        // Setup post effect render target if needed
        const shouldUsePostEffect = this.#postEffectPasses.length > 0;
        if (shouldUsePostEffect) {
            this.#setupPostEffectTarget(viewportWidth, viewportHeight);
            if (this.#postEffectTarget) {
                this.#renderer.setRenderTarget(this.#postEffectTarget);
                this.#renderer.clear();
                this.#renderer.setRenderTarget(null);
            }
        }

        for (const e of this.#elements) {
            const domRect = e.element.getBoundingClientRect();
            const rect = toRect(domRect);
            const hit = this.#hitTest(e, rect, now);

            if (!hit.isVisible) {
                continue;
            }

            // Update uniforms
            const u = e.passes[0].uniforms;
            u["time"].value = now - e.startTime;
            u["resolution"].value.x = domRect.width * this.#pixelRatio;
            u["resolution"].value.y = domRect.height * this.#pixelRatio;
            u["mouse"].value.x = this.#mouseX * this.#pixelRatio;
            u["mouse"].value.y = this.#mouseY * this.#pixelRatio;

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
                u["src"].value.needsUpdate = true;
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
                    if (pass.size) continue; // fixed size, no resize
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
            const resolvedTargets = new Map<string, THREE.Texture>();

            // Pre-register persistent backbuffer textures
            for (const pass of e.passes) {
                if (pass.backbuffer && pass.target) {
                    resolvedTargets.set(pass.target, pass.backbuffer.texture);
                }
            }

            // Render intermediate passes, chaining src between passes
            // Use local inputTexture (like post-effects) to avoid corrupting
            // the shared src uniform across frames.
            let inputTexture: THREE.Texture = e.srcTexture;
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

                pass.uniforms["resolution"].value.set(bufferW, bufferH);
                pass.uniforms["offset"].value.set(0, 0);
                pass.uniforms["mouse"].value.set(
                    (relMouseX / defaultRect.w) * bufferW,
                    (relMouseY / defaultRect.h) * bufferH,
                );

                if (pass.backbuffer) {
                    // Persistent pass: render to backbuffer, then swap
                    this.#render(
                        pass.scene,
                        pass.backbuffer.target,
                        bufferRect,
                        pass.uniforms,
                    );
                    pass.backbuffer.swap();
                    inputTexture = pass.backbuffer.texture;
                } else {
                    // Non-persistent pass: render to buffer target
                    const rt = e.bufferTargets.get(pass.target as string);
                    if (!rt) continue;

                    this.#renderer.setRenderTarget(rt);
                    this.#renderer.clear();
                    this.#render(pass.scene, rt, bufferRect, pass.uniforms);
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
            finalPass.uniforms["resolution"].value.set(
                domRect.width * this.#pixelRatio,
                domRect.height * this.#pixelRatio,
            );
            finalPass.uniforms["offset"].value.set(
                glRect.x * this.#pixelRatio,
                glRect.y * this.#pixelRatio,
            );
            finalPass.uniforms["mouse"].value.set(
                this.#mouseX * this.#pixelRatio,
                this.#mouseY * this.#pixelRatio,
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
                        finalPass.scene,
                        e.backbuffer.target,
                        viewportGlRect,
                        finalPass.uniforms,
                    );
                    e.backbuffer.swap();

                    this.#copyPass.setUniforms(
                        e.backbuffer.texture,
                        this.#pixelRatio,
                        viewportGlRect,
                    );
                    this.#render(
                        this.#copyPass.scene,
                        shouldUsePostEffect
                            ? this.#postEffectTarget || null
                            : null,
                        viewportGlRect,
                        this.#copyPass.uniforms,
                    );
                } else {
                    e.backbuffer.resize(
                        glRectWithOverflow.w,
                        glRectWithOverflow.h,
                    );

                    this.#setOffset(e, e.overflow.left, e.overflow.bottom);
                    this.#render(
                        finalPass.scene,
                        e.backbuffer.target,
                        e.backbuffer.getViewport(),
                        finalPass.uniforms,
                    );
                    e.backbuffer.swap();

                    this.#copyPass.setUniforms(
                        e.backbuffer.texture,
                        this.#pixelRatio,
                        glRectWithOverflow,
                    );
                    this.#render(
                        this.#copyPass.scene,
                        shouldUsePostEffect
                            ? this.#postEffectTarget || null
                            : null,
                        glRectWithOverflow,
                        this.#copyPass.uniforms,
                    );
                }
            } else {
                this.#setOffset(e, glRect.x, glRect.y);
                this.#render(
                    finalPass.scene,
                    shouldUsePostEffect ? this.#postEffectTarget || null : null,
                    e.isFullScreen ? viewportGlRect : glRectWithOverflow,
                    finalPass.uniforms,
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

        if (isVisible) {
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
            return shaderNameOrCode; // Assume that the given string is a valid shader code
        }
    }

    #getGLSLVersion(
        opt: "100" | "300 es" | undefined,
        shader: string,
    ): "100" | "300 es" {
        if (opt) {
            return opt;
        }
        if (shader.includes("out vec4")) {
            return "300 es";
        }
        if (shader.includes("gl_FragColor")) {
            return "100";
        }

        throw `VFX-JS error: Cannot detect GLSL version of the shader.\n\nOriginal shader:\n${shader}`;
    }

    #render(
        scene: THREE.Scene,
        target: THREE.WebGLRenderTarget | null,
        rect: GLRect,
        uniforms: { [key: string]: THREE.IUniform },
    ) {
        this.#renderer.setRenderTarget(target);
        // Only clear if target is not the post effect target (which is cleared once at the beginning)
        if (target !== null && target !== this.#postEffectTarget) {
            this.#renderer.clear();
        }

        // Clip viewport to render target bounds to avoid precision issues
        // on mobile GPUs (Adreno, some Mali) with large offscreen rects.
        const targetCssW = target
            ? target.width / this.#pixelRatio
            : this.#canvasSize[0];
        const targetCssH = target
            ? target.height / this.#pixelRatio
            : this.#canvasSize[1];
        const cx1 = Math.max(0, rect.x);
        const cy1 = Math.max(0, rect.y);
        const cx2 = Math.min(targetCssW, rect.x + rect.w);
        const cy2 = Math.min(targetCssH, rect.y + rect.h);
        const cw = cx2 - cx1;
        const ch = cy2 - cy1;
        if (cw <= 0 || ch <= 0) return; // nothing visible
        this.#renderer.setViewport(cx1, cy1, cw, ch);

        // Viewport uniform uses un-clipped rect for shader uv calculation.
        if (uniforms["viewport"]) {
            uniforms["viewport"].value.set(
                rect.x * this.#pixelRatio,
                rect.y * this.#pixelRatio,
                rect.w * this.#pixelRatio,
                rect.h * this.#pixelRatio,
            );
        }

        try {
            this.#renderer.render(scene, this.#camera);
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Set uniforms["offset"] of the given element.
     * XY must be the values from the bottom-left of the render target.
     */
    #setOffset(e: VFXElement, x: number, y: number) {
        e.passes[0].uniforms["offset"].value.x = x * this.#pixelRatio;
        e.passes[0].uniforms["offset"].value.y = y * this.#pixelRatio;
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
                    frag,
                    pe.uniforms,
                    pe.persistent ?? false,
                    pe.float ?? false,
                    pe.size,
                    pe.target !== undefined,
                );
                targetNames.push(pe.target);
            } else {
                frag = this.#getShader(pe.shader);
                pass = new PostEffectPass(
                    frag,
                    pe.uniforms,
                    pe.persistent ?? false,
                    pe.float ?? false,
                );
                // For legacy VFXPostEffect, register "backbuffer" uniform
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

        // Register buffer target names (created lazily in #renderPostEffects)
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
        if (!this.#postEffectTarget) return;

        let inputTexture = this.#postEffectTarget.texture;

        // Track resolved target textures for auto-binding
        const resolvedTargets = new Map<string, THREE.Texture>();

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

            // #mouseX/Y are in viewport-Y-up coords, but the canvas extends
            // paddingX/Y outside the viewport. Add padding to convert to the
            // canvas-Y-up space that matches gl_FragCoord in render targets.
            const mouseX = this.#mouseX + this.#paddingX;
            const mouseY = this.#mouseY + this.#paddingY;

            // For passes with custom size, set uniforms in target space
            const targetDims = pass.getTargetDimensions();
            if (targetDims) {
                const [tw, th] = targetDims;
                pass.uniforms.src.value = inputTexture;
                pass.uniforms.resolution.value.set(tw, th);
                pass.uniforms.offset.value.set(0, 0);
                pass.uniforms.time.value = now - this.#initTime;
                pass.uniforms.mouse.value.set(
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
                if (pass.uniforms[name]) {
                    pass.uniforms[name].value = tex;
                }
            }

            if (isLastPass) {
                // Render to canvas
                if (pass.backbuffer) {
                    // Legacy VFXPostEffect: set backbuffer uniform directly
                    if (pass.uniforms.backbuffer) {
                        pass.uniforms.backbuffer.value =
                            pass.backbuffer.texture;
                    }

                    this.#render(
                        pass.scene,
                        pass.backbuffer.target,
                        viewportGlRect,
                        pass.uniforms,
                    );
                    pass.backbuffer.swap();

                    this.#copyPass.setUniforms(
                        pass.backbuffer.texture,
                        this.#pixelRatio,
                        viewportGlRect,
                    );
                    this.#render(
                        this.#copyPass.scene,
                        null,
                        viewportGlRect,
                        this.#copyPass.uniforms,
                    );
                } else {
                    this.#render(
                        pass.scene,
                        null,
                        viewportGlRect,
                        pass.uniforms,
                    );
                }
            } else if (pass.backbuffer) {
                // Render intermediate pass with persistent backbuffer
                // Legacy VFXPostEffect: set backbuffer uniform directly
                if (pass.uniforms.backbuffer) {
                    pass.uniforms.backbuffer.value = pass.backbuffer.texture;
                }

                // Use custom size viewport if set
                const bbRect = targetDims
                    ? getGLRect(
                          0,
                          0,
                          targetDims[0] / this.#pixelRatio,
                          targetDims[1] / this.#pixelRatio,
                      )
                    : viewportGlRect;

                this.#render(
                    pass.scene,
                    pass.backbuffer.target,
                    bbRect,
                    pass.uniforms,
                );
                pass.backbuffer.swap();

                inputTexture = pass.backbuffer.texture;

                // Register output for named buffer auto-binding
                if (targetName) {
                    resolvedTargets.set(targetName, pass.backbuffer.texture);
                }
            } else {
                // Render to intermediate buffer
                const bufferName = targetName ?? `postEffect${i}`;
                let rt = this.#postEffectBufferTargets.get(bufferName);

                // Use custom size or viewport size
                const rtW = targetDims
                    ? targetDims[0]
                    : viewportGlRect.w * this.#pixelRatio;
                const rtH = targetDims
                    ? targetDims[1]
                    : viewportGlRect.h * this.#pixelRatio;

                if (!rt || rt.width !== rtW || rt.height !== rtH) {
                    rt?.dispose();
                    rt = createRenderTarget(this.#floatRTType, rtW, rtH, {
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

                this.#renderer.setRenderTarget(rt);
                this.#renderer.clear();
                this.#render(pass.scene, rt, renderRect, pass.uniforms);

                inputTexture = rt.texture;

                // Register output for named buffer auto-binding
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
            if (this.#postEffectTarget) {
                this.#postEffectTarget.dispose();
            }

            this.#postEffectTarget = createRenderTarget(
                this.#floatRTType,
                targetWidth,
                targetHeight,
            );
        }

        // Initialize/resize post effect backbuffers
        for (const pass of this.#postEffectPasses) {
            if (pass.persistent && !pass.backbuffer) {
                pass.initializeBackbuffer(
                    width,
                    height,
                    this.#pixelRatio,
                    this.#floatRTType,
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

function parseWrapSingle(wrapOpt: VFXWrap): THREE.Wrapping {
    if (wrapOpt === "repeat") {
        return THREE.RepeatWrapping;
    } else if (wrapOpt === "mirror") {
        return THREE.MirroredRepeatWrapping;
    } else {
        return THREE.ClampToEdgeWrapping;
    }
}

function parseWrap(
    wrapOpt: VFXWrap | [VFXWrap, VFXWrap] | undefined,
): [THREE.Wrapping, THREE.Wrapping] {
    if (!wrapOpt) {
        return [THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping];
    }

    if (Array.isArray(wrapOpt)) {
        return [parseWrapSingle(wrapOpt[0]), parseWrapSingle(wrapOpt[1])];
    } else {
        const w = parseWrapSingle(wrapOpt);
        return [w, w];
    }
}

function clamp(x: number, xmin: number, xmax: number): number {
    return Math.max(xmin, Math.min(xmax, x));
}
