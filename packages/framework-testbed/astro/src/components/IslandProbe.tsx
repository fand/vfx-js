import { useEffect, useState } from "react";
import { islandEntry } from "./island-log";

/**
 * A React island inside the transition target.
 * It counts renders, mounts, effects and cleanups on `window.__islandLog`,
 * so you can check that a transition does not mount it twice.
 */
export default function IslandProbe({ page }: { page: string }) {
    const entry = islandEntry(page);
    entry.renders++;
    // Runs once per fresh mount, not on a re-render.
    useState(() => {
        entry.mounts++;
    });
    const [clicks, setClicks] = useState(0);
    useEffect(() => {
        entry.effects++;
        return () => {
            entry.cleanups++;
        };
    }, [entry]);
    return (
        <button
            type="button"
            className="island-probe"
            onClick={() => setClicks((n) => n + 1)}
        >
            React island on {page}: {clicks} clicks
        </button>
    );
}
