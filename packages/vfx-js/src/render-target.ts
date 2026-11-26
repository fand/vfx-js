import type {
    Backend,
    BackendProgram,
    BackendRenderTarget,
    BlendMode,
    Uniforms,
} from "./backend.js";
import {
    DEFAULT_VERTEX_SHADER,
    DEFAULT_VERTEX_SHADER_100,
} from "./constants.js";
import { detectGlslVersion, type GlslVersion } from "./glsl-version.js";

/**
 * A fullscreen shader pass: program, uniforms and blend mode.
 * @internal
 */
export type Pass = {
    program: BackendProgram;
    uniforms: Uniforms;
    blend: BlendMode;
    dispose(): void;
};

/** @internal */
export function createPass(
    backend: Backend,
    vertSrc: string,
    fragSrc: string,
    uniforms: Uniforms,
    blend: BlendMode,
    glslVersion?: GlslVersion,
): Pass {
    const program = backend.createProgram({
        language: "glsl",
        vert: vertSrc,
        frag: fragSrc,
        glslVersion,
    });
    return { program, uniforms, blend, dispose: () => program.dispose() };
}

/**
 * Create a framebuffer matching the options passed to element/post-effect passes.
 * @internal
 */
export function createRenderTarget(
    backend: Backend,
    width: number,
    height: number,
    opts: { float?: boolean } = {},
): BackendRenderTarget {
    return backend.createRenderTarget(width, height, {
        float: opts.float ?? false,
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
    backend: Backend,
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
    return createPass(
        backend,
        vertexShader,
        opts.fragmentShader,
        opts.uniforms,
        blend,
        glslVersion,
    );
}
