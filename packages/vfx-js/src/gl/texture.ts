import type { GLContext, Restorable } from "./context.js";

/**
 * Texture wrapper over a WebGL2 `TEXTURE_2D`.
 *
 * Matches the behaviour of the Three.js texture types previously used
 * by VFX-JS: Y-flipped unpack, non-premultiplied alpha, linear filter,
 * and RGBA format. Use {@link needsUpdate} to re-upload from a live
 * canvas/video source on the next bind.
 *
 * Self-registers with {@link GLContext} unless `autoRegister: false` is
 * passed — opt out when the Texture is owned by a {@link Framebuffer}
 * (its storage is managed by the FBO's own `restore()`).
 * @internal
 */
export type TextureWrap = "clamp" | "repeat" | "mirror";

/** @internal */
export type TextureFilter = "nearest" | "linear";

/** @internal */
export type TextureSource =
    | HTMLImageElement
    | HTMLVideoElement
    | HTMLCanvasElement
    | OffscreenCanvas
    | ImageBitmap;

/** @internal */
export type TextureOpts = {
    /** Default true. Pass false for FBO attachment textures. */
    autoRegister?: boolean;
};

/** @internal */
export class Texture implements Restorable {
    gl: WebGL2RenderingContext;
    texture!: WebGLTexture;
    wrapS: TextureWrap = "clamp";
    wrapT: TextureWrap = "clamp";
    minFilter: TextureFilter = "linear";
    magFilter: TextureFilter = "linear";
    needsUpdate = true;
    /** Source image/canvas/video; exposed for identity comparison. */
    source: TextureSource | null = null;

    #ctx: GLContext;
    #uploaded = false;
    #registered: boolean;

    constructor(ctx: GLContext, source?: TextureSource, opts?: TextureOpts) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.#create();
        if (source) {
            this.source = source;
        }
        this.#registered = opts?.autoRegister !== false;
        if (this.#registered) {
            ctx.addResource(this);
        }
    }

    #create(): void {
        const tex = this.gl.createTexture();
        if (!tex) {
            throw new Error("[VFX-JS] Failed to create texture");
        }
        this.texture = tex;
    }

    restore(): void {
        // Old handle is invalid; create a fresh one and flag for re-upload.
        this.#create();
        this.#uploaded = false;
        this.needsUpdate = true;
    }

    bind(unit: number): void {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (this.needsUpdate) {
            this.#upload();
            this.needsUpdate = false;
        }
    }

    #upload(): void {
        const gl = this.gl;
        const src = this.source;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        if (src) {
            try {
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    src as TexImageSource,
                );
            } catch (e) {
                // Some sources (e.g. cross-origin videos before playback)
                // can fail temporarily; log and keep the previous pixels.
                console.error(e);
            }
        } else if (!this.#uploaded) {
            // Allocate 1x1 transparent pixel so the sampler is valid even
            // without a real source.
            const pixel = new Uint8Array([0, 0, 0, 0]);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixel,
            );
        }
        this.#applyParams();
        this.#uploaded = true;
    }

    #applyParams(): void {
        const gl = this.gl;
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            wrapEnum(gl, this.wrapS),
        );
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            wrapEnum(gl, this.wrapT),
        );
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            filterEnum(gl, this.minFilter),
        );
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            filterEnum(gl, this.magFilter),
        );
    }

    dispose(): void {
        if (this.#registered) {
            this.#ctx.removeResource(this);
        }
        this.gl.deleteTexture(this.texture);
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

function filterEnum(gl: WebGL2RenderingContext, f: TextureFilter): number {
    return f === "nearest" ? gl.NEAREST : gl.LINEAR;
}

/** Load an image from URL with CORS enabled. @internal */
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
