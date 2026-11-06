"use client";

import {
    shaderTransition,
    type TransitionEase,
    type TransitionUniforms,
} from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Code } from "../_components/code";
import { highlight } from "../_components/highlight";
import { LabScene } from "./lab-scene";
import { groups, type Source, type SourceGroup, sourceOf } from "./sources";

const first = sourceOf(groups[0].options[0].id) as Source;

type Tab = "presets" | "edit" | "gl";

// gl-transitions sits last, on the far right: the shaders are not ours.
const tabs: { id: Tab; label: string }[] = [
    { id: "presets", label: "Presets" },
    { id: "edit", label: "Edit" },
    { id: "gl", label: "gl-transitions" },
];

/** Easing choices. The first keeps the source's own ease. */
const eases: { label: string; ease?: TransitionEase }[] = [
    { label: "default" },
    { label: "linear", ease: "linear" },
    { label: "smoothstep", ease: "smoothstep" },
    {
        label: "easeInOutCubic",
        ease: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
    },
    { label: "easeInCubic", ease: (x) => x ** 3 },
    { label: "easeOutCubic", ease: (x) => 1 - (1 - x) ** 3 },
    {
        label: "easeInOutExpo",
        ease: (x) =>
            x <= 0
                ? 0
                : x >= 1
                  ? 1
                  : x < 0.5
                    ? 2 ** (20 * x - 10) / 2
                    : (2 - 2 ** (-20 * x + 10)) / 2,
    },
];

const easeName = (ease: TransitionEase | undefined) =>
    typeof ease === "function" ? "custom" : (ease ?? "smoothstep");

const ownGroups = groups.filter((g) => !g.thirdParty);
const glGroups = groups.filter((g) => g.thirdParty);
const glCount = glGroups.reduce((n, g) => n + g.options.length, 0);

export function ShaderLab({ head }: { head?: React.ReactNode }) {
    const [source, setSource] = useState(first);
    const [frag, setFrag] = useState(first.frag);
    const [values, setValues] = useState<TransitionUniforms>(first.uniforms);
    const [scene, setScene] = useState(0);
    const [tab, setTab] = useState<Tab>("presets");
    const [easeIndex, setEaseIndex] = useState(0);
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
        run(() => setScene((s) => s + 1), {
            transition,
            uniforms,
            reverse,
            ease: eases[easeIndex].ease,
        });
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
                    <label className="pg-range">
                        <span>ease</span>
                        <select
                            className="pg-select"
                            value={easeIndex}
                            onChange={(e) =>
                                setEaseIndex(Number(e.target.value))
                            }
                        >
                            {eases.map((e, i) => (
                                <option key={e.label} value={i}>
                                    {i === 0
                                        ? `default (${easeName(source.ease)})`
                                        : e.label}
                                </option>
                            ))}
                        </select>
                    </label>
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
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            id={`lab-tab-${t.id}`}
                            aria-controls={`lab-panel-${t.id}`}
                            aria-selected={tab === t.id}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {/* All panels stay mounted, so the editor keeps its scroll and caret. */}
                <SourceList
                    id="presets"
                    hidden={tab !== "presets"}
                    groups={ownGroups}
                    current={source.id}
                    onPick={pick}
                />
                <SourceList
                    id="gl"
                    hidden={tab !== "gl"}
                    intro={<GLIntro />}
                    groups={glGroups}
                    current={source.id}
                    onPick={pick}
                />
                <div
                    className="lab-panel lab-edit"
                    role="tabpanel"
                    id="lab-panel-edit"
                    aria-labelledby="lab-tab-edit"
                    hidden={tab !== "edit"}
                >
                    <p className="lab-current">
                        {source.label}
                        {source.credit && (
                            <>
                                {" "}
                                · by {source.credit.author} ·{" "}
                                {source.credit.license} ·{" "}
                                <a
                                    href={source.credit.href}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    gl-transitions ↗
                                </a>
                            </>
                        )}
                    </p>
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

/** One tab panel of loadable sources. With an intro, the groups drop their headings. */
function SourceList({
    id,
    hidden,
    intro,
    groups,
    current,
    onPick,
}: {
    id: Tab;
    hidden: boolean;
    intro?: React.ReactNode;
    groups: SourceGroup[];
    current: string;
    onPick: (id: string) => void;
}) {
    return (
        <div
            className="lab-panel lab-list"
            role="tabpanel"
            id={`lab-panel-${id}`}
            aria-labelledby={`lab-tab-${id}`}
            hidden={hidden}
        >
            {intro}
            {groups.map((g) => (
                <section key={g.label}>
                    {!intro && (
                        <h2>
                            {g.label}
                            <span>{g.options.length}</span>
                        </h2>
                    )}
                    <ul>
                        {g.options.map((o) => (
                            <li key={o.id}>
                                <button
                                    type="button"
                                    className="pg-item"
                                    aria-pressed={o.id === current}
                                    onClick={() => onPick(o.id)}
                                >
                                    <span>{o.label}</span>
                                    {o.author && (
                                        <span className="lab-author">
                                            by {o.author}
                                        </span>
                                    )}
                                    <span className="pg-play" aria-hidden>
                                        ▶
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

const glExample = `
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const cube = transitions.find((t) => t.name === "Cube");
t.run(cb, { transition: createGLTransition(cube, { persp: 0.5 }) });
`;

/** Credit for gl-transitions, and how to use its shaders with VFX-JS. */
function GLIntro() {
    return (
        <div className="lab-intro">
            <p>
                <a
                    href="https://gl-transitions.com/"
                    target="_blank"
                    rel="noreferrer"
                >
                    gl-transitions
                </a>{" "}
                is an open collection of GLSL transitions, started by Gaëtan
                Renaudeau and published by its contributors.
            </p>
            <p>
                The {glCount} shaders below were written by the community. Each
                keeps its author&apos;s license, shown in the Edit tab. Shaders
                that need extra textures are left out.
            </p>
            <p>
                Install <code>gl-transitions</code>, then{" "}
                <code>createGLTransition</code> from{" "}
                <code>@vfx-js/transitions</code> turns any of them into a VFX-JS
                transition:
            </p>
            <Code label="main.ts">{glExample}</Code>
        </div>
    );
}
