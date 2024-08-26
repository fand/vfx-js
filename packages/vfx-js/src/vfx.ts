import { VFXPlayer } from "./vfx-player.js";
import { VFXOpts, VFXProps } from "./types.js";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    "z-index": 9999,
    "pointer-events": "none",
};

/**
 * The main interface of VFX-JS.
 */
export class VFX {
    #player: VFXPlayer;
    #canvas: HTMLCanvasElement;

    /**
     * Creates VFX instance and start playing immediately.
     */
    constructor(opts: VFXOpts = {}) {
        const canvas = document.createElement("canvas");
        for (const [k, v] of Object.entries(canvasStyle)) {
            canvas.style.setProperty(k, v.toString());
        }
        if (opts.zIndex !== undefined) {
            canvas.style.setProperty("z-index", opts.zIndex.toString());
        }
        document.body.appendChild(canvas);
        this.#canvas = canvas;

        this.#player = new VFXPlayer(canvas, opts.pixelRatio);
        this.#player.play();
    }

    /**
     * Register an element to track the position and render visual effects in the area.
     */
    add(element: HTMLElement, opts: VFXProps): void {
        if (element instanceof HTMLImageElement) {
            this.#addImage(element, opts);
        } else if (element instanceof HTMLVideoElement) {
            this.#addVideo(element, opts);
        } else if (element instanceof HTMLCanvasElement) {
            this.#addCanvas(element, opts);
        } else {
            this.#addText(element, opts);
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
     * Destroy VFX and stop rendering.
     */
    destroy(): void {
        this.#player.destroy();
        this.#canvas.remove();
    }

    #addImage(element: HTMLImageElement, opts: VFXProps): void {
        if (element.complete) {
            this.#player.addElement(element, opts);
        } else {
            element.addEventListener(
                "load",
                () => {
                    this.#player.addElement(element, opts);
                },
                { once: true },
            );
        }
    }

    #addVideo(element: HTMLVideoElement, opts: VFXProps): void {
        if (element.readyState >= 3) {
            this.#player.addElement(element, opts);
        } else {
            element.addEventListener(
                "canplay",
                () => {
                    this.#player.addElement(element, opts);
                },
                { once: true },
            );
        }
    }

    #addCanvas(element: HTMLCanvasElement, opts: VFXProps): void {
        this.#player.addElement(element, opts);
    }

    #addText(element: HTMLElement, opts: VFXProps): void {
        this.#player.addElement(element, opts);
    }
}
