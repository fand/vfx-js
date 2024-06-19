import VFXPlayer from "./vfx-player";
import { VFXProps } from "./types";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    "z-index": 9999,
    "pointer-events": "none",
};

type VFXOptions = {
    pixelRatio?: number;
    zIndex?: number;
};

export class VFX {
    #player: VFXPlayer;

    constructor(opts: VFXOptions = {}) {
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

    #addImage(element: HTMLImageElement, opts: VFXProps): void {
        if (element.complete) {
            this.#player.addElement(element, opts);
        } else {
            element.addEventListener("load", () => {
                this.#player.addElement(element, opts);
            });
        }
    }

    #addVideo(element: HTMLVideoElement, opts: VFXProps): void {
        if (element.readyState >= 4) {
            this.#player.addElement(element, opts);
        } else {
            element.addEventListener("load", () => {
                this.#player.addElement(element, opts);
            });
        }
    }

    #addText(element: HTMLElement, opts: VFXProps): void {
        this.#player.addElement(element, opts);
    }

    addElement(element: HTMLElement, opts: VFXProps): void {
        if (element instanceof HTMLImageElement) {
            this.#addImage(element, opts);
        } else if (element instanceof HTMLVideoElement) {
            this.#addVideo(element, opts);
        } else {
            this.#addText(element, opts);
        }
    }
}
