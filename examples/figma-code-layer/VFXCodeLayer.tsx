// VFX-JS as a Figma Code Layer.
//
// Figma Code Layers (Config 2026) run real React + npm packages in a
// browser/WebGL context, so @vfx-js/react + @vfx-js/effects run live and
// fully animated — including multi-pass effects (bloom, fluid, particle)
// that a native single-pass shader fill cannot express.
//
// VFX-JS captures *DOM* content, not Figma vector layers. So this layer
// renders its own target (an <img> or text) and applies the effect to
// it. To run an effect over an existing Figma layer, export that layer
// to an image and pass its URL/data-URI as `imageSrc`.
//
// Paste this file (and effects.ts) into a Code Layer. Make sure
// @vfx-js/core, @vfx-js/react and @vfx-js/effects are available as
// dependencies.

import { VFXImg, VFXProvider, VFXSpan } from "@vfx-js/react";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Control, defaultParams, EFFECT_NAMES, EFFECTS } from "./effects";

const DEFAULT_IMAGE =
    "https://raw.githubusercontent.com/fand/vfx-js/main/packages/docs/public/logo.png";

type Target = "image" | "text";

export default function VFXCodeLayer() {
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [effectName, setEffectName] = useState<string>(EFFECT_NAMES[0]);
    const [params, setParams] = useState<Record<string, unknown>>(() =>
        defaultParams(EFFECT_NAMES[0]),
    );
    const [target, setTarget] = useState<Target>("image");
    const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);

    const entry = EFFECTS[effectName];

    // One stable effect instance per selected effect type. Switching the
    // type yields a new instance → @vfx-js/react diffs the `effect` ref
    // and takes the `updateEffects` fast path (no source reload).
    const effect = useMemo(
        () => entry.create(defaultParams(effectName)),
        [effectName, entry],
    );

    // Param tweaks update the *same* instance live via setParams — no
    // re-add, no flicker. Uniforms are read from params every frame.
    useEffect(() => {
        effect.setParams?.(params);
    }, [effect, params]);

    const onPickEffect = (name: string) => {
        setEffectName(name);
        setParams(defaultParams(name));
    };

    return (
        <div style={styles.root}>
            <Panel
                effectName={effectName}
                onPickEffect={onPickEffect}
                controls={entry.controls}
                params={params}
                setParams={setParams}
                target={target}
                setTarget={setTarget}
                imageSrc={imageSrc}
                setImageSrc={setImageSrc}
            />

            {/* Stage: wrapper keeps the WebGL canvas contained inside the
                layer (needs position:relative + overflow:hidden). */}
            <div ref={wrapperRef} style={styles.stage}>
                <VFXProvider wrapper={wrapperRef}>
                    {target === "image" ? (
                        <VFXImg
                            // key forces a clean remount if the URL changes
                            key={imageSrc}
                            src={imageSrc}
                            crossOrigin="anonymous"
                            effect={effect}
                            style={styles.media}
                            alt=""
                        />
                    ) : (
                        <VFXSpan effect={effect} style={styles.text}>
                            VFX-JS
                        </VFXSpan>
                    )}
                </VFXProvider>
            </div>
        </div>
    );
}

function Panel(props: {
    effectName: string;
    onPickEffect: (name: string) => void;
    controls: Control[];
    params: Record<string, unknown>;
    setParams: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    target: Target;
    setTarget: (t: Target) => void;
    imageSrc: string;
    setImageSrc: (s: string) => void;
}) {
    const setParam = (key: string, value: unknown) =>
        props.setParams((p) => ({ ...p, [key]: value }));

    return (
        <div style={styles.panel}>
            <label style={styles.field}>
                <span style={styles.label}>Effect</span>
                <select
                    value={props.effectName}
                    onChange={(e) => props.onPickEffect(e.target.value)}
                    style={styles.input}
                >
                    {EFFECT_NAMES.map((name) => (
                        <option key={name} value={name}>
                            {EFFECTS[name].label}
                        </option>
                    ))}
                </select>
            </label>

            <label style={styles.field}>
                <span style={styles.label}>Target</span>
                <select
                    value={props.target}
                    onChange={(e) => props.setTarget(e.target.value as Target)}
                    style={styles.input}
                >
                    <option value="image">Image</option>
                    <option value="text">Text</option>
                </select>
            </label>

            {props.target === "image" && (
                <label style={styles.field}>
                    <span style={styles.label}>Image URL</span>
                    <input
                        type="text"
                        value={props.imageSrc}
                        onChange={(e) => props.setImageSrc(e.target.value)}
                        style={styles.input}
                    />
                </label>
            )}

            {props.controls.length === 0 && (
                <p style={styles.hint}>
                    No params — this showcase effect runs the full multi-pass
                    pipeline with defaults.
                </p>
            )}

            {props.controls.map((c) =>
                c.kind === "slider" ? (
                    <label key={c.key} style={styles.field}>
                        <span style={styles.label}>
                            {c.label}: {Number(props.params[c.key]).toFixed(2)}
                        </span>
                        <input
                            type="range"
                            min={c.min}
                            max={c.max}
                            step={c.step}
                            value={Number(props.params[c.key] ?? c.default)}
                            onChange={(e) =>
                                setParam(c.key, Number(e.target.value))
                            }
                        />
                    </label>
                ) : (
                    <label key={c.key} style={styles.field}>
                        <span style={styles.label}>{c.label}</span>
                        <input
                            type="color"
                            value={rgbaToHex(
                                (props.params[c.key] as number[]) ?? c.default,
                            )}
                            onChange={(e) =>
                                setParam(c.key, hexToRgba(e.target.value))
                            }
                        />
                    </label>
                ),
            )}
        </div>
    );
}

// --- color helpers: @vfx-js/effects uses 0..1 RGBA floats ---

function rgbaToHex(rgba: number[]): string {
    const h = (n: number) =>
        Math.round(Math.max(0, Math.min(1, n)) * 255)
            .toString(16)
            .padStart(2, "0");
    return `#${h(rgba[0])}${h(rgba[1])}${h(rgba[2])}`;
}

function hexToRgba(hex: string): [number, number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [
        ((n >> 16) & 255) / 255,
        ((n >> 8) & 255) / 255,
        (n & 255) / 255,
        1,
    ];
}

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",
        gap: 16,
        fontFamily: "system-ui, sans-serif",
        color: "#fff",
        background: "#111",
        padding: 16,
        borderRadius: 12,
        alignItems: "flex-start",
    },
    panel: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: 240,
        flex: "0 0 auto",
    },
    field: { display: "flex", flexDirection: "column", gap: 4 },
    label: { fontSize: 12, opacity: 0.8 },
    input: {
        background: "#222",
        color: "#fff",
        border: "1px solid #333",
        borderRadius: 6,
        padding: "6px 8px",
        fontSize: 13,
    },
    hint: { fontSize: 12, opacity: 0.6, lineHeight: 1.4 },
    stage: {
        position: "relative",
        overflow: "hidden",
        flex: "1 1 auto",
        minWidth: 320,
        minHeight: 320,
        display: "grid",
        placeItems: "center",
        background: "#000",
        borderRadius: 8,
    },
    media: { maxWidth: "100%", maxHeight: 320, display: "block" },
    text: { fontSize: 72, fontWeight: 800, letterSpacing: 2 },
};
