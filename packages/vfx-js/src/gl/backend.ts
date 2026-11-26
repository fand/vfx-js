import type {
    Backend,
    BackendGeometry,
    BackendProgram,
    BackendRenderTarget,
    BackendTargetGroup,
    BackendTexture,
    ClearCommand,
    DrawCommand,
    PendingRead,
    PixelReadOpts,
    RenderTargetOpts,
    ShaderSource,
    TextureSource,
    WebGLAccess,
} from "../backend.js";
import type { EffectGeometry } from "../types.js";
import { GLContext } from "./context.js";
import { Framebuffer } from "./framebuffer.js";
import { CompiledGeometry } from "./geometry.js";
import { MultiFramebuffer } from "./multi-framebuffer.js";
import { applyBlend, applyDrawState, resetDrawState } from "./pass.js";
import { Program } from "./program.js";
import { Quad } from "./quad.js";
import { PixelRead } from "./read-pixels.js";
import { Texture } from "./texture.js";

/**
 * Create a WebGL2 backend on `canvas`.
 * Throws when WebGL2 is not available.
 * @internal
 */
export function createWebGLBackend(
    canvas: HTMLCanvasElement,
    preserveDrawingBuffer: boolean,
): WebGLBackend {
    const ctx = new GLContext(canvas, preserveDrawingBuffer);
    return new WebGLBackend(ctx, new Quad(ctx));
}

/**
 * {@link Backend} over a WebGL2 context.
 * Each call binds and sets the GL state it needs.
 * @internal
 */
export class WebGLBackend implements Backend {
    readonly shaderLanguage = "glsl";
    readonly webgl: WebGLAccess;
    #ctx: GLContext;
    #gl: WebGL2RenderingContext;
    #quad: Quad;
    #maxDrawTargets: number | undefined;
    #textureUnitCount: number | undefined;

    constructor(ctx: GLContext, quad: Quad) {
        this.#ctx = ctx;
        this.#gl = ctx.gl;
        this.#quad = quad;
        this.webgl = {
            gl: ctx.gl,
            wrapTexture: (handle) =>
                new Texture(ctx, undefined, {
                    autoRegister: false,
                    externalHandle: handle,
                }),
            resetState: () => this.#resetState(),
        };
    }

    get maxTextureSize(): number {
        return this.#ctx.maxTextureSize;
    }

    /** `MAX_DRAW_BUFFERS`, queried once. */
    get maxDrawTargets(): number {
        if (this.#maxDrawTargets === undefined) {
            const gl = this.#gl;
            const n = gl.getParameter(gl.MAX_DRAW_BUFFERS);
            this.#maxDrawTargets = typeof n === "number" && n > 0 ? n : 4;
        }
        return this.#maxDrawTargets;
    }

    get isLost(): boolean {
        return this.#ctx.isContextLost;
    }

    get quad(): BackendGeometry {
        return this.#quad;
    }

    setSize(width: number, height: number, pixelRatio: number): void {
        this.#ctx.setSize(width, height, pixelRatio);
    }

    onLost(cb: () => void): () => void {
        return this.#ctx.onContextLost(cb);
    }

    onRestored(cb: () => void): () => void {
        return this.#ctx.onContextRestored(cb);
    }

