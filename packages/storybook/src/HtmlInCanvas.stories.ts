import type { Meta, StoryObj } from "@storybook/html-vite";
import { VFXCanvas, VFXProvider } from "@vfx-js/react";
import React from "react";
import { createRoot } from "react-dom/client";
import Jellyfish from "./assets/jellyfish.webp";
import { Timer } from "./Timer";
import { initVFX } from "./utils";

const qs = <T extends Element>(el: Element, sel: string) =>
    // biome-ignore lint/style/noNonNullAssertion: story helpers query known IDs
    el.querySelector(sel)! as T;

/** Shared setup: Timer + VFX + addHTML with rainbow shader */
function setupHIC(el: HTMLElement, shader = "rainbow") {
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);
    const vfx = initVFX();
    vfx.addHTML(el, { shader, uniforms: { time: () => timer.time } });
    return vfx;
}

/** Custom shader that ignores texture alpha — exposes actual canvas bounds */
const solidShader = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec3 col = 0.5 + 0.5 * cos(time + uv.xyx * 3.0 + vec3(0, 2, 4));
    outColor = vec4(col, 0.85);
}
`;

function fullscreenRoot() {
    // biome-ignore lint/style/noNonNullAssertion: storybook root always exists
    const root = document.getElementById("storybook-root")!;
    root.style.height = "auto";
    root.style.display = "block";
}

export default {
    title: "Html In Canvas",
    parameters: {
        layout: "fullscreen",
        chromatic: { disableSnapshot: true },
    },
} satisfies Meta;

export const AddHTML: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 128px 128px; font-family:sans-serif; color:white";

        const el = document.createElement("div");
        el.id = "add-html-target";
        el.innerHTML = `
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        `;
        container.appendChild(el);
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        setupHIC(qs(canvasElement, "#add-html-target"));
    },
};

export const AddHTMLWithImage: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 128px 128px; font-family:sans-serif; color:white";

        const el = document.createElement("div");
        el.id = "add-html-image-target";
        el.innerHTML = `
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4488ff"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>')}"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        `;
        container.appendChild(el);
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        setupHIC(qs(canvasElement, "#add-html-image-target"));
    },
};

export const Fallback: StoryObj = {
    parameters: { layout: "padded" },
    render: () => {
        const container = document.createElement("div");
        container.style.cssText =
            "padding-top:96px; font-family:sans-serif; color:white";

        const el = document.createElement("div");
        el.id = "fallback-target";
        el.style.display = "flow-root";
        el.innerHTML = `
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
            </p>
        `;
        container.appendChild(el);
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const el = qs<HTMLElement>(canvasElement, "#fallback-target");
        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);
        const vfx = initVFX();
        await vfx.add(el, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });
    },
};

export const CanvasSizeFixed: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:white;";

        const boxCss =
            "width:300px; height:80px; background:linear-gradient(90deg,#284,#28a); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-bottom:32px";

        const ref = document.createElement("div");
        ref.style.cssText = boxCss;
        ref.textContent = "REFERENCE 300×80";
        container.appendChild(ref);

        const target = document.createElement("div");
        target.id = "fixed-width-target";
        target.style.cssText = boxCss;
        target.textContent = "WITH addHTML";
        container.appendChild(target);

        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        setupHIC(qs(canvasElement, "#fixed-width-target"), solidShader);
    },
};

export const CanvasSizeWithPadding: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:white";

        const boxCss =
            "width:400px; padding:30px; border:5px solid #f44; background:linear-gradient(180deg,#284,#28a); font-size:1.4rem; line-height:1.6; font-weight:bold; margin-bottom:32px";

        const ref = document.createElement("div");
        ref.style.cssText = boxCss;
        ref.textContent = "REFERENCE (padding:30 border:5)";
        container.appendChild(ref);

        const target = document.createElement("div");
        target.id = "padding-target";
        target.style.cssText = boxCss;
        target.textContent = "WITH addHTML (same size expected)";
        container.appendChild(target);

        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const shader = solidShader.replace("uv.xyx", "uv.yxy");
        setupHIC(qs(canvasElement, "#padding-target"), shader);
    },
};

/**
 * The wrapper canvas copies the target's box from its computed style (#264).
 * Each gradient box (addHTML) should cover the dashed reference above it,
 * which has the same CSS. Resize the window: the boxes should keep matching.
 */
const cssSizeCases = [
    {
        key: "class",
        label: "Width from a class (.slides { width: 600px; margin: 0 40px })",
        css: ".hic-css-class { width: 600px; margin: 0 40px; }",
    },
    {
        key: "id",
        label: "Width from an #id rule (480px)",
        css: "#hic-css-id-ref, #hic-css-id-target { width: 480px; }",
    },
    {
        key: "center",
        label: "Centered with margin: 0 auto (480px)",
        css: ".hic-css-center { width: 480px; margin: 0 auto; }",
    },
    {
        key: "scaled",
        label: "Inside a transform: scale(0.75) parent (600px)",
        css: ".hic-css-scaled { width: 600px; }",
        stage: "transform: scale(0.75); transform-origin: 0 0; height: 60px",
    },
    {
        key: "right",
        label: "position: absolute; right: 0 (300px)",
        css: ".hic-css-right { position: absolute; top: 0; right: 0; width: 300px; }",
        stage: "position: relative; height: 80px",
    },
    {
        key: "half",
        label: "position: absolute; left: 50% (300px)",
        css: ".hic-css-half { position: absolute; top: 0; left: 50%; width: 300px; }",
        stage: "position: relative; height: 80px",
    },
] as const;

export const CanvasSizeFromCSS: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:#222; display:flex; flex-direction:column; gap:12px";

        const style = document.createElement("style");
        style.textContent = `
            .hic-css-box {
                box-sizing: border-box; height: 80px; display: flex;
                align-items: center; justify-content: center; font-weight: bold;
            }
            .hic-css-ref { border: 2px dashed #888; color: #888; }
            .hic-css-target { background: #345; color: white; }
            ${cssSizeCases.map((c) => c.css).join("\n")}
        `;
        container.appendChild(style);

        for (const c of cssSizeCases) {
            const label = document.createElement("div");
            label.textContent = c.label;
            label.style.cssText = "font-size:0.9rem; margin-top:12px";
            container.appendChild(label);

            for (const role of ["ref", "target"] as const) {
                const stage = document.createElement("div");
                stage.style.cssText = "stage" in c ? c.stage : "";
                const box = document.createElement("div");
                box.className = `hic-css-box hic-css-${role} hic-css-${c.key}`;
                box.id = `hic-css-${c.key}-${role}`;
                box.textContent = role === "ref" ? "REFERENCE" : "addHTML";
                stage.appendChild(box);
                container.appendChild(stage);
            }
        }
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);
        const vfx = initVFX();
        for (const c of cssSizeCases) {
            const target = qs<HTMLElement>(
                canvasElement,
                `#hic-css-${c.key}-target`,
            );
            vfx.addHTML(target, {
                shader: solidShader,
                uniforms: { time: () => timer.time },
            });
        }
    },
};

