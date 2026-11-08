import type { ShaderPreset, VFXProps } from "@vfx-js/core";
import { resolveShader, resolveUniforms } from "./registry";

const LOG_PREFIX = "[@vfx-js/astro]";

/** `VFXProps` that fit in an HTML attribute. */
export type ElementProps = Omit<VFXProps, "shader" | "uniforms" | "effect"> & {
    /** A preset name, GLSL, or `"@name"` of a registered multipass shader. */
    shader?: ShaderPreset | string;
    /** Static values, or the name of registered uniforms. */
    uniforms?: Record<string, number | number[]> | string;
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
export function toAttr(props: ElementProps): string {
    return JSON.stringify(props);
}

export type Parsed = {
    /** Null when the value is invalid or a name is not registered yet. */
    props: VFXProps | null;
    /** The name that is not registered yet. */
    missing?: string;
};

/** Parse a `data-vfx` value and resolve names. */
export function fromAttr(attr: string): Parsed {
    let parsed: unknown;
    try {
        parsed = JSON.parse(attr);
    } catch {
        console.error(`${LOG_PREFIX} data-vfx is not valid JSON:`, attr);
        return { props: null };
    }
    if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
    ) {
        console.error(`${LOG_PREFIX} data-vfx must be a JSON object:`, attr);
        return { props: null };
    }

    const { shader, uniforms, ...rest } = parsed as ElementProps;
    const props: VFXProps = rest;

    if (typeof shader === "string" && shader.startsWith("@")) {
        const passes = resolveShader(shader.slice(1));
        if (!passes) {
            return { props: null, missing: `shader "${shader}"` };
        }
        props.shader = passes;
    } else if (shader !== undefined) {
        props.shader = shader;
    }

    if (typeof uniforms === "string") {
        const registered = resolveUniforms(uniforms);
        if (!registered) {
            return { props: null, missing: `uniforms "${uniforms}"` };
        }
        props.uniforms = registered;
    } else if (uniforms !== undefined) {
        props.uniforms = uniforms;
    }

    return { props };
}
