"use client";

import { useEffect, useRef, useState } from "react";
import { Code } from "../_components/code";
import { frameworks } from "./frameworks";

// Matches the fade-out on .tab-body.is-out.
const FADE_OUT_MS = 100;

export function FrameworkTabs() {
    const [selected, setSelected] = useState(0);
    const [shown, setShown] = useState(0);
    // No fade-in on the first render.
    const [switched, setSwitched] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const fw = frameworks[shown];
    const fadingOut = selected !== shown;

    useEffect(() => () => clearTimeout(timer.current), []);

    // Which side has tabs scrolled out of view.
    const listRef = useRef<HTMLDivElement>(null);
    const [more, setMore] = useState<"start" | "end" | "both">();
    useEffect(() => {
        const list = listRef.current;
        if (!list) {
            return;
        }
        const update = () => {
            const start = list.scrollLeft > 1;
            const end =
                list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
            setMore(
                start && end
                    ? "both"
                    : start
                      ? "start"
                      : end
                        ? "end"
                        : undefined,
            );
        };
        update();
        list.addEventListener("scroll", update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(list);
        return () => {
            list.removeEventListener("scroll", update);
            observer.disconnect();
        };
    }, []);

    // Fade out, swap the panel, then fade in.
    const select = (i: number) => {
        setSelected(i);
        setSwitched(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setShown(i), FADE_OUT_MS);
    };

    const bodyClass = ["tab-body", switched && "is-in", fadingOut && "is-out"]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="tabs">
            <div
                ref={listRef}
                className="tab-list"
                role="tablist"
                data-more={more}
            >
                {frameworks.map((f, i) => (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={i === selected}
                        onClick={() => select(i)}
                    >
                        {f.name}
                    </button>
                ))}
            </div>
            <div className="tab-panel">
                <div key={fw.id} className={bodyClass}>
                    <h3>{fw.name}</h3>
                    <p className="tab-intro">{fw.intro}</p>
                    <div className="tab-install">
                        <span>$</span> {fw.install}
                    </div>
                    {fw.snippets.map((s) => (
                        <Code key={s.label} label={s.label}>
                            {s.code}
                        </Code>
                    ))}
                    {fw.notes.length > 0 && (
                        <ul className="tab-notes">
                            {fw.notes.map((n) => (
                                <li key={n}>{n}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
