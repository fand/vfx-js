// @vitest-environment happy-dom
import type {
    AddTransitionOpts,
    RunContext,
    RunOpts,
    Transition,
} from "@vfx-js/core";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setNextTransition, takePending } from "./store.js";
import { TransitionIn, useTransitionIn } from "./TransitionIn.js";
import { VFXTransition } from "./VFXTransition.js";

type Run = {
    cb: (ctx: RunContext) => void | Promise<void>;
    opts: () => RunOpts;
};

// Core's hand-over: moves the nodes into a detached box, and back on `giveBack`.
function fakeLive(keeps = true) {
    const ghost = document.createElement("div");
    const held: {
        node: Node;
        marker: Comment;
        onReturn?: (node: Node) => void;
    }[] = [];
    const keepPlaying = vi.fn<RunContext["keepPlaying"]>((nodes, onReturn) => {
        if (!keeps) {
            return;
        }
        for (const node of "nodeType" in nodes ? [nodes] : nodes) {
            const marker = document.createComment("");
            node.parentNode?.insertBefore(marker, node);
            held.push({ node, marker, onReturn });
            ghost.append(node);
        }
    });
    const giveBack = () => {
        for (const { node, marker, onReturn } of held.splice(0)) {
            marker.parentNode?.insertBefore(node, marker);
            marker.remove();
            onReturn?.(node);
        }
    };
    return { ghost, ctx: { keepPlaying }, keepPlaying, giveBack };
}

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
    const added: { opts?: AddTransitionOpts } = {};
    const vfx = {
        addTransition: (_element: HTMLElement, opts: AddTransitionOpts) => {
            added.opts = opts;
            return transition;
        },
    };
    return { runs, vfx, added };
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

