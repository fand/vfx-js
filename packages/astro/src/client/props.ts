import type {
    AddTransitionOpts,
    RunOpts,
    TransitionEase,
    VFXProps,
} from "@vfx-js/core";
import type { ElementProps, TransitionProps } from "./attr";
import {
    resolveEase,
    resolveShader,
    resolveTransition,
    resolveUniforms,
} from "./registry";

const LOG_PREFIX = "[@vfx-js/astro]";

export {
    type ElementProps,
    type RunProps,
    splitProps,
    type TransitionProps,
    toAttr,
} from "./attr";

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

/** Link spec, else page spec, else none. */
export function pickRunOpts(
    link: RunOpts | null,
    page: RunOpts | null,
): RunOpts {
    return link ?? page ?? {};
}
