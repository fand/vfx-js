import * as THREE from "three";
import type { GLCapabilities } from "./gl-capabilities.js";
import { type GLRect, getGLRect } from "./gl-rect";

/**
 * A class to manage initialization and double-buffring of the backbuffer.
 * @internal
 */
export class Backbuffer {
    #width: number;
    #height: number;
    #pixelRatio: number;
    #buffers: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];

    constructor(
        width: number,
        height: number,
        pixelRatio: number,
        float: boolean | undefined,
        caps: GLCapabilities,
    ) {
        this.#width = width;
        this.#height = height;
        this.#pixelRatio = pixelRatio;

        const pwidth = width * pixelRatio; // use physical size
        const pheight = height * pixelRatio;
        const filter = float ? caps.floatRTFilter : THREE.LinearFilter;
        const opts = {
            minFilter: filter,
            magFilter: filter,
            type: float ? caps.floatRTType : THREE.UnsignedByteType,
        };
        this.#buffers = [
            new THREE.WebGLRenderTarget(pwidth, pheight, opts),
            new THREE.WebGLRenderTarget(pwidth, pheight, opts),
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

    getViewport(): GLRect {
        return getGLRect(0, 0, this.#width, this.#height);
    }
}
