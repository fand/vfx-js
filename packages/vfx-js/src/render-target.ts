import {
    DEFAULT_VERTEX_SHADER,
    DEFAULT_VERTEX_SHADER_100,
} from "./constants.js";
import type { GLContext } from "./gl/context.js";
import { Framebuffer } from "./gl/framebuffer.js";
import { type BlendMode, Pass } from "./gl/pass.js";
import {
    type GlslVersion,
    type Uniforms,
    detectGlslVersion,
} from "./gl/program.js";

/**
 * Create a framebuffer matching the options passed to element/post-effect passes.
 * @internal
 */
export function createRenderTarget(
    ctx: GLContext,
    width: number,
    height: number,
    opts: { float?: boolean } = {},
): Framebuffer {
    return new Framebuffer(ctx, width, height, { float: opts.float ?? false });
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
    ctx: GLContext,
    opts: {
        vertexShader?: string;
        fragmentShader: string;
        uniforms: Uniforms;
        /** True when this pass renders into an intermediate RT. */
        renderingToBuffer?: boolean;
        premultipliedAlpha?: boolean;
        glslVersion?: GlslVersion;
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
    const glslVersion =
        opts.glslVersion ?? detectGlslVersion(opts.fragmentShader);
    const vertexShader =
        opts.vertexShader ??
        (glslVersion === "100"
            ? DEFAULT_VERTEX_SHADER_100
            : DEFAULT_VERTEX_SHADER);
    return new Pass(
        ctx,
        vertexShader,
        opts.fragmentShader,
        opts.uniforms,
        blend,
        glslVersion,
    );
}
