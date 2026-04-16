import type { Meta, StoryObj } from "@storybook/html-vite";
import React, { useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { VFXImg, VFXProvider } from "react-vfx";
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

        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.gap = "10px";
        wrapper.appendChild(controls);

        const status = document.createElement("span");
        status.id = "status";
        status.style.color = "white";
        status.textContent = "Status: rendering";
        controls.append(status);

        const loseBtn = document.createElement("button");
        loseBtn.textContent = "Force Context Lost";
        controls.appendChild(loseBtn);

        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Force Context Restore";
        controls.appendChild(restoreBtn);

        const img = document.createElement("img");
        img.src = Logo;
        wrapper.appendChild(img);

        initVFX();

        return wrapper;
    },
    play: async ({ canvasElement }) => {
        const img = canvasElement.querySelector("img")!;
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

        const status = canvasElement.querySelector("#status") as Element;
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

function ContextLostReactApp() {
    const statusRef = useRef<HTMLSpanElement>(null);

    const handleLose = useCallback(() => {
        const ext = getVFXContext();
        ext?.loseContext();
        if (statusRef.current) {
            statusRef.current.textContent = "Status: context lost";
        }
    }, []);

    const handleRestore = useCallback(() => {
        const ext = getVFXContext();
        ext?.restoreContext();
        if (statusRef.current) {
            statusRef.current.textContent = "Status: context restored";
        }
    }, []);

    const h = React.createElement;
    return h(
        VFXProvider,
        null,
        h(
            "div",
            null,
            h(
                "div",
                { style: { display: "flex", gap: "10px" } },
                h("span", { ref: statusRef, style: { color: "white" } }, "Status: rendering"),
                h("button", { onClick: handleLose }, "Force Context Lost"),
                h("button", { onClick: handleRestore }, "Force Context Restore"),
            ),
            h(VFXImg, { src: Logo, shader: "rainbow" }),
        ),
    );
}

export const ContextLostAndRestoreReact: StoryObj = {
    render: () => {
        const container = document.createElement("div");
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const container = canvasElement.firstElementChild as HTMLElement;
        const root = createRoot(container);
        root.render(React.createElement(ContextLostReactApp));
    },
};
