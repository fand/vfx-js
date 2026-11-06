// @vitest-environment happy-dom
import type { RunOpts, TransitionDef } from "@vfx-js/core";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setNextTransition, takePending } from "./store.js";
import { TransitionIn, useTransitionIn } from "./TransitionIn.js";
import { VFXTransition } from "./VFXTransition.js";

type Run = { cb: () => void | Promise<void>; opts: () => RunOpts };

const mock = vi.hoisted(() => {
    const runs: Run[] = [];
    const transition = {
        run: (cb: Run["cb"], opts: Run["opts"]) => {
            runs.push({ cb, opts });
            return Promise.resolve();
        },
        cancel: () => {},
        destroy: () => {},
        running: false,
    };
    const vfx = { addTransition: () => transition };
    return { runs, vfx };
});

vi.mock("../use-vfx-instance.js", () => ({
    useVFXInstance: () => mock.vfx,
}));

const swipe: TransitionDef = { name: "swipe", create: () => [] };
const zoom: TransitionDef = { name: "zoom", create: () => [] };

(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("VFXTransition", () => {
    let container: HTMLElement;
    let root: Root;

    beforeEach(() => {
        mock.runs.length = 0;
        takePending();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const render = (pageKey: string, page: React.ReactNode) =>
        act(() => {
            root.render(
                <VFXTransition pageKey={pageKey}>{page}</VFXTransition>,
            );
        });

    // Run the swap, then resolve the lazy opts like core does.
    // act flushes the update only after its callback returns, so await the swap outside it.
    const swap = async (run: Run) => {
        let swapped = Promise.resolve();
        await act(async () => {
            swapped = Promise.resolve(run.cb());
        });
        await swapped;
        return run.opts();
    };

    it("fills the viewport height unless fullscreen is false", () => {
        // happy-dom drops `dvh`, so check the overflow and the height's absence.
        act(() => {
            root.render(
                <VFXTransition style={{ color: "red" }}>x</VFXTransition>,
            );
        });
        const target = container.firstElementChild
            ?.firstElementChild as HTMLElement;
        expect(target.style.overflow).toBe("hidden");
        expect(target.style.color).toBe("red");
        act(() => {
            root.render(<VFXTransition fullscreen={false}>x</VFXTransition>);
        });
        expect(target.getAttribute("style")).toBeNull();
    });

    it("renders the latest children while pageKey is unchanged", () => {
        render("a", <p>one</p>);
        render("a", <p>two</p>);
        expect(container.textContent).toBe("two");
        expect(mock.runs).toHaveLength(0);
    });

    it("a pageKey change runs and keeps the old page until the swap", async () => {
        render("a", <p>a</p>);
        render("b", <p>b</p>);
        expect(mock.runs).toHaveLength(1);
        expect(container.textContent).toBe("a");
        expect(await swap(mock.runs[0])).toEqual({});
        expect(container.textContent).toBe("b");
    });

    it("lazy opts see the spec of the incoming page", async () => {
        render("a", <p>a</p>);
        render(
            "b",
            <>
                <TransitionIn transition={zoom} />
                <p>b</p>
            </>,
        );
        expect(await swap(mock.runs[0])).toEqual({ transition: zoom });
    });

    it("a click beats the page spec", async () => {
        render("a", <p>a</p>);
        setNextTransition({ transition: swipe });
        render("b", <TransitionIn transition={zoom} />);
        expect(await swap(mock.runs[0])).toEqual({ transition: swipe });
    });

    it("the old page's spec does not leak into the next run", async () => {
        render("a", <TransitionIn transition={zoom} />);
        render("b", <p>b</p>);
        expect(await swap(mock.runs[0])).toEqual({});
    });

    it("a new key mounts the page fresh", async () => {
        let bump = () => {};
        function Page(props: { spec: RunOpts }) {
            useTransitionIn(props.spec);
            const [count, setCount] = useState(0);
            bump = () => setCount((c) => c + 1);
            return <p>{count}</p>;
        }
        render("a", <Page spec={{ transition: swipe }} />);
        act(() => bump());
        expect(container.textContent).toBe("1");
        render("b", <Page spec={{ transition: zoom }} />);
        expect(await swap(mock.runs[0])).toEqual({ transition: zoom });
        expect(container.textContent).toBe("0");
    });
});
