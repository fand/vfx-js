import type {
    AddTransitionOpts,
    RunOpts,
    ShaderPreset,
    TransitionEase,
    VFXProps,
} from "@vfx-js/core";
import {
    resolveEase,
    resolveShader,
    resolveTransition,
    resolveUniforms,
} from "./registry";

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
export function toAttr(props: ElementProps | TransitionProps): string {
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
};

/** Options of `<VFXTransition>`. */
export type TransitionProps = RunProps & {
    keepWrapped?: boolean;
    waitFor?: "media" | "none";
};

function toEase(name: string): TransitionEase | undefined {
    if (name === "smoothstep" || name === "linear") {
        return name;
    }
    const ease = resolveEase(name);
    if (!ease) {
        console.warn(`${LOG_PREFIX} Unknown ease: ${name}`);
    }
    return ease;
}

/**
 * Parse a transition attribute: a JSON object or a bare transition name.
 * Unknown names are dropped with a warning. Null when invalid.
 */
export function fromTransitionAttr(attr: string): AddTransitionOpts | null {
    const text = attr.trim();
    let parsed: unknown;
    if (text.startsWith("{")) {
        try {
            parsed = JSON.parse(text);
        } catch {
            console.error(
                `${LOG_PREFIX} Transition spec is not valid JSON:`,
                attr,
            );
            return null;
        }
    } else {
        parsed = { transition: text };
    }
    if (typeof parsed !== "object" || parsed === null) {
        return null;
    }

    const { transition, ease, ...rest } = parsed as TransitionProps;
    const opts: AddTransitionOpts = rest as AddTransitionOpts;
    if (transition) {
        const resolved = resolveTransition(transition);
        if (resolved) {
            opts.transition = resolved;
        } else {
            console.warn(`${LOG_PREFIX} Unknown transition: ${transition}`);
        }
    }
    if (ease) {
        const resolved = toEase(ease);
        if (resolved) {
            opts.ease = resolved;
        }
    }
    return opts;
}

/** Link spec, else page spec, else none. Back navigation plays in reverse. */
export function pickRunOpts(
    link: RunOpts | null,
    page: RunOpts | null,
    back: boolean,
): RunOpts {
    const spec = link ?? page ?? {};
    return back ? { ...spec, reverse: true } : spec;
}
