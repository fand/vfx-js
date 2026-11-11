"use client";

import type {
    RunContext,
    Transition,
    TransitionEase,
    TransitionUniforms,
} from "@vfx-js/core";
import { useVFXTransition } from "@vfx-js/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Code } from "../_components/code";
import { highlight } from "../_components/highlight";
import { LabScene } from "./lab-scene";
import {
    defaultParams,
    groups,
    LabShader,
    type ParamSpec,
    type ParamValues,
    type Source,
    type SourceGroup,
    shaderOf,
    sourceOf,
} from "./sources";

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

const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** An ease as a function of progress. */
const easeFn = (ease: TransitionEase | undefined) =>
    typeof ease === "function"
        ? ease
        : ease === "linear"
          ? (x: number) => x
          : smoothstep;

const easeName = (ease: TransitionEase | undefined) =>
    typeof ease === "function" ? "custom" : (ease ?? "smoothstep");

const ownGroups = groups.filter((g) => !g.thirdParty);
const glGroups = groups.filter((g) => g.thirdParty);
const glCount = glGroups.reduce((n, g) => n + g.options.length, 0);

export function ShaderLab({ head }: { head?: React.ReactNode }) {
    const [source, setSource] = useState(first);
    const [frag, setFrag] = useState(first.frag);
    const [values, setValues] = useState<TransitionUniforms>(first.uniforms);
    const [params, setParams] = useState<ParamValues>(() =>
        defaultParams(first.factory),
    );
    const [scene, setScene] = useState(0);
    const [tab, setTab] = useState<Tab>("presets");
    const [easeIndex, setEaseIndex] = useState(0);
    const [duration, setDuration] = useState(1.2);
    const [progress, setProgress] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [liveFrom, setLiveFrom] = useState(false);
    // Old scenes that core keeps playing in its hidden canvas.
    const [kept, setKept] = useState<number[]>([]);
    const sceneRef = useRef(scene);
    sceneRef.current = scene;
    const boxes = useRef(new Map<number, HTMLElement>());
    const { ref, run } = useVFXTransition();
    // A held run reads its t from here every frame, so Play, Pause and the slider all drive it.
    const clock = useRef<{
        x: number;
        ease: (x: number) => number;
        active: boolean;
        transition?: Transition;
    }>({ x: 0, ease: smoothstep, active: false });
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

    // The program is cached by its source, so a new instance per edit is cheap.
    const transition = useMemo(
        () =>
            source.effect && source.factory
                ? source.factory.build(params)
                : new LabShader(frag, source),
        [frag, source, params],
    );

    // Sliders change the uniforms of a held run in place.
    useLayoutEffect(() => {
        if (transition instanceof LabShader) {
            transition.params = values;
        }
    }, [transition, values]);

    /** A new param builds the preset again. A shader preset reloads its GLSL and uniforms. */
    const setParam = (name: string, value: string | number) => {
        const next = { ...params, [name]: value };
        setParams(next);
        const built = source.factory && shaderOf(source.factory.build(next));
        if (built) {
            setFrag(built.frag);
            setValues(built.uniforms);
        }
    };

    // A new ease applies to a held run at once.
    clock.current.ease = easeFn(eases[easeIndex].ease ?? source.ease);
    // Effect presets like datamosh follow real time, not t, so they play a normal run.
    const timed = Boolean(source.effect);

    // Hand the shown scene to core, and keep rendering it until core gives it back.
    const nextScene = (ctx: RunContext) => {
        const shown = sceneRef.current;
        const box = boxes.current.get(shown);
        const parent = box?.parentNode;
        if (box) {
            ctx.keepPrev(box, (node) => {
                (node as HTMLElement).style.display = "none";
                setKept((k) => k.filter((i) => i !== shown));
            });
        }
        // Core leaves the box in place without liveFrom.
        if (box && box.parentNode !== parent) {
            setKept((k) => [...k, shown]);
        }
        setScene(shown + 1);
    };

    /** Starts a run held at the clock. A new transition starts a new one. */
    const hold = (next: Transition) => {
        const c = clock.current;
        if (c.active && c.transition === next) {
            return;
        }
        c.active = true;
        c.transition = next;
        run(nextScene, {
            transition: next,
            liveFrom,
            duration: 3600,
            ease: () => c.ease(c.x),
        });
    };

    const play = (next: Transition = transition, isTimed = timed) => {
        const c = clock.current;
        if (c.x >= 1) {
            c.x = 0;
        }
        if (isTimed) {
            c.active = false;
            c.x = 0;
            run(nextScene, {
                transition: next,
                liveFrom,
                duration,
                ease: eases[easeIndex].ease,
            });
        } else {
            hold(next);
        }
        setPlaying(true);
    };

    const scrub = (x: number) => {
        setPlaying(false);
        clock.current.x = x;
        setProgress(x);
        hold(transition);
    };

    // Moves the clock while playing; it stops at the end.
    useEffect(() => {
        if (!playing) {
            return;
        }
        let last = performance.now();
        let id = 0;
        const tick = (now: number) => {
            const c = clock.current;
            c.x = Math.min(1, c.x + (now - last) / 1000 / duration);
            last = now;
            setProgress(c.x);
            if (c.x >= 1) {
                setPlaying(false);
                return;
            }
            id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, [playing, duration]);

    // `?preset=<name>` opens that preset, e.g. from the Presets page.
    useEffect(() => {
        const name = new URLSearchParams(window.location.search).get("preset");
        const next = name && sourceOf(`preset:${name}`);
        if (!next) {
            return;
        }
        setSource(next);
        setFrag(next.frag);
        setValues(next.uniforms);
        setParams(defaultParams(next.factory));
    }, []);

    /** Loads `id` into the editor and plays it once. */
    const pick = (id: string) => {
        const next = sourceOf(id);
        if (!next) {
            return;
        }
        const nextParams = defaultParams(next.factory);
        setSource(next);
        setFrag(next.frag);
        setValues(next.uniforms);
        setParams(nextParams);
        clock.current.x = 0;
        clock.current.active = false;
        const shader = new LabShader(next.frag, next);
        shader.params = next.uniforms;
        play(
            next.effect && next.factory
                ? next.factory.build(nextParams)
                : shader,
            Boolean(next.effect),
        );
    };

    return (
        <div className="lab">
            <div className="lab-preview">
                {head}
                <div className="lab-stage" ref={ref}>
                    {/* Each scene sits in a box that core can move, so React never loses one. */}
                    {[...kept, scene].map((i) => (
                        <div
                            key={i}
                            style={{ display: "contents" }}
                            ref={(box) => {
                                if (box) {
                                    boxes.current.set(i, box);
                                } else {
                                    boxes.current.delete(i);
                                }
                            }}
                        >
                            <LabScene index={i} />
                        </div>
                    ))}
                </div>
                <div className="lab-controls">
                    <div className="lab-transport">
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={playing && timed}
                            onClick={
                                playing ? () => setPlaying(false) : () => play()
                            }
                        >
                            {playing ? "❚❚ Pause" : "▶ Play"}
                        </button>
                        <span className="lab-t">
                            t={clock.current.ease(progress).toFixed(2)}
                        </span>
                        <input
                            type="range"
                            aria-label="progress"
                            min={0}
                            max={1}
                            step={0.001}
                            value={progress}
                            onChange={(e) => scrub(Number(e.target.value))}
                        />
                    </div>
                    <label className="pg-check">
                        <input
                            type="checkbox"
                            checked={liveFrom}
                            onChange={(e) => {
                                setLiveFrom(e.target.checked);
                                // A held run uses the old setting, so start a new one.
                                clock.current.active = false;
                            }}
                        />
                        <span>
                            liveFrom <i>keep the old side moving</i>
                        </span>
                    </label>
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
                    <label className="pg-range">
                        <span>
                            duration <b>{duration.toFixed(1)}s</b>
                        </span>
                        <input
                            type="range"
                            min={0.2}
                            max={5}
                            step={0.1}
                            value={duration}
                            onChange={(e) =>
                                setDuration(Number(e.target.value))
                            }
                        />
                    </label>
                    {source.factory?.params.map((p) => (
                        <ParamInput
                            key={`${source.id}:${p.name}`}
                            spec={p}
                            value={params[p.name] ?? p.value}
                            onChange={(v) => setParam(p.name, v)}
                        />
                    ))}
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
                    {source.effect ? (
                        <p className="lab-hint">
                            {source.label} runs effects, not a shader, so it has
                            no GLSL to edit. Change its params under the stage.
                        </p>
                    ) : (
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
                    )}
                    {!source.effect && (
                        <p className="lab-hint">
                            Edit and press Play. Compile errors print to the
                            console with line numbers.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/** A select or a slider for one factory param. */
function ParamInput({
    spec,
    value,
    onChange,
}: {
    spec: ParamSpec;
    value: string | number;
    onChange: (value: string | number) => void;
}) {
    if (spec.kind === "select") {
        return (
            <label className="pg-range">
                <span>{spec.name}</span>
                <select
                    className="pg-select"
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {spec.options.map((o) => (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ))}
                </select>
            </label>
        );
    }
    return (
        <label className="pg-range">
            <span>
                {spec.name}{" "}
                <b>{Number(value).toFixed(spec.step >= 1 ? 0 : 2)}</b>
            </span>
            <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={Number(value)}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </label>
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

const Cube = createGLTransition(transitions.find((t) => t.name === "Cube"));
t.run(cb, { transition: Cube, params: { persp: 0.5 } });
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
