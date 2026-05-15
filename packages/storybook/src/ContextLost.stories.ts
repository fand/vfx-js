import type { Meta, StoryObj } from "@storybook/html-vite";
import React, { useCallback, useContext, useRef } from "react";
import { createRoot } from "react-dom/client";
import { VFXContext, VFXImg, VFXProvider } from "@vfx-js/react";
import Logo from "./assets/logo-640w-20p.svg";
import { initVFX } from "./utils";
import "./preset.css";

/** Disc travelling at constant velocity from the left edge of the quad
 *  to the right edge as `time` advances. `time` is stepped in 0.1
 *  increments by the Draw button in the play function, so rendered
 *  output is deterministic. */
const backbufferShader = `
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform sampler2D backbuffer;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    // Disc centre sweeps uv.x from 0 (left edge) to 1 (right edge)
    // over time 0..3.
    vec2 centre = vec2(time / 3.0, 0.5);
    vec2 d = (uv - centre) * vec2(resolution.x / resolution.y, 1.0);
    outColor = vec4(step(length(d), .15));
    outColor += texture(backbuffer, uv) * vec4(.95);
}
`;

const RENDER_FRAMES = 30;

/** Must be called while the context is still active; the extension
 *  reference stays valid even after context loss. */
function getVFXLoseContextExt(): WEBGL_lose_context | null {
    const canvas = getVFXCanvas();
    if (!canvas) {
        return null;
    }
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return gl?.getExtension("WEBGL_lose_context") ?? null;
}

function getVFXCanvas(): HTMLCanvasElement | null {
    return document.querySelector(
        'canvas[style*="pointer-events"]',
    ) as HTMLCanvasElement | null;
}

/** Resolves on the next dispatch of `type` on `target`, then yields a
 *  frame so VFX's own listener can run its recovery logic before we
 *  continue. */
function waitForCanvasEvent(
    target: EventTarget | null,
    type: string,
): Promise<void> {
    return new Promise((resolve) => {
        if (!target) {
            resolve();
            return;
        }
        target.addEventListener(
            type,
            () => requestAnimationFrame(() => resolve()),
            { once: true },
        );
    });
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

        const drawBtn = document.createElement("button");
        drawBtn.textContent = "Draw";
        controls.appendChild(drawBtn);

        const loseBtn = document.createElement("button");
        loseBtn.textContent = "Force Context Lost";
        controls.appendChild(loseBtn);

        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Force Context Restore";
        controls.appendChild(restoreBtn);

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.flexDirection = "column";
        row.style.gap = "20px";
        wrapper.appendChild(row);

        const img1 = document.createElement("img");
        img1.src = Logo;
        row.appendChild(img1);

        // Second element uses a backbuffer shader so restore exercises
        // FBO + persistent-texture recovery as well as program recompile.
        const img2 = document.createElement("img");
        img2.src = Logo;
        row.appendChild(img2);

        initVFX({ autoplay: false });

        return wrapper;
    },
    play: async ({ canvasElement }) => {
        const [img1, img2] = [
            ...canvasElement.querySelectorAll("img"),
        ] as HTMLImageElement[];
        await Promise.all(
            [img1, img2].map(
                (img) =>
                    new Promise((r) => {
                        if (img.complete) {
                            r(undefined);
                        } else {
                            img.onload = r;
                        }
                    }),
            ),
        );

        // biome-ignore lint/suspicious/noExplicitAny: access global vfx
        const vfx = (window as any).vfx;

        // Frame counter drives the backbuffer shader's time.
        let time = 0;

        await vfx.add(img1, {
            shader: "rainbow",
            uniforms: { time: () => time },
        });
        await vfx.add(img2, {
            shader: backbufferShader,
            backbuffer: true,
            uniforms: { time: () => time },
        });

        const status = canvasElement.querySelector("#status") as Element;
        const buttons = canvasElement.querySelectorAll("button");
        const drawBtn = buttons[0] as HTMLButtonElement;
        const loseBtn = buttons[1] as HTMLButtonElement;
        const restoreBtn = buttons[2] as HTMLButtonElement;

        // Grab once while the context is alive — getExtension returns null after loss
        const ext = getVFXLoseContextExt();

        drawBtn.addEventListener("click", () => {
            // Render at the current time first so time=0 is drawn on the
            // very first click; then advance.
            vfx.render();
            time += 0.1;
        });

        loseBtn.addEventListener("click", () => {
            ext?.loseContext();
            status.textContent = "Status: context lost";
        });

        restoreBtn.addEventListener("click", () => {
            ext?.restoreContext();
            status.textContent = "Status: context restored";
            // Resetting time here makes pre-loss and post-restore renders
            // pixel-identical when the user performs the same sequence of
            // Draw clicks again.
            time = 0;
        });

        // Chromatic snapshot fires after play() resolves. The sequence
        // below (draw N → lose → restore → draw N) exercises the full
        // context-recovery path; if resources don't rebuild correctly,
        // the final state will differ pixel-wise from a clean render.
        const drawBatch = (n: number): void => {
            for (let i = 0; i < n; i++) {
                drawBtn.click();
            }
        };

        const canvas = getVFXCanvas();
        drawBatch(RENDER_FRAMES);
        const lost = waitForCanvasEvent(canvas, "webglcontextlost");
        loseBtn.click();
        await lost;
        const restored = waitForCanvasEvent(canvas, "webglcontextrestored");
        restoreBtn.click();
        await restored;
        drawBatch(RENDER_FRAMES);
    },
};

