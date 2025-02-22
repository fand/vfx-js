import * as THREE from "three";
import { Backbuffer } from "./backbuffer.js";
import { DEFAULT_VERTEX_SHADER, shaders } from "./constants.js";
import { CopyPass, rectToXywh } from "./copy-pass.js";
import dom2canvas from "./dom-to-canvas.js";
import GIFData from "./gif.js";
import {
    RECT_ZERO,
    type Rect,
    createRect,
    getIntersection,
    growRect,
} from "./rect.js";
import type {
    VFXElement,
    VFXElementIntersection,
    VFXElementType,
    VFXProps,
    VFXUniformValue,
    VFXWrap,
} from "./types";

const gifFor = new Map<HTMLElement, GIFData>();

/**
 * @internal
 */
export class VFXPlayer {
    #canvas: HTMLCanvasElement;
    #renderer: THREE.WebGLRenderer;
    #camera: THREE.Camera;
    #copyPass: CopyPass;

    #playRequest: number | undefined = undefined;
    #pixelRatio = 2;
    #elements: VFXElement[] = [];

    #textureLoader = new THREE.TextureLoader();

    #viewport: Rect = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    };

    #mouseX = 0;
    #mouseY = 0;

    #isRenderingToCanvas = new WeakMap<HTMLElement, boolean>();

