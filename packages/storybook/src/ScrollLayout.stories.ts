import type { Meta, StoryObj } from "@storybook/html-vite";
// import { allModes } from "../.storybook/modes";

import { initVFX } from "./utils";
import { Timer } from "./Timer";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

export default {
    title: "Layout with Scroll",
} satisfies Meta;

function addPaddingDebug(container: HTMLElement) {
    const debug = document.createElement("div");
    debug.textContent = "padding: ...";
    container.appendChild(debug);

    const update = () => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;
        const px = (canvas.width - window.innerWidth) / 2;
        const py = (canvas.height - window.innerHeight) / 2;
        debug.textContent = `padding: ${px.toFixed(0)}x${py.toFixed(0)}`;
        requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

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

        addPaddingDebug(container);

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
            // XXX: This doesn't work on Chromatic...
            // Thus we can't test the output after scroll properly, that's why I commented out some stories below.
            defaultViewport: "small",
        },
    },
});

const renderWithWrapper = (opts = {}): StoryObj => ({
    render: () => {
        // Return the wrapper div directly. Canvas is appended inside it
        // by the VFX constructor, so it survives Storybook's root clearing.
        // Extra nesting (body > #storybook-root > wrapper) is unavoidable
        // in Storybook but doesn't affect the test.
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.overflow = "hidden";

        // big blocks to cause scroll
        const block = document.createElement("div");
        block.style.width = "800px";
        block.style.height = "400px";
        block.style.background = "#999";

        wrapper.appendChild(block.cloneNode());

        const img = document.createElement("img");
        img.src = Logo;
        wrapper.appendChild(img);

        wrapper.appendChild(block.cloneNode());

        const timer = new Timer(1.0, [0, 10]);
        wrapper.appendChild(timer.element);

        addPaddingDebug(wrapper);

        const vfx = initVFX({ wrapper, pixelRatio: 1 });
        vfx.add(img, {
            shader: "sinewave",
            uniforms: { time: () => timer.time },
            overlay: true,
            ...opts,
        });
        vfx.play();

        return wrapper;
    },
    parameters: {
        layout: "fullscreen",
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

// With wrapper
export const Wrapper = renderWithWrapper();
export const WrapperFullscreen = renderWithWrapper(o1);