export const CanvasSizeWithReflow: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:white";

        const target = document.createElement("div");
        target.id = "reflow-target";
        target.style.cssText =
            "font-size:1.4rem; line-height:1.6; padding:16px; border:2px solid #888; max-width:600px";
        target.textContent = "Initial text";
        container.appendChild(target);

        const buttons = document.createElement("div");
        buttons.style.cssText = "margin-top:16px; display:flex; gap:8px";
        container.appendChild(buttons);

        for (const [id, label] of [
            ["reflow-change", "Change DOM text"],
            ["reflow-update", "Manual vfx.update()"],
        ] as const) {
            const btn = document.createElement("button");
            btn.id = id;
            btn.textContent = label;
            btn.style.padding = "8px 16px";
            buttons.appendChild(btn);
        }

        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const target = qs<HTMLElement>(canvasElement, "#reflow-target");
        const btnChange = qs<HTMLElement>(canvasElement, "#reflow-change");
        const btnUpdate = qs<HTMLElement>(canvasElement, "#reflow-update");

        const vfx = setupHIC(target);

        let i = 0;
        btnChange.addEventListener("click", () => {
            i++;
            target.textContent = `Updated text #${i} — longer content to force reflow`;
        });
        btnUpdate.addEventListener("click", () => {
            vfx.update(target);
        });
    },
};