    createTexture(source?: TextureSource): BackendTexture {
        return new Texture(this.#ctx, source);
    }

    uploadTexture(texture: BackendTexture): void {
        (texture as Texture).upload(0);
    }

    ownsTexture(texture: BackendTexture): boolean {
        return (texture as Partial<Texture>).gl === this.#gl;
    }

    createRenderTarget(
        width: number,
        height: number,
        opts?: RenderTargetOpts,
    ): BackendRenderTarget {
        return new Framebuffer(this.#ctx, width, height, opts);
    }

    createTargetGroup(
        members: readonly BackendRenderTarget[],
        depthSource: BackendRenderTarget | null,
    ): BackendTargetGroup {
        return new MultiFramebuffer(
            this.#ctx,
            members as readonly Framebuffer[],
            depthSource as Framebuffer | null,
        );
    }

    createProgram(source: ShaderSource): BackendProgram {
        if (source.language !== "glsl") {
            throw new Error("[VFX-JS] The WebGL backend runs GLSL only.");
        }
        return new Program(
            this.#ctx,
            source.vert,
            source.frag,
            source.glslVersion,
        );
    }

    prepare(): boolean {
        return true;
    }

    // GL runs each call right away; there is no frame to open or submit.
    beginFrame(): void {}

    endFrame(): void {}

    createGeometry(
        geometry: EffectGeometry,
        program: BackendProgram,
    ): BackendGeometry {
        return new CompiledGeometry(this.#ctx, geometry, program as Program);
    }

    draw(command: DrawCommand): void {
        const gl = this.#gl;
        const target = command.target;
        if (target instanceof MultiFramebuffer) {
            target.bind();
        } else {
            const fb = target as Framebuffer | null;
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb ? fb.fbo : null);
        }
        const vp = command.viewport;
        gl.viewport(vp.x, vp.y, vp.w, vp.h);
        gl.disable(gl.SCISSOR_TEST);
        applyBlend(gl, command.blend);

        const program = command.program as Program;
        program.use();
        program.uploadUniforms(command.uniforms);

        const drawState = command.drawState;
        if (drawState) {
            applyDrawState(gl, drawState);
        }
        const geometry = (command.geometry ?? this.#quad) as
            | Quad
            | CompiledGeometry;
        geometry.draw();
        if (drawState) {
            resetDrawState(gl);
        }

        if (target instanceof MultiFramebuffer) {
            for (const member of target.members) {
                member.markDirty();
            }
        } else {
            (target as Framebuffer | null)?.markDirty();
        }
    }

    clear(command: ClearCommand): void {
        const gl = this.#gl;
        let bits = 0;
        if (command.color) {
            gl.clearColor(0, 0, 0, 0);
            bits |= gl.COLOR_BUFFER_BIT;
        }
        if (command.depth) {
            gl.clearDepth(1);
            bits |= gl.DEPTH_BUFFER_BIT;
        }
        if (bits === 0) {
            return;
        }
        const fb = command.target as Framebuffer | null;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb ? fb.fbo : null);
        const scissor = command.scissor;
        if (scissor) {
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(scissor.x, scissor.y, scissor.w, scissor.h);
        } else {
            gl.disable(gl.SCISSOR_TEST);
        }
        gl.clear(bits);
        fb?.markDirty();
        if (scissor) {
            gl.disable(gl.SCISSOR_TEST);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    readPixels(
        target: BackendRenderTarget,
        opts: PixelReadOpts | undefined,
        onSettle: (read: PendingRead) => void,
    ): PendingRead {
        return new PixelRead(this.#gl, target as Framebuffer, opts, onSettle);
    }

    dispose(): void {
        this.#quad.dispose();
    }

    /**
     * Write the GL baseline the pipeline assumes (see
     * `EffectContext.resetState`). Write-only: no `getParameter` per
     * call. VFX-JS keeps no GL state cache, so there is nothing else to
     * invalidate.
     */
    #resetState(): void {
        const gl = this.#gl;

        // Framebuffer + viewport.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawBuffers([gl.BACK]);
        gl.readBuffer(gl.BACK);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        // Capabilities.
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        gl.disable(gl.SAMPLE_COVERAGE);

        // Masks and fixed-function settings.
        gl.depthMask(true);
        gl.clearColor(0, 0, 0, 0);
        gl.depthFunc(gl.LESS);
        gl.colorMask(true, true, true, true);
        gl.stencilMask(0xffffffff);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);

        // Program, VAO and buffer bindings.
        gl.useProgram(null);
        gl.bindVertexArray(null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        gl.bindBuffer(gl.COPY_READ_BUFFER, null);
        gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);

        // Samplers override texture params, so unbind them on every unit.
        const units = this.#getTextureUnitCount();
        for (let i = 0; i < units; i++) {
            gl.bindSampler(i, null);
        }
        gl.activeTexture(gl.TEXTURE0);

        // Pixel store (WebGL defaults).
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(
            gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
            gl.BROWSER_DEFAULT_WEBGL,
        );
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
        gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 0);
        gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
        gl.pixelStorei(gl.PACK_ROW_LENGTH, 0);
        gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0);
        gl.pixelStorei(gl.PACK_SKIP_ROWS, 0);
    }

    /** `MAX_COMBINED_TEXTURE_IMAGE_UNITS`, queried once. */
    #getTextureUnitCount(): number {
        if (this.#textureUnitCount === undefined) {
            const gl = this.#gl;
            const n = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
            this.#textureUnitCount = typeof n === "number" && n > 0 ? n : 16;
        }
        return this.#textureUnitCount;
    }
}
