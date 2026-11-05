"use client";

import { shaderTransition } from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { highlight } from "../_components/highlight";
import { Scene } from "../_components/scenes";
import { examples } from "./examples";

export function ShaderLab() {
    const [exampleId, setExampleId] = useState(examples[0].id);
    const example = examples.find((e) => e.id === exampleId) ?? examples[0];
    const [frag, setFrag] = useState(example.frag);
    const [values, setValues] = useState<Record<string, number>>(() =>
        Object.fromEntries(example.uniforms.map((u) => [u.name, u.value])),
    );
    const [scene, setScene] = useState(0);
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
        () => shaderTransition({ name: "custom", frag }),
        [frag],
    );

    const pick = (id: string) => {
        const next = examples.find((e) => e.id === id);
        if (!next) {
            return;
        }
        setExampleId(id);
        setFrag(next.frag);
        setValues(
            Object.fromEntries(next.uniforms.map((u) => [u.name, u.value])),
        );
    };

    const play = (reverse = false) => {
        run(() => setScene((s) => s + 1), {
            transition: def,
            uniforms: values,
            reverse,
        });
    };

    return (
        <div className="lab">
            <div className="lab-editor">
                <div className="lab-tabs">
                    {examples.map((e) => (
                        <button
                            key={e.id}
                            type="button"
                            aria-pressed={e.id === exampleId}
                            onClick={() => pick(e.id)}
                        >
                            {e.label}
                        </button>
                    ))}
                </div>
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
            <div className="lab-preview">
                <div className="lab-stage" ref={ref}>
                    <Scene index={scene} />
                </div>
                <div className="lab-controls">
                    {example.uniforms.map((u) => (
                        <label key={u.name} className="pg-range">
                            <span>
                                {u.name} <b>{values[u.name]}</b>
                            </span>
                            <input
                                type="range"
                                min={u.min}
                                max={u.max}
                                step={u.step}
                                value={values[u.name] ?? u.value}
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
        </div>
    );
}
