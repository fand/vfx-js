// @vitest-environment happy-dom
import { Crossfade, Glitch, Swipe } from "@vfx-js/transitions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickRunOpts } from "./props";
import { registerVFX, resetRegistry } from "./registry";
import type { SwapFunctions } from "./swap";
import { installTransition, uninstallTransition } from "./transition";

const mock = vi.hoisted(() => {
    const runs: { opts: unknown; done: boolean }[] = [];
    const handle = {
        // Calls `cb` at once, as if the snapshot were taken.
        run: vi.fn(async (cb: () => Promise<void> | void, opts: unknown) => {
            const run = { opts, done: false };
            runs.push(run);
            await cb();
            run.done = true;
        }),
        destroy: vi.fn(),
        running: false,
    };
    const canvas = { current: null as HTMLCanvasElement | null };
    const vfx = {
        addTransition: vi.fn((_target: HTMLElement, _opts: unknown) => handle),
        get canvas() {
            return canvas.current;
        },
    };
    return { runs, handle, vfx, canvas, init: vi.fn(() => vfx) };
});

vi.mock("@vfx-js/core", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    VFX: { init: mock.init },
}));

const PERSIST = "data-astro-transition-persist";

// Astro's body swap, cut down to `transition:persist`.
const swapFunctions: SwapFunctions = {
    deselectScripts: () => {},
    swapRootAttributes: () => {},
    swapHeadElements: () => {},
    saveFocus: () => () => {},
    swapBodyElement(newBody, oldBody) {
        const pairs: [Element, Element][] = [];
        for (const el of oldBody.querySelectorAll(`[${PERSIST}]`)) {
            const id = el.getAttribute(PERSIST);
            const match = newBody.querySelector(`[${PERSIST}="${id}"]`);
            if (match) {
                pairs.push([el, match]);
            }
        }
        oldBody.replaceWith(newBody);
        for (const [el, match] of pairs) {
            match.replaceWith(el);
        }
    },
};

const flush = () => new Promise((r) => setTimeout(r));

function page(body: string): Document {
    return new DOMParser().parseFromString(
        `<html><head></head><body>${body}</body></html>`,
        "text/html",
    );
}

function target(spec: string, content: string): string {
    return `<nav>nav</nav><div data-vfx-transition-target='${spec}'>${content}</div>`;
}

// Fire Astro's navigation events the way the router does.
async function navigate(opts: {
    doc: Document;
    source?: Element;
    direction?: string;
    abort?: boolean;
    afterSwap?: boolean;
}) {
    const controller = new AbortController();
    const prep = Object.assign(new Event("astro:before-preparation"), {
        loader: async () => {},
        sourceElement: opts.source,
        newDocument: opts.doc,
        direction: opts.direction ?? "forward",
        signal: controller.signal,
    });
    document.dispatchEvent(prep);
    await prep.loader();
    if (opts.abort) {
        controller.abort();
        return;
    }
    const swap = Object.assign(new Event("astro:before-swap"), {
        newDocument: opts.doc,
        swap: () => swapFunctions.swapBodyElement(opts.doc.body, document.body),
    });
    document.dispatchEvent(swap);
    swap.swap();
    // Astro changes history here, then fires after-swap.
    if (opts.afterSwap !== false) {
        document.dispatchEvent(new Event("astro:after-swap"));
    }
}

describe("pickRunOpts", () => {
    it("takes the link, then the page, then nothing", () => {
        const link = { transition: Swipe };
        const page = { transition: Glitch };
        expect(pickRunOpts(link, page)).toBe(link);
        expect(pickRunOpts(null, page)).toBe(page);
        expect(pickRunOpts(null, null)).toEqual({});
    });
});

