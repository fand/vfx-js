import type { GLContext } from "./context.js";
import type { Framebuffer } from "./framebuffer.js";
import { type GlslVersion, Program, type Uniforms } from "./program.js";
import type { Quad } from "./quad.js";

/**
 * Blending preset for a {@link Pass}.
 *   - `"normal"`: non-premultiplied (SRC_ALPHA, ONE_MINUS_SRC_ALPHA).
 *     Equivalent to Three.js NormalBlending with premultipliedAlpha=false.
 *   - `"premultiplied"`: premultiplied (ONE, ONE_MINUS_SRC_ALPHA).
 *     Equivalent to Three.js NormalBlending with premultipliedAlpha=true.
 *   - `"additive"`: premultiplied additive (ONE, ONE). Source RGB and
 *     alpha both accumulate onto the destination — overlapping
 *     fragments brighten.
 *   - `"none"`: BLEND disabled. Used when rendering to an intermediate
 *     buffer so output is not blended against previous contents.
 * @internal
 */
export type BlendMode = "normal" | "premultiplied" | "additive" | "none";

/** @internal */
export class Pass {
    gl: WebGL2RenderingContext;
    program: Program;
    uniforms: Uniforms;
    blend: BlendMode;

    constructor(
        ctx: GLContext,
        vertSrc: string,
        fragSrc: string,
        uniforms: Uniforms,
        blend: BlendMode,
        glslVersion?: GlslVersion,
    ) {
        this.gl = ctx.gl;
        this.program = new Program(ctx, vertSrc, fragSrc, glslVersion);
        this.uniforms = uniforms;
        this.blend = blend;
    }

    dispose(): void {
        this.program.dispose();
    }
}

type ViewportRect = { x: number; y: number; w: number; h: number };

/**
 * Render `pass` into `target` (or the canvas if null) over `viewport`.
 * Applies clipping and blend state, uploads uniforms, and draws the quad.
 * @internal
 */
export function renderPass(
    gl: WebGL2RenderingContext,
    quad: Quad,
    pass: Pass,
    target: Framebuffer | null,
    viewport: ViewportRect,
    canvasW: number,
    canvasH: number,
    pixelRatio: number,
): void {
    const targetCssW = target ? target.width / pixelRatio : canvasW;
    const targetCssH = target ? target.height / pixelRatio : canvasH;
    const cx1 = Math.max(0, viewport.x);
    const cy1 = Math.max(0, viewport.y);
    const cx2 = Math.min(targetCssW, viewport.x + viewport.w);
    const cy2 = Math.min(targetCssH, viewport.y + viewport.h);
    const cw = cx2 - cx1;
    const ch = cy2 - cy1;
    if (cw <= 0 || ch <= 0) {
        return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(
        Math.round(cx1 * pixelRatio),
        Math.round(cy1 * pixelRatio),
        Math.round(cw * pixelRatio),
        Math.round(ch * pixelRatio),
    );
    applyBlend(gl, pass.blend);

    pass.program.use();
    pass.program.uploadUniforms(pass.uniforms);
    quad.draw();
}

/** @internal */
export function applyBlend(gl: WebGL2RenderingContext, mode: BlendMode): void {
    if (mode === "none") {
        gl.disable(gl.BLEND);
        return;
    }
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    if (mode === "premultiplied") {
        gl.blendFuncSeparate(
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
        );
    } else if (mode === "additive") {
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
    } else {
        gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
        );
    }
}
