import type { Meta, StoryObj } from "@storybook/html-vite";
import type { RunOpts } from "@vfx-js/core";
import * as presets from "@vfx-js/transitions";
import { initVFX, isChromatic } from "./utils";

type Preset = Pick<RunOpts, "transition" | "params">;

const TRANSITIONS: Record<string, Preset> = {
    crossfade: { transition: presets.Crossfade },
    swipe: { transition: presets.Swipe },
    swipeUp: { transition: presets.Swipe, params: { direction: "up" } },
    zoom: { transition: presets.Zoom },
    zoomBlur: { transition: presets.ZoomBlur },
    crosszoom: { transition: presets.Crosszoom },
    glitch: { transition: presets.Glitch },
    glitchSlide: { transition: presets.GlitchSlide },
    datamosh: { transition: presets.Datamosh },
    pixelsort: { transition: presets.Pixelsort },
    pixelsortRight: {
        transition: presets.Pixelsort,
        params: { direction: "right" },
    },
    lensDistortion: { transition: presets.LensDistortion },
    slitScan: { transition: presets.SlitScan },
    pixelScan: { transition: presets.PixelScan },
    pixelStretch: { transition: presets.PixelStretch },
    tile: { transition: presets.Tile },
    tileUp: { transition: presets.Tile, params: { direction: "up" } },
    tileSquare: { transition: presets.Tile, params: { shape: "square" } },
    distortFade: { transition: presets.DistortFade },
};

type Args = {
    transition: keyof typeof TRANSITIONS;
    reverse: boolean;
    duration: number;
    overflow: "none" | "48px" | "full";
};

const OVERFLOW: Record<Args["overflow"], true | number | undefined> = {
    none: undefined,
    "48px": 48,
    full: true,
};

const PAGES = [
    {
        title: "Tab one",
        color: "#ff4f6d",
        body: "Click Next to swap this panel with a shader transition.",
    },
    {
        title: "Tab two",
        color: "#3fb6ff",
        body: "The old content is held while the DOM changes, then mixed into the new one.",
    },
    {
        title: "Tab three",
        color: "#7bdc6b",
        body: "A new run during a transition drops the old one.",
    },
];

function renderPage(index: number): HTMLElement {
    const page = PAGES[index];
    const cards = [1, 2, 3]
        .map(
            (n) =>
                `<li style="flex:1; padding:16px; border-radius:12px; background:${page.color}; color:#111">Card ${n}</li>`,
        )
        .join("");
    const section = document.createElement("section");
    section.innerHTML = `
        <h2 style="margin:0 0 12px">${page.title}</h2>
        <p style="margin:0 0 24px; line-height:1.6">${page.body}</p>
        <ul style="display:flex; gap:16px; margin:0; padding:0; list-style:none">${cards}</ul>
    `;
    section.hidden = index > 0;
    return section;
}

export default {
    title: "Transition",
    parameters: { layout: "fullscreen" },
} satisfies Meta<Args>;

export const Tabs: StoryObj<Args> = {
    args: {
        transition: "crossfade",
        reverse: false,
        duration: 0.8,
        overflow: "none",
    },
    argTypes: {
        transition: {
            control: { type: "select" },
            options: Object.keys(TRANSITIONS),
        },
        overflow: {
            control: { type: "select" },
            options: Object.keys(OVERFLOW),
        },
        duration: { control: { type: "range", min: 0, max: 3, step: 0.1 } },
    },
    render: (args) => {
        const root = document.createElement("div");
        root.style.cssText =
            "padding:64px; font-family:sans-serif; color:white; max-width:720px";

        // Keep the button outside the container, so the capture never covers it.
        const next = document.createElement("button");
        next.textContent = "Next";
        next.style.cssText = "margin-bottom:24px; font-size:1rem";

        // A fixed-size box: the tabs share one size, so nothing moves between them.
        // Width is explicit too; the story root shrinks to its content otherwise.
        const container = document.createElement("div");
        container.style.cssText =
            "width:560px; height:240px; box-sizing:border-box; padding:24px; border-radius:16px; background:#222";
        let index = 0;
        container.append(...PAGES.map((_, i) => renderPage(i)));
        root.append(next, container);

        const chromatic = isChromatic();
        const vfx = initVFX(chromatic ? { timeScale: 0 } : undefined);
        const transition = vfx.addTransition(container, {
            ...TRANSITIONS[args.transition],
            reverse: args.reverse,
            duration: args.duration,
            overflow: OVERFLOW[args.overflow],
            waitFor: "none",
        });
        const swap = () => {
            index = (index + 1) % PAGES.length;
            return transition.show(index);
        };
        next.addEventListener("click", () => void swap());

        if (chromatic) {
            // Pin the clock halfway through one run for a stable snapshot.
            requestAnimationFrame(() => {
                void swap();
                setTimeout(() => {
                    vfx.setTime(args.duration / 2);
                    vfx.render();
                }, 1000);
            });
        }
        return root;
    },
};