describe("installTransition", () => {
    let meta: HTMLMetaElement;

    beforeEach(() => {
        vi.clearAllMocks();
        mock.runs.length = 0;
        document.head.innerHTML = "";
        meta = document.createElement("meta");
        meta.name = "astro-view-transitions-enabled";
        document.head.append(meta);
        document.body.innerHTML = target(
            '{"transition":"crossfade","duration":0.8}',
            "<p>old</p>",
        );
        const canvas = document.createElement("canvas");
        document.body.append(canvas);
        mock.canvas.current = canvas;
    });
    afterEach(() => {
        uninstallTransition();
        resetRegistry();
        vi.restoreAllMocks();
    });

    it("warns and does nothing without ClientRouter", () => {
        meta.remove();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        installTransition({ swapFunctions });
        expect(warn).toHaveBeenCalledTimes(1);
        expect(mock.vfx.addTransition).not.toHaveBeenCalled();
    });

    it("adds one transition with the target's options", () => {
        installTransition({ swapFunctions });
        installTransition({ swapFunctions });
        expect(mock.vfx.addTransition).toHaveBeenCalledTimes(1);
        const [el, opts] = mock.vfx.addTransition.mock.calls[0] ?? [];
        expect(el).toBe(document.querySelector("[data-vfx-transition-target]"));
        expect(opts).toEqual({ transition: Crossfade, duration: 0.8 });
    });

    it("passes autoReverse from the target", () => {
        document.body.innerHTML = target('{"autoReverse":true}', "<p>old</p>");
        installTransition({ swapFunctions });
        const [, opts] = mock.vfx.addTransition.mock.calls[0] ?? [];
        expect(opts).toEqual({ autoReverse: true });
    });

    it("holds the run until after-swap, when history has changed", async () => {
        installTransition({ swapFunctions });
        await navigate({ doc: page(target("{}", "new")), afterSwap: false });
        await flush();
        expect(document.body.textContent).toContain("new");
        expect(mock.runs[0]?.done).toBe(false);
        document.dispatchEvent(new Event("astro:after-swap"));
        await flush();
        expect(mock.runs[0]?.done).toBe(true);
    });

    it("uses the link spec over the page spec", async () => {
        installTransition({ swapFunctions });
        const link = document.createElement("a");
        link.setAttribute("data-vfx-transition", "swipe");
        await navigate({
            source: link,
            doc: page(
                `<meta name="vfx-transition-in" content='{"transition":"glitch"}'>${target("{}", "new")}`,
            ),
        });
        expect(mock.runs[0]?.opts).toEqual({ transition: Swipe });
    });

    it("takes JSON in the link", async () => {
        installTransition({ swapFunctions });
        const link = document.createElement("a");
        link.setAttribute(
            "data-vfx-transition",
            '{"transition":"swipe","params":{"direction":"left"},"ease":"linear"}',
        );
        await navigate({ source: link, doc: page(target("{}", "new")) });
        expect(mock.runs[0]?.opts).toEqual({
            transition: Swipe,
            params: { direction: "left" },
            ease: "linear",
        });
    });

    it("uses the page spec as is on back", async () => {
        installTransition({ swapFunctions });
        await navigate({
            direction: "back",
            doc: page(
                `<meta name="vfx-transition-in" content='{"transition":"glitch"}'>${target("{}", "new")}`,
            ),
        });
        expect(mock.runs[0]?.opts).toEqual({ transition: Glitch });
    });

    it("prefers a registered transition and ease", async () => {
        const custom = new Swipe();
        const ease = (x: number) => x;
        registerVFX({ transitions: { swipe: custom }, eases: { flat: ease } });
        installTransition({ swapFunctions });
        const link = document.createElement("a");
        link.setAttribute(
            "data-vfx-transition",
            '{"transition":"swipe","ease":"flat"}',
        );
        await navigate({ source: link, doc: page(target("{}", "new")) });
        expect(mock.runs[0]?.opts).toEqual({ transition: custom, ease });
    });

    it("keeps the live target and canvas and moves the new children in", async () => {
        installTransition({ swapFunctions });
        const live = document.querySelector("[data-vfx-transition-target]");
        const canvas = mock.canvas.current;
        await navigate({
            doc: page(target('{"duration":2}', "<p>new</p>")),
        });
        expect(document.querySelector("[data-vfx-transition-target]")).toBe(
            live,
        );
        expect(live?.innerHTML).toBe("<p>new</p>");
        expect(live?.getAttribute("data-vfx-transition-target")).toBe(
            '{"duration":2}',
        );
        expect(canvas?.parentElement).toBe(document.body);
        expect(document.querySelectorAll(`[${PERSIST}]`)).toHaveLength(0);
        await flush();
        expect(mock.runs[0]?.done).toBe(true);
    });

    it("keeps the wrapper core puts around the target during a run", async () => {
        installTransition({ swapFunctions });
        const live = document.querySelector(
            "[data-vfx-transition-target]",
        ) as HTMLElement;
        const wrapper = document.createElement("canvas");
        wrapper.setAttribute("layoutsubtree", "");
        live.replaceWith(wrapper);
        wrapper.append(live);
        await navigate({ doc: page(target("{}", "<p>new</p>")) });
        expect(live.parentElement).toBe(wrapper);
        expect(wrapper.parentElement).toBe(document.body);
        expect(live.textContent).toBe("new");
    });

    it("frees the run when the navigation is aborted", async () => {
        installTransition({ swapFunctions });
        await navigate({ doc: page(target("{}", "new")), abort: true });
        await flush();
        expect(mock.runs[0]?.done).toBe(true);
        expect(document.body.textContent).toContain("old");
    });

    it("frees the previous run on a newer navigation", async () => {
        installTransition({ swapFunctions });
        const doc = page(target("{}", "new"));
        const prep = Object.assign(new Event("astro:before-preparation"), {
            loader: async () => {},
            newDocument: doc,
            direction: "forward",
            signal: new AbortController().signal,
        });
        document.dispatchEvent(prep);
        await prep.loader();
        await navigate({ doc: page(target("{}", "newer")) });
        await flush();
        expect(mock.runs.map((r) => r.done)).toEqual([true, true]);
    });

    it("drops the transition when the new page has no target", async () => {
        installTransition({ swapFunctions });
        await navigate({ doc: page("<p>plain</p>") });
        expect(mock.handle.destroy).toHaveBeenCalled();
        expect(document.body.textContent).toBe("plain");
    });
});
