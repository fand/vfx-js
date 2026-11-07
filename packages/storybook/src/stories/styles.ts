// Shared by the Vue and Svelte stories.

export const ROOT_STYLE =
    "display:flex; flex-direction:column; gap:48px; padding:48px; font-family:system-ui, sans-serif; color:#fff";

export const SECTION_HEADER_STYLE =
    "font-size:14px; font-weight:600; color:#a0e4ff; letter-spacing:1px; text-transform:uppercase; margin-bottom:12px";

export const SHADERS = ["rgbShift", "glitch", "rainbow", "sinewave"] as const;

export function bloomParams() {
    return {
        threshold: 0.4,
        softness: 0.3,
        intensity: 3.5,
        scatter: 1.0,
        dither: 0.0,
        edgeFade: 0.02,
        pad: 120,
    };
}

export const TRANSITION_PAGES = [
    {
        title: "Page one",
        color: "#ff4f6d",
        body: "Click Next to go to the next page with a shader transition.",
    },
    {
        title: "Page two",
        color: "#3fb6ff",
        body: "The old page is captured before the DOM changes.",
    },
    {
        title: "Page three",
        color: "#7bdc6b",
        body: "A click during a run drops the old run.",
    },
];

export const TRANSITION_ROOT_STYLE =
    "padding:64px; font-family:sans-serif; color:white; max-width:720px";

export const NEXT_BUTTON_STYLE = "margin-bottom:24px; font-size:1rem";

// Fixed size, so every page shares one box.
export const TRANSITION_BOX_STYLE =
    "width:560px; height:240px; box-sizing:border-box; padding:24px; border-radius:16px; background:#222";

/** Let the story root grow with its content, like the React stories. */
export function storyContainer(): HTMLElement {
    const root = document.getElementById("storybook-root");
    if (root) {
        root.style.height = "auto";
        root.style.display = "block";
    }
    return document.createElement("div");
}
