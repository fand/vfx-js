"use client";

import { useState } from "react";
import { highlight } from "./highlight";

/** A code box with one tab per snippet. */
export function CodeTabs({ tabs }: { tabs: { name: string; code: string }[] }) {
    const [selected, setSelected] = useState(0);
    return (
        <div className="code">
            <div className="code-bar code-tabs" role="tablist">
                {tabs.map((tab, i) => (
                    <button
                        key={tab.name}
                        type="button"
                        role="tab"
                        aria-selected={i === selected}
                        onClick={() => setSelected(i)}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>
            <pre>
                <code>{highlight(tabs[selected].code.trim())}</code>
            </pre>
        </div>
    );
}
