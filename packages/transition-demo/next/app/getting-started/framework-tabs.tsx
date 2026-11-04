"use client";

import { useVFXTransition } from "@vfx-js/react";
import { createSwipe } from "@vfx-js/transitions";
import { useState } from "react";
import { Code } from "../_components/code";
import { frameworks } from "./frameworks";

const toLeft = createSwipe({ direction: "left" });
const toRight = createSwipe({ direction: "right" });

export function FrameworkTabs() {
    const [active, setActive] = useState(0);
    const { ref, run } = useVFXTransition({ duration: 0.55 });
    const fw = frameworks[active];

    const select = (i: number) => {
        if (i === active) {
            return;
        }
        run(() => setActive(i), {
            transition: i > active ? toLeft : toRight,
        });
    };

    return (
        <div className="tabs">
            <div className="tab-list" role="tablist">
                {frameworks.map((f, i) => (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        onClick={() => select(i)}
                    >
                        {f.name}
                    </button>
                ))}
            </div>
            <div className="tab-panel" ref={ref}>
                <div className="tab-body" key={fw.id}>
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
