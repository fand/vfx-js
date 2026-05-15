import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Effect, EffectContext, EffectRenderTarget } from "@vfx-js/core";
import Jellyfish from "./assets/jellyfish.webp";
import "./preset.css";
import { initVFX } from "./utils";

// Smoke story: writes src into a mipmap'd RT (auto-regen) and samples
// it with split-screen `textureLod` — left half always at LOD 0, right
// half at the slider-driven LOD. If the right half blurs as LOD rises,
// the auto-regen path is alive on a real GPU.
const COPY_FRAG = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`;

const SPLIT_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D rt;
uniform float lod;
void main() {
    float useLod = uv.x < 0.5 ? 0.0 : lod;
    vec4 c = textureLod(rt, uv, useLod);
    // Red separator down the middle for unambiguous split.
    if (abs(uv.x - 0.5) < 0.002) c = vec4(1.0, 0.0, 0.0, 1.0);
    outColor = c;
}
`;

class MipmapSmokeEffect implements Effect {
    lod: number;
    #rt: EffectRenderTarget | null = null;

    constructor(initialLod: number) {
        this.lod = initialLod;
    }

    init(ctx: EffectContext): void {
        this.#rt = ctx.createRenderTarget({ mipmap: true });
    }

    render(ctx: EffectContext): void {
        if (!this.#rt) {
            return;
        }
        ctx.draw({
            frag: COPY_FRAG,
            uniforms: { src: ctx.src },
            target: this.#rt,
        });
        ctx.draw({
            frag: SPLIT_FRAG,
            uniforms: { rt: this.#rt, lod: this.lod },
            target: ctx.target,
        });
    }

    dispose(): void {
        this.#rt = null;
    }
}

export default {
    title: "Mipmap",
    parameters: { layout: "fullscreen" },
} satisfies Meta<{ lod: number }>;

type Args = { lod: number };

export const smoke: StoryObj<Args> = {
    render: (args) => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        img.style.display = "block";
        img.style.margin = "40px auto";

        const vfx = initVFX();
        const effect = new MipmapSmokeEffect(args.lod);
        img.onload = () => {
            vfx.add(img, { effect });
        };
        return img;
    },
    args: { lod: 4 },
    argTypes: {
        lod: { control: { type: "range", min: 0, max: 10, step: 0.1 } },
    },
};
