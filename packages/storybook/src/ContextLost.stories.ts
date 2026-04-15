import type { Meta, StoryObj } from "@storybook/html-vite";
import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

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
        restoreBtn.disabled = true;
        controls.appendChild(restoreBtn);

        // Image
        const img = document.createElement("img");
        img.src = Logo;
        wrapper.appendChild(img);

        // Init VFX
        const vfx = initVFX();
        vfx.add(img, { shader: "rainbow" });

        // Button handlers
        loseBtn.addEventListener("click", () => {
            vfx.forceContextLoss();
            status.textContent = "Status: context lost";
            status.style.color = "#f88";
            loseBtn.disabled = true;
            restoreBtn.disabled = false;
        });

        restoreBtn.addEventListener("click", () => {
            vfx.forceContextRestore();
            status.textContent = "Status: context restored";
            status.style.color = "#8f8";
            loseBtn.disabled = false;
            restoreBtn.disabled = true;
        });

        return wrapper;
    },
};
