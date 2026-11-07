import { nextTick } from "vue";
import { defineVFXTransition } from "../base.js";
import { connectRouter, type RouterLike } from "../connect-router.js";
import { warnOnce } from "../scope.js";

/**
 * Animate between vue-router pages with a shader. Put it around `<RouterView />`.
 * Each path is one page.
 * The target fills the viewport height by default; pass `:fullscreen="false"` to size it yourself.
 */
export const VFXTransition = defineVFXTransition("VFXTransition", (ctx) => {
    const router = (ctx.app.config.globalProperties as { $router?: RouterLike })
        .$router;
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
});
