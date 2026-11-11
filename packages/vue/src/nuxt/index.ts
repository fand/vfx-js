import { cloneVNode, type VNode } from "vue";
import { defineVFXTransition, type RouterContext } from "../base.js";
import { connectRouter, type RouterLike } from "../connect-router.js";

// Read from the app, not imported, so a second copy of `nuxt`
// in the bundle never gets a different instance.
type NuxtAppLike = {
    hook(name: "page:finish", fn: () => void): () => void;
};

// A page transition that hands the leaving page to core and ends when core gives it back.
function keepingTransition(ctx: RouterContext) {
    return {
        css: false,
        // Both pages are in the DOM at once, so the new one is captured during the run.
        mode: "default",
        onLeave(el: Element, done: () => void) {
            const parent = el.parentNode;
            ctx.held?.keepPrev(el, () => done());
            // Core keeps nothing when the run does not use liveFrom.
            if (el.parentNode === parent) {
                done();
            }
        },
    };
}

const transitions = new WeakMap<
    RouterContext,
    ReturnType<typeof keepingTransition>
>();

// <NuxtPage> needs the transition from its first render, so its first leave runs it.
function withKeepingTransition(nodes: VNode[], ctx: RouterContext): VNode[] {
    if (!ctx.liveFrom()) {
        return nodes;
    }
    let transition = transitions.get(ctx);
    if (!transition) {
        transition = keepingTransition(ctx);
        transitions.set(ctx, transition);
    }
    return nodes.map((node) =>
        (node.type as { name?: string }).name === "NuxtPage"
            ? cloneVNode(node, { transition })
            : node,
    );
}

/**
 * Animate between Nuxt pages with a shader. Put it around `<NuxtPage />`.
 * Each path is one page.
 * The target fills the viewport height by default; pass `:fullscreen="false"` to size it yourself.
 */
export const VFXTransition = defineVFXTransition(
    "VFXTransition",
    (ctx) => {
        const nuxtApp = (ctx.app as { $nuxt?: NuxtAppLike }).$nuxt;
        const router = (
            ctx.app.config.globalProperties as { $router?: RouterLike }
        ).$router;
        if (!nuxtApp || !router) {
            console.warn(
                "[@vfx-js/vue] VFXTransition from @vfx-js/vue/nuxt needs a Nuxt app with pages.",
            );
            return () => {};
        }
        // Comes after the new page's setup and render.
        return connectRouter(ctx, router, (ready) =>
            nuxtApp.hook("page:finish", ready),
        );
    },
    withKeepingTransition,
);
