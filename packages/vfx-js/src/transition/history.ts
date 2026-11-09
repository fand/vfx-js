import type { RunOpts } from "./types.js";

/** A history entry. `key` stays on replace and is new on push. */
export type HistoryEntry = { index: number; key: string };

export type HistorySpecs = {
    /** The spec for a run that just changed the history entry. `spec` is what the run would use without autoReverse. */
    pick(spec: RunOpts): RunOpts;
};

type NavigationLike = {
    currentEntry?: { index: number; key?: string } | null;
};

function navigationEntry(): HistoryEntry | undefined {
    const navigation = (globalThis as { navigation?: NavigationLike })
        .navigation;
    const entry = navigation?.currentEntry;
    if (!entry || entry.index < 0 || !entry.key) {
        return undefined;
    }
    return { index: entry.index, key: entry.key };
}

export function createHistorySpecs(
    getEntry: () => HistoryEntry | undefined = navigationEntry,
): HistorySpecs {
    // Specs hold classes, so they stay in memory.
    // Keyed by entry, since a push after back reuses the index.
    const specs = new Map<string, RunOpts>();
    let last: HistoryEntry | undefined;

    return {
        pick(spec) {
            const entry = getEntry();
            if (!entry) {
                return spec;
            }
            const leaving = last ?? entry;
            last = entry;
            const left = specs.get(leaving.key);
            if (entry.index < leaving.index && left) {
                return { ...left, reverse: true };
            }
            const entered = specs.get(entry.key);
            if (entry.index > leaving.index && entered) {
                return entered;
            }
            specs.set(entry.key, spec);
            return spec;
        },
    };
}

/** One store per document, shared by every handle. */
export const historySpecs = createHistorySpecs();
