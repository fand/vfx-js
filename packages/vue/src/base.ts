import type {
    AddTransitionOpts,
    RunContext,
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
    type VNode,
    watchEffect,
} from "vue";
import {
    createScope,
    type TransitionScope,
    TransitionScopeKey,
} from "./scope.js";
import { attachVFX } from "./vfx.js";

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
    /** On back, play the spec that entered the page, reversed. Needs the Navigation API. */
    autoReverse: { type: Boolean, default: undefined },
    /** Keep the old page playing during the run. Nuxt only. */
    keepPlaying: { type: Boolean, default: undefined },
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
    "autoReverse",
    "keepPlaying",
] as const;

export type RouterContext = {
    /** The handle, or null while there is none (SSR, no WebGL). */
    handle(): TransitionHandle | null;
    scope: TransitionScope;
    /** The Vue app this component is mounted in. */
    app: App;
    /** Whether the `keepPlaying` prop is set. */
    keepPlaying(): boolean;
    /** The run that waits for the new page, while it waits. */
    held: RunContext | null;
};

/**
 * Build a `<VFXTransition>` that wires a router in `connect`.
 * `connect` runs on mount and returns its cleanup.
 */
export function defineVFXTransition(
    name: string,
    connect: (ctx: RouterContext) => () => void,
    /** Change the slot content, e.g. to pass props to the router view. */
    mapSlot?: (nodes: VNode[], ctx: RouterContext) => VNode[],
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
            const ctx: RouterContext = {
                handle: () => handle,
                scope,
                app,
                keepPlaying: () => props.keepPlaying === true,
                held: null,
            };
            let disconnect: (() => void) | null = null;
            let release: (() => void) | null = null;

            onMounted(() => {
                const element = el.value;
                if (!element) {
                    return;
                }
                // A config change replaces the VFX; a run on the old one is cut.
                release = attachVFX((vfx) => {
                    handle = vfx.addTransition(
                        element,
                        live as AddTransitionOpts,
                    );
                    return () => {
                        handle?.destroy();
                        handle = null;
                    };
                });
                disconnect = connect(ctx);
            });

            onBeforeUnmount(() => {
                disconnect?.();
                disconnect = null;
                release?.();
                release = null;
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
                        mapSlot
                            ? mapSlot(slots.default?.() ?? [], ctx)
                            : slots.default?.(),
                    ),
                ]);
        },
    });
}
