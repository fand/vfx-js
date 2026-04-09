import * as THREE from "three";

/**
 * Device-derived capabilities resolved from a WebGL2 context. Centralizes
 * the float render target type/filter selection and other GL limits so
 * call sites do not need to probe extensions themselves.
 *
 *   - FP32 + Linear : OES_texture_float_linear available (desktop, Android)
 *   - FP16 + Linear : no FP32 linear, but WebGL2 guarantees half-float
 *                      linear filtering as built-in (iOS Safari)
 *
 * @internal
 */
export class GLCapabilities {
    /** Texture data type for float render targets (FloatType or HalfFloatType). */
    readonly floatRTType: THREE.TextureDataType;
    /** GL_MAX_TEXTURE_SIZE — max width/height of any texture upload. */
    readonly maxTextureSize: number;

    constructor(gl: WebGL2RenderingContext) {
        gl.getExtension("EXT_color_buffer_float");
        gl.getExtension("EXT_color_buffer_half_float");
        const floatLinear = !!gl.getExtension("OES_texture_float_linear");

        // FP32 when hardware supports float linear filtering (desktop,
        // Android), FP16 otherwise (iOS Safari — WebGL2 guarantees
        // half-float linear filtering as built-in).
        this.floatRTType = floatLinear ? THREE.FloatType : THREE.HalfFloatType;
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
}
