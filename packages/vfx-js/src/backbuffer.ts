import * as THREE from "three";

/**
 * A class to manage initialization and double-buffring of the backbuffer.
 * @internal
 */
export class Backbuffer {
    #width: number;
    #height: number;
    #pixelRatio: number;
    #buffers: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];

    constructor(width: number, height: number, pixelRatio: number) {
        this.#width = width;
        this.#height = height;
        this.#pixelRatio = pixelRatio;

        const pwidth = width * pixelRatio; // use physical size
        const pheight = height * pixelRatio;
        this.#buffers = [
            new THREE.WebGLRenderTarget(pwidth, pheight),
            new THREE.WebGLRenderTarget(pwidth, pheight),
        ];
    }

    get texture(): THREE.Texture {
        return this.#buffers[0].texture;
    }

    get target(): THREE.WebGLRenderTarget {
        return this.#buffers[1];
    }

    /**
     * Resize textuers if necessary.
     * @param width - logical width of the backbuffer
     * @param height - logical height of the backbuffer
     */
    resize(width: number, height: number) {
        if (width !== this.#width || height !== this.#height) {
            this.#width = width;
            this.#height = height;
            this.#buffers[0].setSize(
                width * this.#pixelRatio,
                height * this.#pixelRatio,
            );
            this.#buffers[1].setSize(
                width * this.#pixelRatio,
                height * this.#pixelRatio,
            );
        }
    }

    /**
     * Swap double buffers for the backbuffer.
     * This should always be called right after the rendering.
     */
    swap() {
        this.#buffers = [this.#buffers[1], this.#buffers[0]];
    }

    getViewport(): [number, number, number, number] {
        return [0, 0, this.#width, this.#height];
    }
}
