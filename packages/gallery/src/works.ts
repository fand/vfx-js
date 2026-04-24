export type Work = {
    id: string;
    index: string;
    title: string;
    category: string;
    year: string;
    author: string;
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
        author: "AMAGI",
        description:
            "Real-time fluid dynamics simulation rendered in WebGL. Cursor drags momentum through the velocity field.",
        url: "./works/stable-fluid.html",
    },
    {
        id: "liquid-glass",
        index: "02",
        title: "Liquid Glass",
        category: "Distortion",
        year: "2024",
        author: "AMAGI",
        description:
            "Refraction-based liquid glass overlay. Perturbs underlying content with a chromatic displacement field.",
        url: "./works/liquid-glass.html",
    },
    {
        id: "crt",
        index: "03",
        title: "CRT",
        category: "Postprocess",
        year: "2024",
        author: "AMAGI",
        description:
            "CRT display simulation with scanlines, chromatic aberration, and phosphor glow. Emulates the look of analog cathode-ray-tube monitors.",
        url: "./works/crt.html",
    },
];
