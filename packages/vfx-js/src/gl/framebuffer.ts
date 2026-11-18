import type { GLContext, Restorable } from "./context.js";
import { Texture, type TextureFilter, type TextureWrap } from "./texture.js";

const warnedMultisample = new WeakSet<WebGL2RenderingContext>();

/**
 * Single color-attachment framebuffer, with an optional depth texture.
 * Replaces `THREE.WebGLRenderTarget`.
 * The `texture` field is a {@link Texture} that wraps the FBO's color
 * attachment, so it can be fed directly into a shader as a sampler.
 *
 * With `samples: 4`, draws go to a multisampled FBO backed by
 * renderbuffers, and the textures live on {@link resolveFbo}.
 * Call {@link markDirty} after drawing, and {@link resolveColor} /
 * {@link resolveDepth} before sampling.
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
    depth: boolean;
    samples: 1 | 4;

    /** Draw target. Multisampled when `samples` is 4. */
    fbo!: WebGLFramebuffer;

    /** FBO holding the textures, when `samples` is 4. Null otherwise. */
    resolveFbo: WebGLFramebuffer | null = null;
    texture: Texture;
    depthTexture: Texture | null;

    #ctx: GLContext;
    #colorRenderbuffer: WebGLRenderbuffer | null = null;
    #depthRenderbuffer: WebGLRenderbuffer | null = null;
    #colorDirty = false;
    #depthDirty = false;

    constructor(
        ctx: GLContext,
        width: number,
        height: number,
        opts: {
            float?: boolean;
            wrap?: TextureWrap | readonly [TextureWrap, TextureWrap];
            filter?: TextureFilter;
            mipmap?: boolean;
            depth?: boolean;
            samples?: 1 | 4;
        } = {},
    ) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.float = opts.float ?? false;
        this.mipmap = opts.mipmap ?? false;
        this.depth = opts.depth ?? false;
        this.samples =
            opts.samples === 4 && this.#supportsMultisample() ? 4 : 1;

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
        this.depthTexture = null;
        if (this.depth) {
            this.depthTexture = new Texture(ctx, undefined, {
                autoRegister: false,
            });
            this.depthTexture.minFilter = "nearest";
            this.depthTexture.magFilter = "nearest";
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
        this.depthTexture?.restore();
        this.#allocate();
    }

    dispose(): void {
        this.#ctx.removeResource(this);
        this.gl.deleteFramebuffer(this.fbo);
        this.#deleteMultisample(
            this.resolveFbo,
            this.#colorRenderbuffer,
            this.#depthRenderbuffer,
        );
        this.texture.dispose();
        this.depthTexture?.dispose();
    }

    /**
     * Whether the color format takes 4 samples.
     * Warns once per context if not.
     */
    #supportsMultisample(): boolean {
        const gl = this.gl;
        const format = this.float ? gl.RGBA16F : gl.RGBA8;
        const counts = gl.getInternalformatParameter(
            gl.RENDERBUFFER,
            format,
            gl.SAMPLES,
        ) as Int32Array | null;
        // Counts are sorted high to low; null means the context is lost.
        if (!counts || (counts.length > 0 && counts[0] >= 4)) {
            return true;
        }
        if (!warnedMultisample.has(gl)) {
            warnedMultisample.add(gl);
            console.warn(
                "[VFX-JS] This GPU can't use samples: 4 for this render target format; using samples: 1.",
            );
        }
        return false;
    }

    /** Flag new pixels in the multisampled buffers. No-op without MSAA. */
    markDirty(): void {
        if (this.samples === 1) {
            return;
        }
        this.#colorDirty = true;
        this.#depthDirty = this.depth;
    }

    /** Copy multisampled color into {@link texture} if it changed. */
    resolveColor(): void {
        if (!this.#colorDirty) {
            return;
        }
        this.#colorDirty = false;
        this.#blitToResolve(this.gl.COLOR_BUFFER_BIT);
    }

    /** Copy multisampled depth into {@link depthTexture} if it changed. */
    resolveDepth(): void {
        if (!this.#depthDirty) {
            return;
        }
        this.#depthDirty = false;
        this.#blitToResolve(this.gl.DEPTH_BUFFER_BIT);
    }

    #blitToResolve(mask: number): void {
        const gl = this.gl;
        // Scissor would clip the blit.
        gl.disable(gl.SCISSOR_TEST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.resolveFbo);
        gl.blitFramebuffer(
            0,
            0,
            this.width,
            this.height,
            0,
            0,
            this.width,
            this.height,
            mask,
            gl.NEAREST,
        );
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    /**
     * Regenerate mips from level 0. No-op when this FB was not created
     * with `mipmap: true`.
     */
    generateMipmaps(): void {
        if (!this.mipmap) {
            return;
        }
        this.resolveColor();
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    #allocate(): void {
        const gl = this.gl;
        const oldFbo = this.fbo;
        const oldResolveFbo = this.resolveFbo;
        const oldColorRenderbuffer = this.#colorRenderbuffer;
        const oldDepthRenderbuffer = this.#depthRenderbuffer;
        const fbo = gl.createFramebuffer();
        if (!fbo) {
            throw new Error("[VFX-JS] Failed to create framebuffer");
        }
        let multisampleFbo: WebGLFramebuffer | null = null;
        if (this.samples > 1) {
            multisampleFbo = gl.createFramebuffer();
            if (!multisampleFbo) {
                gl.deleteFramebuffer(fbo);
                throw new Error("[VFX-JS] Failed to create framebuffer");
            }
            this.fbo = multisampleFbo;
            this.resolveFbo = fbo;
        } else {
            this.fbo = fbo;
        }

        const tex = this.texture.texture;
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // Choose format based on float/non-float. For float textures, use
        // RGBA16F as a fallback if linear filtering on RGBA32F is not
        // supported by the GPU.
        // Multisampled float always uses RGBA16F.
        const floatLinear = this.#ctx.floatLinearFilter && this.samples === 1;
        if (this.float && floatLinear && !this.#ctx.floatBlend) {
            // Blending into RGBA32F needs EXT_float_blend; fail fast
            // instead of letting blended draws drop silently.
            throw new Error("[VFX-JS] EXT_float_blend is not supported.");
        }
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

        // Per-level texImage2D for both mip and non-mip — the texture
        // handle is reused across setSize / restore, and texStorage2D
        // makes it immutable so re-allocate would fail. Per-level keeps
        // the storage mutable and matches the non-mip code path.
        if (this.mipmap) {
            const levels =
                Math.floor(Math.log2(Math.max(this.width, this.height))) + 1;
            let w = this.width;
            let h = this.height;
            for (let level = 0; level < levels; level++) {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    level,
                    internalFormat,
                    w,
                    h,
                    0,
                    gl.RGBA,
                    type,
                    null,
                );
                w = Math.max(1, w >> 1);
                h = Math.max(1, h >> 1);
            }
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
        if (this.depthTexture) {
            this.#allocateDepth(this.depthTexture);
        }
        if (multisampleFbo) {
            this.#allocateMultisample(multisampleFbo, internalFormat);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.#colorDirty = false;
        this.#depthDirty = false;

        this.texture.needsUpdate = false;
        // Keep the Texture wrapper's source null: the storage is managed
        // here, not by a DOM source.
        this.texture.source = null;

        // Delete after assigning the new FBO so this.fbo is never stale.
        // On restore() the old handle is dead; deleteFramebuffer is a no-op.
        if (oldFbo) {
            gl.deleteFramebuffer(oldFbo);
        }
        this.#deleteMultisample(
            oldResolveFbo,
            oldColorRenderbuffer,
            oldDepthRenderbuffer,
        );
    }

    /** Allocate multisampled renderbuffers and attach them to `fbo`. */
    #allocateMultisample(fbo: WebGLFramebuffer, colorFormat: number): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        this.#colorRenderbuffer = this.#createRenderbuffer(colorFormat);
        gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.RENDERBUFFER,
            this.#colorRenderbuffer,
        );
        this.#depthRenderbuffer = null;
        if (this.depth) {
            this.#depthRenderbuffer = this.#createRenderbuffer(
                gl.DEPTH_COMPONENT24,
            );
            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER,
                gl.DEPTH_ATTACHMENT,
                gl.RENDERBUFFER,
                this.#depthRenderbuffer,
            );
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    #createRenderbuffer(format: number): WebGLRenderbuffer {
        const gl = this.gl;
        const renderbuffer = gl.createRenderbuffer();
        if (!renderbuffer) {
            throw new Error("[VFX-JS] Failed to create renderbuffer");
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorageMultisample(
            gl.RENDERBUFFER,
            this.samples,
            format,
            this.width,
            this.height,
        );
        return renderbuffer;
    }

    #deleteMultisample(
        resolveFbo: WebGLFramebuffer | null,
        colorRenderbuffer: WebGLRenderbuffer | null,
        depthRenderbuffer: WebGLRenderbuffer | null,
    ): void {
        const gl = this.gl;
        if (resolveFbo) {
            gl.deleteFramebuffer(resolveFbo);
        }
        if (colorRenderbuffer) {
            gl.deleteRenderbuffer(colorRenderbuffer);
        }
        if (depthRenderbuffer) {
            gl.deleteRenderbuffer(depthRenderbuffer);
        }
    }

    /** Allocate the depth texture and attach it to the bound FBO. */
    #allocateDepth(depthTexture: Texture): void {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, depthTexture.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.DEPTH_COMPONENT24,
            this.width,
            this.height,
            0,
            gl.DEPTH_COMPONENT,
            gl.UNSIGNED_INT,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NONE);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D,
            depthTexture.texture,
            0,
        );
        // Storage is managed here; the wrapper must not upload over it.
        depthTexture.needsUpdate = false;
        depthTexture.source = null;
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
