import { VFX } from "@vfx-js/core";
import Logo from "./assets/logo-640w-20p.svg";
import Jellyfish from "./assets/jellyfish.webp";
import "./preset.css";

const render = (opts) => {
    const img = document.createElement("img");
    img.src = opts.src ?? Logo;

    const vfx = new VFX();
    vfx.add(img, opts);

    return img;
};

export default {
    title: "Presets",
    render,
    parameters: {
        layout: "fullscreen",
    },
    args: {},
};

export const UvGradient = { args: { shader: "uvGradient" } };
export const Glitch = { args: { shader: "glitch", overflow: 100 } };
export const RgbGlitch = { args: { shader: "rgbGlitch" } };
export const RgbShift = { args: { shader: "rgbShift" } };
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
