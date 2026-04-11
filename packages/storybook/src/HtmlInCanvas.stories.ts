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
 * the full parent width, disrupting layout and extending the shader render
 * area beyond the original element's bounds.
 *
 * Note: `drawElementImage` rasterizes children at canvas-pixel-density
 * (buffer/css), not at devicePixelRatio. When the canvas CSS width is
 * stretched beyond the child width, the captured texture has transparent
 * padding on the right. Texture-alpha-dependent shaders (rainbow, uvGradient)
 * output transparent in that area, making the bug invisible by coincidence.
 *
 * This story uses a custom shader that ignores texture alpha and outputs a
 * solid gradient over the full render area, exposing the wrapper canvas's
 * actual size.
 *
 * Expected: gradient area matches the 300px reference box.
 * Actual: gradient area spans the full 800px parent.
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

        // 800px block parent. Intentionally NOT flex, to keep layout simple.
        const parent = document.createElement("div");
        parent.style.width = "800px";
        parent.style.border = "1px dashed #888";
        parent.style.padding = "16px";
        container.appendChild(parent);

        // Common style for the 300×80 visual box. No padding / no border so
        // ResizeObserver's contentRect == border-box and issue 3 does NOT
        // shrink the canvas. This isolates issues 1/2.
        const boxStyle = (el: HTMLElement) => {
            el.style.width = "300px";
            el.style.height = "80px";
            el.style.background = "linear-gradient(90deg, #284, #28a)";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.style.fontWeight = "bold";
            el.style.marginBottom = "32px";
        };

        // Reference: 300×80 box, no shader
        const ref = document.createElement("div");
        boxStyle(ref);
        ref.textContent = "REFERENCE 300×80";
        parent.appendChild(ref);

        // Target: identical 300×80 box with addHTML applied
        const target = document.createElement("div");
        boxStyle(target);
        target.textContent = "WITH addHTML";
        parent.appendChild(target);

        const note = document.createElement("p");
        note.style.color = "#ff0";
        note.style.fontSize = "0.9rem";
        note.style.marginTop = "16px";
        note.textContent =
            "BUG: the colored gradient spans the full 800px parent instead of matching the 300px reference box above. The wrapper canvas is stretched to 100% width by wrapElement.";
        container.appendChild(note);

        // Custom shader that renders a solid gradient, ignoring src alpha.
        // This exposes the wrapper canvas's actual render area (800×80)
        // regardless of where drawElementImage placed its content.
        const customShader = `
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

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(target, {
            shader: customShader,
            uniforms: { time: () => timer.time },
        });

        return container;
    },
};

/**
 * BUG (issue 3): `wrapElement`'s ResizeObserver uses `entry.contentRect`
 * (content-box), but the initial canvas CSS height comes from
 * `getBoundingClientRect()` (border-box). After the first RO fire, canvas
 * CSS height shrinks by `padding + border` total.
 *
 * That alone would just compress the texture vertically. But there's a
 * secondary amplification: by the time `captureElement`'s `waitForPaint`
 * (double-rAF) resolves, the RO has already fired. The new canvas pixel
 * density (vertical) is `buffer / new_css` instead of `dpr`, and
 * `drawElementImage` rasterizes the child at this inflated density —
 * which overflows the pixel buffer and **clips the bottom of the child**.
 *
 * Uses the same alpha-independent custom shader as BugFixedWidth so the
 * canvas's actual render area is visible (alpha-dependent shaders like
 * rainbow would hide the width mismatch from the coexisting issue 1/2).
 *
 * Expected: gradient box height matches the reference box.
 * Actual: gradient box is shorter by ~70px (30px padding × 2 + 5px border × 2).
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

        // Common style: fixed width (avoids text-wrap variability),
        // padding + border (to trigger content-box < border-box).
        const boxStyle = (el: HTMLElement) => {
            el.style.width = "400px";
            el.style.padding = "30px";
            el.style.border = "5px solid #f44";
            el.style.background = "linear-gradient(180deg, #284, #28a)";
            el.style.fontSize = "1.4rem";
            el.style.lineHeight = "1.6";
            el.style.fontWeight = "bold";
            el.style.marginBottom = "32px";
        };

        // Reference: identical padding/border, no shader
        const ref = document.createElement("div");
        boxStyle(ref);
        ref.textContent = "REFERENCE (padding:30 border:5)";
        container.appendChild(ref);

        // Target with addHTML applied
        const target = document.createElement("div");
        boxStyle(target);
        target.textContent = "WITH addHTML (same size expected)";
        container.appendChild(target);

        const note = document.createElement("p");
        note.style.color = "#ff0";
        note.style.fontSize = "0.9rem";
        note.style.marginTop = "32px";
        note.textContent =
            "BUG: the shader box is ~70px shorter than the reference (lost the padding+border zone). ResizeObserver fires with contentRect, shrinking canvas CSS height below the captured texture, and drawElementImage then clips the child's bottom on re-capture.";
        container.appendChild(note);

        // Alpha-independent shader — exposes the canvas's actual render area
        // regardless of texture transparency (same trick as BugFixedWidth).
        const customShader = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec3 col = 0.5 + 0.5 * cos(time + uv.yxy * 3.0 + vec3(0, 2, 4));
    outColor = vec4(col, 0.85);
}
`;

        const timer = new Timer(0, [0, 10]);
        document.body.append(timer.element);

        const vfx = initVFX();
        vfx.addHTML(target, {
            shader: customShader,
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
