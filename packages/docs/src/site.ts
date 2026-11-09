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
    /** Label in the header. Pages without it show only in the mobile menu. */
    headerLabel?: string;
    sections: NavSection[];
};

export const nav: NavItem[] = [
    {
        slug: "getting-started",
        label: "Getting Started",
        headerLabel: "Getting Started",
        sections: [
            { id: "install", label: "Install" },
            { id: "first-effect", label: "Your first effect" },
            { id: "data-attributes", label: "data-* attributes" },
            { id: "frameworks", label: "Frameworks" },
            { id: "next", label: "Next steps" },
        ],
    },
    {
        slug: "how-it-works",
        label: "How it Works",
        headerLabel: "How it Works",
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
        headerLabel: "AI",
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
        headerLabel: "Effects",
        sections: [
            { id: "presets", label: "Shader presets" },
            { id: "parameters", label: "Parameters" },
            { id: "gallery", label: "@vfx-js/effects" },
            { id: "chaining", label: "Chaining" },
            { id: "storybook", label: "Storybook" },
        ],
    },
    {
        slug: "shaders",
        label: "Custom Shaders",
        headerLabel: "Shaders",
        sections: [
            { id: "template", label: "GLSL template" },
            { id: "built-in-uniforms", label: "Built-in uniforms" },
            { id: "custom-uniforms", label: "Custom uniforms" },
            { id: "overflow", label: "Overflow" },
            { id: "multipass", label: "Multipass" },
            { id: "post-effects", label: "Post effects" },
        ],
    },
    {
        slug: "custom-effects",
        label: "Custom Effects",
        sections: [
            { id: "effect-api", label: "Effect API" },
            { id: "hooks", label: "Lifecycle hooks" },
            { id: "effect-texture", label: "EffectTexture" },
            { id: "examples", label: "Examples" },
        ],
    },
];

export function findNav(slug: string): NavItem {
    const item = nav.find((i) => i.slug === slug);
    if (!item) {
        throw new Error(`Unknown page: ${slug}`);
    }
    return item;
}
