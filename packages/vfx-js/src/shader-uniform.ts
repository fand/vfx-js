import type { EffectTexture, VFXUniformValue } from "./types.js";

/** A uniform value the shader path can upload. */
export type ShaderUniformValue = Exclude<VFXUniformValue, EffectTexture>;

/**
 * Build a filter for user uniforms on the shader path.
 * It passes values through, and turns an `EffectTexture` into `null`
 * (which `Program.uploadUniforms` skips), warning on the first one.
 * @internal
 */
export function createShaderUniformFilter(): (
    value: VFXUniformValue,
) => ShaderUniformValue | null {
    let warned = false;
    return (value) => {
        if (typeof value === "object" && "__brand" in value) {
            if (!warned) {
                warned = true;
                console.warn(
                    "[VFX-JS] Texture uniforms work on the effect path only (`effect`), not with `shader`. Ignoring the value.",
                );
            }
            return null;
        }
        return value;
    };
}
