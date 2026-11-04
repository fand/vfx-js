"use client";

import type { TransitionDef } from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";
import { useState } from "react";
import { Code } from "../_components/code";
import { Scene } from "../_components/scenes";

// Transitions that need extra textures are not supported.
const entries = transitions.filter((e) => e.textures.length === 0);

const defs = new Map<string, TransitionDef>();
function defOf(name: string): TransitionDef {
    let def = defs.get(name);
    if (!def) {
        const entry = entries.find((e) => e.name === name);
        if (!entry) {
            throw new Error(`no gl-transition "${name}"`);
        }
        def = createGLTransition(entry);
        defs.set(name, def);
    }
    return def;
}

export function GLPlayground() {
    const [name, setName] = useState("Cube");
    const [duration, setDuration] = useState(1.2);
    const [reverse, setReverse] = useState(false);
    const [scene, setScene] = useState(0);
    const { ref, run } = useVFXTransition();
    const entry = entries.find((e) => e.name === name);

    const play = (next: string) => {
        setName(next);
        run(() => setScene((s) => s + 1), {
            transition: defOf(next),
            duration,
            reverse,
        });
    };

    const varName = name[0].toLowerCase() + name.slice(1);
    const opts = [
        `transition: createGLTransition(${varName})`,
        `duration: ${duration.toFixed(1)}`,
        ...(reverse ? ["reverse: true"] : []),
    ];
    const snippet = `
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const ${varName} = transitions.find((t) => t.name === "${name}")!;

t.run(swap, {
  ${opts.join(",\n  ")},
});
`;

    return (
        <div className="playground">
            <div className="pg-stage-wrap">
                <div className="pg-stage" ref={ref}>
                    <Scene index={scene} />
                </div>
                <div className="pg-now">
                    <span className="dot" />
                    <code>{name}</code>
                    <span>{entry?.description}</span>
                </div>
            </div>

            <aside className="pg-side">
                <div className="pg-controls">
                    <label className="pg-range">
                        <span>
                            transition <b>{entries.length} shaders</b>
                        </span>
                        <select
                            className="pg-select"
                            value={name}
                            onChange={(e) => play(e.target.value)}
                        >
                            {entries.map((e) => (
                                <option key={e.name} value={e.name}>
                                    {e.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className="pg-item"
                        aria-pressed
                        onClick={() => play(name)}
                    >
                        <span>Play</span>
                        <span className="pg-play" aria-hidden>
                            ▶
                        </span>
                    </button>
                    <label className="pg-range">
                        <span>
                            duration <b>{duration.toFixed(1)}s</b>
                        </span>
                        <input
                            type="range"
                            min={0.2}
                            max={3}
                            step={0.1}
                            value={duration}
                            onChange={(e) =>
                                setDuration(Number(e.target.value))
                            }
                        />
                    </label>
                    <label className="pg-toggle">
                        <input
                            type="checkbox"
                            checked={reverse}
                            onChange={(e) => setReverse(e.target.checked)}
                        />
                        <span>reverse</span>
                    </label>
                </div>
                <Code label="run options">{snippet}</Code>
            </aside>
        </div>
    );
}
