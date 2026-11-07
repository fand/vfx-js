import type { RunOpts } from "@vfx-js/core";
import type { InjectionKey } from "vue";
import { takePending } from "./pending.js";

/** Lets the incoming page tell its `<VFXTransition>` how it enters. */
export type TransitionScope = {
    register(spec: RunOpts): () => void;
    /** Forget the page spec before a navigation. */
    reset(): void;
    /** The spec for the run: link spec, then page spec, then `{}`. Back adds `reverse`. */
    pick(back: boolean): RunOpts;
};

export const TransitionScopeKey: InjectionKey<TransitionScope> = Symbol(
    "vfx-js-transition-scope",
);

export function createScope(): TransitionScope {
    let incoming: RunOpts | null = null;
    return {
        register(spec) {
            incoming = spec;
            return () => {
                if (incoming === spec) {
                    incoming = null;
                }
            };
        },
        reset() {
            incoming = null;
        },
        pick(back) {
            const spec = takePending() ?? incoming ?? {};
            return back ? { ...spec, reverse: true } : spec;
        },
    };
}

const warned = new Set<string>();

export function warnOnce(key: string, message: string): void {
    if (!warned.has(key)) {
        warned.add(key);
        console.warn(message);
    }
}
