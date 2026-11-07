import type { Meta, StoryObj } from "@storybook/html-vite";
import { type Component, mount, unmount } from "svelte";
import { storyContainer } from "./stories/styles";
import Elements from "./stories/svelte/Elements.svelte";
import Live from "./stories/svelte/Live.svelte";
import "./preset.css";

let app: Record<string, unknown> | null = null;

export default {
    title: "Effect/Svelte",
    parameters: { layout: "fullscreen" },
    // Unmount on story change, so the shared VFX goes with it.
    beforeEach: () => () => {
        if (app) {
            unmount(app);
            app = null;
        }
    },
} satisfies Meta<undefined>;

async function mountStory(target: HTMLElement, component: Component) {
    await new Promise((r) => requestAnimationFrame(r));
    app = mount(component, { target });
}

export const elements: StoryObj<undefined> = {
    name: "Elements",
    render: storyContainer,
    args: undefined,
};
elements.play = ({ canvasElement }) =>
    mountStory(canvasElement.firstElementChild as HTMLElement, Elements);

export const live: StoryObj<undefined> = {
    name: "Live Props",
    render: storyContainer,
    args: undefined,
};
live.play = ({ canvasElement }) =>
    mountStory(canvasElement.firstElementChild as HTMLElement, Live);
