export const links = {
    vfxjs: "https://amagi.dev/vfx-js",
    docs: "https://github.com/fand/vfx-js/blob/main/docs/TRANSITION.md",
    github: "https://github.com/fand/vfx-js",
    npm: "https://www.npmjs.com/package/@vfx-js/transitions",
    issues: "https://github.com/fand/vfx-js/issues",
};

export type NavSection = {
    id: string;
    label: string;
};

export type NavItem = {
    href: string;
    label: string;
    sections: NavSection[];
};

export const nav: NavItem[] = [
    {
        href: "/getting-started",
        label: "Getting Started",
        sections: [
            { id: "setup", label: "Setup by framework" },
            { id: "next", label: "Next" },
        ],
    },
    {
        href: "/how-it-works",
        label: "How it works",
        sections: [
            { id: "dom", label: "The DOM stays DOM" },
            { id: "easing", label: "t is eased for you" },
            { id: "size", label: "Fixed size, shared box" },
            { id: "precedence", label: "Which spec wins" },
            { id: "limitations", label: "Limitations" },
        ],
    },
    {
        href: "/transitions",
        label: "Transitions",
        sections: [
            { id: "playground", label: "Playground" },
            { id: "gl-transitions", label: "gl-transitions" },
            { id: "presets", label: "Preset list" },
        ],
    },
    {
        href: "/custom",
        label: "Custom",
        sections: [
            { id: "def", label: "shaderTransition" },
            { id: "prelude", label: "What the prelude gives you" },
            { id: "overflow", label: "Draw outside the box" },
            { id: "hooks", label: "Transition effects" },
            { id: "state", label: "State lives on the effect" },
        ],
    },
];

export type PresetName =
    | "crossfade"
    | "swipe"
    | "zoom"
    | "zoomBlur"
    | "crosszoom"
    | "glitch"
    | "glitchSlide"
    | "jpegGlitch"
    | "datamosh"
    | "pixelsort"
    | "lensDistortion"
    | "slitScan"
    | "pixelScan"
    | "pixelStretch"
    | "tile"
    | "distortFade";
