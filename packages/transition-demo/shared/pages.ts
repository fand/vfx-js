export type DemoPage = {
    path: string;
    label: string;
    transition: "crossfade" | "glitch" | "pixelsort" | "swipe";
    title: string;
    lead: string;
    images: string[];
    theme: string;
};

// Same pages in every demo, so the frameworks can be compared side by side.
export const pages: DemoPage[] = [
    {
        path: "/",
        label: "Home",
        transition: "crossfade",
        title: "Shader page transitions",
        lead: "Each link uses a different preset. The browser back button plays the reverse.",
        images: [],
        theme: "#0f172a",
    },
    {
        path: "/gallery",
        label: "Gallery",
        transition: "pixelsort",
        title: "Gallery",
        lead: "Images load after the swap. The transition waits for them before it captures the new page.",
        images: [10, 20, 30, 40, 50, 60].map(
            (id: number) => `https://picsum.photos/id/${id}/480/320`,
        ),
        theme: "#1e1b4b",
    },
    {
        path: "/about",
        label: "About",
        transition: "glitch",
        title: "About",
        lead: "The outlet has a fixed size, so old and new content share one box.",
        images: [],
        theme: "#3f1d38",
    },
];

export const findPage = (path: string): DemoPage =>
    pages.find((p) => p.path === path) ?? pages[0];
