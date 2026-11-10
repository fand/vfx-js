import type { RouterContext } from "./base.js";

// The parts of vue-router this package uses.
// Read from the app, not imported, so a second copy of `vue-router`
// in the bundle never gets a different instance.
type Location = { path: string; matched?: readonly unknown[] };
export type RouterLike = {
    beforeEach(guard: (to: Location, from: Location) => unknown): () => void;
    afterEach(
        guard: (to: Location, from: Location, failure?: unknown) => unknown,
    ): () => void;
};

/**
 * Run a transition for each navigation of `router`.
 * `onPageReady` calls its callback once the new page is in, and returns its cleanup.
 */
export function connectRouter(
    ctx: RouterContext,
    router: RouterLike,
    onPageReady: (ready: () => void) => () => void,
): () => void {
    let finish: (() => void) | null = null;
    // Let the held run animate to the new page.
    const free = () => {
        finish?.();
        finish = null;
    };

    const offBefore = router.beforeEach((to, from) => {
        const t = ctx.handle();
        // The first navigation has nothing on screen to leave.
        const initial = from.matched?.length === 0;
        if (!t || initial || to.path === from.path) {
            return;
        }
        // A newer navigation drops this one, so free its run.
        free();
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
                () => ctx.scope.pick(),
            ).catch((err: unknown) => {
                console.error("[@vfx-js/vue] VFXTransition run failed:", err);
            });
        });
    });
    const offAfter = router.afterEach((_to, _from, failure) => {
        // The page did not change, so end the run without animating.
        if (failure && finish) {
            ctx.handle()?.cancel();
            free();
        }
    });
    const offReady = onPageReady(free);

    return () => {
        offBefore();
        offAfter();
        offReady();
        free();
    };
}
