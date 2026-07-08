import type { Meta, StoryObj } from "@storybook/html-vite";

import { LightStreakEffect } from "@vfx-js/effects";
import Live from "./assets/live.webp";
import Logo from "./assets/logo-640w-20p.svg";
import Robot from "./assets/robot.webp";
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
    const effect = new LightStreakEffect();
    await vfx.add(img, { effect });

    const sources = { Logo, Live, Robot };
    attachLightStreakPane("Light Streak", effect, {
        img,
        sources,
        onSrcChange: async (key) => {
            img.src = sources[key as keyof typeof sources];
            await new Promise<void>((o) => {
                img.onload = () => o();
            });
            await vfx.update(img);
        },
    });
};
