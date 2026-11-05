"use client";

import type { TransitionDef } from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import {
    createDatamosh,
    createPixelsort,
    createSwipe,
} from "@vfx-js/transitions";
import { useCallback, useEffect, useRef, useState } from "react";
import { Code } from "../_components/code";
import { Scene } from "../_components/scenes";
import { presetList, presets } from "../_lib/presets";

type Entry = {
    id: string;
    label: string;
    note: string;
    def: TransitionDef;
    importName: string;
    expr: string;
};

const entries: Entry[] = [
    ...presetList.map((p) => ({
        id: p.name,
        label: p.name,
        note: p.note,
        def: presets[p.name],
        importName: p.name,
        expr: p.name,
    })),
    {
        id: "swipe-up",
        label: "createSwipe up",
        note: "Swipe with a direction.",
        def: createSwipe({ direction: "up" }),
        importName: "createSwipe",
        expr: 'createSwipe({ direction: "up" })',
    },
    {
        id: "pixelsort-left",
        label: "createPixelsort left",
        note: "Pixel sort with a direction.",
        def: createPixelsort({ direction: "left" }),
        importName: "createPixelsort",
        expr: 'createPixelsort({ direction: "left" })',
    },
    {
        id: "datamosh-64",
        label: "createDatamosh 64",
        note: "Datamosh with big blocks.",
        def: createDatamosh({ blockSize: 64 }),
        importName: "createDatamosh",
        expr: "createDatamosh({ blockSize: 64 })",
    },
];

export function Playground() {
    const [selected, setSelected] = useState(entries[8]);
    const [duration, setDuration] = useState(1.2);
    const [reverse, setReverse] = useState(false);
    const [auto, setAuto] = useState(false);
    const [scene, setScene] = useState(0);
    const { ref, run } = useVFXTransition();
    const selectedIndex = useRef(entries.indexOf(selected));

    const play = useCallback(
        (e: Entry) => {
            setSelected(e);
            selectedIndex.current = entries.indexOf(e);
            run(() => setScene((s) => s + 1), {
                transition: e.def,
                duration,
                reverse,
            });
        },
        [run, duration, reverse],
    );

    useEffect(() => {
        if (!auto) {
            return;
        }
        const id = setInterval(
            () => play(entries[(selectedIndex.current + 1) % entries.length]),
            duration * 1000 + 900,
        );
        return () => clearInterval(id);
    }, [auto, duration, play]);

    const opts = [
        `transition: ${selected.expr}`,
        `duration: ${duration.toFixed(1)}`,
        ...(reverse ? ["reverse: true"] : []),
    ];
    const snippet = `
import { ${selected.importName} } from "@vfx-js/transitions";

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
                    <code>{selected.label}</code>
                    <span>{selected.note}</span>
                </div>
            </div>

            <aside className="pg-side">
                <div className="pg-list">
                    {entries.map((e) => (
                        <button
                            key={e.id}
                            type="button"
                            className="pg-item"
                            aria-pressed={e.id === selected.id}
                            onClick={() => play(e)}
                        >
                            <span>{e.label}</span>
                            <span className="pg-play" aria-hidden>
                                ▶
                            </span>
                        </button>
                    ))}
                </div>

                <div className="pg-controls">
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
                    <label className="pg-toggle">
                        <input
                            type="checkbox"
                            checked={auto}
                            onChange={(e) => setAuto(e.target.checked)}
                        />
                        <span>autoplay</span>
                    </label>
                </div>
                <Code label="run options">{snippet}</Code>
            </aside>
        </div>
    );
}
