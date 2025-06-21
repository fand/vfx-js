import * as THREE from "three";
import { Backbuffer } from "./backbuffer.js";
import {
    DEFAULT_VERTEX_SHADER,
    DEFAULT_VERTEX_SHADER_100,
    shaders,
} from "./constants.js";
import { CopyPass } from "./copy-pass.js";
import dom2canvas from "./dom-to-canvas.js";
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
import type {
    VFXElement,
    VFXElementIntersection,
    VFXElementType,
    VFXOptsInner,
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
    #postEffectPass: PostEffectPass | undefined;
    #postEffectTarget: THREE.WebGLRenderTarget | undefined;
    #postEffectUniformGenerators: { [name: string]: () => VFXUniformValue } =
        {};

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
        this.#pixelRatio = opts.pixelRatio;

        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.#resize);
            window.addEventListener("mousemove", this.#mousemove);
        }
        this.#resize();

        this.#camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.#camera.position.set(0, 0, 1);

        // Setup copyScene
        this.#copyPass = new CopyPass();

        // Setup post effect pass if specified
        if (opts.postEffect) {
            const postEffectShader = this.#getShader(opts.postEffect.shader);
            this.#postEffectPass = new PostEffectPass(
                postEffectShader,
                opts.postEffect.uniforms,
                opts.postEffect.backbuffer,
            );

            // Store uniform generators for custom uniforms
            if (opts.postEffect.uniforms) {
                for (const [key, value] of Object.entries(
                    opts.postEffect.uniforms,
                )) {
                    if (typeof value === "function") {
                        this.#postEffectUniformGenerators[key] = value;
                    }
                }
            }
        }
    }

    destroy(): void {
        this.stop();
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.#resize);
            window.removeEventListener("mousemove", this.#mousemove);
        }

        // Clean up post effect resources
        if (this.#postEffectTarget) {
            this.#postEffectTarget.dispose();
        }
    }

    #scrollBarSize: number | undefined;

    #getScrollBarSize(): number {
        if (this.#scrollBarSize === undefined) {
            const div = document.createElement("div");
            div.style.visibility = "hidden";
            div.style.overflow = "scroll"; // Force scrollbar
            div.style.position = "absolute";

            document.body.appendChild(div);
            const scrollbarSize = div.offsetWidth - div.clientWidth;
            document.body.removeChild(div);

            this.#scrollBarSize = scrollbarSize;
        }
        return this.#scrollBarSize;
    }

    #updateCanvasSize(): void {
        if (typeof window === "undefined") {
            return;
        }

        // Get the window size without scroll bar
        const wrapper = this.#canvas.parentElement as HTMLElement;
        const wrapperParent = wrapper.parentElement as HTMLElement;

        const ownerWindow = wrapper.ownerDocument.defaultView?.window ?? window;
        const scrollBarWidth =
            wrapperParent.scrollHeight > wrapperParent.clientHeight
                ? this.#getScrollBarSize()
                : 0;
        const scrollBarHeight =
            wrapperParent.scrollWidth > wrapperParent.clientWidth
                ? this.#getScrollBarSize()
                : 0;
        const width = ownerWindow.innerWidth - scrollBarWidth;
        const height = ownerWindow.innerHeight - scrollBarHeight;

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let paddingX: number;
        let paddingY: number;
        if (this.#opts.fixedCanvas) {
            paddingY = 0;
            paddingX = 0;
        } else {
            // Clamp padding so that the canvas doesn't cause overflow
            const maxPaddingX = wrapper.scrollWidth - (scrollX + width);
            const maxPaddingY = wrapper.scrollHeight - (scrollY + height);

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
        }
    };

    #mousemove = (e: MouseEvent): void => {
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
            const oldTexture: THREE.CanvasTexture = e.uniforms["src"].value;
            const oldCanvas = oldTexture.image;

            const canvas = await dom2canvas(
                e.element,
                e.originalOpacity,
                oldCanvas,
            );
            if (canvas.width === 0 || canvas.width === 0) {
                throw "omg";
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            e.uniforms["src"].value = texture;
            oldTexture.dispose();
        } catch (e) {
            console.error(e);
        }

        this.#isRenderingToCanvas.set(e.element, false);
    }

    async addElement(element: HTMLElement, opts: VFXProps = {}): Promise<void> {
        const shader = this.#getShader(opts.shader || "uvGradient");
        const glslVersion = this.#getGLSLVersion(opts.glslVersion, shader);

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
            texture = new THREE.CanvasTexture(element);
            type = "canvas" as VFXElementType;
        } else {
            const canvas = await dom2canvas(element, originalOpacity);
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

        const uniforms: { [name: string]: THREE.IUniform } = {
            src: { value: texture },
            resolution: {
                value: new THREE.Vector2(),
            },
            offset: { value: new THREE.Vector2() },
            time: { value: 0.0 },
            enterTime: { value: -1.0 },
            leaveTime: { value: -1.0 },
            mouse: { value: new THREE.Vector2() },
            intersection: { value: 0.0 },
            viewport: { value: new THREE.Vector4() },
            autoCrop: { value: autoCrop },
        };

        const uniformGenerators: {
            [name: string]: () => VFXUniformValue;
        } = {};

        if (opts.uniforms !== undefined) {
            const keys = Object.keys(opts.uniforms);
            for (const key of keys) {
                const value = opts.uniforms[key];
                if (typeof value === "function") {
                    uniforms[key] = {
                        value: value(),
                    };
                    uniformGenerators[key] = value;
                } else {
                    uniforms[key] = { value };
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
                return new Backbuffer(bw, bh, this.#pixelRatio);
            })();
            uniforms["backbuffer"] = { value: backbuffer.texture };
        }

        const scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);
        const vertexShader =
            glslVersion === "100"
                ? DEFAULT_VERTEX_SHADER_100
                : DEFAULT_VERTEX_SHADER;
        const material = new THREE.RawShaderMaterial({
            vertexShader,
            fragmentShader: shader,
            transparent: true,
            uniforms,
            glslVersion,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const now = Date.now() / 1000;
        const elem = {
            type,
            element,
            isInViewport: false,
            isInLogicalViewport: false,
            width: domRect.width,
            height: domRect.height,
            scene,
            mesh,
            uniforms,
            uniformGenerators,
            startTime: now,
            enterTime: now,
            leaveTime: Number.NEGATIVE_INFINITY,
            release: opts.release ?? Number.POSITIVE_INFINITY,
            isGif,
            isFullScreen,
            overflow,
            intersection: intersectionOpts,
            originalOpacity,
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

    removeElement(element: HTMLElement): void {
        const i = this.#elements.findIndex((e) => e.element === element);
        if (i !== -1) {
            const e = this.#elements.splice(i, 1)[0] as VFXElement;

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
            const oldTexture = e.uniforms["src"].value;
            const texture = new THREE.CanvasTexture(element);
            texture.wrapS = oldTexture.wrapS;
            texture.wrapT = oldTexture.wrapT;
            e.uniforms["src"].value = texture;
            oldTexture.dispose();
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
        const shouldUsePostEffect = this.#postEffectPass !== undefined;
        if (shouldUsePostEffect) {
            this.#setupPostEffectTarget(viewportWidth, viewportHeight);
            // Clear the post effect target once at the beginning
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
            e.uniforms["time"].value = now - e.startTime;
            e.uniforms["resolution"].value.x = domRect.width * this.#pixelRatio;
            e.uniforms["resolution"].value.y =
                domRect.height * this.#pixelRatio;
            e.uniforms["mouse"].value.x = this.#mouseX * this.#pixelRatio;
            e.uniforms["mouse"].value.y = this.#mouseY * this.#pixelRatio;

            for (const [key, gen] of Object.entries(e.uniformGenerators)) {
                e.uniforms[key].value = gen();
            }

            // Update GIF / video
            gifFor.get(e.element)?.update();
            if (e.type === "video" || e.isGif) {
                e.uniforms["src"].value.needsUpdate = true;
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

            if (e.backbuffer) {
                // Update backbuffer
                e.uniforms["backbuffer"].value = e.backbuffer.texture;

                if (e.isFullScreen) {
                    e.backbuffer.resize(viewportWidth, viewportHeight);

                    // Render to backbuffer
                    this.#setOffset(e, glRect.x, glRect.y);
                    this.#render(
                        e.scene,
                        e.backbuffer.target,
                        viewportGlRect,
                        e.uniforms,
                    );
                    e.backbuffer.swap();

                    // Render to canvas
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

                    // Render to backbuffer
                    this.#setOffset(e, e.overflow.left, e.overflow.bottom);
                    this.#render(
                        e.scene,
                        e.backbuffer.target,
                        e.backbuffer.getViewport(),
                        e.uniforms,
                    );
                    e.backbuffer.swap();

                    // Render to canvas
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
                // Render to canvas
                this.#setOffset(e, glRect.x, glRect.y);
                this.#render(
                    e.scene,
                    shouldUsePostEffect ? this.#postEffectTarget || null : null,
                    e.isFullScreen ? viewportGlRect : glRectWithOverflow,
                    e.uniforms,
                );
            }
        }

        // Apply post effect if enabled
        if (
            shouldUsePostEffect &&
            this.#postEffectPass &&
            this.#postEffectTarget
        ) {
            this.#postEffectPass.setUniforms(
                this.#postEffectTarget.texture,
                this.#pixelRatio,
                viewportGlRect,
                now - this.#initTime,
                this.#mouseX,
                this.#mouseY,
            );

            // Update custom uniforms
            this.#postEffectPass.updateCustomUniforms(
                this.#postEffectUniformGenerators,
            );

            // Handle backbuffer rendering
            if (this.#postEffectPass.backbuffer) {
                // Update backbuffer texture reference (previous frame)
                this.#postEffectPass.uniforms.backbuffer.value =
                    this.#postEffectPass.backbuffer.texture;

                // Render post effect to backbuffer target
                this.#render(
                    this.#postEffectPass.scene,
                    this.#postEffectPass.backbuffer.target,
                    viewportGlRect,
                    this.#postEffectPass.uniforms,
                );

                // Swap backbuffer immediately after rendering
                this.#postEffectPass.backbuffer.swap();

                // Copy from backbuffer to canvas
                this.#copyPass.setUniforms(
                    this.#postEffectPass.backbuffer.texture,
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
                // Render post effect directly to canvas
                this.#render(
                    this.#postEffectPass.scene,
                    null,
                    viewportGlRect,
                    this.#postEffectPass.uniforms,
                );
            }
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
            e.uniforms["intersection"].value = intersection;
            e.uniforms["enterTime"].value = now - e.enterTime;
            e.uniforms["leaveTime"].value = now - e.leaveTime;
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

        this.#renderer.setViewport(rect.x, rect.y, rect.w, rect.h);

        // Set viewport uniform if passed and exists
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
        e.uniforms["offset"].value.x = x * this.#pixelRatio;
        e.uniforms["offset"].value.y = y * this.#pixelRatio;
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

            this.#postEffectTarget = new THREE.WebGLRenderTarget(
                targetWidth,
                targetHeight,
                {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat,
                },
            );
        }

        // Initialize/resize post effect backbuffer if needed
        if (this.#postEffectPass) {
            if (
                this.#postEffectPass.uniforms.backbuffer &&
                !this.#postEffectPass.backbuffer
            ) {
                this.#postEffectPass.initializeBackbuffer(
                    width,
                    height,
                    this.#pixelRatio,
                );
            } else if (this.#postEffectPass.backbuffer) {
                this.#postEffectPass.resizeBackbuffer(width, height);
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
