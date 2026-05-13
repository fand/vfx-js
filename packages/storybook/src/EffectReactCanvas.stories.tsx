import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Effect } from "@vfx-js/core";
import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { VFXCanvas, VFXProvider } from "react-vfx";
import { BloomEffect } from "./effects/bloom";
import { createPixelateEffect } from "./effects/pixelate";
import { createScanlineEffect } from "./effects/scanline";
import "./preset.css";

export default {
    title: "Effect/React",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

type EffectId = "pixelate" | "scanline" | "bloom";
type ChainItem = { id: EffectId; enabled: boolean };

function buildEffectInstances(): Record<EffectId, Effect> {
    return {
        pixelate: createPixelateEffect({ size: 6 }),
        scanline: createScanlineEffect({ spacing: 4 }),
        bloom: new BloomEffect({
            threshold: 0.4,
            softness: 0.3,
            intensity: 4.0,
            scatter: 1.0,
            dither: 0.0,
            edgeFade: 0.02,
            pad: 200,
        }),
    };
}

const INITIAL_CHAIN: ChainItem[] = [
    { id: "pixelate", enabled: true },
    { id: "scanline", enabled: true },
    { id: "bloom", enabled: true },
];

const PANEL_STYLE: React.CSSProperties = {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 10000,
    width: 240,
    padding: 12,
    background: "rgba(20,20,20,0.85)",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    borderRadius: 6,
    userSelect: "none",
};

const LIST_STYLE: React.CSSProperties = {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
};

function SortableList({
    items,
    onChange,
}: {
    items: ChainItem[];
    onChange: (next: ChainItem[]) => void;
}): React.ReactElement {
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);

    const move = (from: number, to: number): void => {
        if (from === to) {
            return;
        }
        const next = [...items];
        const [m] = next.splice(from, 1);
        next.splice(to, 0, m);
        onChange(next);
    };

    const toggle = (idx: number): void => {
        onChange(
            items.map((it, j) =>
                j === idx ? { ...it, enabled: !it.enabled } : it,
            ),
        );
    };

    return (
        <div style={PANEL_STYLE}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
                VFXCanvas (HIC) — effect chain
            </div>
            <ul style={LIST_STYLE}>
                {items.map((item, i) => {
                    const isDragging = dragIdx === i;
                    const isOver = overIdx === i && dragIdx !== i;
                    return (
                        <li
                            key={item.id}
                            draggable
                            onDragStart={(e) => {
                                setDragIdx(i);
                                e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setOverIdx(i);
                            }}
                            onDragLeave={() => {
                                setOverIdx((cur) => (cur === i ? null : cur));
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (dragIdx !== null) {
                                    move(dragIdx, i);
                                }
                                setDragIdx(null);
                                setOverIdx(null);
                            }}
                            onDragEnd={() => {
                                setDragIdx(null);
                                setOverIdx(null);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 8px",
                                background: isOver
                                    ? "rgba(120,160,255,0.35)"
                                    : "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: 4,
                                opacity: isDragging ? 0.4 : 1,
                                cursor: "grab",
                            }}
                        >
                            <span aria-hidden style={{ opacity: 0.6 }}>
                                ≡
                            </span>
                            <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={() => toggle(i)}
                            />
                            <span style={{ flex: 1 }}>{item.id}</span>
                        </li>
                    );
                })}
            </ul>
            <div
                style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.6,
                    lineHeight: 1.4,
                }}
            >
                Drag rows to reorder. Toggle to disable.
            </div>
        </div>
    );
}

const CANVAS_STYLE: React.CSSProperties = {
    display: "block",
    width: "min(640px, 90vw)",
    margin: "64px auto",
};

// All visual styling lives on this inner div — putting padding /
// background on the <canvas layoutsubtree> itself would stretch the
// captured texture (canvas box includes padding, capture only sees
// children's render area).
const CARD_STYLE: React.CSSProperties = {
    padding: "40px 48px",
    background: "linear-gradient(135deg, #1a0030 0%, #001a30 100%)",
    borderRadius: 12,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
    fontFamily: "system-ui, sans-serif",
};

function CRTBloomCanvasApp(): React.ReactElement {
    const [chain, setChain] = useState<ChainItem[]>(INITIAL_CHAIN);

    const instancesRef = useRef<Record<EffectId, Effect> | null>(null);
    if (!instancesRef.current) {
        instancesRef.current = buildEffectInstances();
    }
    const instances = instancesRef.current;

    const effects = useMemo(
        () => chain.filter((c) => c.enabled).map((c) => instances[c.id]),
        [chain, instances],
    );

    return (
        <VFXProvider>
            <SortableList items={chain} onChange={setChain} />
            <VFXCanvas effect={effects} style={CANVAS_STYLE}>
                <div style={CARD_STYLE}>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: 48,
                            fontWeight: 800,
                            color: "#ff4fa3",
                            textShadow: "0 0 12px rgba(255,79,163,0.6)",
                            letterSpacing: -1,
                        }}
                    >
                        VFX-JS
                    </h1>
                    <p
                        style={{
                            margin: "24px 0 0",
                            fontSize: 18,
                            lineHeight: 1.6,
                            color: "#a0e4ff",
                        }}
                    >
                        Live HTML captured into a WebGL texture via{" "}
                        <strong style={{ color: "#ffe066" }}>
                            html-in-canvas
                        </strong>
                        , then run through an effect chain. Reorder or toggle
                        the effects on the right.
                    </p>
                    <div
                        style={{
                            marginTop: 28,
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                        }}
                    >
                        {["pixelate", "scanline", "bloom"].map((label) => (
                            <span
                                key={label}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 999,
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "#fff",
                                    fontSize: 14,
                                }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </VFXCanvas>
        </VFXProvider>
    );
}

export const crtBloomCanvas: StoryObj<undefined> = {
    name: "CRT Bloom (VFXCanvas)",
    render: () => {
        const container = document.createElement("div");
        return container;
    },
    args: undefined,
};
crtBloomCanvas.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    const container = canvasElement.firstElementChild as HTMLElement;
    const root = createRoot(container);
    root.render(<CRTBloomCanvasApp />);
};
