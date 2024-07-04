import * as THREE from "three";
import dom2canvas from "./dom-to-canvas.js";
import { shaders, DEFAULT_VERTEX_SHADER } from "./constants.js";
import GIFData from "./gif.js";
import {
    VFXProps,
    VFXElement,
    VFXElementType,
    VFXUniformValue,
    VFXElementOverflow,
    VFXWrap,
} from "./types";

/**
 * top-left origin rect.
 * Subset of DOMRect, which is returned by `HTMLElement.getBoundingClientRect()`.
 * @internal
 */
type Rect = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

const gifFor = new Map<HTMLElement, GIFData>();

/**
 * @internal
 */
export class VFXPlayer {
    #canvas: HTMLCanvasElement;
    #renderer: THREE.WebGLRenderer;
    #camera: THREE.Camera;
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

        const rect = element.getBoundingClientRect();
        const overflow = sanitizeOverflow(opts.overflow);
        const isInViewport = isRectInViewport(this.#viewport, rect, overflow);

        const originalOpacity =
            element.style.opacity === ""
                ? 1
                : parseFloat(element.style.opacity);

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
                texture = this.#textureLoader.load(element.src);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = new THREE.VideoTexture(element);
            type = "video" as VFXElementType;
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

        const scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: DEFAULT_VERTEX_SHADER,
            fragmentShader: shader,
            transparent: true,
            uniforms,
        });
        scene.add(new THREE.Mesh(geometry, material));

        const now = Date.now() / 1000;
        const elem = {
            type,
            element,
            isInViewport,
            width: rect.width,
            height: rect.height,
            scene,
            uniforms,
            uniformGenerators,
            startTime: now,
            enterTime: isInViewport ? now : -1,
            leaveTime: -Infinity,
            release: opts.release ?? 0,
            isGif,
            overflow,
            originalOpacity,
        };

        this.#elements.push(elem);
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

    #playLoop = (): void => {
        const now = Date.now() / 1000;

        this.#renderer.clear();

        // This must done every frame because iOS Safari doesn't fire
        // window resize event while the address bar is transforming.
        this.#updateCanvasSize();

        for (const e of this.#elements) {
            const rect = e.element.getBoundingClientRect();

            // Check intersection
            const isInViewport = isRectInViewport(
                this.#viewport,
                rect,
                e.overflow,
            );

            // entering
            if (isInViewport && !e.isInViewport) {
                e.enterTime = now;
                e.leaveTime = Infinity;
            }

            // leaving
            if (!isInViewport && e.isInViewport) {
                e.leaveTime = now;
            }
            e.isInViewport = isInViewport;

            // Quit if the element has left and the transition has ended
            if (!isInViewport && now - e.leaveTime > e.release) {
                continue;
            }

            // Update uniforms
            e.uniforms["time"].value = now - e.startTime;
            e.uniforms["enterTime"].value =
                e.enterTime === -1 ? 0 : now - e.enterTime;
            e.uniforms["leaveTime"].value =
                e.leaveTime === -1 ? 0 : now - e.leaveTime;
            e.uniforms["resolution"].value.x = rect.width * this.#pixelRatio; // TODO: use correct width, height
            e.uniforms["resolution"].value.y = rect.height * this.#pixelRatio;
            e.uniforms["offset"].value.x = rect.left * this.#pixelRatio;
            e.uniforms["offset"].value.y =
                (window.innerHeight - rect.top - rect.height) *
                this.#pixelRatio;
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

            // Set viewport
            if (e.overflow === "fullscreen") {
                this.#renderer.setViewport(
                    0,
                    0,
                    window.innerWidth,
                    window.innerHeight,
                );
            } else {
                this.#renderer.setViewport(
                    rect.left - e.overflow.left,
                    window.innerHeight -
                        (rect.top + rect.height) -
                        e.overflow.bottom,
                    rect.width + (e.overflow.left + e.overflow.right),
                    rect.height + (e.overflow.top + e.overflow.bottom),
                );
            }

            // Render to viewport
            this.#camera.lookAt(e.scene.position);
            try {
                this.#renderer.render(e.scene, this.#camera);
            } catch (e) {
                console.error(e);
            }
        }

        if (this.isPlaying()) {
            this.#playRequest = requestAnimationFrame(this.#playLoop);
        }
    };

    #getShader(shaderNameOrCode: string): string {
        if (shaderNameOrCode in shaders) {
            return shaders[shaderNameOrCode as keyof typeof shaders];
        } else {
            return shaderNameOrCode; // Assume that the given string is a valid shader code
        }
    }
}

// TODO: Consider custom root element
export function isRectInViewport(
    viewport: Rect,
    rect: Rect,
    overflow: VFXElementOverflow,
): boolean {
    if (overflow === "fullscreen") {
        return true;
    }

    return (
        rect.left - overflow.left <= viewport.right &&
        rect.right + overflow.right >= viewport.left &&
        rect.top - overflow.top <= viewport.bottom &&
        rect.bottom + overflow.bottom >= viewport.top
    );
}

export function sanitizeOverflow(
    overflow: VFXProps["overflow"],
): VFXElementOverflow {
    if (overflow === true) {
        return "fullscreen";
    }
    if (overflow === undefined) {
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    if (typeof overflow === "number") {
        return {
            top: overflow,
            right: overflow,
            bottom: overflow,
            left: overflow,
        };
    }
    if (Array.isArray(overflow)) {
        return {
            top: overflow[0],
            right: overflow[1],
            bottom: overflow[2],
            left: overflow[3],
        };
    }
    return {
        top: overflow.top ?? 0,
        right: overflow.right ?? 0,
        bottom: overflow.bottom ?? 0,
        left: overflow.left ?? 0,
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
