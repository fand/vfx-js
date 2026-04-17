/**
 * Fullscreen quad. Builds a single VAO with a position buffer that
 * covers NDC (-1..1). Attribute name "position" is bound to location 0
 * on every shader program (see {@link Program}) so this VAO can be
 * shared across all passes.
 * @internal
 */
export class Quad {
    gl: WebGL2RenderingContext;
    vao: WebGLVertexArrayObject;
    #buffer: WebGLBuffer;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        const vao = gl.createVertexArray();
        const buffer = gl.createBuffer();
        if (!vao || !buffer) {
            throw new Error("[VFX-JS] Failed to create quad VAO");
        }
        this.vao = vao;
        this.#buffer = buffer;

        // Two triangles covering NDC.
        const verts = new Float32Array([
            -1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0,
        ]);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    draw(): void {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    dispose(): void {
        this.gl.deleteVertexArray(this.vao);
        this.gl.deleteBuffer(this.#buffer);
    }
}
