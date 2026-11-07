// @vitest-environment happy-dom
import type { AddTransitionOpts, RunOpts, Transition } from "@vfx-js/core";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type UseVFXTransition, useVFXTransition } from "./useVFXTransition.js";

type Run = {
    cb: () => void | Promise<void>;
    opts: RunOpts | undefined;
    // The panel text when `cb` resolves.
    textAfterCb?: string | null;
};

const mock = vi.hoisted(() => {
    const runs: Run[] = [];
    const added: { element: HTMLElement; opts: AddTransitionOpts }[] = [];
    const destroy = vi.fn();
    const vfx = {
        addTransition: (element: HTMLElement, opts: AddTransitionOpts) => {
            added.push({ element, opts });
            return {
                // Like core: the run ends once `cb` has updated the DOM.
                run: async (cb: Run["cb"], opts: Run["opts"]) => {
                    const run: Run = { cb, opts };
                    runs.push(run);
                    await cb();
                    run.textAfterCb = element.textContent;
                },
                show: async () => {},
                cancel: () => {},
                destroy,
                running: false,
            };
        },
    };
    return { runs, added, destroy, vfx };
});

vi.mock("../use-vfx-instance.js", () => ({
    useVFXInstance: () => mock.vfx,
}));

class Swipe implements Transition {
    readonly name = "swipe";
}
class Zoom implements Transition {
    readonly name = "zoom";
}

(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("useVFXTransition", () => {
    let container: HTMLElement;
    let root: Root;
    let api: UseVFXTransition;
    let setTab: (tab: string) => void;

    function Tabs({
        opts,
        attach = true,
    }: {
        opts: AddTransitionOpts;
        attach?: boolean;
    }) {
        const [tab, set] = useState("a");
        api = useVFXTransition(opts);
        setTab = set;
        return (
            <div ref={attach ? api.ref : undefined} id="panel">
                {tab}
            </div>
        );
    }

    const render = (opts: AddTransitionOpts, attach?: boolean) =>
        act(() => {
            root.render(<Tabs opts={opts} attach={attach} />);
        });

    // act flushes the update only after its callback returns, so await the run outside it.
    const run = async (cb: () => void, opts?: RunOpts) => {
        let done = Promise.resolve();
        await act(async () => {
            done = api.run(cb, opts);
        });
        await done;
    };

    const panel = () => container.querySelector("#panel");

    beforeEach(() => {
        mock.runs.length = 0;
        mock.added.length = 0;
        mock.destroy.mockClear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it("adds a transition on the ref element and destroys it on unmount", () => {
        render({ transition: Swipe });
        expect(mock.added).toHaveLength(1);
        expect(mock.added[0].element).toBe(panel());
        act(() => root.unmount());
        expect(mock.destroy).toHaveBeenCalledTimes(1);
        root = createRoot(container);
    });

    it("passes the run options and resolves after React commits", async () => {
        render({ transition: Swipe });
        await run(() => setTab("b"), { reverse: true });
        expect(mock.runs).toHaveLength(1);
        expect(mock.runs[0].opts).toEqual({ reverse: true });
        expect(mock.runs[0].textAfterCb).toBe("b");
    });

    it("resolves on the next frame when cb updates no state", async () => {
        render({ transition: Swipe });
        const cb = vi.fn();
        await run(cb);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(panel()?.textContent).toBe("a");
    });

    it("still runs cb before the ref is attached", async () => {
        render({ transition: Swipe }, false);
        expect(mock.added).toHaveLength(0);
        await run(() => setTab("b"));
        expect(mock.runs).toHaveLength(0);
        expect(panel()?.textContent).toBe("b");
    });

    it("applies new options without a new transition", () => {
        render({ transition: Swipe, duration: 1 });
        render({ transition: Zoom });
        expect(mock.added).toHaveLength(1);
        expect(mock.added[0].opts.transition).toBe(Zoom);
        expect("duration" in mock.added[0].opts).toBe(false);
    });
});
