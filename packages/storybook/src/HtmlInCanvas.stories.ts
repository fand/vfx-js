import type { Meta, StoryObj } from "@storybook/html-vite";
import { Timer } from "./Timer";
import { initVFX } from "./utils";

export default {
    title: "Html In Canvas",
    parameters: {
        layout: "fullscreen",
        // html-in-canvas requires chrome://flags/#canvas-draw-element
        chromatic: { disableSnapshot: true },
    },
} satisfies Meta;

export const AddHTML: StoryObj = {
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");
        container.style.padding = "128px";
        container.style.fontFamily = "sans-serif";
        container.style.color = "white";

        const el = document.createElement("div");
        el.innerHTML = `
            <h2>html-in-canvas: addHTML</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                This element is captured via <code>drawElementImage</code>
                and rendered with a shader effect.
                Resize the window to see responsive re-capture.
            </p>
        `;
        container.appendChild(el);

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(el, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });

        return container;
    },
};

export const AddHTMLWithImage: StoryObj = {
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");
        container.style.padding = "128px";
        container.style.fontFamily = "sans-serif";
        container.style.color = "white";

        const el = document.createElement("div");
        el.innerHTML = `
            <h2>html-in-canvas: with image</h2>
            <img src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4488ff"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>')}"
                 style="display:block; width:200px; border-radius:8px; margin-top:16px" />
        `;
        container.appendChild(el);

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(el, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });

        return container;
    },
};

export const Fallback: StoryObj = {
    parameters: { layout: "padded" },
    render: () => {
        const container = document.createElement("div");
        container.style.fontFamily = "sans-serif";
        container.style.color = "white";

        const el = document.createElement("div");
        el.id = "fallback-target";
        el.style.display = "flow-root";
        el.innerHTML = `
            <h2>html-in-canvas: fallback</h2>
            <p style="font-size:1.2rem; line-height:1.6; max-width:600px">
                When html-in-canvas is not supported, <code>addHTML</code>
                falls back to <code>add</code> (dom-to-canvas).
                This story works in any browser.
            </p>
        `;
        container.appendChild(el);

        return container;
    },
    // vfx.add needs the element in the DOM with settled layout
    play: async ({ canvasElement }) => {
        await new Promise((r) => requestAnimationFrame(r));
        const el = canvasElement.querySelector("#fallback-target")!;

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        await vfx.add(el as HTMLElement, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });
    },
};

// ---------- Bug demonstration stories ----------
// These stories visualize known sizing bugs documented in research.md.

/**
 * BUG (issues 1, 2): `wrapElement` forces `width: 100%` on the wrapper canvas
 * regardless of the element's intrinsic/fixed width. The canvas overflows to
 * the full parent width, and the texture (sized to childRect) gets stretched
 * across the wider canvas via `resolution` uniform from wrapper rect.
 *
 * Expected: rainbow area matches the 300px reference box.
 * Actual: rainbow area spans the full 800px parent.
 */
export const BugFixedWidth: StoryObj = {
    name: "Bug: width:100% override (issues 1, 2)",
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");
        container.style.padding = "64px";
        container.style.fontFamily = "sans-serif";
        container.style.color = "white";

        const parent = document.createElement("div");
        parent.style.width = "800px";
        parent.style.border = "1px dashed #888";
        parent.style.padding = "16px";
        parent.style.display = "flex";
        parent.style.flexDirection = "column";
        parent.style.gap = "32px";
        container.appendChild(parent);

        // Reference box: 300px, no shader
        const ref = document.createElement("div");
        ref.style.width = "300px";
        ref.style.border = "2px solid #f44";
        ref.style.padding = "16px";
        ref.innerHTML = "<strong>REFERENCE: 300px wide</strong>";
        parent.appendChild(ref);

        // Target: 300px element with addHTML applied
        const target = document.createElement("div");
        target.style.width = "300px";
        target.style.border = "2px solid #f44";
        target.style.padding = "16px";
        target.innerHTML =
            "<strong>WITH addHTML: should also be 300px</strong>";
        parent.appendChild(target);

        const note = document.createElement("p");
        note.style.color = "#ff0";
        note.style.fontSize = "0.9rem";
        note.style.marginTop = "16px";
        note.textContent =
            "BUG: rainbow shader spans the full 800px parent instead of matching the 300px reference.";
        container.appendChild(note);

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(target, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });

        return container;
    },
};

