import { defineVFXTransition } from "../base.js";
import { connectRouter, type RouterLike } from "../connect-router.js";

// Read from the app, not imported, so a second copy of `nuxt`
// in the bundle never gets a different instance.
type NuxtAppLike = {
    hook(name: "page:finish", fn: () => void): () => void;
};

/**
 * Animate between Nuxt pages with a shader. Put it around `<NuxtPage />`.
 * Each path is one page.
 * The target fills the viewport height by default; pass `:fullscreen="false"` to size it yourself.
 */
export const VFXTransition = defineVFXTransition("VFXTransition", (ctx) => {
    const nuxtApp = (ctx.app as { $nuxt?: NuxtAppLike }).$nuxt;
    const router = (ctx.app.config.globalProperties as { $router?: RouterLike })
        .$router;
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
});
