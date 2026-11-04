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
    preset: PresetName;
};

export const nav: NavItem[] = [
    { href: "/getting-started", label: "Getting Started", preset: "swipe" },
    { href: "/how-it-works", label: "How it works", preset: "crosszoom" },
    { href: "/transitions", label: "Transitions", preset: "pixelsort" },
    { href: "/custom", label: "Custom", preset: "glitch" },
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
