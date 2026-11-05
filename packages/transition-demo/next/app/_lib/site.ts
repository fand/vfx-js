export const links = {
    vfxjs: "https://amagi.dev/vfx-js",
    docs: "https://github.com/fand/vfx-js/blob/main/docs/TRANSITION.md",
    github: "https://github.com/fand/vfx-js",
    npm: "https://www.npmjs.com/package/@vfx-js/transitions",
    issues: "https://github.com/fand/vfx-js/issues",
};

export type NavItem = {
    href: string;
    label: string;
};

export const nav: NavItem[] = [
    { href: "/getting-started", label: "Getting Started" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/transitions", label: "Transitions" },
    { href: "/custom", label: "Custom" },
];

export type PresetName =
    | "crossfade"
    | "swipe"
    | "zoom"
    | "zoomBlur"
    | "crosszoom"
    | "glitch"
    | "glitchSlide"
    | "datamosh"
    | "pixelsort";
