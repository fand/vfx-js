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

export const CRT_EFFECT_IDS = ["pixelate", "scanline", "bloom"] as const;

export const CRT_PANEL_STYLE =
    "position:fixed; top:16px; right:16px; z-index:10000; width:200px; padding:12px; background:rgba(20,20,20,0.85); color:#fff; font-family:system-ui, sans-serif; font-size:13px; border-radius:6px";

export const CRT_CANVAS_STYLE =
    "display:block; width:min(640px, 90vw); margin:64px auto";

// Style the inner div, not the canvas.
// Padding on the canvas would stretch the captured texture.
export const CRT_CARD_STYLE =
    "padding:40px 48px; background:linear-gradient(135deg, #1a0030 0%, #001a30 100%); border-radius:12px; box-shadow:0 0 0 1px rgba(255,255,255,0.1); font-family:system-ui, sans-serif";

export const CRT_TITLE_STYLE =
    "margin:0; font-size:48px; font-weight:800; color:#ff4fa3; text-shadow:0 0 12px rgba(255,79,163,0.6); letter-spacing:-1px";

export const CRT_TEXT_STYLE =
    "margin:24px 0 0; font-size:18px; line-height:1.6; color:#a0e4ff";

export const CRT_INPUT_STYLE =
    "margin-top:24px; padding:8px 12px; font-size:18px; border-radius:6px; border:1px solid rgba(255,255,255,0.3); background:rgba(255,255,255,0.08); color:#ffe066; width:100%; box-sizing:border-box";
