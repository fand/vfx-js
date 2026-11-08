import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Effect, EffectContext, EffectTexture } from "@vfx-js/core";
import "./preset.css";
import { initVFX } from "./utils";

// The effect shows a 2D canvas wrapped with `autoUpdate: false`.
// "Redraw" alone must not change the output; "Redraw + update()" must.
const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D tex;
void main() {
    outColor = texture(tex, uv);
}
`;

class CanvasTextureEffect implements Effect {
    tex: EffectTexture | null = null;
    #canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.#canvas = canvas;
    }

    init(ctx: EffectContext): void {
        this.tex = ctx.wrapTexture(this.#canvas, { autoUpdate: false });
    }

    render(ctx: EffectContext): void {
        if (!this.tex) {
            return;
        }
        ctx.draw({
            frag: FRAG,
            uniforms: { tex: this.tex },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.tex?.dispose();
        this.tex = null;
    }
}

const COLORS = ["#e63946", "#2a9d8f", "#e9c46a", "#457b9d", "#f4a261"];

function draw(canvas: HTMLCanvasElement, count: number): void {
    const c = canvas.getContext("2d");
    if (!c) {
        return;
    }
    c.fillStyle = "#222";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = COLORS[count % COLORS.length];
    c.beginPath();
    c.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height / 3,
        0,
        Math.PI * 2,
    );
    c.fill();
    c.fillStyle = "#fff";
    c.font = "bold 48px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(count), canvas.width / 2, canvas.height / 2);
}

export default {
    title: "TextureUpdate",
    parameters: { layout: "fullscreen" },
} satisfies Meta;

export const manualUpdate: StoryObj = {
    render: () => {
        const root = document.createElement("div");
        root.style.padding = "40px";

        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 300;
        let count = 0;
        draw(canvas, count);

        const target = document.createElement("div");
        target.style.width = "400px";
        target.style.height = "300px";

        const buttons = document.createElement("div");
        buttons.style.marginTop = "16px";
        buttons.style.display = "flex";
        buttons.style.gap = "8px";

        const effect = new CanvasTextureEffect(canvas);

        const redraw = document.createElement("button");
        redraw.textContent = "Redraw";
        redraw.onclick = () => {
            draw(canvas, ++count);
        };

        const redrawAndUpdate = document.createElement("button");
        redrawAndUpdate.textContent = "Redraw + update()";
        redrawAndUpdate.onclick = () => {
            draw(canvas, ++count);
            effect.tex?.update();
        };

        buttons.append(redraw, redrawAndUpdate);
        root.append(target, buttons);

        const vfx = initVFX();
        requestAnimationFrame(() => {
            vfx.add(target, { effect });
        });
        return root;
    },
};
