/** Counts for the island of one page. `IslandLog.astro` fills the first five. */
export type IslandEntry = {
    /** `<astro-island>` elements that started, copies included. */
    elements: number;
    /** `start()` calls, one per connect of the `<astro-island>`. */
    starts: number;
    /** Hydrate calls from the client directive. */
    hydrates: number;
    /** React roots made by those calls. */
    roots: number;
    /** `astro:unmount` events on the island. */
    unmounts: number;
    renders: number;
    /** Fresh mounts of the component; a re-render does not count. */
    mounts: number;
    effects: number;
    cleanups: number;
};

declare global {
    interface Window {
        __islandLog?: Record<string, IslandEntry>;
        __islandEntry?: (page: string) => IslandEntry;
    }
}

const blank = (): IslandEntry => ({
    elements: 0,
    starts: 0,
    hydrates: 0,
    roots: 0,
    unmounts: 0,
    renders: 0,
    mounts: 0,
    effects: 0,
    cleanups: 0,
});

/** The entry of `page`, or a throwaway one on the server. */
export function islandEntry(page: string): IslandEntry {
    return (
        (typeof window !== "undefined" && window.__islandEntry?.(page)) ||
        blank()
    );
}
