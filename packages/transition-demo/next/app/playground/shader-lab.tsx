"use client";

import { shaderTransition, type TransitionUniforms } from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { highlight } from "../_components/highlight";
import { LabScene } from "./lab-scene";
import { groups, type Source, sourceOf } from "./sources";

const first = sourceOf(groups[0].options[0].id) as Source;

export function ShaderLab({ head }: { head?: React.ReactNode }) {
    const [source, setSource] = useState(first);
    const [frag, setFrag] = useState(first.frag);
    const [values, setValues] = useState<TransitionUniforms>(first.uniforms);
    const [scene, setScene] = useState(0);
    const [tab, setTab] = useState<"presets" | "edit">("presets");
    const { ref, run } = useVFXTransition({ duration: 1.2 });
    const preRef = useRef<HTMLPreElement>(null);
    const caretRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Restore the caret after a Tab edit re-renders the value.
    useEffect(() => {
        const caret = caretRef.current;
        if (caret !== null && textareaRef.current) {
            textareaRef.current.setSelectionRange(caret, caret);
            caretRef.current = null;
        }
    });

    const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop;
            preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    const insertTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== "Tab" || e.shiftKey) {
            return;
        }
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = e.currentTarget;
        caretRef.current = selectionStart + 2;
        setFrag(
            `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`,
        );
    };

    // The program is cached by its source, so a new def per edit is cheap.
    const def = useMemo(
        () =>
            shaderTransition({
                name: "custom",
                frag,
                ease: source.ease,
                overflow: source.overflow,
            }),
        [frag, source],
    );

    const play = (reverse = false, transition = def, uniforms = values) => {
        run(() => setScene((s) => s + 1), { transition, uniforms, reverse });
    };

    /** Loads `id` into the editor and plays it once. */
    const pick = (id: string) => {
        const next = sourceOf(id);
        if (!next) {
            return;
        }
        setSource(next);
        setFrag(next.frag);
        setValues(next.uniforms);
        play(
            false,
            shaderTransition({
                name: "custom",
                frag: next.frag,
                ease: next.ease,
                overflow: next.overflow,
            }),
            next.uniforms,
        );
    };

    return (
        <div className="lab">
            <div className="lab-preview">
                {head}
                <div className="lab-stage" ref={ref}>
                    <LabScene index={scene} />
                </div>
                <div className="lab-controls">
                    {source.sliders.map((u) => (
                        <label key={u.name} className="pg-range">
                            <span>
                                {u.name}{" "}
                                <b>
                                    {Number(values[u.name] ?? u.value).toFixed(
                                        u.step >= 1 ? 0 : 2,
                                    )}
                                </b>
                            </span>
                            <input
                                type="range"
                                min={u.min}
                                max={u.max}
                                step={u.step}
                                value={Number(values[u.name] ?? u.value)}
                                onChange={(e) =>
                                    setValues((v) => ({
                                        ...v,
                                        [u.name]: Number(e.target.value),
                                    }))
                                }
                            />
                        </label>
                    ))}
                    <div className="lab-buttons">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => play()}
                        >
                            ▶ Play
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => play(true)}
                        >
                            ◀ Reverse
                        </button>
                    </div>
                </div>
            </div>
            <div className="lab-editor">
                <div className="lab-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        id="lab-tab-presets"
                        aria-controls="lab-panel-presets"
                        aria-selected={tab === "presets"}
                        onClick={() => setTab("presets")}
                    >
                        Presets
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="lab-tab-edit"
                        aria-controls="lab-panel-edit"
                        aria-selected={tab === "edit"}
                        onClick={() => setTab("edit")}
                    >
                        Edit
                    </button>
                </div>
                {/* Both panels stay mounted, so the editor keeps its scroll and caret. */}
                <div
                    className="lab-panel lab-list"
                    role="tabpanel"
                    id="lab-panel-presets"
                    aria-labelledby="lab-tab-presets"
                    hidden={tab !== "presets"}
                >
                    {groups.map((g) => (
                        <section key={g.label}>
                            <h2>{g.label}</h2>
                            <ul>
                                {g.options.map((o) => (
                                    <li key={o.id}>
                                        <button
                                            type="button"
                                            className="pg-item"
                                            aria-pressed={o.id === source.id}
                                            onClick={() => pick(o.id)}
                                        >
                                            <span>{o.label}</span>
                                            <span
                                                className="pg-play"
                                                aria-hidden
                                            >
                                                ▶
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
                <div
                    className="lab-panel lab-edit"
                    role="tabpanel"
                    id="lab-panel-edit"
                    aria-labelledby="lab-tab-edit"
                    hidden={tab !== "edit"}
                >
                    <p className="lab-current">{source.label}</p>
                    <div className="lab-code">
                        <pre aria-hidden ref={preRef}>
                            <code>{highlight(`${frag}\n`)}</code>
                        </pre>
                        <textarea
                            ref={textareaRef}
                            spellCheck={false}
                            wrap="off"
                            value={frag}
                            onChange={(e) => setFrag(e.target.value)}
                            onScroll={syncScroll}
                            onKeyDown={insertTab}
                            aria-label="Transition GLSL"
                        />
                    </div>
                    <p className="lab-hint">
                        Edit and press Play. Compile errors print to the console
                        with line numbers.
                    </p>
                </div>
            </div>
        </div>
    );
}
