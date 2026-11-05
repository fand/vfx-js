"use client";

import { useEffect, useRef, useState } from "react";
import { Code } from "../_components/code";
import { frameworks } from "./frameworks";

// Matches the opacity transition on .tab-body.
const FADE_MS = 200;

export function FrameworkTabs() {
    const [selected, setSelected] = useState(0);
    const [shown, setShown] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const fw = frameworks[shown];
    const fading = selected !== shown;

    useEffect(() => () => clearTimeout(timer.current), []);

    // Fade out, swap the panel, then fade in.
    const select = (i: number) => {
        setSelected(i);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setShown(i), FADE_MS);
    };

    return (
        <div className="tabs">
            <div className="tab-list" role="tablist">
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
                <div className="tab-body" style={{ opacity: fading ? 0 : 1 }}>
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
