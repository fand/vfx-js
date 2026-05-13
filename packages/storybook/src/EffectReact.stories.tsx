import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Effect } from "@vfx-js/core";
import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { VFXImg, VFXProvider } from "react-vfx";
import {
    BloomEffect,
    createPixelateEffect,
    createScanlineEffect,
} from "@vfx-js/effects";
import Jellyfish from "./assets/jellyfish.webp";
import "./preset.css";

export default {
    title: "Effect/React",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

type EffectId = "pixelate" | "scanline" | "bloom";
type ChainItem = { id: EffectId; enabled: boolean };

function buildEffectInstances(): Record<EffectId, Effect> {
    return {
        pixelate: createPixelateEffect({ size: 10 }),
        scanline: createScanlineEffect({ spacing: 5 }),
        bloom: new BloomEffect({
            threshold: 0.01,
            softness: 0.2,
            intensity: 10.0,
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
                CRT Bloom — effect chain
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

function CRTBloomReactApp(): React.ReactElement {
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
            <VFXImg src={Jellyfish} effect={effects} />
        </VFXProvider>
    );
}

export const crtBloomImg: StoryObj<undefined> = {
    name: "CRT Bloom (VFXImg)",
    render: () => {
        const container = document.createElement("div");
        return container;
    },
    args: undefined,
};
crtBloomImg.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    const container = canvasElement.firstElementChild as HTMLElement;
    const root = createRoot(container);
    root.render(<CRTBloomReactApp />);
};
