import type { Meta, StoryObj } from "@storybook/html";
// import { allModes } from "../.storybook/modes";

import { initVFX } from "./utils";
import { Timer } from "./Timer";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

export default {
    title: "Layout with Scroll",
} satisfies Meta;

const render = (opts = {}, scroll = [0, 0]): StoryObj => ({
    render: () => {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "0";
        container.style.top = "0";
        container.style.display = "flex";
        container.style.flexDirection = "column";

        const marker = document.createElement("div");
        marker.style.position = "fixed";
        marker.style.zIndex = "2";
        marker.style.left = "0px";
        marker.style.top = "0px";
        marker.style.width = "100%";
        marker.style.height = "100%";
        marker.style.boxSizing = "border-box";
        marker.style.border = "5px solid red";
        marker.style.opacity = "0.5";
        container.appendChild(marker);

        // big block to cause scroll
        const block = document.createElement("div");
        block.style.width = "800px";
        block.style.height = "400px";
        block.style.background = "#999";

        container.appendChild(block.cloneNode());

        // Place the image somewhere in the middle
        const img = document.createElement("img");
        img.src = Logo;
        container.appendChild(img);

        container.appendChild(block.cloneNode());

        // Use Timer to mock time for VRT
        const timer = new Timer(1.0, [0, 10]);
        container.appendChild(timer.element);

        const vfx = initVFX({ pixelRatio: 1 });
        vfx.add(img, {
            shader: "sinewave",
            uniforms: { time: () => timer.time },
            overlay: true,
            ...opts,
        });

        window.scrollTo(scroll[0], scroll[1]);

        return container;
    },
    parameters: {
        viewport: {
            defaultViewport: "small",
        },
    },
});

const S = 1000;

// Plain layout
export const Normal = render();
// export const NormalScrollX = render({}, [S, 0]);
// export const NormalScrollY = render({}, [0, S]);

// Fullscreen mode
const o1 = { overflow: true };
export const Fullscreen = render(o1);
// export const FullscreenScrollX = render(o1, [S, 0]);
// export const FullscreenScrollY = render(o1, [0, S]);

// Backbuffer
const o2 = { backbuffer: true };
export const Backbuffer = render(o2);
// export const BackbufferScrollX = render(o2, [S, 0]);
// export const BackbufferScrollY = render(o2, [0, S]);

// Fullscreen + Backbuffer
const o3 = { overflow: true, backbuffer: true };
export const FullscreenBackbuffer = render(o3);
// export const FullscreenBackbufferScrollX = render(o3, [S, 0]);
// export const FullscreenBackbufferScrollY = render(o3, [0, S]);
