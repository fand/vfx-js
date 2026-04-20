import type { Meta, StoryObj } from "@storybook/html-vite";

import Logo from "./assets/logo-640w-20p.svg";
import { initVFX } from "./utils";
import "./preset.css";

export default {
    title: "Mouse Position",
} satisfies Meta;

// Show green cross on mouse
const DEBUG_SHADER = `
precision highp float;
uniform vec2 mouse;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 dm = gl_FragCoord.xy - mouse;
    outColor += step(abs(dm.x), 1.) + step(abs(dm.y), 1.) * vec4(0,1,0,1);
}
`;

function addReferenceDot(container: HTMLElement, pos: [number, number]) {
    const dot = document.createElement("div");
    dot.style.cssText = `
        position: fixed;
        left: ${pos[0] - 10}px;
        top: ${pos[1] - 10}px;
        width: 20px;
        height: 20px;
        background: red;
        z-index: 9999;
        pointer-events: none;
    `;
    container.appendChild(dot);
}

const render = (scrollable: boolean, pos: [number, number]): StoryObj => ({
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");

        if (scrollable) {
            // Force page scroll (paddingY > 0)
            const block = document.createElement("div");
            block.style.width = "100%";
            block.style.height = "2000px";
            block.style.background = "#222";
            container.appendChild(block);
        }

        // target element with overflow: true
        const img = document.createElement("img");
        img.src = Logo;
        img.style.position = "fixed";
        img.style.left = "0";
        img.style.top = "0";
        img.style.width = "200px";
        img.style.height = "200px";
        container.appendChild(img);

        addReferenceDot(container, pos);

        const vfx = initVFX({ pixelRatio: 1 });
        vfx.add(img, {
            shader: DEBUG_SHADER,
            overlay: true,
            overflow: true,
        });

        return container;
    },
    play: async ({ canvasElement }) => {
        const img = canvasElement.querySelector("img") as HTMLImageElement;
        if (img && !img.complete) {
            await new Promise((r) => {
                img.onload = r;
            });
        }
        window.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: pos[0],
                clientY: pos[1],
                pointerId: 1,
                pointerType: "mouse",
                bubbles: true,
            }),
        );
        // The shader has no `time` uniform, so once the auto-render picks
        // up the new `mouse` uniform the output is stable. Two rAFs is
        // enough for the uniform update to land on the canvas before
        // Chromatic captures.
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
    },
    parameters: {
        layout: "fullscreen",
        viewport: {
            defaultViewport: "small",
        },
    },
});

export const MousePosition = render(false, [200, 250]);
export const MousePositionInScrollablePage = render(true, [200, 250]);
