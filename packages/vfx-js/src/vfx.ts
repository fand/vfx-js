import { supportsHtmlInCanvas } from "./html-in-canvas-support.js";
import { unwrapElement, wrapElement } from "./html-in-canvas.js";
import { type VFXOpts, type VFXProps, getVFXOpts } from "./types.js";
import { VFXPlayer } from "./vfx-player.js";

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
    #player: VFXPlayer;
    #canvas: HTMLCanvasElement;
    #wrapperCanvases = new Map<HTMLElement, HTMLCanvasElement>();

    /**
     * Creates VFX instance and start playing immediately.
     */
    constructor(options: VFXOpts = {}) {
        checkEnvironment();
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
    async add(element: HTMLElement, opts: VFXProps): Promise<void> {
        if (element instanceof HTMLImageElement) {
            await this.#addImage(element, opts);
        } else if (element instanceof HTMLVideoElement) {
            await this.#addVideo(element, opts);
        } else if (element instanceof HTMLCanvasElement) {
            if (element.hasAttribute("layoutsubtree")) {
                // layoutsubtree canvas (from <VFXCanvas>) → hic path
                await this.#player.addElement(element, opts);
            } else {
                await this.#addCanvas(element, opts);
            }
        } else {
            await this.#addText(element, opts);
        }
    }

    /**
     * Register an element using html-in-canvas API.
     * Wraps the element in a `<canvas layoutsubtree>` and captures via drawElementImage.
     * Falls back to `add()` if html-in-canvas is not supported.
     */
    async addHTML(element: HTMLElement, opts: VFXProps): Promise<void> {
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

        let wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            this.#player.removeElement(wrapper);
        } else {
            // onReflow re-captures the texture on subtree or parent reflow.
            // updateHICElement is a no-op until addElement below registers
            // the wrapper, so early RO fires are harmless.
            wrapper = await wrapElement(element, (c) => {
                void this.#player.updateHICElement(c);
            });
            this.#wrapperCanvases.set(element, wrapper);
        }

        await this.#player.addElement(wrapper, hicOpts);
    }

    /**
     * Remove the element from VFX and stop rendering the shader.
     */
    remove(element: HTMLElement): void {
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
        const wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            return this.#player.updateHICElement(wrapper);
        }

        if (element instanceof HTMLCanvasElement) {
            if (element.hasAttribute("layoutsubtree")) {
                return this.#player.updateHICElement(element);
            }
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
        this.#player.play();
    }

    /**
     * Stop rendering VFX.
     * You can restart rendering by calling `VFX.play()` later.
     */
    stop(): void {
        this.#player.stop();
    }

    /**
     * Render the whole scene once, manually.
     * This is useful when you want to control the rendering timings manually by combining with `autoplay: false`.
     */
    render(): void {
        this.#player.render();
    }

    /**
     * Destroy VFX and stop rendering.
     */
    destroy(): void {
        for (const [element, wrapper] of this.#wrapperCanvases) {
            unwrapElement(wrapper, element);
        }
        this.#wrapperCanvases.clear();

        this.#player.destroy();
        this.#canvas.remove();
    }

    #addImage(element: HTMLImageElement, opts: VFXProps): Promise<void> {
        if (element.complete) {
            return this.#player.addElement(element, opts);
        } else {
            return new Promise<void>((resolve) => {
                element.addEventListener(
                    "load",
                    () => {
                        this.#player.addElement(element, opts);
                        resolve();
                    },
                    { once: true },
                );
            });
        }
    }

    #addVideo(element: HTMLVideoElement, opts: VFXProps): Promise<void> {
        if (element.readyState >= 3) {
            return this.#player.addElement(element, opts);
        } else {
            return new Promise<void>((resolve) => {
                element.addEventListener(
                    "canplay",
                    () => {
                        this.#player.addElement(element, opts);
                        resolve();
                    },
                    { once: true },
                );
            });
        }
    }

    #addCanvas(element: HTMLCanvasElement, opts: VFXProps): Promise<void> {
        return this.#player.addElement(element, opts);
    }

    #addText(element: HTMLElement, opts: VFXProps): Promise<void> {
        return this.#player.addElement(element, opts);
    }
}
