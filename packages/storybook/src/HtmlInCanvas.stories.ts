import type { Meta, StoryObj } from "@storybook/html-vite";
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

// ---------- Bug demonstration stories ----------

/** BUG: wrapElement forces width:100% regardless of element's intrinsic width.
 *  Uses solidShader (ignores texture alpha) to expose actual canvas bounds. */
export const BugFixedWidth: StoryObj = {
    name: "Bug: width:100% override (issues 1, 2)",
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 64px 64px; font-family:sans-serif; color:white";

        // 800px parent — intentionally not flex
        const parent = document.createElement("div");
        parent.style.cssText =
            "width:800px; border:1px dashed #888; padding:16px";
        container.appendChild(parent);

        const boxCss =
            "width:300px; height:80px; background:linear-gradient(90deg,#284,#28a); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-bottom:32px";

        const ref = document.createElement("div");
        ref.style.cssText = boxCss;
        ref.textContent = "REFERENCE 300×80";
        parent.appendChild(ref);

        const target = document.createElement("div");
        target.id = "bug-fixed-width-target";
        target.style.cssText = boxCss;
        target.textContent = "WITH addHTML";
        parent.appendChild(target);

        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        setupHIC(qs(canvasElement, "#bug-fixed-width-target"), solidShader);
    },
};

/** BUG: ResizeObserver uses contentRect (content-box) but initial canvas height
 *  comes from getBoundingClientRect (border-box). Canvas shrinks by padding+border. */
export const BugChildWithPadding: StoryObj = {
    name: "Bug: padding shrinks via contentRect (issue 3)",
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 64px 64px; font-family:sans-serif; color:white";

        const boxCss =
            "width:400px; padding:30px; border:5px solid #f44; background:linear-gradient(180deg,#284,#28a); font-size:1.4rem; line-height:1.6; font-weight:bold; margin-bottom:32px";

        const ref = document.createElement("div");
        ref.style.cssText = boxCss;
        ref.textContent = "REFERENCE (padding:30 border:5)";
        container.appendChild(ref);

        const target = document.createElement("div");
        target.id = "bug-padding-target";
        target.style.cssText = boxCss;
        target.textContent = "WITH addHTML (same size expected)";
        container.appendChild(target);

        return container;
    },
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const shader = solidShader.replace("uv.xyx", "uv.yxy");
        setupHIC(qs(canvasElement, "#bug-padding-target"), shader);
    },
};

/** BUG: hic re-capture only fires on window.resize. DOM mutations (text, images)
 *  leave texture stale until manual vfx.update(). */
export const BugContentReflow: StoryObj = {
    name: "Bug: no auto re-capture on content change (issue 4)",
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 64px 64px; font-family:sans-serif; color:white";

        const target = document.createElement("div");
        target.id = "bug-reflow-target";
        target.style.cssText =
            "font-size:1.4rem; line-height:1.6; padding:16px; border:2px solid #888; max-width:600px";
        target.textContent = "Initial text";
        container.appendChild(target);

        const buttons = document.createElement("div");
        buttons.style.cssText = "margin-top:16px; display:flex; gap:8px";
        container.appendChild(buttons);

        for (const [id, label] of [
            ["bug-reflow-change", "Change DOM text"],
            ["bug-reflow-update", "Manual vfx.update()"],
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
        const target = qs<HTMLElement>(canvasElement, "#bug-reflow-target");
        const btnChange = qs<HTMLElement>(canvasElement, "#bug-reflow-change");
        const btnUpdate = qs<HTMLElement>(canvasElement, "#bug-reflow-update");

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
