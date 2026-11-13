import {
    type Component,
    cloneVNode,
    h,
    isVNode,
    nextTick,
    Transition,
    type VNode,
} from "vue";
import { defineVFXTransition, type RouterContext } from "../base.js";
import { connectRouter, type RouterLike } from "../connect-router.js";
import { type KeepingTransition, keepingTransition } from "../keep-playing.js";
import { warnOnce } from "../scope.js";

// What <RouterView> passes to its slot.
type ViewSlotProps = { Component?: VNode; route: { path: string } };
type ViewSlot = (props: ViewSlotProps) => unknown;

// The one page vnode a slot returned, or null.
function onePage(content: unknown): VNode | null {
    const nodes = (Array.isArray(content) ? content : [content]).filter(
        (node) => node != null,
    );
    return nodes.length === 1 && isVNode(nodes[0]) ? nodes[0] : null;
}

// Render the page in a <Transition>, keyed by path, so each path change leaves the old page.
function wrapRouterView(view: VNode, transition: KeepingTransition): VNode {
    const own = (view.children as { default?: ViewSlot } | null)?.default;
    return h(
        view.type as Component,
        { ...view.props, key: view.key ?? undefined },
        {
            default: (slotProps: ViewSlotProps) => {
                const content = own ? own(slotProps) : slotProps.Component;
                if (content == null) {
                    return null;
                }
                const page = onePage(content);
                if (!page) {
                    warnOnce(
                        "router-view-slot",
                        "[@vfx-js/vue] keepPlaying needs the <RouterView> slot to render one page.",
                    );
                    return content;
                }
                return h(Transition, transition, () =>
                    cloneVNode(page, { key: slotProps.route.path }),
                );
            },
        },
    );
}

// <RouterView> needs the transition from its first render, so its first leave runs it.
function withKeepingTransition(nodes: VNode[], ctx: RouterContext): VNode[] {
    if (!ctx.keepPlaying()) {
        return nodes;
    }
    const transition = keepingTransition(ctx);
    return nodes.map((node) =>
        (node.type as { name?: string }).name === "RouterView"
            ? wrapRouterView(node, transition)
            : node,
    );
}

/**
 * Animate between vue-router pages with a shader. Put it around `<RouterView />`.
 * Each path is one page.
 * The target fills the viewport height by default; pass `:fullscreen="false"` to size it yourself.
 */
export const VFXTransition = defineVFXTransition(
    "VFXTransition",
    (ctx) => {
        const router = (
            ctx.app.config.globalProperties as { $router?: RouterLike }
        ).$router;
        if (!router) {
            warnOnce(
                "router",
                "[@vfx-js/vue] VFXTransition from @vfx-js/vue/router needs vue-router (app.use(router)).",
            );
            return () => {};
        }
        // vue-router loads lazy pages before it confirms, so <RouterView>
        // renders the new page in the tick after afterEach.
        return connectRouter(ctx, router, (ready) =>
            router.afterEach((_to, _from, failure) => {
                if (!failure) {
                    void nextTick(ready);
                }
            }),
        );
    },
    withKeepingTransition,
);
