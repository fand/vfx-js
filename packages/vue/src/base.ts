import type {
    AddTransitionOpts,
    TransitionEase,
    TransitionHandle,
    TransitionWaitFor,
} from "@vfx-js/core";
import {
    type App,
    type CSSProperties,
    defineComponent,
    getCurrentInstance,
    h,
    mergeProps,
    onBeforeUnmount,
    onMounted,
    type PropType,
    provide,
    ref,
    watchEffect,
} from "vue";
import {
    createScope,
    type TransitionScope,
    TransitionScopeKey,
} from "./scope.js";
import { acquireVFX, releaseVFX } from "./vfx.js";

const OUTER_STYLE: CSSProperties = { display: "contents" };
// Pages share one viewport-sized box and scroll inside it.
const FILL_STYLE: CSSProperties = { height: "100dvh", overflow: "hidden" };

/** Props of `<VFXTransition>`. The transition options are the defaults for every run. */
export const transitionProps = {
    transition: { type: null as unknown as PropType<unknown> },
    params: { type: null as unknown as PropType<unknown> },
    reverse: { type: Boolean, default: undefined },
    /** Seconds. */
    duration: Number,
    overflow: {
        type: [Boolean, Number] as PropType<true | number>,
        default: undefined,
    },
    ease: Function as PropType<TransitionEase>,
    /** Keep the element wrapped between runs. Read on mount. */
    keepWrapped: { type: Boolean, default: undefined },
    waitFor: [String, Function] as PropType<TransitionWaitFor>,
    /** Size the target to the viewport height. Default `true`; `false` leaves sizing to your CSS. */
    fullscreen: { type: Boolean, default: true },
} as const;

const OPT_KEYS = [
    "transition",
    "params",
    "reverse",
    "duration",
    "overflow",
    "ease",
    "keepWrapped",
    "waitFor",
] as const;

export type RouterContext = {
    /** The handle, or null while there is none (SSR, no WebGL). */
    handle(): TransitionHandle | null;
    scope: TransitionScope;
    /** The Vue app this component is mounted in. */
    app: App;
};

/**
 * Build a `<VFXTransition>` that wires a router in `connect`.
 * `connect` runs on mount and returns its cleanup.
 */
export function defineVFXTransition(
    name: string,
    connect: (ctx: RouterContext) => () => void,
) {
    return defineComponent({
        name,
        inheritAttrs: false,
        props: transitionProps,
        setup(props, { attrs, slots }) {
            const app = getCurrentInstance()?.appContext.app as App;
            const el = ref<HTMLElement | null>(null);
            const scope = createScope();
            provide(TransitionScopeKey, scope);

            // One options object that follows the props.
            // Core reads it on each run, so a prop change applies to the next run.
            const live: Record<string, unknown> = {};
            watchEffect(() => {
                for (const key of OPT_KEYS) {
                    const value = props[key];
                    if (value === undefined) {
                        delete live[key];
                    } else {
                        live[key] = value;
                    }
                }
            });

            let handle: TransitionHandle | null = null;
            let disconnect: (() => void) | null = null;
            let acquired = false;

            onMounted(() => {
                const element = el.value;
                if (!element) {
                    return;
                }
                const vfx = acquireVFX();
                acquired = true;
                handle =
                    vfx?.addTransition(element, live as AddTransitionOpts) ??
                    null;
                disconnect = connect({ handle: () => handle, scope, app });
            });

            onBeforeUnmount(() => {
                disconnect?.();
                disconnect = null;
                handle?.destroy();
                handle = null;
                if (acquired) {
                    acquired = false;
                    releaseVFX();
                }
            });

            // Core moves the inner div into a canvas during a run.
            // Vue removes the outer div on unmount, and that one never moves.
            return () =>
                h("div", { style: OUTER_STYLE }, [
                    h(
                        "div",
                        mergeProps(
                            props.fullscreen ? { style: FILL_STYLE } : {},
                            attrs,
                            { ref: el },
                        ),
                        slots.default?.(),
                    ),
                ]);
        },
    });
}
