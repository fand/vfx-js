import type { RunContext, RunOpts } from "@vfx-js/core";
import { type Component, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setNextTransition, takePending, transition } from "./lib/pending.js";
import About from "./test/About.svelte";
import type { OnNavigate } from "./test/app-navigation.js";
import { callbacks } from "./test/app-navigation.js";
import { page } from "./test/app-state.svelte.js";
import Harness from "./test/Harness.svelte";
import Home from "./test/Home.svelte";
import { Swipe, Zoom } from "./test/presets.js";

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
            // Like core: call cb (after the snapshot); a throwing cb ends the run.
            return Promise.resolve()
                .then(() =>
                    cb({ keepPlaying: (...args) => keep.keepPlaying(...args) }),
                )
                .finally(() => resolve());
        },
        cancel: vi.fn(),
        destroy: vi.fn(),
        running: false,
    };
    const vfx = {
        addTransition: vi.fn((_el: HTMLElement, _opts: object) => handle),
        stop: vi.fn(),
        destroy: vi.fn(),
    };
    const init = vi.fn(() => vfx);
    return { runs, keep, handle, vfx, init };
});

vi.mock("@vfx-js/core", () => ({ VFX: { init: mock.init } }));

type Nav = {
    nav: OnNavigate;
    complete(): void;
    fail(): void;
};

function makeNav(
    from: string,
    to: string,
    type: OnNavigate["type"] = "link",
    delta?: number,
): Nav {
    let complete!: () => void;
    let fail!: () => void;
    const done = new Promise<void>((resolve, reject) => {
        complete = resolve;
        fail = () => reject(new Error("aborted"));
    });
    done.catch(() => {});
    const url = (path: string) => new URL(path, "http://localhost");
    const nav = {
        from: { url: url(from) },
        to: { url: url(to) },
        type,
        delta,
        willUnload: false,
        complete: done,
    } as unknown as OnNavigate;
    return { nav, complete, fail };
}

// Like SvelteKit: wait for every onNavigate promise, then update the DOM.
async function navigate(nav: Nav): Promise<void> {
    await Promise.all([...callbacks].map((fn) => fn(nav.nav)));
}

