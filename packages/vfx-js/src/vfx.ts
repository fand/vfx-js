import VFXPlayer from "./vfx-player";
import { VFXOpts, VFXProps } from "./types";

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

    constructor(opts: VFXOpts = {}) {
        const canvas = document.createElement("canvas");
        for (const [k, v] of Object.entries(canvasStyle)) {
            canvas.style.setProperty(k, v.toString());
        }
        if (opts.zIndex !== undefined) {
            canvas.style.setProperty("z-index", opts.zIndex.toString());
        }
        document.body.appendChild(canvas);

        this.#player = new VFXPlayer(canvas);
        this.#player.play();
    }

    add(element: HTMLElement, opts: VFXProps): void {
        if (element instanceof HTMLImageElement) {
            this.#addImage(element, opts);
        } else if (element instanceof HTMLVideoElement) {
            this.#addVideo(element, opts);
        } else {
            this.#addText(element, opts);
        }
    }

    remove(element: HTMLElement): void {
        this.#player.removeElement(element);
    }

    update(element: HTMLElement): Promise<void> {
        return this.#player.updateTextElement(element);
    }

    play(): void {
        this.#player.play();
    }

    stop(): void {
        this.#player.stop();
    }

    destroy(): void {
        this.#player.destroy();
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

    #addText(element: HTMLElement, opts: VFXProps): void {
        this.#player.addElement(element, opts);
    }
}
