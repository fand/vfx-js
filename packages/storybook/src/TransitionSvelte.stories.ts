import type { Meta, StoryObj } from "@storybook/html-vite";
import { mount, unmount } from "svelte";
import TransitionPages from "./stories/svelte/TransitionPages.svelte";

let app: Record<string, unknown> | null = null;

export default {
    title: "Transition/Svelte",
    parameters: { layout: "fullscreen" },
    beforeEach: () => () => {
        if (app) {
            unmount(app);
            app = null;
        }
    },
} satisfies Meta<undefined>;

export const pages: StoryObj<undefined> = {
    name: "Pages",
    render: () => document.createElement("div"),
    args: undefined,
};
pages.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    app = mount(TransitionPages, {
        target: canvasElement.firstElementChild as HTMLElement,
    });
};
