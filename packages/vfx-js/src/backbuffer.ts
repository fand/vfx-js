import type { GLContext } from "./gl/context.js";
import { Framebuffer } from "./gl/framebuffer.js";
import type { Texture, TextureFilter, TextureWrap } from "./gl/texture.js";
import { type GLRect, getGLRect } from "./gl-rect.js";

/**
 * Double-buffered render target. Pass 0 is read, pass 1 is written;
 * swap() rotates them each frame so a shader can read its previous
 * output without a feedback loop.
 * @internal
 */
export class Backbuffer {
    #width: number;
    #height: number;
    #pixelRatio: number;
    #buffers: [Framebuffer, Framebuffer];

    constructor(
        ctx: GLContext,
        width: number,
        height: number,
        pixelRatio: number,
        float: boolean | undefined,
        opts: {
            wrap?: TextureWrap | readonly [TextureWrap, TextureWrap];
            filter?: TextureFilter;
            mipmap?: boolean;
            depth?: boolean;
            samples?: 1 | 4;
        } = {},
    ) {
        this.#width = width;
        this.#height = height;
        this.#pixelRatio = pixelRatio;

        const pwidth = width * pixelRatio;
        const pheight = height * pixelRatio;
        const fbOpts = {
            float,
            wrap: opts.wrap,
            filter: opts.filter,
            mipmap: opts.mipmap,
            depth: opts.depth,
            samples: opts.samples,
        };
        this.#buffers = [
            new Framebuffer(ctx, pwidth, pheight, fbOpts),
            new Framebuffer(ctx, pwidth, pheight, fbOpts),
        ];
    }

    /** Read side (the previous frame's output). */
    get read(): Framebuffer {
        return this.#buffers[0];
    }

    /** Read texture (the previous frame's output). */
    get texture(): Texture {
        return this.#buffers[0].texture;
    }

    /** Read-side depth texture, or null without `depth: true`. */
    get depthTexture(): Texture | null {
        return this.#buffers[0].depthTexture;
    }

    /** Write target for the current frame. */
    get target(): Framebuffer {
        return this.#buffers[1];
    }

    resize(width: number, height: number): void {
        if (width === this.#width && height === this.#height) {
            return;
        }
        this.#width = width;
        this.#height = height;
        const pw = width * this.#pixelRatio;
        const ph = height * this.#pixelRatio;
        this.#buffers[0].setSize(pw, ph);
        this.#buffers[1].setSize(pw, ph);
    }

    /** Rotate the double-buffers. Call after rendering to `target`. */
    swap(): void {
        this.#buffers = [this.#buffers[1], this.#buffers[0]];
    }

    getViewport(): GLRect {
        return getGLRect(0, 0, this.#width, this.#height);
    }

    dispose(): void {
        this.#buffers[0].dispose();
        this.#buffers[1].dispose();
    }
}
