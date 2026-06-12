import type { VFXProps, shaders } from "@vfx-js/core";
import type { Meta } from "@storybook/html-vite";
import { Timer } from "./Timer";

import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import Jellyfish from "./assets/jellyfish.webp";
import Pigeon from "./assets/pigeon.webp";
import "./preset.css";

interface PresetProps {
    src?: string;
    overflow?: number;
    uniforms?: VFXProps["uniforms"];

    preset: keyof typeof shaders;
    defaultTime?: number;
}

export default {
    title: "Presets",
    render: (opts: PresetProps) => {
        const timer = new Timer(opts.defaultTime ?? 0, [0, 10]);
        document.body.append(timer.element);

        const img = document.createElement("img");
        img.src = opts.src ?? Logo;

        const vfx = initVFX();
        vfx.add(img, {
            shader: opts.preset,
            overflow: opts.overflow,
            uniforms: { ...(opts.uniforms ?? {}), time: () => timer.time },
        });

        return img;
    },
    parameters: {
        layout: "fullscreen",
    },
    args: {
        preset: "uvGradient",
    },
} satisfies Meta<PresetProps>;

const story = (props: PresetProps) => ({ args: props });

export const UvGradient = story({ preset: "uvGradient" });
export const Glitch = story({
    preset: "glitch",
    overflow: 100,
    defaultTime: 2.5,
});
export const RgbGlitch = story({ preset: "rgbGlitch", defaultTime: 1.0 });
export const RgbShift = story({ preset: "rgbShift", defaultTime: 2.0 });
export const Rainbow = story({ preset: "rainbow", defaultTime: 0.0 });
export const Shine = story({ preset: "shine", defaultTime: 0.0 });
export const Blink = story({ preset: "blink", defaultTime: 1.0 });
export const spring = story({ preset: "spring", defaultTime: 1.0 });
export const duotone = story({
    src: Jellyfish,
    preset: "duotone",
    uniforms: {
        color1: [1, 0, 0, 1],
        color2: [0, 0, 1, 1],
    },
});
export const Tritone = story({
    src: Jellyfish,
    preset: "tritone",
    uniforms: {
        color1: [1, 0, 0, 1],
        color2: [0, 1, 0, 1],
        color3: [0, 0, 1, 1],
    },
});
export const hueShift = story({
    src: Jellyfish,
    preset: "hueShift",
    defaultTime: 1.0,
    uniforms: { shift: 0.5 },
});
export const sinewave = story({ preset: "sinewave", defaultTime: 1.0 });
export const pixelate = story({ preset: "pixelate", defaultTime: 1.0 });
export const halftone = story({ src: Jellyfish, preset: "halftone" });
export const Invert = story({ preset: "invert" });
export const Grayscale = story({ preset: "grayscale" });
export const Vignette = story({
    preset: "vignette",
    uniforms: {
        intensity: 0.5,
        radius: 1.0,
        power: 2.0,
    },
});
export const Chromatic = story({
    src: Pigeon,
    preset: "chromatic",
    uniforms: {
        intensity: 0.3,
        radius: 0.0,
        power: 2.0,
    },
});
