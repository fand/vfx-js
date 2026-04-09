import * as THREE from "three";
import type { GLCapabilities } from "./gl-capabilities.js";

/** @internal */
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
 * Disables blending when rendering to an intermediate buffer target.
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
