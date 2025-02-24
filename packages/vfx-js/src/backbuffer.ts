import * as THREE from "three";

/**
 * A class to manage initialization and double-buffring of the backbuffer.
 * @internal
 */
export class Backbuffer {
    #width: number;
    #height: number;
    #buffers: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];

    constructor(width: number, height: number) {
        this.#width = width;
        this.#height = height;
        this.#buffers = [
            new THREE.WebGLRenderTarget(width, height),
            new THREE.WebGLRenderTarget(width, height),
        ];
    }

    get texture(): THREE.Texture {
        return this.#buffers[0].texture;
    }

    get target(): THREE.WebGLRenderTarget {
        return this.#buffers[1];
    }

    get width(): number {
        return this.#width;
    }

    get height(): number {
        return this.#height;
    }

    /**
     * Resize textuers if necessary.
     * @param width - physical width of the backbuffer
     * @param height - physical height of the backbuffer
     */
    resize(width: number, height: number) {
        if (width !== this.#width || height !== this.#height) {
            this.#width = width;
            this.#height = height;
            this.#buffers[0].setSize(width, height);
            this.#buffers[1].setSize(width, height);
        }
    }

    /**
     * Swap double buffers for the backbuffer.
     * This should always be called right after the rendering.
     */
    swap() {
        this.#buffers = [this.#buffers[1], this.#buffers[0]];
    }
}
