import type { VFXProps } from "@vfx-js/core";

const VFX_PROP_KEYS: readonly (keyof VFXProps)[] = [
    "shader",
    "release",
    "uniforms",
    "overlay",
    "intersection",
    "overflow",
    "wrap",
    "zIndex",
    "backbuffer",
    "autoCrop",
    "glslVersion",
    "effect",
] as const;

export function splitVFXProps<T extends VFXProps>(
    props: T,
): { vfxProps: VFXProps; domProps: Omit<T, keyof VFXProps> } {
    const vfxProps: Record<string, unknown> = {};
    const domProps: Record<string, unknown> = {};

    for (const key of Object.keys(props)) {
        if (VFX_PROP_KEYS.includes(key as keyof VFXProps)) {
            vfxProps[key] = (props as Record<string, unknown>)[key];
        } else {
            domProps[key] = (props as Record<string, unknown>)[key];
        }
    }

    return {
        vfxProps: vfxProps as VFXProps,
        domProps: domProps as Omit<T, keyof VFXProps>,
    };
}
