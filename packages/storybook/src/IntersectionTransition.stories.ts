import type { Meta, StoryObj } from "@storybook/html-vite";
import type { VFX, VFXProps } from "@vfx-js/core";
import Jellyfish from "./assets/jellyfish.webp";
import { initVFX } from "./utils";

// Cases where the enter/leave presets break today.
// See docs/tasks/intersection-fix/spec.md.

type Preset =
    | "warpTransition"
    | "slitScanTransition"
    | "pixelateTransition"
    | "focusTransition";

type Step = {
    label: string;
    run: (ctx: SceneContext) => Promise<void>;
};

type SceneContext = {
    vfx: VFX;
    img: HTMLImageElement;
    /** Scroll so the image sits in the middle of the viewport. */
    scrollIn: () => void;
    /** Scroll so the image top is below the leave line but still on screen. */
    scrollOut: () => void;
    /** Scroll so the image is far below the viewport. */
    scrollAway: () => void;
};

type SceneOpts = {
    preset: Preset;
    /** What goes wrong, shown in the panel. */
    bug: string;
    steps: Step[];
    tall?: boolean;
    intersection?: VFXProps["intersection"];
    /** Fraction of the viewport cut from the top and bottom. */
    marginRatio?: number;
    timeScale?: number;
};

const SPACER = "150vh";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guideLine(topRatio: number): HTMLElement {
    const line = document.createElement("div");
    line.style.cssText = `position:fixed;left:0;right:0;top:${topRatio * 100}%;border-top:2px dashed #f0f;z-index:10000;pointer-events:none`;
    return line;
}

function scene(opts: SceneOpts): StoryObj<{ preset: Preset }> {
    return {
        args: { preset: opts.preset },
        argTypes: {
            preset: {
                control: "select",
                options: [
                    "warpTransition",
                    "slitScanTransition",
                    "pixelateTransition",
                    "focusTransition",
                ],
            },
        },
        render: ({ preset }) => {
            const root = document.getElementById(
                "storybook-root",
            ) as HTMLElement;
            root.style.height = "auto";
            root.style.display = "block";

            const container = document.createElement("div");
            container.style.cssText = "background:#222;color:white";

            const spacer = () => {
                const s = document.createElement("div");
                s.style.height = SPACER;
                return s;
            };

            const img = document.createElement("img");
            img.src = Jellyfish;
            img.style.cssText = opts.tall
                ? "display:block;width:100%;height:200vh;object-fit:cover"
                : "display:block;width:480px;height:270px;margin:0 auto;object-fit:cover";

            container.append(spacer(), img, spacer());

            const marginRatio = opts.marginRatio ?? 0.2;
            if (marginRatio > 0) {
                container.append(
                    guideLine(marginRatio),
                    guideLine(1 - marginRatio),
                );
            }

            const vfx = initVFX();
            if (opts.timeScale !== undefined) {
                vfx.timeScale = opts.timeScale;
            }

            const imgTop = () => img.getBoundingClientRect().top + scrollY;
            const ctx: SceneContext = {
                vfx,
                img,
                scrollIn: () =>
                    scrollTo(
                        0,
                        imgTop() - innerHeight / 2 + img.offsetHeight / 2,
                    ),
                scrollOut: () => scrollTo(0, imgTop() - innerHeight * 0.9),
                scrollAway: () => scrollTo(0, 0),
            };

            const panel = document.createElement("div");
            panel.style.cssText =
                "position:fixed;top:16px;left:16px;max-width:360px;padding:12px;background:#000c;color:white;font:13px/1.5 sans-serif;z-index:10001";
            const bug = document.createElement("p");
            bug.style.margin = "0 0 8px";
            bug.textContent = `Bug: ${opts.bug}`;
            panel.append(bug);
            for (const step of opts.steps) {
                const button = document.createElement("button");
                button.textContent = step.label;
                button.style.cssText = "display:block;margin-top:4px";
                button.onclick = () => step.run(ctx);
                panel.append(button);
            }
            container.append(panel);

            const rootMargin = -innerHeight * marginRatio;
            requestAnimationFrame(() => {
                scrollTo(0, 0);
                vfx.add(img, {
                    shader: preset,
                    intersection: {
                        rootMargin: [rootMargin, 0, rootMargin, 0],
                        ...opts.intersection,
                    },
                });
            });

            return container;
        },
        parameters: {
            layout: "fullscreen",
            chromatic: { disableSnapshot: true },
        },
    };
}

export default {
    title: "Intersection Transition",
} satisfies Meta;

const reset: Step = {
    label: "Reset (scroll away)",
    run: async ({ scrollAway }) => scrollAway(),
};

export const ReverseMidLeave = scene({
    preset: "warpTransition",
    bug: "Scrolling back mid-leave makes the image vanish at once, then enter from the start.",
    steps: [
        reset,
        {
            label: "Enter, leave, come back after 0.4s",
            run: async ({ scrollIn, scrollOut }) => {
                scrollIn();
                await wait(1500);
                scrollOut();
                await wait(400);
                scrollIn();
            },
        },
    ],
});

export const LeaveMidEnter = scene({
    preset: "slitScanTransition",
    bug: "Leaving mid-enter jumps to the fully shown image, then wipes out.",
    steps: [
        reset,
        {
            label: "Enter, leave after 0.3s",
            run: async ({ scrollIn, scrollOut }) => {
                scrollIn();
                await wait(300);
                scrollOut();
            },
        },
    ],
});

export const PixelateDivideByZero = scene({
    preset: "pixelateTransition",
    bug: "Right after enter, t < 1/64 divides by zero. timeScale is slowed so the broken frame lasts about 3s.",
    timeScale: 0.005,
    steps: [
        reset,
        {
            label: "Enter",
            run: async ({ scrollIn }) => scrollIn(),
        },
    ],
});

export const TallElementThreshold = scene({
    preset: "warpTransition",
    bug: "The image is twice the viewport height, so the ratio never reaches threshold 0.6 and it never enters.",
    tall: true,
    marginRatio: 0,
    intersection: { threshold: 0.6 },
    steps: [
        reset,
        {
            label: "Enter",
            run: async ({ scrollIn }) => scrollIn(),
        },
    ],
});

export const TallElementFocus = scene({
    preset: "focusTransition",
    bug: "The image is twice the viewport height, so intersection stays at 0.5: blurred and dim even when it fills the screen.",
    tall: true,
    marginRatio: 0,
    steps: [
        reset,
        {
            label: "Enter",
            run: async ({ scrollIn }) => scrollIn(),
        },
    ],
});
