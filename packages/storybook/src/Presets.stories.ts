import { VFX, type VFXProps, shaders } from "@vfx-js/core";
import Logo from "./assets/logo-640w-20p.svg";
import Jellyfish from "./assets/jellyfish.webp";

import type { Meta } from "@storybook/html";
import "./preset.css";

interface PresetProps {
    src?: string;
    shader: keyof typeof shaders;
    time?: number;
    overflow?: number;
    preset?: "tritone" | "duotone";
    uniforms: VFXProps["uniforms"];
}

const render = (opts: PresetProps) => {
    const img = document.createElement("img");
    img.src = opts.src ?? Logo;

    const props: VFXProps = { ...opts };
    if (opts.time !== undefined) {
        const time = opts.time;
        props.uniforms = { ...opts.uniforms, time: () => time };
    }

    const vfx = new VFX();
    vfx.add(img, props);

    return img;
};

export default {
    title: "Presets",
    render,
    parameters: {
        layout: "fullscreen",
    },
    args: {
        shader: "uvGradient",
    },
    argTypes: {
        shader: {
            control: {
                type: "select",
            },
            options: Object.keys(shaders),
        },
        time: {
            control: {
                type: "range",
                min: 0,
                max: 10,
                step: 0.1,
            },
        },
    },
} satisfies Meta<PresetProps>;

export const UvGradient = { args: { shader: "uvGradient" } };
export const Glitch = { args: { shader: "glitch", overflow: 100, time: 2.5 } };
export const RgbGlitch = { args: { shader: "rgbGlitch", time: 1.0 } };
export const RgbShift = { args: { shader: "rgbShift", time: 2.0 } };
export const Rainbow = { args: { shader: "rainbow" } };
export const Shine = { args: { shader: "shine" } };
export const Blink = { args: { shader: "blink" } };
export const spring = { args: { shader: "spring" } };
export const duotone = {
    args: {
        src: Jellyfish,
        shader: "duotone",
        uniforms: {
            color1: [1, 0, 0, 1],
            color2: [0, 0, 1, 1],
        },
    },
};
export const Tritone = {
    args: {
        src: Jellyfish,
        shader: "tritone",
        uniforms: {
            color1: [1, 0, 0, 1],
            color2: [0, 1, 0, 1],
            color3: [0, 0, 1, 1],
        },
    },
};
export const hueShift = { args: { src: Jellyfish, shader: "hueShift" } };
export const sinewave = { args: { shader: "sinewave" } };
export const pixelate = { args: { shader: "pixelate" } };
export const halftone = { args: { src: Jellyfish, shader: "halftone" } };
