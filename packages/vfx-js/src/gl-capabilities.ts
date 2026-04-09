import * as THREE from "three";

/**
 * Device-derived capabilities resolved from a WebGL context. Centralizes
 * the float render target type/filter selection and other GL limits so
 * call sites do not need to probe extensions themselves.
 *
 * Resolved once in the VFXPlayer constructor and shared with every module
 * that needs to allocate a render target or clamp a texture upload.
 *
 *   - FP32 + Linear  : EXT_color_buffer_float + OES_texture_float_linear
 *   - FP16 + Linear  : EXT_color_buffer_half_float + OES_texture_half_float_linear
 *   - FP32 + Nearest : EXT_color_buffer_float only (no float linear filtering)
 *   - FP16 + Nearest : EXT_color_buffer_half_float only
 *
 * iOS Safari is the motivating case for the Nearest fallback: it exposes
 * EXT_color_buffer_(half_)float so float render targets *can* be created,
 * but lacks OES_texture_(half_)float_linear, so sampling those targets
 * with LinearFilter returns 0.
 *
 * @internal
 */
export class GLCapabilities {
    /** Texture data type for float render targets. */
    readonly floatRTType: THREE.TextureDataType;
    /** Min/mag filter for float render targets. */
    readonly floatRTFilter: THREE.MagnificationTextureFilter;
    /** GL_MAX_TEXTURE_SIZE — max width/height of any texture upload. */
    readonly maxTextureSize: number;

    /** Whether float RTs were configured with hardware LinearFilter. */
    get hasFloatLinearFilter(): boolean {
        return this.floatRTFilter === THREE.LinearFilter;
    }

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
        const colorBufferFloat = !!gl.getExtension("EXT_color_buffer_float");
        const colorBufferHalfFloat = !!gl.getExtension(
            "EXT_color_buffer_half_float",
        );
        const floatLinear = !!gl.getExtension("OES_texture_float_linear");
        const halfFloatLinear = !!gl.getExtension(
            "OES_texture_half_float_linear",
        );

        if (colorBufferFloat && floatLinear) {
            this.floatRTType = THREE.FloatType;
            this.floatRTFilter = THREE.LinearFilter;
        } else if (colorBufferHalfFloat && halfFloatLinear) {
            this.floatRTType = THREE.HalfFloatType;
            this.floatRTFilter = THREE.LinearFilter;
        } else if (colorBufferFloat) {
            this.floatRTType = THREE.FloatType;
            this.floatRTFilter = THREE.NearestFilter;
        } else if (colorBufferHalfFloat) {
            this.floatRTType = THREE.HalfFloatType;
            this.floatRTFilter = THREE.NearestFilter;
        } else {
            this.floatRTType = THREE.UnsignedByteType;
            this.floatRTFilter = THREE.LinearFilter;
        }

        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
}