export const ReactVFXCanvas: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 128px 128px; font-family:sans-serif; color:white";
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const container = canvasElement.firstElementChild as HTMLElement;
        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const root = createRoot(container);
        const h = React.createElement;
        root.render(
            h(
                VFXProvider,
                null,
                h(
                    VFXCanvas,
                    {
                        shader: "rainbow",
                        uniforms: { time: () => timer.time },
                        style: { display: "block", width: "100%" },
                    },
                    h("h2", null, "VFXCanvas (@vfx-js/react)"),
                    h(
                        "p",
                        {
                            style: {
                                fontSize: "1.2rem",
                                lineHeight: 1.6,
                                maxWidth: 600,
                            },
                        },
                        "This element is rendered via the React VFXCanvas component using html-in-canvas.",
                    ),
                ),
            ),
        );
    },
};

// Inset-sized absolute target with auto width/height.
const insetSizedCss = `
.inset-box {
    position: relative;
    display: inline-block;
    width: 360px;
    height: 220px;
    margin-right: 32px;
    background: #333;
}
.inset-target {
    position: absolute;
    inset: 24px;
    border: 8px solid #fc4;
    background: #246;
    padding: 12px;
    font-weight: bold;
}
`;

export const InsetSized: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:white";
        const style = document.createElement("style");
        style.textContent = insetSizedCss;
        container.appendChild(style);

        for (const [id, label] of [
            ["inset-sized-ref", "REFERENCE"],
            ["inset-sized-target", "WITH addHTML"],
        ]) {
            const box = document.createElement("div");
            box.className = "inset-box";
            box.innerHTML = `
                <div id="${id}" class="inset-target">
                    ${label}
                </div>
            `;
            container.appendChild(box);
        }
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        setupHIC(qs(canvasElement, "#inset-sized-target"), "none");
    },
};

// Percent vertical margins resolve against the containing block width.
export const InsetSizedPercentMargin: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:white";

        const targetCss =
            "position:absolute; top:0; bottom:0; left:0; right:0; margin:5% 0; background:linear-gradient(90deg,#284,#28a); font-weight:bold; padding:8px";

        for (const [id, label] of [
            ["percent-margin-ref", "REFERENCE"],
            ["percent-margin-target", "WITH addHTML"],
        ]) {
            const box = document.createElement("div");
            box.style.cssText =
                "position:relative; width:600px; height:200px; margin-bottom:32px; outline:1px solid #888";
            const target = document.createElement("div");
            target.id = id;
            target.style.cssText = targetCss;
            target.textContent = label;
            box.appendChild(target);
            container.appendChild(box);
        }
        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        setupHIC(qs(canvasElement, "#percent-margin-target"), solidShader);
    },
};

// A replaced element with `inset: 0` keeps its intrinsic size.
export const InsetReplacedElement: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "margin: 96px 16px; font-family:sans-serif; color:white";

        for (const id of ["replaced-ref", "replaced-target"]) {
            const box = document.createElement("div");
            box.style.cssText =
                "position:relative; width:900px; height:500px; margin-bottom:32px; outline:1px solid #888";
            const img = document.createElement("img");
            img.id = id;
            img.src = Jellyfish;
            img.style.cssText = "position:absolute; inset:0";
            box.appendChild(img);
            container.appendChild(box);
        }
        return container;
    },
    play: async ({ canvasElement }) => {
        const img = qs<HTMLImageElement>(canvasElement, "#replaced-target");
        await img.decode();
        setupHIC(img, solidShader);
    },
};
