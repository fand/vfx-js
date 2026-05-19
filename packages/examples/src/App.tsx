import { useCallback, useEffect, useMemo, useState } from "react";
import { VFinal } from "./VFinal";
import { type Work, works } from "./works";

const readHashId = (validIds: Set<string>): string | null => {
    const id = window.location.hash.slice(1);
    return validIds.has(id) ? id : null;
};

const useHashId = (works: Work[]) => {
    const validIds = useMemo(() => new Set(works.map((w) => w.id)), [works]);
    const [activeId, setActiveIdState] = useState(
        () => readHashId(validIds) ?? works[0].id,
    );

    useEffect(() => {
        const sync = () => {
            setActiveIdState(readHashId(validIds) ?? works[0].id);
        };
        window.addEventListener("hashchange", sync);
        return () => window.removeEventListener("hashchange", sync);
    }, [validIds, works]);

    const setActiveId = useCallback((id: string) => {
        setActiveIdState(id);
        window.history.pushState(null, "", `#${id}`);
    }, []);

    return [activeId, setActiveId] as const;
};

// Mount both desktop + mobile layouts; CSS media query picks which to show so
// window resize works without React re-mounting.
export const App = () => {
    const [activeId, setActiveId] = useHashId(works);
    return (
        <>
            <div className="vf-desktop-wrap">
                <VFinal
                    works={works}
                    activeId={activeId}
                    onActivate={setActiveId}
                    mobile={false}
                />
            </div>
            <div className="vf-mobile-wrap">
                <VFinal
                    works={works}
                    activeId={activeId}
                    onActivate={setActiveId}
                    mobile={true}
                />
            </div>
        </>
    );
};
