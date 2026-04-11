import type { Meta, StoryObj } from "@storybook/html-vite";

import { Timer } from "./Timer";
import Logo from "./assets/logo-640w-20p.svg";
import { initVFX } from "./utils";
import "./preset.css";

export default {
    title: "Mouse Position",
} satisfies Meta;

// Debug shader:
// - green crosshair at gl_FragCoord.xy == mouse
// - magenta dot at element offset (bottom-left corner in canvas GL coords)
// - cyan dot at offset + resolution (top-right corner)
const DEBUG_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 mouse;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 dm = gl_FragCoord.xy - mouse;
    outColor += step(abs(dm.x), 1.) + step(abs(dm.y), 1.) * vec4(0,1,0,1);
}
`;

// Known screen-CSS coordinate for the synthetic mouse move and the
// DOM reference dot. Chosen so that (MOUSE_X, MOUSE_Y) falls within
// the default "small" viewport (600x600).
const MOUSE_X = 200;
const MOUSE_Y = 250;

function addReferenceDot(container: HTMLElement) {
    const dot = document.createElement("div");
    dot.style.cssText = `
        position: fixed;
        left: ${MOUSE_X - 5}px;
        top: ${MOUSE_Y - 5}px;
        width: 10px;
        height: 10px;
        background: red;
        z-index: 9999;
        pointer-events: none;
    `;
    container.appendChild(dot);
}

const render = (scrollable: boolean): StoryObj => ({
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");

        if (scrollable) {
            // Tall block to force page scroll → paddingY > 0
            const block = document.createElement("div");
            block.style.width = "100%";
            block.style.height = "2000px";
            block.style.background = "#222";
            container.appendChild(block);
        }

        // Logo img that VFX attaches to. Overflow=true makes the shader
        // render across the full viewport regardless of where the img sits.
        const img = document.createElement("img");
        img.src = Logo;
        img.style.position = "fixed";
        img.style.left = "0";
        img.style.top = "0";
        img.style.width = "200px";
        img.style.height = "200px";
        container.appendChild(img);

        addReferenceDot(container);

        // Use Timer so VRT snapshots are deterministic (even though the
        // debug shader doesn't depend on time).
        const timer = new Timer(1.0, [0, 10]);
        container.appendChild(timer.element);

        const vfx = initVFX({ pixelRatio: 1 });
        vfx.add(img, {
            shader: DEBUG_SHADER,
            overlay: true,
            overflow: true,
            uniforms: { time: () => timer.time },
        });

        return container;
    },
    play: async () => {
        // Dispatch a synthetic pointermove — VFXPlayer listens on
        // window `pointermove` (not `mousemove`).
        window.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: MOUSE_X,
                clientY: MOUSE_Y,
                pointerId: 1,
                pointerType: "mouse",
                bubbles: true,
            }),
        );
        // Wait a few rAF so vfx-player reads #mouseX/Y and renders a frame.
        await new Promise<void>((r) => {
            let n = 3;
            const tick = () => (--n > 0 ? requestAnimationFrame(tick) : r());
            requestAnimationFrame(tick);
        });
    },
    parameters: {
        layout: "fullscreen",
        viewport: {
            defaultViewport: "small",
        },
    },
});

// Regression guard: non-scrollable page → paddingY == 0 → already passes
// on current code. Green crosshair should overlap the red dot.
export const MousePosition = render(false);

// Bug reproduction: scrollable page → paddingY > 0. Before fix: green
// crosshair sits paddingY CSS px below the red dot. After fix: overlap.
export const MousePositionInScrollablePage = render(true);
