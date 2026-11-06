import { type RunOpts, type TransitionHandle, VFX } from "@vfx-js/core";
import { findPage } from "@vfx-js/transition-demo-shared";
import { presets } from "@vfx-js/transition-demo-shared/transitions";
import { swipe } from "@vfx-js/transitions";

const backSpec: RunOpts = { transition: swipe, reverse: true };

// Hold each navigation in `beforeEach` until `run` has the old page,
// then let `run` wait for the new page to render.
export default defineNuxtPlugin((nuxtApp) => {
    const router = useRouter();
    let transition: TransitionHandle | undefined;
    let position = window.history.state?.position ?? 0;
    let finishSwap: (() => void) | null = null;
    const releaseSwap = () => {
        finishSwap?.();
        finishSwap = null;
    };

    nuxtApp.hook("app:mounted", () => {
        const outlet = document.querySelector<HTMLElement>("main.outlet");
        if (!outlet) {
            return;
        }
        transition = new VFX().addTransition(outlet, {
            duration: 0.8,
        });
    });

    nuxtApp.hook("page:finish", releaseSwap);
    router.afterEach((_to, _from, failure) => {
        position = window.history.state?.position ?? position;
        if (failure) {
            releaseSwap();
        }
    });

    router.beforeEach((to, from) => {
        const t = transition;
        if (!t || to.path === from.path) {
            return;
        }
        // A newer navigation drops this one, so free its run.
        releaseSwap();
        // On back/forward the history entry has already changed.
        const back = (window.history.state?.position ?? position) < position;
        const opts: RunOpts = back
            ? backSpec
            : { transition: presets[findPage(to.path).transition] };
        return new Promise<void>((snapshotTaken) => {
            t.run(() => {
                snapshotTaken();
                return new Promise<void>((done) => {
                    finishSwap = done;
                });
            }, opts).catch((err) => console.error(err));
        });
    });
});
