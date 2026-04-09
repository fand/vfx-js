import * as THREE from "three";
import type { GLCapabilities } from "./gl-capabilities.js";

/**
 * Create a `THREE.WebGLRenderTarget` configured according to the device's
 * GL capabilities. Use this everywhere instead of `new WebGLRenderTarget`
 * so that float type/filter selection lives in one place.
 *
 * For float RTs the type/filter come from `caps`, falling back to FP16 +
 * Nearest on devices (notably iOS Safari) that lack `*_texture_float_linear`.
 *
 * @internal
 */
export function createRenderTarget(
    caps: GLCapabilities,
    width: number,
    height: number,
    opts: { float?: boolean } = {},
): THREE.WebGLRenderTarget {
    const float = opts.float ?? false;
    return new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: float ? caps.floatRTType : THREE.UnsignedByteType,
    });
}

/**
 * Create a `THREE.RawShaderMaterial` for a fullscreen pass.
 *
 * Centralizes the rule that passes writing to an intermediate buffer
 * target must disable blending: blending into a float render target
 * requires the `EXT_float_blend` extension which iOS Safari does not
 * provide, and intermediate compute-style passes (e.g. fluid sim) want
 * to write their output directly without blending against previous
 * contents.
 *
 * @internal
 */
export function createPassMaterial(opts: {
    vertexShader: string;
    fragmentShader: string;
    uniforms: { [name: string]: THREE.IUniform };
    glslVersion?: THREE.GLSLVersion;
    /** True when this material renders into an intermediate RT. */
    renderingToBuffer?: boolean;
    premultipliedAlpha?: boolean;
}): THREE.RawShaderMaterial {
    const renderingToBuffer = opts.renderingToBuffer ?? false;
    return new THREE.RawShaderMaterial({
        vertexShader: opts.vertexShader,
        fragmentShader: opts.fragmentShader,
        uniforms: opts.uniforms,
        glslVersion: opts.glslVersion,
        transparent: !renderingToBuffer,
        blending: renderingToBuffer ? THREE.NoBlending : THREE.NormalBlending,
        premultipliedAlpha: opts.premultipliedAlpha,
    });
}
