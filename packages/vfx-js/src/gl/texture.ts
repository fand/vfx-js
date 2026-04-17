/**
 * Texture wrapper over a WebGL2 `TEXTURE_2D`.
 *
 * Matches the behaviour of the Three.js texture types previously used
 * by VFX-JS: Y-flipped unpack, non-premultiplied alpha, linear filter,
 * and RGBA format. Use {@link needsUpdate} to re-upload from a live
 * canvas/video source on the next bind.
 * @internal
 */
export type TextureWrap = "clamp" | "repeat" | "mirror";

/** @internal */
export type TextureSource =
    | HTMLImageElement
    | HTMLVideoElement
    | HTMLCanvasElement
    | OffscreenCanvas
    | ImageBitmap;

/** @internal */
export class Texture {
    gl: WebGL2RenderingContext;
    texture: WebGLTexture;
    wrapS: TextureWrap = "clamp";
    wrapT: TextureWrap = "clamp";
    needsUpdate = true;
    /** Source image/canvas/video; exposed for identity comparison. */
    source: TextureSource | null = null;

    #uploaded = false;

    constructor(gl: WebGL2RenderingContext, source?: TextureSource) {
        this.gl = gl;
        const tex = gl.createTexture();
        if (!tex) {
            throw new Error("[VFX-JS] Failed to create texture");
        }
        this.texture = tex;
        if (source) {
            this.source = source;
        }
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
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    dispose(): void {
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
