import type { GLContext, Restorable } from "./context.js";
import { Texture } from "./texture.js";

/**
 * Single color-attachment framebuffer. Replaces `THREE.WebGLRenderTarget`.
 * The `texture` field is a {@link Texture} that wraps the FBO's color
 * attachment, so it can be fed directly into a shader as a sampler.
 *
 * Self-registers with {@link GLContext} so the FBO + its attachment
 * texture are rebuilt after a context loss. The internal attachment
 * texture opts out of auto-registering; its storage is managed here.
 * @internal
 */
export class Framebuffer implements Restorable {
    gl: WebGL2RenderingContext;
    width: number;
    height: number;
    float: boolean;
    fbo!: WebGLFramebuffer;
    texture: Texture;

    #ctx: GLContext;

    constructor(
        ctx: GLContext,
        width: number,
        height: number,
        opts: { float?: boolean } = {},
    ) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.float = opts.float ?? false;

        this.texture = new Texture(ctx, undefined, { autoRegister: false });
        this.#allocate();
        ctx.addResource(this);
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

    restore(): void {
        // Old FBO + attachment texture are dead; the attachment Texture
        // recreated its handle via its own `restore()` (not registered;
        // done manually here because ordering matters).
        this.texture.restore();
        this.#allocate();
    }

    dispose(): void {
        this.#ctx.removeResource(this);
        this.gl.deleteFramebuffer(this.fbo);
        this.texture.dispose();
    }

    #allocate(): void {
        const gl = this.gl;
        const fbo = gl.createFramebuffer();
        if (!fbo) {
            throw new Error("[VFX-JS] Failed to create framebuffer");
        }
        this.fbo = fbo;

        const tex = this.texture.texture;
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // Choose format based on float/non-float. For float textures, use
        // RGBA16F as a fallback if linear filtering on RGBA32F is not
        // supported by the GPU.
        const floatLinear = this.#ctx.floatLinearFilter;
        const internalFormat = this.float
            ? floatLinear
                ? gl.RGBA32F
                : gl.RGBA16F
            : gl.RGBA8;
        const type = this.float
            ? floatLinear
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

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
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
