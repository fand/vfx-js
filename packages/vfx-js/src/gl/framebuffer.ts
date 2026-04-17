import { Texture } from "./texture.js";

/**
 * Single color-attachment framebuffer. Replaces `THREE.WebGLRenderTarget`.
 * The `texture` field is a {@link Texture} that wraps the FBO's color
 * attachment, so it can be fed directly into a shader as a sampler.
 * @internal
 */
export class Framebuffer {
    gl: WebGL2RenderingContext;
    width: number;
    height: number;
    float: boolean;
    fbo: WebGLFramebuffer;
    texture: Texture;

    #floatLinearFilter: boolean;

    constructor(
        gl: WebGL2RenderingContext,
        width: number,
        height: number,
        opts: { float?: boolean; floatLinearFilter: boolean },
    ) {
        this.gl = gl;
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.float = opts.float ?? false;
        this.#floatLinearFilter = opts.floatLinearFilter;

        const fbo = gl.createFramebuffer();
        if (!fbo) {
            throw new Error("[VFX-JS] Failed to create framebuffer");
        }
        this.fbo = fbo;
        this.texture = new Texture(gl);
        this.#allocate();
    }

    setSize(width: number, height: number): void {
        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        if (w === this.width && h === this.height) {
            return;
        }
        this.width = w;
        this.height = h;
        this.#allocate();
    }

    dispose(): void {
        this.gl.deleteFramebuffer(this.fbo);
        this.texture.dispose();
    }

    #allocate(): void {
        const gl = this.gl;
        const tex = this.texture.texture;
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // Choose format based on float/non-float. For float textures, use
        // RGBA16F as a fallback if linear filtering on RGBA32F is not
        // supported by the GPU.
        const internalFormat = this.float
            ? this.#floatLinearFilter
                ? gl.RGBA32F
                : gl.RGBA16F
            : gl.RGBA8;
        const type = this.float
            ? this.#floatLinearFilter
                ? gl.FLOAT
                : gl.HALF_FLOAT
            : gl.UNSIGNED_BYTE;

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            internalFormat,
            this.width,
            this.height,
            0,
            gl.RGBA,
            type,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            tex,
            0,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.texture.needsUpdate = false;
        // Keep the Texture wrapper's source null: the storage is managed
        // here, not by a DOM source.
        this.texture.source = null;
    }
}
