import type { Meta, StoryObj } from "@storybook/html-vite";
import { createRoot } from "react-dom/client";
import { VFXDiv, VFXP, VFXProvider, VFXSpan, VFXVideo } from "@vfx-js/react";
import {
    BloomEffect,
    PixelateEffect,
    ScanlineEffect,
} from "@vfx-js/effects";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import "./preset.css";

// Each component gets its own Effect instance — vfx-js rejects reuse
// across registered elements, and these all share one VFXProvider.

export default {
    title: "Effect/React",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

const ROOT_STYLE: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 48,
    padding: 48,
    fontFamily: "system-ui, sans-serif",
    color: "#fff",
};

const SECTION_HEADER: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "#a0e4ff",
    letterSpacing: 1,
    textTransform: "uppercase",
};

function bloomParams() {
    return {
        threshold: 0.4,
        softness: 0.3,
        intensity: 3.5,
        scatter: 1.0,
        dither: 0.0,
        edgeFade: 0.02,
        pad: 120,
    };
}

function SmokeTestApp(): React.ReactElement {
    return (
        <VFXProvider>
            <div style={ROOT_STYLE}>
                <section>
                    <div style={SECTION_HEADER}>VFXVideo + pixelate</div>
                    <VFXVideo
                        src={JellyfishMp4}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: 320, marginTop: 12 }}
                        effect={[new PixelateEffect({ size: 8 })]}
                    />
                </section>

                <section>
                    <div style={SECTION_HEADER}>VFXSpan + bloom</div>
                    <VFXSpan
                        style={{
                            display: "inline-block",
                            marginTop: 12,
                            fontSize: 64,
                            fontWeight: 800,
                            color: "#ff4fa3",
                        }}
                        effect={[new BloomEffect(bloomParams())]}
                    >
                        Hello, VFXSpan
                    </VFXSpan>
                </section>

                <section>
                    <div style={SECTION_HEADER}>VFXDiv + bloom</div>
                    <VFXDiv
                        style={{
                            display: "inline-block",
                            marginTop: 12,
                            padding: "24px 32px",
                            background:
                                "linear-gradient(135deg, #2d0040, #002040)",
                            borderRadius: 8,
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#ffe066",
                        }}
                        effect={[new BloomEffect(bloomParams())]}
                    >
                        VFXDiv container
                    </VFXDiv>
                </section>

                <section>
                    <div style={SECTION_HEADER}>VFXP + scanline</div>
                    <VFXP
                        style={{
                            marginTop: 12,
                            maxWidth: 560,
                            fontSize: 18,
                            lineHeight: 1.6,
                            color: "#a0e4ff",
                        }}
                        effect={[new ScanlineEffect({ spacing: 4 })]}
                    >
                        VFXP is the paragraph variant. Text elements go through
                        dom2canvas, then the effect chain runs against that
                        captured texture.
                    </VFXP>
                </section>
            </div>
        </VFXProvider>
    );
}

export const elementsSmokeTest: StoryObj<undefined> = {
    name: "Elements Smoke Test",
    render: () => {
        const root = document.getElementById("storybook-root");
        if (root) {
            root.style.height = "auto";
            root.style.display = "block";
        }
        const container = document.createElement("div");
        return container;
    },
    args: undefined,
};
elementsSmokeTest.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    const container = canvasElement.firstElementChild as HTMLElement;
    const root = createRoot(container);
    root.render(<SmokeTestApp />);
};
