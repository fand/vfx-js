// @vitest-environment happy-dom
import type { RunContext, RunOpts, Transition } from "@vfx-js/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    type App,
    type Component,
    createApp,
    defineComponent,
    h,
    nextTick,
    ref,
} from "vue";
import { vTransition } from "./directive.js";
import { VFXTransition } from "./nuxt/index.js";
import { setNextTransition, takePending, transition } from "./pending.js";
import { useTransitionIn } from "./use-transition-in.js";

type Run = {
    cb: (ctx: RunContext) => void | Promise<void>;
    opts: () => RunOpts;
    done: Promise<void>;
};

const mock = vi.hoisted(() => {
    const runs: Run[] = [];
    // Core's hand-over; a test swaps in its own.
    const keep: { keepPlaying: RunContext["keepPlaying"] } = {
        keepPlaying: () => {},
    };
    const handle = {
        run(cb: Run["cb"], opts: Run["opts"]) {
            let resolve!: () => void;
            const done = new Promise<void>((r) => {
                resolve = r;
            });
            runs.push({ cb, opts, done });
            // Like core: call cb (after the snapshot), then read opts.
            return Promise.resolve()
                .then(() =>
                    cb({ keepPlaying: (...args) => keep.keepPlaying(...args) }),
                )
                .then(() => {
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
    return { runs, keep, handle, vfx, init };
});

vi.mock("@vfx-js/core", () => ({ VFX: { init: mock.init } }));

class Swipe implements Transition {
    readonly name = "swipe";
}
class Zoom implements Transition {
    readonly name = "zoom";
}

type Guard = (to: { path: string }, from: { path: string }) => unknown;
type AfterGuard = (
    to: { path: string },
    from: { path: string },
    failure?: unknown,
) => unknown;

function fakeNuxt() {
    const before = new Set<Guard>();
    const after = new Set<AfterGuard>();
    const finish = new Set<() => void>();
    const router = {
        beforeEach(g: Guard) {
            before.add(g);
            return () => before.delete(g);
        },
        afterEach(g: AfterGuard) {
            after.add(g);
            return () => after.delete(g);
        },
    };
    const nuxtApp = {
        hook(_name: string, fn: () => void) {
            finish.add(fn);
            return () => finish.delete(fn);
        },
    };
    return {
        router,
        nuxtApp,
        before,
        // Like vue-router: guards, then the history entry, then afterEach.
        async navigate(from: string, to: string, position?: number) {
            if (position !== undefined) {
                window.history.replaceState({ position }, "");
            }
            const results = [...before].map((g) =>
                g({ path: to }, { path: from }),
            );
            await Promise.all(results);
        },
        afterEach(failure?: unknown) {
            for (const g of after) {
                g({ path: "" }, { path: "" }, failure);
            }
        },
        pageFinish() {
            for (const fn of finish) {
                fn();
            }
        },
    };
}

const Home = defineComponent({ setup: () => () => h("p", "home") });
const About = defineComponent({
    setup() {
        useTransitionIn({ transition: Zoom });
        return () => h("p", "about");
    },
});

describe("VFXTransition (nuxt)", () => {
    let container: HTMLElement;
    let app: App | null;
    let nuxt: ReturnType<typeof fakeNuxt>;
    const page = ref<Component>(Home);

    function mount(props: Record<string, unknown> = {}, withNuxt = true) {
        app = createApp({
            render: () =>
                h(VFXTransition, props, { default: () => h(page.value) }),
        });
        if (withNuxt) {
            app.config.globalProperties.$router = nuxt.router;
            (app as unknown as { $nuxt: unknown }).$nuxt = nuxt.nuxtApp;
        }
        app.mount(container);
    }

    // Start a navigation, swap the page, and let Nuxt finish it.
    async function go(from: string, to: string, next: Component, pos = 1) {
        await nuxt.navigate(from, to, pos);
        page.value = next;
        await nextTick();
        nuxt.afterEach();
        nuxt.pageFinish();
        const run = mock.runs[mock.runs.length - 1];
        await run.done;
        return run.opts();
    }

    beforeEach(() => {
        mock.runs.length = 0;
        mock.init.mockClear();
        mock.vfx.destroy.mockClear();
        mock.vfx.addTransition.mockClear();
        mock.handle.destroy.mockClear();
        mock.handle.cancel.mockClear();
        takePending();
        page.value = Home;
        nuxt = fakeNuxt();
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

    it("renders the target inside a display: contents div", () => {
        mount({ class: "outlet" });
        const outer = container.firstElementChild as HTMLElement;
        const inner = outer.firstElementChild as HTMLElement;
        expect(outer.style.display).toBe("contents");
        expect(inner.className).toBe("outlet");
        // happy-dom drops `100dvh`, so check the other half.
        expect(inner.style.overflow).toBe("hidden");
        expect(inner.textContent).toBe("home");
        expect(mock.vfx.addTransition).toHaveBeenCalledWith(
            inner,
            expect.any(Object),
        );
    });

    it("leaves sizing to CSS with fullscreen false", () => {
        mount({ fullscreen: false });
        const inner = container.firstElementChild
            ?.firstElementChild as HTMLElement;
        expect(inner.getAttribute("style")).toBeNull();
    });

    it("passes props as live options", async () => {
        const duration = ref(0.5);
        app = createApp({
            render: () => h(VFXTransition, { duration: duration.value }),
        });
        app.config.globalProperties.$router = nuxt.router;
        (app as unknown as { $nuxt: unknown }).$nuxt = nuxt.nuxtApp;
        app.mount(container);
        const opts = (mock.vfx.addTransition.mock.calls[0] as unknown[])[1] as
            | Record<string, unknown>
            | undefined;
        expect(opts).toEqual({ duration: 0.5 });
        duration.value = 1;
        await nextTick();
        expect(opts).toEqual({ duration: 1 });
    });

    it("passes autoReverse to core", () => {
        mount({ autoReverse: true });
        const opts = (mock.vfx.addTransition.mock.lastCall as unknown[])[1];
        expect(opts).toEqual({ autoReverse: true });
    });

    it("shares one VFX and destroys it a frame after the last unmount", async () => {
        mount();
        const second = createApp({ render: () => h(VFXTransition) });
        second.mount(document.createElement("div"));
        expect(mock.init).toHaveBeenCalledTimes(1);
        app?.unmount();
        app = null;
        second.unmount();
        expect(mock.handle.destroy).toHaveBeenCalledTimes(2);
        expect(mock.vfx.destroy).not.toHaveBeenCalled();
        await new Promise((r) => requestAnimationFrame(r));
        expect(mock.vfx.destroy).toHaveBeenCalledTimes(1);
    });

    it("holds the navigation until the run calls cb", async () => {
        mount();
        let passed = false;
        const nav = nuxt.navigate("/", "/about").then(() => {
            passed = true;
        });
        expect(mock.runs).toHaveLength(1);
        expect(passed).toBe(false);
        await nav;
        expect(passed).toBe(true);
    });

    it("uses the page spec, read after the new page mounts", async () => {
        mount();
        expect(await go("/", "/about", About)).toEqual({ transition: Zoom });
    });

    it("lets a link spec win over the page spec", async () => {
        mount();
        setNextTransition({ transition: Swipe });
        expect(await go("/", "/about", About)).toEqual({ transition: Swipe });
    });

    it("uses the spec of a v-transition link from a template", async () => {
        app = createApp({
            components: { VFXTransition },
            directives: { transition: vTransition },
            setup: () => ({ page, spec: { transition: Swipe } }),
            template: `
                <a href="/about" v-transition="spec">About</a>
                <VFXTransition><component :is="page" /></VFXTransition>
            `,
        });
        app.config.globalProperties.$router = nuxt.router;
        (app as unknown as { $nuxt: unknown }).$nuxt = nuxt.nuxtApp;
        app.mount(container);
        container.querySelector("a")?.dispatchEvent(new MouseEvent("click"));
        expect(await go("/", "/about", About)).toEqual({ transition: Swipe });
    });

    it("falls back to {} so the props apply", async () => {
        mount({ transition: Swipe });
        expect(await go("/", "/home2", Home)).toEqual({});
    });

    it("forgets the old page spec on the next navigation", async () => {
        mount();
        await go("/", "/about", About);
        expect(await go("/about", "/", Home, 2)).toEqual({});
    });

    it("does not reverse on back", async () => {
        window.history.replaceState({ position: 2 }, "");
        mount();
        expect(await go("/about", "/", Home, 1)).toEqual({});
        expect(await go("/", "/about", About, 1)).toEqual({
            transition: Zoom,
        });
    });

    it("skips a navigation to the same path", async () => {
        mount();
        await nuxt.navigate("/a", "/a");
        expect(mock.runs).toHaveLength(0);
    });

    it("frees the run of a dropped navigation", async () => {
        mount();
        await nuxt.navigate("/", "/a");
        const first = mock.runs[0];
        await nuxt.navigate("/", "/b");
        await first.done;
        expect(mock.runs).toHaveLength(2);
    });

    it("frees the run of a failed navigation", async () => {
        mount();
        await nuxt.navigate("/", "/a");
        nuxt.afterEach(new Error("aborted"));
        await mock.runs[0].done;
        expect(mock.handle.cancel).toHaveBeenCalledTimes(1);
    });

    it("removes the router hooks on unmount", () => {
        mount();
        expect(nuxt.before.size).toBe(1);
        app?.unmount();
        app = null;
        expect(nuxt.before.size).toBe(0);
    });

    it("warns without a Nuxt app", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mount({}, false);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("needs a Nuxt app"),
        );
        warn.mockRestore();
    });

    describe("keepPlaying", () => {
        type PageTransition = {
            css: boolean;
            mode: string;
            onLeave(el: Element, done: () => void): void;
        };
        let seen: { transition?: PageTransition } = {};
        const NuxtPage = defineComponent({
            name: "NuxtPage",
            props: { transition: Object },
            setup(props) {
                return () => {
                    seen = { transition: props.transition as PageTransition };
                    return h("p", "page");
                };
            },
        });
        const mountWithPage = (props: Record<string, unknown>) => {
            app = createApp({
                render: () =>
                    h(VFXTransition, props, { default: () => h(NuxtPage) }),
            });
            app.config.globalProperties.$router = nuxt.router;
            (app as unknown as { $nuxt: unknown }).$nuxt = nuxt.nuxtApp;
            app.mount(container);
        };
        const leaving = () => {
            const parent = document.createElement("div");
            const el = document.createElement("section");
            parent.append(el);
            return el;
        };

        beforeEach(() => {
            seen = {};
            mock.keep.keepPlaying = () => {};
        });

        it("gives <NuxtPage> a page transition from the first render", () => {
            mountWithPage({ keepPlaying: true });
            expect(seen.transition).toMatchObject({
                css: false,
                mode: "default",
            });
        });

        it("leaves <NuxtPage> alone without keepPlaying", () => {
            mountWithPage({});
            expect(seen.transition).toBeUndefined();
        });

        it("hands the leaving page to the held run and ends the leave when it is back", async () => {
            mountWithPage({ keepPlaying: true });
            let giveBack = () => {};
            mock.keep.keepPlaying = vi.fn((node, onReturn) => {
                (node as Element).remove();
                giveBack = () => onReturn?.(node as Node);
            });
            await nuxt.navigate("/", "/about");
            const el = leaving();
            const done = vi.fn();
            seen.transition?.onLeave(el, done);
            expect(mock.keep.keepPlaying).toHaveBeenCalledWith(
                el,
                expect.any(Function),
            );
            expect(done).not.toHaveBeenCalled();
            giveBack();
            expect(done).toHaveBeenCalledOnce();
            nuxt.pageFinish();
        });

        it("a second navigation while the old page is held hands its page over too", async () => {
            mountWithPage({ keepPlaying: true });
            const giveBacks = new Map<Node, () => void>();
            mock.keep.keepPlaying = vi.fn((node, onReturn) => {
                (node as Element).remove();
                giveBacks.set(node as Node, () => onReturn?.(node as Node));
            });
            await nuxt.navigate("/", "/about");
            const first = leaving();
            const firstDone = vi.fn();
            seen.transition?.onLeave(first, firstDone);
            // The page has not finished, so the first run still holds its page.
            await nuxt.navigate("/about", "/");
            const second = leaving();
            const secondDone = vi.fn();
            seen.transition?.onLeave(second, secondDone);
            expect(mock.keep.keepPlaying).toHaveBeenCalledTimes(2);
            // Core gives the first page back when the newer run starts.
            giveBacks.get(first)?.();
            expect(firstDone).toHaveBeenCalledOnce();
            expect(secondDone).not.toHaveBeenCalled();
            giveBacks.get(second)?.();
            expect(secondDone).toHaveBeenCalledOnce();
            expect(firstDone).toHaveBeenCalledOnce();
            nuxt.pageFinish();
        });

        it("ends the leave at once when core keeps nothing", async () => {
            mountWithPage({ keepPlaying: true });
            mock.keep.keepPlaying = vi.fn();
            await nuxt.navigate("/", "/about");
            const done = vi.fn();
            seen.transition?.onLeave(leaving(), done);
            expect(done).toHaveBeenCalledOnce();
            nuxt.pageFinish();
        });

        it("ends the leave at once outside a run", () => {
            mountWithPage({ keepPlaying: true });
            const done = vi.fn();
            seen.transition?.onLeave(leaving(), done);
            expect(done).toHaveBeenCalledOnce();
        });
    });
});

describe("transition", () => {
    beforeEach(() => {
        takePending();
    });

    it("sets the spec on a plain left click", () => {
        const a = document.createElement("a");
        a.addEventListener("click", transition({ transition: Swipe }));
        a.dispatchEvent(new MouseEvent("click", { button: 0 }));
        expect(takePending()).toEqual({ transition: Swipe });
    });

    it("ignores modified clicks and other targets", () => {
        const a = document.createElement("a");
        a.addEventListener("click", transition({ transition: Swipe }));
        a.dispatchEvent(new MouseEvent("click", { metaKey: true }));
        expect(takePending()).toBeNull();
        a.target = "_blank";
        a.dispatchEvent(new MouseEvent("click"));
        expect(takePending()).toBeNull();
    });
});

describe("vTransition", () => {
    let container: HTMLElement;
    let app: App | null;

    function mount(template: string, setup: () => Record<string, unknown>) {
        app = createApp({
            directives: { transition: vTransition },
            setup,
            template,
        });
        app.mount(container);
        return container.querySelector("a") as HTMLAnchorElement;
    }

    beforeEach(() => {
        takePending();
        container = document.createElement("div");
        app = null;
    });
    afterEach(() => {
        app?.unmount();
    });

    it("sets the latest spec on a plain left click", async () => {
        const spec = ref<RunOpts>({ transition: Swipe });
        const a = mount('<a href="/" v-transition="spec">x</a>', () => ({
            spec,
        }));
        a.dispatchEvent(new MouseEvent("click"));
        expect(takePending()).toEqual({ transition: Swipe });
        spec.value = { transition: Zoom };
        await nextTick();
        a.dispatchEvent(new MouseEvent("click"));
        expect(takePending()).toEqual({ transition: Zoom });
    });

    // NuxtLink calls preventDefault in its own click handler.
    it("runs before the link's own handler prevents the click", () => {
        const a = mount(
            '<a href="/" @click.prevent v-transition="spec">x</a>',
            () => ({ spec: { transition: Swipe } }),
        );
        a.dispatchEvent(new MouseEvent("click", { cancelable: true }));
        expect(takePending()).toEqual({ transition: Swipe });
    });

    it("ignores modified clicks and other targets", () => {
        const a = mount(
            '<a href="/" target="_blank" v-transition="spec">x</a>',
            () => ({ spec: { transition: Swipe } }),
        );
        a.dispatchEvent(new MouseEvent("click"));
        a.removeAttribute("target");
        a.dispatchEvent(new MouseEvent("click", { metaKey: true }));
        expect(takePending()).toBeNull();
    });

    it("removes the listener on unmount", () => {
        const a = mount('<a href="/" v-transition="spec">x</a>', () => ({
            spec: { transition: Swipe },
        }));
        app?.unmount();
        app = null;
        a.dispatchEvent(new MouseEvent("click"));
        expect(takePending()).toBeNull();
    });

    // Vue wraps `@click="f(x)"` in `$event => f(x)`, so the handler is dropped.
    it('is needed because @click="transition(spec)" does nothing', () => {
        const a = mount(
            '<a href="/" @click="transition({ transition: Swipe })">x</a>',
            () => ({ transition, Swipe }),
        );
        a.dispatchEvent(new MouseEvent("click"));
        expect(takePending()).toBeNull();
    });
});

describe("useTransitionIn", () => {
    it("warns outside <VFXTransition>", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const app = createApp(About);
        app.mount(document.createElement("div"));
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("outside <VFXTransition>"),
        );
        app.unmount();
        warn.mockRestore();
    });
});
