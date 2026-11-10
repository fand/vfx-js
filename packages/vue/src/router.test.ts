// @vitest-environment happy-dom
import type { RunOpts, Transition } from "@vfx-js/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    type App,
    type Component,
    createApp,
    defineComponent,
    h,
    ref,
} from "vue";
import { setNextTransition, takePending } from "./pending.js";
import { VFXTransition } from "./router/index.js";
import { useTransitionIn } from "./use-transition-in.js";

type Run = {
    cb: () => void | Promise<void>;
    opts: () => RunOpts;
    done: Promise<void>;
    // What the page showed when the run let go.
    endText: string | null;
};

const mock = vi.hoisted(() => {
    const runs: Run[] = [];
    const handle = {
        run(cb: Run["cb"], opts: Run["opts"]) {
            let resolve!: () => void;
            const done = new Promise<void>((r) => {
                resolve = r;
            });
            const run: Run = { cb, opts, done, endText: null };
            runs.push(run);
            // Like core: call cb (after the snapshot), then read opts.
            return Promise.resolve()
                .then(cb)
                .then(() => {
                    run.endText = document.body.textContent;
                    resolve();
                });
        },
        cancel: vi.fn(),
        destroy: vi.fn(),
        running: false,
    };
    const vfx = {
        addTransition: vi.fn(() => handle),
        stop: vi.fn(),
        destroy: vi.fn(),
    };
    const init = vi.fn(() => vfx);
    return { runs, handle, vfx, init };
});

vi.mock("@vfx-js/core", () => ({ VFX: { init: mock.init } }));

class Swipe implements Transition {
    readonly name = "swipe";
}
class Zoom implements Transition {
    readonly name = "zoom";
}

type Location = { path: string; matched?: unknown[] };
type Guard = (to: Location, from: Location) => unknown;
type AfterGuard = (to: Location, from: Location, failure?: unknown) => unknown;

const Home = defineComponent({ setup: () => () => h("p", "home") });
const About = defineComponent({
    setup() {
        useTransitionIn({ transition: Zoom });
        return () => h("p", "about");
    },
});

// Like vue-router: guards, then the route changes, then afterEach.
// <RouterView> renders the new page on the next flush.
function fakeRouter(page: { value: Component }) {
    const before = new Set<Guard>();
    const after = new Set<AfterGuard>();
    return {
        router: {
            beforeEach(g: Guard) {
                before.add(g);
                return () => before.delete(g);
            },
            afterEach(g: AfterGuard) {
                after.add(g);
                return () => after.delete(g);
            },
        },
        before,
        async navigate(
            from: Location,
            to: Location,
            next: Component,
            position?: number,
        ) {
            if (position !== undefined) {
                window.history.replaceState({ position }, "");
            }
            await Promise.all([...before].map((g) => g(to, from)));
            page.value = next;
            for (const g of after) {
                g(to, from);
            }
        },
        async startOnly(from: string, to: string) {
            await Promise.all(
                [...before].map((g) => g({ path: to }, { path: from })),
            );
        },
        fail(from: string, to: string) {
            for (const g of after) {
                g({ path: to }, { path: from }, new Error("aborted"));
            }
        },
    };
}

