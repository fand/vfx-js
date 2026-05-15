import type { GLContext, Restorable } from "./context.js";
import { Texture, type TextureFilter, type TextureWrap } from "./texture.js";

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
    mipmap: boolean;
    fbo!: WebGLFramebuffer;
    texture: Texture;

    #ctx: GLContext;

    constructor(
        ctx: GLContext,
        width: number,
        height: number,
        opts: {
            float?: boolean;
            wrap?: TextureWrap | readonly [TextureWrap, TextureWrap];
            filter?: TextureFilter;
            mipmap?: boolean;
        } = {},
    ) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.float = opts.float ?? false;
        this.mipmap = opts.mipmap ?? false;

        this.texture = new Texture(ctx, undefined, { autoRegister: false });
        const w = opts.wrap;
        if (w !== undefined) {
            if (typeof w === "string") {
                this.texture.wrapS = w;
                this.texture.wrapT = w;
            } else {
                this.texture.wrapS = w[0];
                this.texture.wrapT = w[1];
            }
        }
        if (opts.filter !== undefined) {
            this.texture.minFilter = opts.filter;
            this.texture.magFilter = opts.filter;
        }
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

    /**
     * Regenerate mips from level 0. No-op when this FB was not created
     * with `mipmap: true`.
     */
    generateMipmaps(): void {
        if (!this.mipmap) {
            return;
        }
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    #allocate(): void {
        const gl = this.gl;
        const oldFbo = this.fbo;
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

        // Immutable mip storage when mipmapped; per-level texImage2D
        // would leave the chain mutable, allowing accidental
        // texImage2D(level=0) that could resize the texture out from
        // under us. texStorage2D is the WebGL2 idiom for "I want N
        // levels, allocated up front, no surprises".
        const levels = this.mipmap
            ? Math.floor(Math.log2(Math.max(this.width, this.height))) + 1
            : 1;
        if (this.mipmap) {
            gl.texStorage2D(
                gl.TEXTURE_2D,
                levels,
                internalFormat,
                this.width,
                this.height,
            );
        } else {
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
        }
        const baseMin =
            this.texture.minFilter === "nearest" ? gl.NEAREST : gl.LINEAR;
        const magF =
            this.texture.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR;
        // Auto-promote MIN to mipmap-aware variant when mip storage exists.
        const minF = this.mipmap
            ? this.texture.minFilter === "nearest"
                ? gl.NEAREST_MIPMAP_NEAREST
                : gl.LINEAR_MIPMAP_LINEAR
            : baseMin;
        const wrapS = wrapEnum(gl, this.texture.wrapS);
        const wrapT = wrapEnum(gl, this.texture.wrapT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

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

        // Delete after assigning the new FBO so this.fbo is never stale.
        // On restore() the old handle is dead; deleteFramebuffer is a no-op.
        if (oldFbo) {
            gl.deleteFramebuffer(oldFbo);
        }
    }
}

function wrapEnum(gl: WebGL2RenderingContext, w: TextureWrap): number {
    if (w === "repeat") {
        return gl.REPEAT;
    }
    if (w === "mirror") {
        return gl.MIRRORED_REPEAT;
    }
    return gl.CLAMP_TO_EDGE;
}