    constructor(canvas: HTMLCanvasElement, pixelRatio?: number) {
        this.#canvas = canvas;
        this.#renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
        });
        this.#renderer.autoClear = false;
        this.#renderer.setClearAlpha(0);

        if (typeof window !== "undefined") {
            this.#pixelRatio = pixelRatio || window.devicePixelRatio;

            window.addEventListener("resize", this.#resize);
            window.addEventListener("mousemove", this.#mousemove);
        }
        this.#resize();

        this.#camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.#camera.position.set(0, 0, 1);

        // Setup copyScene
        this.#copyPass = new CopyPass();
    }

    destroy(): void {
        this.stop();
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.#resize);
            window.removeEventListener("mousemove", this.#mousemove);
        }
    }

    #updateCanvasSize(): void {
        if (typeof window !== "undefined") {
            const w = window.innerWidth;
            const h = window.innerHeight;

            if (w !== this.#width() || h !== this.#height()) {
                this.#canvas.width = w;
                this.#canvas.height = h;
                this.#renderer.setSize(w, h);
                this.#renderer.setPixelRatio(this.#pixelRatio);
                this.#viewport = {
                    top: 0,
                    left: 0,
                    right: w,
                    bottom: h,
                };
            }
        }
    }

    #width(): number {
        return this.#viewport.right - this.#viewport.left;
    }

    #height(): number {
        return this.#viewport.bottom - this.#viewport.top;
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

        const rect = element.getBoundingClientRect();
        const [isFullScreen, overflow] = parseOverflowOpts(opts.overflow);
        const rectWithOverflow = growRect(rect, overflow);

        const intersectionOpts = parseIntersectionOpts(opts.intersection);
        const isInViewport =
            isFullScreen || isRectInViewport(this.#viewport, rectWithOverflow);

        const viewportPadded = growRect(
            this.#viewport,
            intersectionOpts.rootMargin,
        );
        const intersection = getIntersection(this.#viewport, rect);
        const isInLogicalViewport =
            isFullScreen ||
            checkIntersection(
                viewportPadded,
                rect,
                intersection,
                intersectionOpts.threshold,
            );

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
            intersection: { value: intersection },
            rectOuter: { value: new THREE.Vector4() },
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
                return new Backbuffer(bw, bh);
            })();
            uniforms["backbuffer"] = { value: backbuffer.texture };
        }

        const scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.RawShaderMaterial({
            vertexShader: DEFAULT_VERTEX_SHADER,
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
            isInViewport,
            isInLogicalViewport,
            width: rect.width,
            height: rect.height,
            scene,
            mesh,
            uniforms,
            uniformGenerators,
            startTime: now,
            enterTime: isInLogicalViewport ? now : Number.NEGATIVE_INFINITY,
            leaveTime: isInLogicalViewport
                ? Number.POSITIVE_INFINITY
                : Number.NEGATIVE_INFINITY,
            release: opts.release ?? Number.POSITIVE_INFINITY,
            isGif,
            isFullScreen,
            overflow,
            intersection: intersectionOpts,
            originalOpacity,
            zIndex: opts.zIndex ?? 0,
            backbuffer,
        };

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

        for (const e of this.#elements) {
            const rect = e.element.getBoundingClientRect();
            const hit = this.#hitTest(e, rect, now);

            if (!hit.isVisible) {
                continue;
            }

            // Update uniforms
            e.uniforms["time"].value = now - e.startTime;
            e.uniforms["enterTime"].value = now - e.enterTime;
            e.uniforms["leaveTime"].value = now - e.leaveTime;
            e.uniforms["resolution"].value.x = rect.width * this.#pixelRatio;
            e.uniforms["resolution"].value.y = rect.height * this.#pixelRatio;
            e.uniforms["mouse"].value.x = this.#mouseX * this.#pixelRatio;
            e.uniforms["mouse"].value.y = this.#mouseY * this.#pixelRatio;
            e.uniforms["intersection"].value = hit.intersection;

            for (const [key, gen] of Object.entries(e.uniformGenerators)) {
                e.uniforms[key].value = gen();
            }

            // Update GIF / video
            gifFor.get(e.element)?.update();
            if (e.type === "video" || e.isGif) {
                e.uniforms["src"].value.needsUpdate = true;
            }

            if (e.backbuffer) {
                // Update backbuffer
                e.uniforms["backbuffer"].value = e.backbuffer.texture;
                // Set viewport
                if (e.isFullScreen) {
                    // Resize backbuffer
                    const bw = viewportWidth * this.#pixelRatio;
                    const bh = viewportHeight * this.#pixelRatio;
                    e.backbuffer.resize(bw, bh);

                    // Render to backbuffer
                    e.uniforms["offset"].value.x = rect.left * this.#pixelRatio;
                    e.uniforms["offset"].value.y =
                        (viewportHeight - rect.bottom) * this.#pixelRatio;
                    e.uniforms["rectOuter"].value.set(
                        0,
                        0,
                        viewportWidth * this.#pixelRatio,
                        viewportHeight * this.#pixelRatio,
                    );
                    this.#render(e.scene, e.backbuffer.target, [
                        0,
                        0,
                        viewportWidth,
                        viewportHeight,
                    ]);
                    e.backbuffer.swap();

                    // Render to canvas
                    // TODO: use rectWithOverflow as the viewport
                    this.#copyPass.setUniforms(
                        e.backbuffer.texture,
                        this.#pixelRatio,
                        rectToXywh(this.#viewport, viewportHeight),
                    );
                    this.#render(this.#copyPass.scene, null, [
                        0,
                        0,
                        viewportWidth,
                        viewportHeight,
                    ]);
                } else {
                    // Resize backbuffer
                    const bw =
                        (hit.rectWithOverflow.right -
                            hit.rectWithOverflow.left) *
                        this.#pixelRatio;
                    const bh =
                        (hit.rectWithOverflow.bottom -
                            hit.rectWithOverflow.top) *
                        this.#pixelRatio;
                    e.backbuffer.resize(bw, bh);

                    // Render to backbuffer
                    e.uniforms["offset"].value.x =
                        e.overflow.left * this.#pixelRatio;
                    e.uniforms["offset"].value.y =
                        e.overflow.bottom * this.#pixelRatio;
                    e.uniforms["rectOuter"].value.set(
                        hit.rectWithOverflow.left * this.#pixelRatio,
                        (viewportHeight - hit.rectWithOverflow.bottom) *
                            this.#pixelRatio,
                        (hit.rectWithOverflow.right -
                            hit.rectWithOverflow.left) *
                            this.#pixelRatio,
                        (hit.rectWithOverflow.bottom -
                            hit.rectWithOverflow.top) *
                            this.#pixelRatio,
                    );
                    this.#render(e.scene, e.backbuffer.target, [
                        0,
                        0,
                        e.backbuffer.width / this.#pixelRatio, // must use logical coordinate
                        e.backbuffer.height / this.#pixelRatio,
                    ]);
                    e.backbuffer.swap();

                    // Render to canvas
                    const xywh = rectToXywh(
                        hit.rectWithOverflow,
                        viewportHeight,
                    );
                    this.#copyPass.setUniforms(
                        e.backbuffer.texture,
                        this.#pixelRatio,
                        xywh,
                    );
                    this.#render(this.#copyPass.scene, null, [
                        xywh.x,
                        xywh.y,
                        xywh.w,
                        xywh.h,
                    ]);
                }
            } else {
                e.uniforms["offset"].value.x = rect.left * this.#pixelRatio;
                e.uniforms["offset"].value.y =
                    (viewportHeight - rect.bottom) * this.#pixelRatio;

                let viewport: [number, number, number, number] = [0, 0, 0, 0];
                if (e.isFullScreen) {
                    viewport = [0, 0, viewportWidth, viewportHeight];
                } else {
                    viewport = [
                        hit.rectWithOverflow.left,
                        viewportHeight - hit.rectWithOverflow.bottom,
                        hit.rectWithOverflow.right - hit.rectWithOverflow.left,
                        hit.rectWithOverflow.bottom - hit.rectWithOverflow.top,
                    ];
                }

                // Render to canvas
                this.#render(e.scene, null, viewport);
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
            isRectInViewport(this.#viewport, rectWithOverflow);

        const viewportPadded = growRect(
            this.#viewport,
            e.intersection.rootMargin,
        );
        const intersection = getIntersection(viewportPadded, rect);
        const isInLogicalViewport =
            e.isFullScreen ||
            checkIntersection(
                viewportPadded,
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
        viewport: [number, number, number, number],
    ) {
        this.#renderer.setRenderTarget(target);
        if (target !== null) {
            this.#renderer.clear();
        }

        this.#renderer.setViewport(...viewport);

        try {
            this.#renderer.render(scene, this.#camera);
        } catch (e) {
            console.error(e);
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
): [isFullScreen: boolean, Rect] {
    if (overflow === true) {
        return [true, RECT_ZERO];
    }
    if (overflow === undefined) {
        return [false, RECT_ZERO];
    }
    return [false, createRect(overflow)];
}

export function parseIntersectionOpts(
    intersectionOpts: VFXProps["intersection"],
): VFXElementIntersection {
    const threshold = intersectionOpts?.threshold ?? 0;
    const rootMargin = createRect(intersectionOpts?.rootMargin ?? 0);
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
