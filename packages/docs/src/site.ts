export const links = {
    github: "https://github.com/fand/vfx-js",
    npm: "https://www.npmjs.com/package/@vfx-js/core",
    transitions: "https://amagi.dev/vfx-js-transitions/",
};

export const siteUrl = "https://amagi.dev";
export const siteTitle = "VFX-JS - Visual Effects Framework for Web #VFXJS";
export const siteDescription =
    "VFX-JS is a JavaScript library to add WebGL powered effects to your website.";

/** Prefix a site path (no leading slash) with the base, e.g. "docs/" → "/vfx-js/docs/". */
export function url(path = ""): string {
    return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path}`;
}

export type NavSection = {
    id: string;
    label: string;
};

export type NavItem = {
    slug: string;
    label: string;
    /** One line for the top page cards. */
    blurb: string;
    sections: NavSection[];
};

export const nav: NavItem[] = [
    {
        slug: "getting-started",
        label: "Getting Started",
        blurb: "Install VFX-JS and add your first effect.",
        sections: [
            { id: "install", label: "Install" },
            { id: "first-effect", label: "Your first effect" },
            { id: "options", label: "Options" },
            { id: "frameworks", label: "Frameworks" },
            { id: "next", label: "Next steps" },
        ],
    },
    {
        slug: "how-it-works",
        label: "How it Works",
        blurb: "How VFX-JS draws DOM elements with WebGL.",
        sections: [
            { id: "dom", label: "The DOM stays DOM" },
            { id: "capture", label: "Element capture" },
            { id: "overflow", label: "Overflow" },
            { id: "scroll", label: "Scroll and visibility" },
            { id: "uniforms", label: "Uniforms and timing" },
            { id: "limits", label: "Limits" },
        ],
    },
    {
        slug: "ai",
        label: "Use with AI",
        blurb: "Let your AI agent write effects and shaders.",
        sections: [
            { id: "skill", label: "Install the skill" },
            { id: "llms", label: "llms.txt" },
            { id: "prompts", label: "Prompts that work" },
            { id: "write", label: "Write a shader with AI" },
            { id: "check", label: "Check the result" },
        ],
    },
    {
        slug: "effects",
        label: "Effects",
        blurb: "Shader presets and the @vfx-js/effects gallery.",
        sections: [
            { id: "presets", label: "Shader presets" },
            { id: "parameters", label: "Preset uniforms" },
            { id: "gallery", label: "@vfx-js/effects" },
            { id: "chaining", label: "Chaining" },
            { id: "storybook", label: "Storybook" },
        ],
    },
    {
        slug: "shaders",
        label: "Custom Shaders",
        blurb: "Write your own GLSL, with uniforms and multipass.",
        sections: [
            { id: "template", label: "GLSL template" },
            { id: "built-in-uniforms", label: "Built-in uniforms" },
            { id: "custom-uniforms", label: "Custom uniforms" },
            { id: "overflow", label: "Overflow" },
            { id: "backbuffer", label: "Backbuffer" },
            { id: "multipass", label: "Multipass" },
            { id: "post-effects", label: "Post effects" },
        ],
    },
    {
        slug: "custom-effects",
        label: "Custom Effects",
        blurb: "Build effects with the Effect API and hooks.",
        sections: [
            { id: "effect-interface", label: "The Effect interface" },
            { id: "hooks", label: "Lifecycle hooks" },
            { id: "drawing", label: "Drawing" },
            { id: "textures", label: "Textures" },
            { id: "params", label: "Params" },
            { id: "post-effect", label: "As a post effect" },
            { id: "tips", label: "Tips" },
        ],
    },
    {
        slug: "docs",
        label: "API Reference",
        blurb: "Every class, function and type, generated from the source.",
        // The sidebar lists the API pages instead.
        sections: [],
    },
];

export function findNav(slug: string): NavItem {
    const item = nav.find((i) => i.slug === slug);
    if (!item) {
        throw new Error(`Unknown page: ${slug}`);
    }
    return item;
}
