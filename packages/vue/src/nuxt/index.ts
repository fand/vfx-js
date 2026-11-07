import { defineVFXTransition } from "../base.js";

// The parts of vue-router and the Nuxt app this file uses.
// Read from the app, not imported, so a second copy of `nuxt` or
// `vue-router` in the bundle never gets a different instance.
type Location = { path: string };
type RouterLike = {
    beforeEach(guard: (to: Location, from: Location) => unknown): () => void;
    afterEach(
        guard: (to: Location, from: Location, failure?: unknown) => unknown,
    ): () => void;
};
type NuxtAppLike = {
    hook(name: "page:finish", fn: () => void): () => void;
};

function historyPosition(): number | undefined {
    const position = (window.history.state as { position?: unknown } | null)
        ?.position;
    return typeof position === "number" ? position : undefined;
}

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

    let finish: (() => void) | null = null;
    // Let the held run animate to the new page.
    const free = () => {
        finish?.();
        finish = null;
    };
    let position = historyPosition() ?? 0;

    const offBefore = router.beforeEach((to, from) => {
        const t = ctx.handle();
        if (!t || to.path === from.path) {
            return;
        }
        // A newer navigation drops this one, so free its run.
        free();
        // On back/forward the history entry has already changed.
        const back = (historyPosition() ?? position) < position;
        ctx.scope.reset();
        // Hold the navigation until the old page is captured.
        return new Promise<void>((snapshotTaken) => {
            t.run(
                () => {
                    snapshotTaken();
                    return new Promise<void>((done) => {
                        finish = done;
                    });
                },
                // Read once the new page is in, so its useTransitionIn counts.
                () => ctx.scope.pick(back),
            ).catch((err: unknown) => {
                console.error("[@vfx-js/vue] VFXTransition run failed:", err);
            });
        });
    });
    const offAfter = router.afterEach((_to, _from, failure) => {
        position = historyPosition() ?? position;
        if (failure) {
            free();
        }
    });
    // Comes after the new page's setup and render.
    const offFinish = nuxtApp.hook("page:finish", free);

    return () => {
        offBefore();
        offAfter();
        offFinish();
        free();
    };
});