/**
 * BUG (issue 3): The ResizeObserver in `wrapElement` uses `entry.contentRect`
 * (content-box), but the initial canvas height is set from
 * `getBoundingClientRect()` (border-box). After the first RO fire, the canvas
 * CSS height shrinks by `padding + border` total, while the texture (sized
 * via childRect = border-box) keeps the larger size — content gets squashed
 * vertically.
 *
 * Expected: rainbow box height matches the reference box.
 * Actual: rainbow box is shorter by ~70px (30px padding * 2 + 5px border * 2).
 */
export const BugChildWithPadding: StoryObj = {
    name: "Bug: padding shrinks via contentRect (issue 3)",
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");
        container.style.padding = "64px";
        container.style.fontFamily = "sans-serif";
        container.style.color = "white";

        // Reference: identical padding/border, no shader
        const ref = document.createElement("div");
        ref.style.padding = "30px";
        ref.style.border = "5px solid #f44";
        ref.style.fontSize = "1.4rem";
        ref.style.lineHeight = "1.6";
        ref.style.marginBottom = "32px";
        ref.style.maxWidth = "600px";
        ref.textContent = "REFERENCE — same padding/border, no shader";
        container.appendChild(ref);

        // Target with addHTML
        const target = document.createElement("div");
        target.style.padding = "30px";
        target.style.border = "5px solid #f44";
        target.style.fontSize = "1.4rem";
        target.style.lineHeight = "1.6";
        target.style.maxWidth = "600px";
        target.textContent =
            "WITH addHTML — should be the same height as reference";
        container.appendChild(target);

        const note = document.createElement("p");
        note.style.color = "#ff0";
        note.style.fontSize = "0.9rem";
        note.style.marginTop = "32px";
        note.textContent =
            "BUG: ResizeObserver uses contentRect (content-box), so the canvas CSS height shrinks by padding+border total (~70px) after the first RO fire. Texture is compressed vertically.";
        container.appendChild(note);

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(target, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });

        return container;
    },
};

/**
 * BUG (issue 4): `wrapElement`'s ResizeObserver only updates canvas CSS
 * height — it does NOT trigger texture re-capture. `vfx-player`'s hic
 * re-capture only fires on `window.resize`. So content mutations (text
 * changes, image loads, font swaps) leave the texture stale until the user
 * manually calls `vfx.update(el)`.
 *
 * Expected: rainbow shader content updates when DOM text changes.
 * Actual: rainbow shader keeps showing the original text. Click "Manual
 * vfx.update()" to force a re-capture.
 */
export const BugContentReflow: StoryObj = {
    name: "Bug: no auto re-capture on content change (issue 4)",
    render: () => {
        const root = document.getElementById("storybook-root")!;
        root.style.height = "auto";
        root.style.display = "block";

        const container = document.createElement("div");
        container.style.padding = "64px";
        container.style.fontFamily = "sans-serif";
        container.style.color = "white";

        const target = document.createElement("div");
        target.style.fontSize = "1.4rem";
        target.style.lineHeight = "1.6";
        target.style.padding = "16px";
        target.style.border = "2px solid #888";
        target.style.maxWidth = "600px";
        target.textContent = "Initial text";
        container.appendChild(target);

        const buttons = document.createElement("div");
        buttons.style.marginTop = "16px";
        buttons.style.display = "flex";
        buttons.style.gap = "8px";
        container.appendChild(buttons);

        const btnChange = document.createElement("button");
        btnChange.textContent = "Change DOM text";
        btnChange.style.padding = "8px 16px";
        let i = 0;
        btnChange.addEventListener("click", () => {
            i++;
            target.textContent = `Updated text #${i} — longer content to force reflow`;
        });
        buttons.appendChild(btnChange);

        const btnUpdate = document.createElement("button");
        btnUpdate.textContent = "Manual vfx.update()";
        btnUpdate.style.padding = "8px 16px";
        buttons.appendChild(btnUpdate);

        const note = document.createElement("p");
        note.style.color = "#ff0";
        note.style.fontSize = "0.9rem";
        note.style.marginTop = "16px";
        note.textContent =
            'BUG: clicking "Change DOM text" mutates the DOM, but the rainbow shader keeps showing the original text. Clicking "Manual vfx.update()" forces a re-capture.';
        container.appendChild(note);

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(target, {
            shader: "rainbow",
            uniforms: { time: () => timer.time },
        });

        btnUpdate.addEventListener("click", () => {
            vfx.update(target);
        });

        return container;
    },
};
