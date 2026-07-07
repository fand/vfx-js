import type { Meta, StoryObj } from "@storybook/html-vite";

import { LightStreakEffect } from "@vfx-js/effects";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import { attachLightStreakPane, initVFX } from "./utils";

export default {
    title: "Effect/Light Streak",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

export const lightStreak: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        return img;
    },
    args: undefined,
};

lightStreak.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const effect = new LightStreakEffect({
        streaks: 6,
        threshold: 0.4,
        intensity: 3.0,
        dispersion: -0.6,
        fringe: 0.25,
        length: 220,
        pad: 280,
    });
    await vfx.add(img, { effect });
    attachLightStreakPane("Light Streak", effect);
};
