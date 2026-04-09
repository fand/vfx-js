import * as THREE from "three";

/**
 * Device-derived capabilities resolved from a WebGL2 context.
 *
 * Float RT data type is FP32 when OES_texture_float_linear is available
 * (desktop, Android), FP16 otherwise (iOS Safari — WebGL2 guarantees
 * half-float linear filtering as built-in).
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

        this.floatRTType = floatLinear ? THREE.FloatType : THREE.HalfFloatType;
        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
}
