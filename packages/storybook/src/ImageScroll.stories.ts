import type { Meta, StoryObj } from "@storybook/html";
import { initVFX } from "./utils";
import { Timer } from "./Timer";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

export default {
    title: "Image/Layout with Scroll",
    parameters: {
        layout: "fullscreen",
    },
} satisfies Meta;

export const longPageWithImageHorizontal: StoryObj = {
    render: () => {
        // Create a tall container to force vertical scroll
        const container = document.createElement("div");
        container.style.height = "2000px";
        container.style.position = "relative";
        container.style.background = "#111";

        // Place the image somewhere in the middle
        const img = document.createElement("img");
        img.src = Logo;
        img.style.minWidth = "3000px";

        img.style.margin = "900px auto 0 auto";

        container.appendChild(img);

        // Use Timer to mock time for VRT
        const timer = new Timer(1.0, [0, 10]);
        container.appendChild(timer.element);

        const vfx = initVFX({ pixelRatio: 1 });
        vfx.add(img, {
            shader: "sinewave",
            uniforms: { time: () => timer.time },
            // backbuffer: true,
            // overflow: true,
            overflow: 0,
        }).then(() => {
            setTimeout(() => {
                img.style.opacity = "0.4";
            }, 100);
        });

        return container;
    },
    name: "Image in Long Scrollable Page X",
};