class Wave implements Transition {
    readonly name = "wave";
    constructor(readonly params: { amount?: number } = {}) {}
}

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
    const swap = async (run: Run, ctx: RunContext = fakeLive().ctx) => {
        let swapped = Promise.resolve();
        await act(async () => {
            swapped = Promise.resolve(run.cb(ctx));
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
                <TransitionIn transition={Zoom} />
                <p>b</p>
            </>,
        );
        expect(await swap(mock.runs[0])).toEqual({ transition: Zoom });
    });

    it("TransitionIn passes the class params", async () => {
        render("a", <p>a</p>);
        render("b", <TransitionIn transition={Wave} params={{ amount: 2 }} />);
        expect(await swap(mock.runs[0])).toEqual({
            transition: Wave,
            params: { amount: 2 },
        });
        // @ts-expect-error params follow the class
        void (<TransitionIn transition={Wave} params={{ amount: "x" }} />);
        void (
            <VFXTransition
                transition={Wave}
                // @ts-expect-error params follow the class
                params={{ amount: "x" }}
            >
                x
            </VFXTransition>
        );
    });

    it("a click beats the page spec", async () => {
        render("a", <p>a</p>);
        setNextTransition({ transition: Swipe });
        render("b", <TransitionIn transition={Zoom} />);
        expect(await swap(mock.runs[0])).toEqual({ transition: Swipe });
    });

    it("the old page's spec does not leak into the next run", async () => {
        render("a", <TransitionIn transition={Zoom} />);
        render("b", <p>b</p>);
        expect(await swap(mock.runs[0])).toEqual({});
    });

    it("passes autoReverse to core and follows prop changes", () => {
        act(() => {
            root.render(<VFXTransition autoReverse>x</VFXTransition>);
        });
        const opts = mock.added.opts;
        expect(opts?.autoReverse).toBe(true);
        act(() => {
            root.render(<VFXTransition>x</VFXTransition>);
        });
        expect(mock.added.opts).toBe(opts);
        expect(opts?.autoReverse).toBeUndefined();
    });

    it("a new key mounts the page fresh", async () => {
        let bump = () => {};
        function Page(props: { spec: RunOpts }) {
            useTransitionIn(props.spec);
            const [count, setCount] = useState(0);
            bump = () => setCount((c) => c + 1);
            return <p>{count}</p>;
        }
        render("a", <Page spec={{ transition: Swipe }} />);
        act(() => bump());
        expect(container.textContent).toBe("1");
        render("b", <Page spec={{ transition: Zoom }} />);
        expect(await swap(mock.runs[0])).toEqual({ transition: Zoom });
        expect(container.textContent).toBe("0");
    });

    describe("keepPlaying", () => {
        let bump = () => {};
        function Counter(props: { name: string }) {
            const [count, setCount] = useState(0);
            bump = () => setCount((c) => c + 1);
            return (
                <p>
                    {props.name}
                    {count}
                </p>
            );
        }
        const renderLive = (pageKey: string, page: React.ReactNode) =>
            act(() => {
                root.render(
                    <VFXTransition pageKey={pageKey} keepPlaying>
                        {page}
                    </VFXTransition>,
                );
            });
        const target = () =>
            container.firstElementChild?.firstElementChild as HTMLElement;

        it("hands the old page to core and keeps it alive until it is back", async () => {
            renderLive("a", <Counter name="a" />);
            const live = fakeLive();
            renderLive("b", <Counter name="b" />);
            await swap(mock.runs[0], live.ctx);
            expect(live.keepPlaying).toHaveBeenCalledOnce();
            expect(target().textContent).toBe("b0");
            expect(live.ghost.textContent).toBe("a0");
            act(() => bump());
            act(() => {
                live.giveBack();
            });
            expect(target().textContent).toBe("b1");
            expect(target().children).toHaveLength(1);
        });

        it("the old page keeps its state while core holds it", async () => {
            let bumpA = () => {};
            function A() {
                const [count, setCount] = useState(0);
                bumpA = () => setCount((c) => c + 1);
                return <p>a{count}</p>;
            }
            renderLive("a", <A />);
            const live = fakeLive();
            renderLive("b", <p>b</p>);
            await swap(mock.runs[0], live.ctx);
            act(() => bumpA());
            expect(live.ghost.textContent).toBe("a1");
            act(() => {
                live.giveBack();
            });
            expect(target().textContent).toBe("b");
        });

        it("drops the old page when core does not keep it", async () => {
            renderLive("a", <p>a</p>);
            const live = fakeLive(false);
            renderLive("b", <p>b</p>);
            await swap(mock.runs[0], live.ctx);
            expect(live.keepPlaying).toHaveBeenCalledOnce();
            expect(target().textContent).toBe("b");
        });

        it("hands nothing over without keepPlaying", async () => {
            render("a", <p>a</p>);
            const live = fakeLive();
            render("b", <p>b</p>);
            await swap(mock.runs[0], live.ctx);
            expect(live.keepPlaying).not.toHaveBeenCalled();
            expect(target().textContent).toBe("b");
        });

        it("turning keepPlaying off while core holds a page keeps the DOM whole", async () => {
            renderLive("a", <Counter name="a" />);
            const live = fakeLive();
            renderLive("b", <Counter name="b" />);
            await swap(mock.runs[0], live.ctx);
            act(() => bump());
            act(() => {
                root.render(
                    <VFXTransition pageKey="b">
                        {<Counter name="b" />}
                    </VFXTransition>,
                );
            });
            // The shown page keeps its state.
            expect(target().textContent).toBe("b1");
            act(() => {
                live.giveBack();
            });
            expect(target().textContent).toBe("b1");
            expect(target().children).toHaveLength(1);
        });

        it("a page core gives back while it is still shown stays visible", async () => {
            let release = () => {};
            const pending = new Promise<void>((resolve) => {
                release = resolve;
            });
            let ready = false;
            function Slow() {
                if (!ready) {
                    throw pending;
                }
                return <p>b</p>;
            }
            renderLive("a", <p>a</p>);
            const live = fakeLive();
            renderLive("b", <Slow />);
            // The new page suspends, so the old one stays the shown page.
            await act(async () => {
                void mock.runs[0].cb(live.ctx);
            });
            expect(live.keepPlaying).toHaveBeenCalledOnce();
            // A newer run gives the page back before the new one is in.
            act(() => {
                live.giveBack();
            });
            const shownBox = target().firstElementChild as HTMLElement;
            expect(shownBox.textContent).toBe("a");
            expect(shownBox.style.display).not.toBe("none");
            ready = true;
            await act(async () => {
                release();
                await pending;
            });
            expect(target().textContent).toBe("b");
            expect(target().children).toHaveLength(1);
        });

        it("a page that comes back mounts fresh next to the kept one", async () => {
            renderLive("a", <Counter name="a" />);
            act(() => bump());
            const first = fakeLive();
            renderLive("b", <p>b</p>);
            await swap(mock.runs[0], first.ctx);
            renderLive("a", <Counter name="a" />);
            await swap(mock.runs[1], fakeLive().ctx);
            expect(target().textContent).toBe("a0");
            act(() => {
                first.giveBack();
            });
            expect(target().textContent).toBe("a0");
        });
    });
});
