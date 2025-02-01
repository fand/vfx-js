import { VFX, type VFXProps, type shaders } from "@vfx-js/core";
import Logo from "./assets/logo-640w-20p.svg";
import Jellyfish from "./assets/jellyfish.webp";

import type { Meta } from "@storybook/html";
import "./preset.css";
import { Timer } from "./Timer";

interface PresetProps {
    src?: string;
    overflow?: number;
    uniforms: VFXProps["uniforms"];

    preset: keyof typeof shaders;
    defaultTime?: number;
}

const render = (opts: PresetProps) => {
    const timer = new Timer(opts.defaultTime ?? 0, [0, 10]);
    document.body.append(timer.element);

    const img = document.createElement("img");
    img.src = opts.src ?? Logo;

    const props: VFXProps = {
        shader: opts.preset,
        overflow: opts.overflow,
        uniforms: { ...(opts.uniforms ?? {}), time: () => timer.time },
    };

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
        preset: "uvGradient",
    },
} satisfies Meta<PresetProps>;

export const UvGradient = { args: { preset: "uvGradient" } };
export const Glitch = {
    args: { preset: "glitch", overflow: 100, defaultTime: 2.5 },
};
export const RgbGlitch = { args: { preset: "rgbGlitch", defaultTime: 1.0 } };
export const RgbShift = { args: { preset: "rgbShift", defaultTime: 2.0 } };
export const Rainbow = { args: { preset: "rainbow", defaultTime: 0.0 } };
export const Shine = { args: { preset: "shine", defaultTime: 0.0 } };
export const Blink = { args: { preset: "blink", defaultTime: 1.0 } };
export const spring = { args: { preset: "spring", defaultTime: 1.0 } };
export const duotone = {
    args: {
        src: Jellyfish,
        preset: "duotone",
        uniforms: {
            color1: [1, 0, 0, 1],
            color2: [0, 0, 1, 1],
        },
    },
};
export const Tritone = {
    args: {
        src: Jellyfish,
        preset: "tritone",
        uniforms: {
            color1: [1, 0, 0, 1],
            color2: [0, 1, 0, 1],
            color3: [0, 0, 1, 1],
        },
    },
};
export const hueShift = {
    args: {
        src: Jellyfish,
        preset: "hueShift",
        defaultTime: 1.0,
        uniforms: { shift: 0.5 },
    },
};
export const sinewave = { args: { preset: "sinewave", defaultTime: 1.0 } };
export const pixelate = { args: { preset: "pixelate", defaultTime: 1.0 } };
export const halftone = { args: { src: Jellyfish, preset: "halftone" } };
