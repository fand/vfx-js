import type { Meta, StoryObj } from "@storybook/html-vite";
import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

function getVFXContext(): WEBGL_lose_context | null {
    const canvas = document.querySelector(
        'canvas[style*="pointer-events"]',
    ) as HTMLCanvasElement | null;
    if (!canvas) {
        return null;
    }
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return gl?.getExtension("WEBGL_lose_context") ?? null;
}

export default {
    title: "Context Lost",
    parameters: {
        layout: "fullscreen",
    },
} satisfies Meta;

export const ContextLostAndRestore: StoryObj = {
    render: () => {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "20px";
        wrapper.style.padding = "20px";

        // Status display
        const status = document.createElement("div");
        status.dataset.role = "status";
        status.style.color = "white";
        status.style.fontFamily = "monospace";
        status.style.fontSize = "14px";
        status.textContent = "Status: rendering";
        wrapper.appendChild(status);

        // Buttons
        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.gap = "12px";
        wrapper.appendChild(controls);

        const btnStyle = (btn: HTMLButtonElement) => {
            btn.style.padding = "8px 16px";
            btn.style.fontFamily = "monospace";
            btn.style.fontSize = "14px";
            btn.style.cursor = "pointer";
            btn.style.border = "1px solid #666";
            btn.style.borderRadius = "4px";
            btn.style.color = "white";
        };

        const loseBtn = document.createElement("button");
        loseBtn.textContent = "Force Context Lost";
        loseBtn.style.background = "#a33";
        btnStyle(loseBtn);
        controls.appendChild(loseBtn);

        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Force Context Restore";
        restoreBtn.style.background = "#3a3";
        btnStyle(restoreBtn);
        controls.appendChild(restoreBtn);

        // Image
        const img = document.createElement("img");
        img.src = Logo;
        wrapper.appendChild(img);

        // Init VFX
        initVFX();

        return wrapper;
    },
    play: async ({ canvasElement }) => {
        const img = canvasElement.querySelector("img") as HTMLImageElement;
        await new Promise((r) => {
            if (img.complete) {
                r(undefined);
            } else {
                img.onload = r;
            }
        });

        // biome-ignore lint/suspicious/noExplicitAny: access global vfx
        const vfx = (window as any).vfx;
        await vfx.add(img, { shader: "rainbow" });

        const status = canvasElement.querySelector(
            '[data-role="status"]',
        ) as HTMLDivElement;
        const loseBtn = canvasElement.querySelectorAll("button")[0];
        const restoreBtn = canvasElement.querySelectorAll("button")[1];

        const ext = getVFXContext();

        loseBtn.addEventListener("click", () => {
            ext?.loseContext();
            status.textContent = "Status: context lost";
        });

        restoreBtn.addEventListener("click", () => {
            ext?.restoreContext();
            status.textContent = "Status: context restored";
        });
    },
};