describe("VFXTransition (router)", () => {
    let container: HTMLElement;
    let app: App | null;
    let router: ReturnType<typeof fakeRouter>;
    const page = ref<Component>(Home);

    function mount(props: Record<string, unknown> = {}, withRouter = true) {
        app = createApp({
            render: () =>
                h(VFXTransition, props, { default: () => h(page.value) }),
        });
        if (withRouter) {
            app.config.globalProperties.$router = router.router;
        }
        app.mount(container);
    }

    async function go(from: string, to: string, next: Component, pos = 1) {
        await router.navigate({ path: from }, { path: to }, next, pos);
        const run = mock.runs[mock.runs.length - 1];
        await run.done;
        return run;
    }

    beforeEach(() => {
        mock.runs.length = 0;
        mock.init.mockClear();
        mock.vfx.destroy.mockClear();
        mock.handle.destroy.mockClear();
        mock.handle.cancel.mockClear();
        takePending();
        page.value = Home;
        router = fakeRouter(page);
        window.history.replaceState({ position: 0 }, "");
        container = document.createElement("div");
        document.body.appendChild(container);
        app = null;
    });
    afterEach(async () => {
        app?.unmount();
        container.remove();
        // Let the shared VFX go, so each test starts without one.
        await new Promise((r) => requestAnimationFrame(r));
    });

    it("passes autoReverse to core", () => {
        mount({ autoReverse: true });
        const opts = (mock.vfx.addTransition.mock.lastCall as unknown[])[1];
        expect(opts).toEqual({ autoReverse: true });
    });

    it("holds the navigation until the run calls cb", async () => {
        mount();
        let passed = false;
        const nav = router.startOnly("/", "/about").then(() => {
            passed = true;
        });
        expect(mock.runs).toHaveLength(1);
        expect(passed).toBe(false);
        await nav;
        expect(passed).toBe(true);
    });

    it("ends the run after afterEach and a tick, with the new page in", async () => {
        mount();
        const run = await go("/", "/about", About);
        expect(run.endText).toBe("about");
    });

    it("uses the page spec", async () => {
        mount();
        const run = await go("/", "/about", About);
        expect(run.opts()).toEqual({ transition: Zoom });
    });

    it("lets a link spec win over the page spec", async () => {
        mount();
        setNextTransition({ transition: Swipe });
        const run = await go("/", "/about", About);
        expect(run.opts()).toEqual({ transition: Swipe });
    });

    it("falls back to {} so the props apply", async () => {
        mount({ transition: Swipe });
        const run = await go("/", "/home2", Home);
        expect(run.opts()).toEqual({});
    });

    it("does not reverse on back", async () => {
        window.history.replaceState({ position: 2 }, "");
        mount();
        const run = await go("/about", "/", Home, 1);
        expect(run.opts()).toEqual({});
    });

    it("frees the run of a dropped navigation", async () => {
        mount();
        await router.startOnly("/", "/a");
        const first = mock.runs[0];
        await router.startOnly("/", "/b");
        await first.done;
        expect(mock.runs).toHaveLength(2);
        expect(mock.handle.cancel).not.toHaveBeenCalled();
    });

    it("cancels the run of a navigation a later guard aborts", async () => {
        mount();
        await router.startOnly("/", "/a");
        const run = mock.runs[0];
        let heldAtCancel = false;
        mock.handle.cancel.mockImplementationOnce(() => {
            heldAtCancel = run.endText === null;
        });
        router.fail("/", "/a");
        await run.done;
        expect(mock.handle.cancel).toHaveBeenCalledTimes(1);
        // Cancelled while held, so the run never animates.
        expect(heldAtCancel).toBe(true);
    });

    it("frees the run on unmount without cancelling", async () => {
        mount();
        await router.startOnly("/", "/a");
        app?.unmount();
        app = null;
        await mock.runs[0].done;
        expect(mock.handle.cancel).not.toHaveBeenCalled();
    });

    it("skips a navigation to the same path", async () => {
        mount();
        await router.startOnly("/a", "/a");
        expect(mock.runs).toHaveLength(0);
    });

    it("skips the first navigation", async () => {
        mount();
        await router.navigate(
            { path: "/", matched: [] },
            { path: "/about" },
            About,
        );
        expect(mock.runs).toHaveLength(0);
    });

    it("removes the router hooks on unmount", () => {
        mount();
        expect(router.before.size).toBe(1);
        app?.unmount();
        app = null;
        expect(router.before.size).toBe(0);
    });

    it("warns without a router", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mount({}, false);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("needs vue-router"),
        );
        expect(container.textContent).toBe("home");
        warn.mockRestore();
    });
});
