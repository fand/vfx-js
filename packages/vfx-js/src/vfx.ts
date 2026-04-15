import { supportsHtmlInCanvas } from "./html-in-canvas-support.js";
import { unwrapElement, wrapElement } from "./html-in-canvas.js";
import { type VFXOpts, type VFXProps, getVFXOpts } from "./types.js";
import { VFXPlayer } from "./vfx-player.js";
import { isWebGLAvailable } from "./webgl-support.js";

function checkEnvironment() {
    if (typeof window === "undefined") {
        throw "Cannot find 'window'. VFX-JS only runs on the browser.";
    }
    if (typeof document === "undefined") {
        throw "Cannot find 'document'. VFX-JS only runs on the browser.";
    }
}

function getCanvasStyle(fixed: boolean) {
    return {
        position: fixed ? "fixed" : "absolute",
        top: 0,
        left: 0,
        // Sized by VFXPlayer#updateCanvasSize; avoid 100vw/100vh which
        // can cause overflow on iOS Safari.
        width: "0px",
        height: "0px",
        "z-index": 9999,
        "pointer-events": "none",
    };
}

/**
 * The main interface of VFX-JS.
 */
export class VFX {
    #player: VFXPlayer | null = null;
    #canvas: HTMLCanvasElement | null = null;
    #wrapperCanvases = new Map<HTMLElement, HTMLCanvasElement>();

    /**
     * Creates VFX instance and start playing immediately.
     *
     * When WebGL is not available the instance stays inert — all methods
     * become safe no-ops so the rest of the application keeps working.
     */
    constructor(options: VFXOpts = {}) {
        checkEnvironment();

        if (!isWebGLAvailable()) {
            console.warn(
                "VFX-JS: WebGL is not available. Effects will be disabled.",
            );
            return;
        }

        const opts = getVFXOpts(options);

        // Setup canvas
        const canvas = document.createElement("canvas");
        const canvasStyle = getCanvasStyle(opts.fixedCanvas);
        for (const [k, v] of Object.entries(canvasStyle)) {
            canvas.style.setProperty(k, v.toString());
        }
        if (opts.zIndex !== undefined) {
            canvas.style.setProperty("z-index", opts.zIndex.toString());
        }
        (opts.wrapper ?? document.body).appendChild(canvas);
        this.#canvas = canvas;

        this.#player = new VFXPlayer(opts, canvas);

        if (opts.autoplay) {
            this.#player.play();
        }
    }

    /**
     * Register an element to track the position and render visual effects in the area.
     */
    async add(
        element: HTMLElement,
        opts: VFXProps,
        initialCapture?: OffscreenCanvas,
    ): Promise<void> {
        if (!this.#player) {
            return;
        }

        if (element instanceof HTMLImageElement) {
            await this.#addImage(element, opts);
        } else if (element instanceof HTMLVideoElement) {
            await this.#addVideo(element, opts);
        } else if (element instanceof HTMLCanvasElement) {
            if (element.hasAttribute("layoutsubtree") && initialCapture) {
                await this.#player.addElement(element, opts, initialCapture);
            } else {
                await this.#addCanvas(element, opts);
            }
        } else {
            await this.#addText(element, opts);
        }
    }

    /**
     * Update the HIC texture for a layoutsubtree canvas.
     * @internal Used by VFXCanvas (react-vfx).
     */
    updateHICTexture(
        canvas: HTMLCanvasElement,
        offscreen: OffscreenCanvas,
    ): void {
        this.#player?.updateHICTexture(canvas, offscreen);
    }

    get maxTextureSize(): number {
        return this.#player?.maxTextureSize ?? 0;
    }

    /**
     * Simulate a WebGL context loss via the `WEBGL_lose_context` extension.
     * Useful for testing how your application handles GPU context loss.
     */
    forceContextLoss(): void {
        this.#player?.forceContextLoss();
    }

    /**
     * Simulate a WebGL context restore via the `WEBGL_lose_context` extension.
     * Useful for testing recovery after a forced context loss.
     */
    forceContextRestore(): void {
        this.#player?.forceContextRestore();
    }

