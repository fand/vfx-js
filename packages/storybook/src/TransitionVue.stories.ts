import type { Meta, StoryObj } from "@storybook/html-vite";
import { Crossfade } from "@vfx-js/transitions";
import { VFXTransition } from "@vfx-js/vue/router";
import { type App, createApp, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import {
    NEXT_BUTTON_STYLE,
    TRANSITION_BOX_STYLE,
    TRANSITION_PAGES,
    TRANSITION_ROOT_STYLE,
} from "./stories/styles";

let app: App | null = null;

export default {
    title: "Transition/Vue",
    parameters: { layout: "fullscreen" },
    // Unmount on story change, so the shared VFX goes with it.
    beforeEach: () => () => {
        app?.unmount();
        app = null;
    },
} satisfies Meta<undefined>;

const routes = TRANSITION_PAGES.map((page, index) => ({
    path: `/${index}`,
    component: defineComponent({
        setup: () => () =>
            h("section", [
                h(
                    "h2",
                    { style: `margin:0 0 12px; color:${page.color}` },
                    page.title,
                ),
                h("p", { style: "margin:0; line-height:1.6" }, page.body),
            ]),
    }),
}));

export const pages: StoryObj<undefined> = {
    name: "Pages",
    render: () => document.createElement("div"),
    args: undefined,
};
pages.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", redirect: "/0" }, ...routes],
    });
    const next = () => {
        const index = Number(router.currentRoute.value.path.slice(1));
        void router.push(`/${(index + 1) % TRANSITION_PAGES.length}`);
    };

    app = createApp({
        render: () =>
            h("div", { style: TRANSITION_ROOT_STYLE }, [
                // Outside the target, so the capture never covers it.
                h(
                    "button",
                    { style: NEXT_BUTTON_STYLE, onClick: next },
                    "Next",
                ),
                h(
                    VFXTransition,
                    {
                        transition: Crossfade,
                        duration: 0.8,
                        fullscreen: false,
                        style: TRANSITION_BOX_STYLE,
                    },
                    { default: () => h(RouterView) },
                ),
            ]),
    });
    app.use(router);
    app.mount(canvasElement.firstElementChild as HTMLElement);
};
