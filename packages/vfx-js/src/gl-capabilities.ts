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
    /** Texture data type for float render targets. */
    readonly floatRTType: THREE.TextureDataType;
    /** Min/mag filter for float render targets. */
    readonly floatRTFilter: THREE.MagnificationTextureFilter;
    /** GL_MAX_TEXTURE_SIZE — max width/height of any texture upload. */
    readonly maxTextureSize: number;

    constructor(gl: WebGL2RenderingContext) {
        gl.getExtension("EXT_color_buffer_float");
        gl.getExtension("EXT_color_buffer_half_float");
        const floatLinear = !!gl.getExtension("OES_texture_float_linear");

        if (floatLinear) {
            this.floatRTType = THREE.FloatType;
            this.floatRTFilter = THREE.LinearFilter;
        } else {
            // WebGL2 guarantees half-float linear filtering as built-in
            // (OES_texture_half_float_linear is core). iOS Safari lands
            // here: it lacks OES_texture_float_linear but FP16+Linear
            // works without the extension.
            this.floatRTType = THREE.HalfFloatType;
            this.floatRTFilter = THREE.LinearFilter;
        }

        this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
}