    /**
     * Register an element using html-in-canvas API.
     * Wraps the element in a `<canvas layoutsubtree>` and captures via drawElementImage.
     * Falls back to `add()` if html-in-canvas is not supported.
     */
    async addHTML(element: HTMLElement, opts: VFXProps): Promise<void> {
        if (!this.#player) {
            return;
        }

        if (!supportsHtmlInCanvas()) {
            console.warn(
                "html-in-canvas not supported, falling back to dom-to-canvas",
            );
            return this.add(element, opts);
        }

        if (opts.overlay !== undefined) {
            console.warn(
                "addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.",
            );
        }

        const { overlay: _, ...hicOpts } = opts;

        const player = this.#player;

        let wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            player.removeElement(wrapper);
        }

        const { canvas, initialCapture } = await wrapElement(element, {
            onCapture: (offscreen) => {
                player.updateHICTexture(canvas, offscreen);
            },
            maxSize: player.maxTextureSize,
        });
        wrapper = canvas;
        this.#wrapperCanvases.set(element, wrapper);

        await player.addElement(wrapper, hicOpts, initialCapture);
    }

    /**
     * Remove the element from VFX and stop rendering the shader.
     */
    remove(element: HTMLElement): void {
        if (!this.#player) {
            return;
        }

        const wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            unwrapElement(wrapper, element);
            this.#wrapperCanvases.delete(element);
            this.#player.removeElement(wrapper);
        } else {
            this.#player.removeElement(element);
        }
    }

    /**
     * Update the texture for the given element.
     *
     * If the element is an HTMLImageElemnt or HTMLVideoElement, VFX-JS does nothing.
     * Otherwise, VFX-JS captures a new snapshot of the DOM tree under the elemnt and udpate the WebGL texture with it.
     *
     * This is useful to apply effects to eleents whose contents change dynamically (e.g. input, textare etc).
     */
    async update(element: HTMLElement): Promise<void> {
        if (!this.#player) {
            return;
        }

        const wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            wrapper.requestPaint();
            return;
        }

        if (element instanceof HTMLCanvasElement) {
            this.#player.updateCanvasElement(element);
            return;
        } else {
            return this.#player.updateTextElement(element);
        }
    }

    /**
     * Start rendering VFX.
     */
    play(): void {
        this.#player?.play();
    }

    /**
     * Stop rendering VFX.
     * You can restart rendering by calling `VFX.play()` later.
     */
    stop(): void {
        this.#player?.stop();
    }

    /**
     * Render the whole scene once, manually.
     * This is useful when you want to control the rendering timings manually by combining with `autoplay: false`.
     */
    render(): void {
        this.#player?.render();
    }

    /**
     * Destroy VFX and stop rendering.
     */
    destroy(): void {
        for (const [element, wrapper] of this.#wrapperCanvases) {
            unwrapElement(wrapper, element);
        }
        this.#wrapperCanvases.clear();

        this.#player?.destroy();
        this.#canvas?.remove();
    }

    #addImage(element: HTMLImageElement, opts: VFXProps): Promise<void> {
        if (!this.#player) {
            return Promise.resolve();
        }

        if (element.complete) {
            return this.#player.addElement(element, opts);
        } else {
            const player = this.#player;
            return new Promise<void>((resolve) => {
                element.addEventListener(
                    "load",
                    () => {
                        player.addElement(element, opts);
                        resolve();
                    },
                    { once: true },
                );
            });
        }
    }

    #addVideo(element: HTMLVideoElement, opts: VFXProps): Promise<void> {
        if (!this.#player) {
            return Promise.resolve();
        }

        if (element.readyState >= 3) {
            return this.#player.addElement(element, opts);
        } else {
            const player = this.#player;
            return new Promise<void>((resolve) => {
                element.addEventListener(
                    "canplay",
                    () => {
                        player.addElement(element, opts);
                        resolve();
                    },
                    { once: true },
                );
            });
        }
    }

    #addCanvas(element: HTMLCanvasElement, opts: VFXProps): Promise<void> {
        if (!this.#player) {
            return Promise.resolve();
        }
        return this.#player.addElement(element, opts);
    }

    #addText(element: HTMLElement, opts: VFXProps): Promise<void> {
        if (!this.#player) {
            return Promise.resolve();
        }
        return this.#player.addElement(element, opts);
    }
}
