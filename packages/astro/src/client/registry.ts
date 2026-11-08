import type {
    Transition,
    TransitionClass,
    VFXOpts,
    VFXPass,
    VFXProps,
} from "@vfx-js/core";
import * as builtInTransitions from "@vfx-js/transitions";

type VFXUniforms = NonNullable<VFXProps["uniforms"]>;

export type TransitionLike = Transition | TransitionClass;

export type RegisterOpts = {
    transitions?: Record<string, TransitionLike>;
    uniforms?: Record<string, VFXUniforms>;
    shaders?: Record<string, VFXPass[]>;
    eases?: Record<string, (x: number) => number>;
    /** Options of the page's VFX. Applies only before it is made. */
    vfx?: VFXOpts;
};

const transitions = new Map<string, TransitionLike>();
const uniforms = new Map<string, VFXUniforms>();
const shaders = new Map<string, VFXPass[]>();
const eases = new Map<string, (x: number) => number>();
let vfxOpts: VFXOpts = {};
let vfxMade = false;
const listeners = new Set<() => void>();

// Classes from `@vfx-js/transitions`, by lowercase class name.
const builtIns = new Map<string, TransitionLike>();
for (const [name, value] of Object.entries(builtInTransitions)) {
    if (typeof value === "function" && /^[A-Z]/.test(name)) {
        builtIns.set(name.toLowerCase(), value as TransitionLike);
    }
}

function addAll<T>(map: Map<string, T>, entries?: Record<string, T>): void {
    for (const [name, value] of Object.entries(entries ?? {})) {
        map.set(name, value);
    }
}

/**
 * Register things that `.astro` props refer to by name.
 * Call it in the layout `<script>`.
 * Elements that wait for a name start once it is registered.
 */
export function registerVFX(opts: RegisterOpts): void {
    addAll(transitions, opts.transitions);
    addAll(uniforms, opts.uniforms);
    addAll(shaders, opts.shaders);
    addAll(eases, opts.eases);
    if (opts.vfx) {
        if (vfxMade) {
            console.warn(
                "[@vfx-js/astro] registerVFX: the VFX already exists, so the `vfx` options are ignored. Call registerVFX before any element.",
            );
        }
        vfxOpts = { ...vfxOpts, ...opts.vfx };
    }
    for (const listener of listeners) {
        listener();
    }
}

/** Call `listener` after each `registerVFX`. Returns the unsubscribe. */
export function onRegister(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** A registered transition, else a built-in one. */
export function resolveTransition(name: string): TransitionLike | undefined {
    return transitions.get(name) ?? builtIns.get(name);
}

export function resolveUniforms(name: string): VFXUniforms | undefined {
    return uniforms.get(name);
}

export function resolveShader(name: string): VFXPass[] | undefined {
    return shaders.get(name);
}

export function resolveEase(name: string): ((x: number) => number) | undefined {
    return eases.get(name);
}

/** Read once, when the VFX is made. */
export function takeVFXOpts(): VFXOpts {
    vfxMade = true;
    return vfxOpts;
}

/** Clear everything. For tests. */
export function resetRegistry(): void {
    transitions.clear();
    uniforms.clear();
    shaders.clear();
    eases.clear();
    vfxOpts = {};
    vfxMade = false;
}
