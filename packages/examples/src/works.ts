export type Work = {
    id: string;
    index: string;
    title: string;
    tags: string[];
    year: string;
    author: string;
    description: string;
    url: string;
    /** Optional override. Defaults to packages/examples/works/<id>.html on main. */
    sourceUrl?: string;
};

export const works: Work[] = [
    {
        id: "stable-fluid",
        index: "01",
        title: "Stable Fluid",
        tags: ["Simulation", "Fluid", "html-in-canvas"],
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
        tags: ["Distortion", "html-in-canvas"],
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
        tags: ["Postprocess"],
        year: "2024",
        author: "AMAGI",
        description:
            "CRT display simulation with scanlines, chromatic aberration, and phosphor glow. Emulates the look of analog cathode-ray-tube monitors.",
        url: "./works/crt.html",
    },
    {
        id: "pixel-scan",
        index: "04",
        title: "Pixel Scan",
        tags: ["Transition"],
        year: "2024",
        author: "AMAGI",
        description:
            "Pixel-grid reveal animation sweeping text and images with glowing edge highlights. After Smertimba Graphics.",
        url: "./works/pixel-scan.html",
    },
    {
        id: "text-scrub",
        index: "05",
        title: "Text Scrub",
        tags: ["Distortion", "Typography"],
        year: "2024",
        author: "AMAGI",
        description:
            "Multi-layered chromatic scrub distortion following pointer motion. Reproduction of Daniel Kuntz's work.",
        url: "./works/text-scrub.html",
    },
    {
        id: "text-3d-sdf",
        index: "06",
        title: "Text 3D SDF",
        tags: ["Typography", "3D"],
        year: "2024",
        author: "AMAGI",
        description:
            "3D raymarched SDF of text with floating particles and iridescent hatching. Driven by a signed-distance field baked from the source text.",
        url: "./works/text-3d-sdf.html",
    },
    {
        id: "text-shadow",
        index: "07",
        title: "Text Shadow",
        tags: ["Typography"],
        year: "2024",
        author: "AMAGI",
        description:
            "Cursor-driven light source casting soft shadows through text with rainbow spectrum bleed.",
        url: "./works/text-shadow.html",
    },
    {
        id: "block-glitch-transition",
        index: "08",
        title: "Block Glitch Transition",
        tags: ["Transition", "Glitch", "Scroll"],
        year: "2024",
        author: "AMAGI",
        description:
            "Scroll-triggered block glitch with chromatic offsets. Noise-driven cells displace the text and image as they enter the viewport.",
        url: "./works/block-glitch-transition.html",
    },
    {
        id: "scroll-rgb-shift",
        index: "09",
        title: "Scroll RGB Shift",
        tags: ["Distortion", "Scroll"],
        year: "2024",
        author: "AMAGI",
        description:
            "Vertical RGB separation driven by scroll velocity. Per-column jitter turns page motion into chromatic smear.",
        url: "./works/scroll-rgb-shift.html",
    },
    {
        id: "web-font-raymarch",
        index: "10",
        title: "Editable Text",
        tags: ["Typography"],
        year: "2024",
        author: "AMAGI",
        description:
            "Raymarched refractive spheres lensing live editable web-font text. Cheap dispersion and fresnel over a 2D text canvas.",
        url: "./works/web-font-raymarch.html",
    },
];
