import { DEFAULT_VERTEX_SHADER } from "./constants.js";
import { Framebuffer } from "./gl/framebuffer.js";
import { type BlendMode, Pass } from "./gl/pass.js";
import type { Uniforms } from "./gl/program.js";

/**
 * Create a framebuffer matching the options passed to element/post-effect passes.
 * @internal
 */
export function createRenderTarget(
    gl: WebGL2RenderingContext,
    floatLinearFilter: boolean,
    width: number,
    height: number,
    opts: { float?: boolean } = {},
): Framebuffer {
    return new Framebuffer(gl, width, height, {
        float: opts.float ?? false,
        floatLinearFilter,
    });
}

/**
 * Create a {@link Pass} for a fullscreen render. Maps the old
 * `createPassMaterial` behaviour:
 *   - Rendering to an intermediate buffer → NoBlending.
 *   - Rendering to the screen with `premultipliedAlpha` → premultiplied blend.
 *   - Otherwise (element passes) → non-premultiplied normal blend.
 * @internal
 */
export function createPassMaterial(
    gl: WebGL2RenderingContext,
    opts: {
        vertexShader?: string;
        fragmentShader: string;
        uniforms: Uniforms;
        /** True when this pass renders into an intermediate RT. */
        renderingToBuffer?: boolean;
        premultipliedAlpha?: boolean;
    },
): Pass {
    const renderingToBuffer = opts.renderingToBuffer ?? false;
    let blend: BlendMode;
    if (renderingToBuffer) {
        blend = "none";
    } else if (opts.premultipliedAlpha) {
        blend = "premultiplied";
    } else {
        blend = "normal";
    }
    const vertexShader = opts.vertexShader ?? DEFAULT_VERTEX_SHADER;
    return new Pass(
        gl,
        vertexShader,
        opts.fragmentShader,
        opts.uniforms,
        blend,
    );
}
