/**
 * WebGL2 context wrapper. Owns the canvas's rendering context and
 * negotiates optional float texture extensions.
 * @internal
 */
export class GLContext {
    gl: WebGL2RenderingContext;
    canvas: HTMLCanvasElement;
    maxTextureSize: number;
    /** True if `OES_texture_float_linear` is available. */
    floatLinearFilter: boolean;

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
    }

    setSize(width: number, height: number, pixelRatio: number): void {
        const w = Math.floor(width * pixelRatio);
        const h = Math.floor(height * pixelRatio);
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
    }
}