/** Inner component that lives inside VFXProvider so it can reach the
 *  VFX instance via context. Wires the Draw / Lose / Restore buttons to
 *  manual render + context-loss control. */
function ContextLostReactControls() {
    const vfx = useContext(VFXContext);
    const statusRef = useRef<HTMLSpanElement>(null);
    const extRef = useRef<WEBGL_lose_context | null>(null);
    const timeRef = useRef(0);

    const initExt = useCallback(() => {
        if (!extRef.current) {
            extRef.current = getVFXLoseContextExt();
        }
    }, []);

    const handleDraw = useCallback(() => {
        if (!vfx) {
            return;
        }
        // Render at the current time first so time=0 is drawn on the
        // very first click; then advance.
        vfx.render();
        timeRef.current += 0.1;
    }, [vfx]);

    const handleLose = useCallback(() => {
        initExt();
        extRef.current?.loseContext();
        if (statusRef.current) {
            statusRef.current.textContent = "Status: context lost";
        }
    }, [initExt]);

    const handleRestore = useCallback(() => {
        extRef.current?.restoreContext();
        if (statusRef.current) {
            statusRef.current.textContent = "Status: context restored";
        }
        timeRef.current = 0;
    }, []);

    const h = React.createElement;
    return h(
        "div",
        null,
        h(
            "div",
            { style: { display: "flex", gap: "10px" } },
            h(
                "span",
                { ref: statusRef, style: { color: "white" } },
                "Status: rendering",
            ),
            h("button", { onClick: handleDraw }, "Draw"),
            h("button", { onClick: handleLose }, "Force Context Lost"),
            h("button", { onClick: handleRestore }, "Force Context Restore"),
        ),
        h(
            "div",
            {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                },
            },
            h(VFXImg, {
                src: Logo,
                shader: "rainbow",
                uniforms: { time: () => timeRef.current },
            }),
            h(VFXImg, {
                src: Logo,
                shader: backbufferShader,
                backbuffer: true,
                uniforms: { time: () => timeRef.current },
            }),
        ),
    );
}

function ContextLostReactApp() {
    const h = React.createElement;
    return h(
        VFXProvider,
        { autoplay: false },
        h(ContextLostReactControls, null),
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

        // Wait for React to commit and VFXImg to register its elements
        // with VFXProvider (both need a couple of frames + image loads).
        await new Promise((r) => setTimeout(r, 500));

        const buttons = canvasElement.querySelectorAll("button");
        const drawBtn = buttons[0] as HTMLButtonElement;
        const loseBtn = buttons[1] as HTMLButtonElement;
        const restoreBtn = buttons[2] as HTMLButtonElement;

        const drawBatch = (n: number): void => {
            for (let i = 0; i < n; i++) {
                drawBtn.click();
            }
        };

        const canvas = getVFXCanvas();
        drawBatch(RENDER_FRAMES);
        const lost = waitForCanvasEvent(canvas, "webglcontextlost");
        loseBtn.click();
        await lost;
        const restored = waitForCanvasEvent(canvas, "webglcontextrestored");
        restoreBtn.click();
        await restored;
        drawBatch(RENDER_FRAMES);
    },
};
