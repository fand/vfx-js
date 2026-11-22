import type { Meta, StoryObj } from "@storybook/html-vite";
import { SaberEffect } from "@vfx-js/effects";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import { attachSaberPane, initVFX } from "./utils";

type Args = {
    /** VFX pixel ratio. 0 uses the device pixel ratio. */
    pixelRatio: number;
};

export default {
    title: "Effect/Saber",
    parameters: { layout: "fullscreen" },
    args: { pixelRatio: 0 },
    argTypes: {
        pixelRatio: { control: { type: "select" }, options: [0, 1, 2] },
    },
} satisfies Meta<Args>;

async function mount(el: HTMLElement, args: Args): Promise<void> {
    const vfx = initVFX(
        args.pixelRatio > 0 ? { pixelRatio: args.pixelRatio } : undefined,
    );
    const effect = new SaberEffect();
    await vfx.add(el, { effect });
    attachSaberPane("Saber", effect);
}

export const logo: StoryObj<Args> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.width = "min(70vw, 800px)";
        return img;
    },
    play: async ({ canvasElement, args }) => {
        const img = canvasElement.querySelector("img") as HTMLImageElement;
        if (!img.complete) {
            await new Promise((o) => {
                img.onload = o;
            });
        }
        await mount(img, args);
    },
};

export const text: StoryObj<Args> = {
    render: () => {
        const h1 = document.createElement("h1");
        h1.textContent = "Saber";
        h1.style.cssText =
            "margin: 0; color: white; font: 900 clamp(72px, 16vw, 200px)/1 system-ui, 'Helvetica Neue', Arial, sans-serif";
        return h1;
    },
    play: async ({ canvasElement, args }) => {
        const h1 = canvasElement.querySelector("h1") as HTMLElement;
        await document.fonts?.ready;
        await mount(h1, args);
    },
};
