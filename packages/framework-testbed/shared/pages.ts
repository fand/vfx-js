export type DemoPage = {
    path: string;
    label: string;
    transition: "swipe" | "zoom";
    title: string;
    lead: string;
    images: string[];
    theme: string;
};

// Same pages in every demo, so the frameworks can be compared side by side.
export const pages: [DemoPage, ...DemoPage[]] = [
    {
        path: "/",
        label: "Home",
        transition: "swipe",
        title: "Shader page transitions",
        lead: "Links use Swipe or Zoom, so you can see the direction on back.",
        images: [],
        theme: "#0f172a",
    },
    {
        path: "/gallery",
        label: "Gallery",
        transition: "zoom",
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
        transition: "swipe",
        title: "About",
        lead: "The outlet has a fixed size, so old and new content share one box.",
        images: [],
        theme: "#3f1d38",
    },
];

export const findPage = (path: string): DemoPage =>
    pages.find((p) => p.path === path) ?? pages[0];
