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
        href: "/ai",
        label: "Use with AI",
        sections: [
            { id: "skill", label: "Install the skill" },
            { id: "llms", label: "Or use llms.txt" },
            { id: "prompts", label: "Example prompts" },
            { id: "write", label: "Write a transition with AI" },
            { id: "check", label: "Check the result" },
        ],
    },
    {
        href: "/how-it-works",
        label: "How it works",
        sections: [
            { id: "dom", label: "The DOM stays DOM" },
            { id: "easing", label: "Easing" },
            { id: "size", label: "Fixed size, shared box" },
            { id: "precedence", label: "Which spec wins" },
        ],
    },
    {
        href: "/limitations",
        label: "Limitations",
        sections: [
            { id: "browsers", label: "Browser support" },
            { id: "motion", label: "Reduced motion" },
            { id: "other", label: "Other limits" },
        ],
    },
    {
        href: "/presets",
        label: "Presets",
        sections: [
            { id: "page", label: "For page navigation" },
            { id: "bold", label: "Bold" },
            { id: "image", label: "For images" },
            { id: "gl-transitions", label: "gl-transitions" },
        ],
    },
    {
        href: "/custom",
        label: "Custom",
        sections: [
            { id: "def", label: "ShaderTransition" },
            { id: "prelude", label: "What the prelude gives you" },
            { id: "overflow", label: "Draw outside the box" },
            { id: "hooks", label: "Hooks" },
            { id: "state", label: "State lives on the instance" },
            { id: "effects", label: "Build on an effect" },
        ],
    },
    {
        href: "/api",
        label: "API Reference",
        sections: [
            { id: "add-transition", label: "addTransition" },
            { id: "handle", label: "TransitionHandle" },
            { id: "run-opts", label: "RunOpts" },
            { id: "vfx-transition", label: "<VFXTransition>" },
            { id: "transition-in", label: "<TransitionIn>" },
            { id: "transition-link", label: "transition(spec)" },
            { id: "use-vfx-transition", label: "useVFXTransition" },
            { id: "set-next-transition", label: "setNextTransition" },
            {
                id: "use-transition-instance",
                label: "useTransitionInstance",
            },
            { id: "transition", label: "Transition" },
            { id: "shader-transition", label: "ShaderTransition" },
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
