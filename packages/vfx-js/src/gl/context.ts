/** A GL resource that can be rebuilt after a WebGL context loss. @internal */
export interface Restorable {
    restore(): void;
}

/**
 * WebGL2 context wrapper. Owns the canvas's rendering context, negotiates
 * optional float texture extensions, and coordinates recovery of registered
 * resources after `webglcontextlost` / `webglcontextrestored` events.
 *
 * Low-level resources ({@link Program}, {@link Framebuffer}, {@link Texture},
 * {@link Quad}) register themselves here so their underlying GL handles can
 * be rebuilt after a context loss.
 * @internal
 */
export class GLContext {
    gl: WebGL2RenderingContext;
    canvas: HTMLCanvasElement;
    maxTextureSize: number;
    /** True if `OES_texture_float_linear` is available. */
    floatLinearFilter: boolean;
    /** True between `webglcontextlost` and `webglcontextrestored`. */
    isContextLost = false;

    #resources = new Set<Restorable>();
    #onLost = new Set<() => void>();
    #onRestored = new Set<() => void>();

    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext("webgl2", {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
        });
        if (!gl) {
            throw new Error("[VFX-JS] WebGL2 is not available.");
        }
        this.gl = gl;
        this.canvas = canvas;
        gl.getExtension("EXT_color_buffer_float");
        gl.getExtension("EXT_color_buffer_half_float");
        this.floatLinearFilter = !!gl.getExtension("OES_texture_float_linear");
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

        canvas.addEventListener("webglcontextlost", this.#handleLost, false);
        canvas.addEventListener(
            "webglcontextrestored",
            this.#handleRestored,
            false,
        );
    }

    setSize(width: number, height: number, pixelRatio: number): void {
        const w = Math.floor(width * pixelRatio);
        const h = Math.floor(height * pixelRatio);
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
    }

    addResource(r: Restorable): void {
        this.#resources.add(r);
    }

    removeResource(r: Restorable): void {
        this.#resources.delete(r);
    }

    /** Subscribe to context-lost events. Returns an unsubscribe function. */
    onContextLost(cb: () => void): () => void {
        this.#onLost.add(cb);
        return () => this.#onLost.delete(cb);
    }

    /** Subscribe to context-restored events. Returns an unsubscribe function. */
    onContextRestored(cb: () => void): () => void {
        this.#onRestored.add(cb);
        return () => this.#onRestored.delete(cb);
    }

    #handleLost = (event: Event): void => {
        // Without preventDefault the browser will not attempt to restore.
        event.preventDefault();
        this.isContextLost = true;
        for (const cb of this.#onLost) {
            cb();
        }
    };

    #handleRestored = (): void => {
        this.isContextLost = false;
        // Re-float extensions (fresh context).
        const gl = this.gl;
        gl.getExtension("EXT_color_buffer_float");
        gl.getExtension("EXT_color_buffer_half_float");
        for (const r of this.#resources) {
            r.restore();
        }
        for (const cb of this.#onRestored) {
            cb();
        }
    };
}
