// Types and helpers the `.astro` components use on the server.
// No runtime import, so SSR never loads core or the transitions.
import type { ShaderPreset, VFXProps } from "@vfx-js/core";

/** `VFXProps` that fit in an HTML attribute. */
export type ElementProps = Omit<VFXProps, "shader" | "uniforms" | "effect"> & {
    /** A preset name, GLSL, or `"@name"` of a registered multipass shader. */
    shader?: ShaderPreset | string;
    /** Static values, or the name of registered uniforms. */
    uniforms?: Record<string, number | number[]> | string;
};

/** A run spec that fits in an HTML attribute. */
export type RunProps = {
    /** A built-in name like `"swipe"`, or a registered one. */
    transition?: string;
    /** Constructor params of the transition class. */
    params?: Record<string, unknown>;
    reverse?: boolean;
    /** Seconds. */
    duration?: number;
    overflow?: true | number;
    /** `"smoothstep"`, `"linear"`, or a registered ease. */
    ease?: string;
    /** Keep the old page playing during the run. */
    keepPlaying?: boolean;
};

/** Options of `<VFXTransition>`. */
export type TransitionProps = RunProps & {
    keepWrapped?: boolean;
    waitFor?: "media" | "none";
    /** On back, play the spec that entered the page, reversed. Needs the Navigation API. */
    autoReverse?: boolean;
};

const ELEMENT_KEYS = [
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
] as const satisfies readonly (keyof ElementProps)[];

/** Split component props into the effect props and the rest. */
export function splitProps<T extends ElementProps>(
    props: T,
): [ElementProps, Omit<T, keyof ElementProps>] {
    const effect: Record<string, unknown> = {};
    const rest: Record<string, unknown> = { ...props };
    for (const key of ELEMENT_KEYS) {
        effect[key] = rest[key];
        delete rest[key];
    }
    return [effect as ElementProps, rest as Omit<T, keyof ElementProps>];
}

/** The `data-vfx` value. Drops undefined fields. */
export function toAttr(props: ElementProps | TransitionProps): string {
    return JSON.stringify(props);
}
