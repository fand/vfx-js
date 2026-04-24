export type Work = {
    id: string;
    index: string;
    title: string;
    category: string;
    year: string;
    description: string;
    url: string;
};

export const works: Work[] = [
    {
        id: "stable-fluid",
        index: "01",
        title: "Stable Fluid",
        category: "Simulation",
        year: "2024",
        description:
            "Real-time fluid dynamics simulation rendered in WebGL. Cursor drags momentum through the velocity field.",
        url: "https://amagi.dev/vfx-js/test",
    },
    {
        id: "liquid-glass",
        index: "02",
        title: "Liquid Glass",
        category: "Distortion",
        year: "2024",
        description:
            "Refraction-based liquid glass overlay. Perturbs underlying content with a chromatic displacement field.",
        url: "https://amagi.dev/vfx-js/test-lg",
    },
];
