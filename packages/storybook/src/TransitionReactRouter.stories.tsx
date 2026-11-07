import type { Meta, StoryObj } from "@storybook/html-vite";
import { VFXProvider } from "@vfx-js/react";
import { VFXTransition } from "@vfx-js/react/react-router";
import { Crossfade } from "@vfx-js/transitions";
import { createRoot, type Root } from "react-dom/client";
import {
    createMemoryRouter,
    RouterProvider,
    useLocation,
    useNavigate,
} from "react-router";
import { TRANSITION_PAGES } from "./stories/styles";

let root: Root | null = null;

export default {
    title: "Transition/React Router",
    parameters: { layout: "fullscreen" },
    // Unmount on story change, so the VFX goes with it.
    beforeEach: () => () => {
        root?.unmount();
        root = null;
    },
} satisfies Meta<undefined>;

// Same look as the Vue and Svelte stories.
const ROOT_STYLE: React.CSSProperties = {
    padding: 64,
    fontFamily: "sans-serif",
    color: "white",
    maxWidth: 720,
};
const NEXT_BUTTON_STYLE: React.CSSProperties = {
    marginBottom: 24,
    fontSize: "1rem",
};
const BOX_STYLE: React.CSSProperties = {
    width: 560,
    height: 240,
    boxSizing: "border-box",
    padding: 24,
    borderRadius: 16,
    background: "#222",
};

function Page({ index }: { index: number }) {
    const page = TRANSITION_PAGES[index];
    return (
        <section>
            <h2 style={{ margin: "0 0 12px", color: page.color }}>
                {page.title}
            </h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{page.body}</p>
        </section>
    );
}

function Layout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const next = () => {
        const index = Number(pathname.slice(1));
        void navigate(`/${(index + 1) % TRANSITION_PAGES.length}`);
    };
    return (
        <div style={ROOT_STYLE}>
            {/* Outside the target, so the capture never covers it. */}
            <button type="button" style={NEXT_BUTTON_STYLE} onClick={next}>
                Next
            </button>
            <VFXTransition
                transition={Crossfade}
                duration={0.8}
                fullscreen={false}
                style={BOX_STYLE}
            />
        </div>
    );
}

export const pages: StoryObj<undefined> = {
    name: "Pages",
    render: () => document.createElement("div"),
    args: undefined,
};
pages.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    const router = createMemoryRouter(
        [
            {
                path: "/",
                element: <Layout />,
                children: TRANSITION_PAGES.map((_, index) => ({
                    path: String(index),
                    element: <Page index={index} />,
                })),
            },
        ],
        { initialEntries: ["/0"] },
    );
    root = createRoot(canvasElement.firstElementChild as HTMLElement);
    root.render(
        <VFXProvider>
            <RouterProvider router={router} />
        </VFXProvider>,
    );
};
