import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Effect, EffectContext } from "@vfx-js/core";
import "./preset.css";
import { initVFX } from "./utils";

// Translucent pixels must look the same with and without the effect path.
// The top row is plain HTML; the rows below render the same markup with VFX-JS.
const COPY_FRAG = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`;

class CopyEffect implements Effect {
    render(ctx: EffectContext): void {
        ctx.draw({
            frag: COPY_FRAG,
            uniforms: { src: ctx.src },
            target: ctx.target,
        });
    }
}

function makeSample(label: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText =
        "display:flex;gap:16px;align-items:center;padding:12px;color:white;font:20px sans-serif;";
    el.innerHTML = `
        <span style="width:200px">${label}</span>
        <code style="background:rgba(255,255,255,0.12);padding:4px 8px">rgba(255,255,255,0.12)</code>
        <span style="background:rgba(255,0,0,0.3);padding:4px 8px">rgba(255,0,0,0.3)</span>
        <span style="background:rgba(0,128,255,0.5);padding:4px 8px">rgba(0,128,255,0.5)</span>
    `;
    return el;
}

export default {
    title: "PremultipliedSrc",
    parameters: { layout: "fullscreen" },
} satisfies Meta;

export const translucent: StoryObj = {
    render: () => {
        const root = document.createElement("div");
        root.style.cssText = "background:#222;min-height:100vh;padding:40px;";

        const plain = makeSample("HTML");
        const shader = makeSample("shader");
        const empty = makeSample("effect: []");
        const copy = makeSample("effect: [copy]");
        root.append(plain, shader, empty, copy);

        const vfx = initVFX();
        requestAnimationFrame(() => {
            vfx.add(shader, { shader: "none" });
            vfx.add(empty, { effect: [] });
            vfx.add(copy, { effect: [new CopyEffect()] });
        });
        return root;
    },
};