describe("VFXTransition (sveltekit)", () => {
    let container: HTMLElement;
    let app: Record<string, unknown> | null;
    let props: { page: Component } & Record<string, unknown>;

    function render(extra: Record<string, unknown> = {}) {
        const state = $state({ page: Home, ...extra });
        props = state;
        app = mount(Harness, { target: container, props });
        flushSync();
    }

    // Start a navigation, swap the page, and let SvelteKit finish it.
    async function go(nav: Nav, next: Component) {
        await navigate(nav);
        props.page = next;
        flushSync();
        nav.complete();
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
        takePending();
        container = document.createElement("div");
        document.body.appendChild(container);
        app = null;
    });
    afterEach(async () => {
        if (app) {
            unmount(app);
        }
        container.remove();
        // Let the shared VFX go, so each test starts without one.
        await new Promise((r) => requestAnimationFrame(r));
    });

    describe("keepPlaying", () => {
        // Moves the nodes into a detached box, and back on `giveBack`.
        function fakeKeep() {
            const ghost = document.createElement("div");
            let giveBack = () => {};
            mock.keep.keepPlaying = vi.fn((nodes, onReturn) => {
                const node = nodes as Node;
                const marker = document.createComment("");
                node.parentNode?.insertBefore(marker, node);
                ghost.append(node);
                giveBack = () => {
                    marker.parentNode?.insertBefore(node, marker);
                    marker.remove();
                    onReturn?.(node);
                };
            });
            return { ghost, giveBack: () => giveBack() };
        }
        const inner = () =>
            container.firstElementChild?.firstElementChild as HTMLElement;

        // Start a navigation and swap the page, but leave the run held.
        async function swap(path: string, next: Component) {
            const nav = makeNav(page.url.pathname, path);
            await navigate(nav);
            page.url = new URL(path, "http://localhost");
            props.page = next;
            flushSync();
            return nav;
        }

        beforeEach(() => {
            page.url = new URL("http://localhost/");
            mock.keep.keepPlaying = () => {};
        });

        it("hands the old page to core and drops it once it is back", async () => {
            render({ keepPlaying: true });
            const keep = fakeKeep();
            const nav = await swap("/about", About);
            expect(mock.keep.keepPlaying).toHaveBeenCalledOnce();
            expect(keep.ghost.textContent).toBe("home");
            expect(inner().textContent).toBe("about");
            nav.complete();
            keep.giveBack();
            await vi.waitFor(() => {
                expect(inner().children).toHaveLength(1);
            });
            expect(inner().textContent).toBe("about");
        });

        it("a second navigation while the old page is held hands its page over too", async () => {
            render({ keepPlaying: true });
            const ghost = document.createElement("div");
            const giveBacks: (() => void)[] = [];
            mock.keep.keepPlaying = vi.fn((nodes, onReturn) => {
                const node = nodes as Node;
                const marker = document.createComment("");
                node.parentNode?.insertBefore(marker, node);
                ghost.append(node);
                giveBacks.push(() => {
                    marker.parentNode?.insertBefore(node, marker);
                    marker.remove();
                    onReturn?.(node);
                });
            });
            const first = await swap("/about", About);
            // A newer navigation drops the first one before it completes.
            const second = await swap("/", Home);
            first.fail();
            expect(mock.keep.keepPlaying).toHaveBeenCalledTimes(2);
            expect(ghost.textContent).toBe("homeabout");
            expect(inner().textContent).toBe("home");
            // Core gives the first page back when the newer run starts.
            giveBacks[0]();
            second.complete();
            giveBacks[1]();
            await vi.waitFor(() => {
                expect(inner().children).toHaveLength(1);
            });
            expect(inner().textContent).toBe("home");
        });

        it("drops the old page at once when core keeps nothing", async () => {
            render({ keepPlaying: true });
            mock.keep.keepPlaying = vi.fn();
            const nav = await swap("/about", About);
            expect(mock.keep.keepPlaying).toHaveBeenCalledOnce();
            expect(inner().children).toHaveLength(1);
            expect(inner().textContent).toBe("about");
            nav.complete();
        });

        it("hands nothing over without keepPlaying", async () => {
            render();
            const keep = fakeKeep();
            const nav = await swap("/about", About);
            expect(mock.keep.keepPlaying).not.toHaveBeenCalled();
            expect(keep.ghost.textContent).toBe("");
            expect(inner().textContent).toBe("about");
            nav.complete();
        });
    });

    it("renders the target inside a display: contents div", () => {
        render({ class: "outlet" });
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
        render({ fullscreen: false });
        const inner = container.firstElementChild
            ?.firstElementChild as HTMLElement;
        expect(inner.getAttribute("style")).toBeNull();
    });

    it("passes props as live options", () => {
        render({ duration: 0.5 });
        const opts = mock.vfx.addTransition.mock.calls[0][1];
        expect(opts).toEqual({ duration: 0.5 });
        props.duration = 1;
        flushSync();
        expect(opts).toEqual({ duration: 1 });
    });

    it("passes autoReverse to core and follows prop changes", () => {
        render({ autoReverse: true });
        const opts = mock.vfx.addTransition.mock.calls[0][1];
        expect(opts).toEqual({ autoReverse: true });
        props.autoReverse = false;
        flushSync();
        expect(opts).toEqual({ autoReverse: false });
    });

    it("shares one VFX and destroys it a frame after the last unmount", async () => {
        render();
        const other = document.createElement("div");
        const second = mount(Harness, { target: other, props: { page: Home } });
        flushSync();
        expect(mock.init).toHaveBeenCalledTimes(1);
        unmount(app as Record<string, unknown>);
        app = null;
        unmount(second);
        expect(mock.handle.destroy).toHaveBeenCalledTimes(2);
        expect(mock.vfx.destroy).not.toHaveBeenCalled();
        await new Promise((r) => requestAnimationFrame(r));
        expect(mock.vfx.destroy).toHaveBeenCalledTimes(1);
    });

    it("holds the navigation until the run calls cb", async () => {
        render();
        let passed = false;
        const nav = navigate(makeNav("/", "/about")).then(() => {
            passed = true;
        });
        expect(mock.runs).toHaveLength(1);
        expect(passed).toBe(false);
        await nav;
        expect(passed).toBe(true);
    });

    it("uses the page spec, read after the new page mounts", async () => {
        render();
        expect(await go(makeNav("/", "/about"), About)).toEqual({
            transition: Zoom,
        });
    });

    it("lets a link spec win over the page spec", async () => {
        render();
        setNextTransition({ transition: Swipe });
        expect(await go(makeNav("/", "/about"), About)).toEqual({
            transition: Swipe,
        });
    });

    it("falls back to {} so the props apply", async () => {
        render({ transition: Swipe });
        expect(await go(makeNav("/", "/home2"), Home)).toEqual({});
    });

    it("forgets the old page spec on the next navigation", async () => {
        render();
        await go(makeNav("/", "/about"), About);
        expect(await go(makeNav("/about", "/"), Home)).toEqual({});
    });

    it("does not reverse on back", async () => {
        render();
        expect(await go(makeNav("/about", "/", "popstate", -1), Home)).toEqual(
            {},
        );
        expect(await go(makeNav("/", "/about", "popstate", 1), About)).toEqual({
            transition: Zoom,
        });
    });

    it("skips a navigation to the same path", async () => {
        render();
        await navigate(makeNav("/a", "/a"));
        expect(mock.runs).toHaveLength(0);
    });

    it("ends the run of a failed navigation", async () => {
        render();
        const nav = makeNav("/", "/a");
        await navigate(nav);
        nav.fail();
        await mock.runs[0].done;
    });

    it("stops listening on unmount", () => {
        render();
        expect(callbacks.size).toBe(1);
        unmount(app as Record<string, unknown>);
        app = null;
        expect(callbacks.size).toBe(0);
    });
});

describe("transition", () => {
    beforeEach(() => {
        takePending();
    });

    it("sets the spec on a plain left click", () => {
        const a = document.createElement("a");
        const remove = transition({ transition: Swipe })(a);
        a.dispatchEvent(new MouseEvent("click", { button: 0 }));
        expect(takePending()).toEqual({ transition: Swipe });
        remove?.();
        a.dispatchEvent(new MouseEvent("click", { button: 0 }));
        expect(takePending()).toBeNull();
    });

    it("ignores modified clicks and other targets", () => {
        const a = document.createElement("a");
        transition({ transition: Swipe })(a);
        a.dispatchEvent(new MouseEvent("click", { metaKey: true }));
        expect(takePending()).toBeNull();
        a.target = "_blank";
        a.dispatchEvent(new MouseEvent("click"));
        expect(takePending()).toBeNull();
    });
});

describe("transitionIn", () => {
    it("warns outside <VFXTransition>", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const app = mount(About, { target: document.createElement("div") });
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("outside <VFXTransition>"),
        );
        unmount(app);
        warn.mockRestore();
    });
});
