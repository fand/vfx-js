// @vitest-environment happy-dom
import type { RunOpts } from "@vfx-js/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
    createMemoryRouter,
    RouterProvider,
    useLocation,
    useParams,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VFXTransition } from "./index.js";

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

(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Item() {
    const { id } = useParams();
    return <p>item {id}</p>;
}

function Search() {
    return <p>search {useLocation().search}</p>;
}

describe("VFXTransition (react-router)", () => {
    let container: HTMLElement;
    let root: Root;
    let router: ReturnType<typeof createMemoryRouter>;

    beforeEach(() => {
        mock.runs.length = 0;
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function mount(initial: string) {
        router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <VFXTransition />,
                    children: [
                        { index: true, element: <p>home</p> },
                        { path: "about", element: <p>about</p> },
                        { path: "item/:id", element: <Item /> },
                        { path: "search", element: <Search /> },
                    ],
                },
            ],
            { initialEntries: [initial] },
        );
        act(() => {
            root.render(<RouterProvider router={router} />);
        });
    }

    const navigate = (to: string) =>
        act(async () => {
            await router.navigate(to);
        });

    // Run the swap like core does; await it outside act so the update flushes.
    const swap = async (run: Run) => {
        let swapped = Promise.resolve();
        await act(async () => {
            swapped = Promise.resolve(run.cb());
        });
        await swapped;
        return run.opts();
    };

    it("keeps the old page until the swap, then shows the new one", async () => {
        mount("/");
        expect(container.textContent).toBe("home");
        await navigate("/about");
        expect(mock.runs).toHaveLength(1);
        expect(container.textContent).toBe("home");
        await swap(mock.runs[0]);
        expect(container.textContent).toBe("about");
    });

    it("the kept page renders its own route, not the new one", async () => {
        mount("/item/1");
        await navigate("/item/2");
        expect(mock.runs).toHaveLength(1);
        expect(container.textContent).toBe("item 1");
        await swap(mock.runs[0]);
        expect(container.textContent).toBe("item 2");
    });

    it("does not run on a search-only change", async () => {
        mount("/search");
        await navigate("/search?q=1");
        expect(mock.runs).toHaveLength(0);
        expect(container.textContent).toBe("search ?q=1");
    });

    it("uses pageKey over the pathname", async () => {
        router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <VFXTransition pageKey="fixed" />,
                    children: [
                        { index: true, element: <p>home</p> },
                        { path: "about", element: <p>about</p> },
                    ],
                },
            ],
            { initialEntries: ["/"] },
        );
        act(() => {
            root.render(<RouterProvider router={router} />);
        });
        await navigate("/about");
        expect(mock.runs).toHaveLength(0);
        expect(container.textContent).toBe("about");
    });
});
