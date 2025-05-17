import { type VFXOpts, type VFXProps, getVFXOpts } from "./types.js";
import { VFXPlayer } from "./vfx-player.js";

function getCanvasStyle(fixed: boolean) {
    return {
        position: fixed ? "fixed" : "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
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

    /**
     * Creates VFX instance and start playing immediately.
     */
    constructor(options: VFXOpts = {}) {
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
        document.body.appendChild(canvas);
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
            await this.#addCanvas(element, opts);
        } else {
            await this.#addText(element, opts);
        }
    }

    /**
     * Remove the element from VFX and stop rendering the shader.
     */
    remove(element: HTMLElement): void {
        this.#player.removeElement(element);
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
