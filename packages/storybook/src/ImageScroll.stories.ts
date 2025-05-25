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

export const longPageWithImage: StoryObj = {
    render: () => {
        // Create a tall container to force vertical scroll
        const container = document.createElement("div");
        container.style.height = "2000px";
        container.style.position = "relative";
        container.style.background = "#111";

        // Place the image somewhere in the middle
        const img = document.createElement("img");
        img.src = Logo;
        img.style.margin = "900px auto 0 auto";

        container.appendChild(img);

        // Use Timer to mock time for VRT
        const timer = new Timer(1.0, [0, 10]);
        container.appendChild(timer.element);

        const vfx = initVFX();
        vfx.add(img, {
            shader: "sinewave",
            uniforms: { time: () => timer.time },
        });

        return container;
    },
    name: "Image in Long Scrollable Page",
};

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
        // img.style.minWidth = "3000px";

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

export const scrolledToImage: StoryObj = {
    render: () => {
        // Same as above: tall container and image in the middle
        const container = document.createElement("div");
        container.style.height = "2000px";
        container.style.position = "relative";
        container.style.background = "#111";

        const img = document.createElement("img");
        img.src = Logo;
        img.style.display = "block";
        img.style.margin = "900px auto 0 auto";
        img.style.maxWidth = "400px";
        img.style.boxShadow = "0 4px 32px #0008";
        img.alt = "Jellyfish";

        container.appendChild(img);

        // Use Timer to mock time for VRT
        const timer = new Timer(1.0, [0, 10]);
        container.appendChild(timer.element);

        const vfx = initVFX();
        vfx.add(img, {
            shader: "sinewave",
            uniforms: { time: () => timer.time },
        });

        // Scroll the window to the image after rendering
        setTimeout(() => {
            // Scroll so the image is near the top of the viewport
            img.scrollIntoView({ behavior: "auto", block: "start" });
        }, 50);

        return container;
    },
    name: "Image After Scrolling to It",
};
