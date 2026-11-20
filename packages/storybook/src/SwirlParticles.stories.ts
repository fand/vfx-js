import type { Meta, StoryObj } from "@storybook/html-vite";
import Amagi from "../../docs/public/amagi.png";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import {
    SWIRL_PARTICLES_DEFAULTS,
    SwirlParticlesEffect,
    type SwirlParticlesParams,
} from "./swirl-particles";
import { initVFX, isChromatic } from "./utils";

type Args = SwirlParticlesParams & { shape: "logo" | "amagi" };

const SOURCES = {
    logo: { src: Logo, style: "width: min(80vw, 960px)" },
    amagi: { src: Amagi, style: "height: min(70vh, 640px)" },
};

const slider = (min: number, max: number, step: number) => ({
    control: { type: "range" as const, min, max, step },
});

export default {
    title: "Swirl Particles",
    parameters: { layout: "fullscreen" },
    render: (args) => {
        const { shape, ...params } = args;
        const source = SOURCES[shape];
        const img = document.createElement("img");
        img.style.cssText = source.style;

        const vfx = initVFX();
        const add = () => {
            vfx.add(img, {
                effect: new SwirlParticlesEffect(params, {
                    still: isChromatic(),
                }),
            });
        };
        img.addEventListener("load", add, { once: true });
        img.src = source.src;
        return img;
    },
    args: { ...SWIRL_PARTICLES_DEFAULTS, shape: "logo" },
    argTypes: {
        shape: { control: "inline-radio", options: ["logo", "amagi"] },
        count: {
            control: "select",
            options: [65536, 131072, 262144, 524288, 1048576],
        },
        depth: slider(0.02, 1, 0.01),
        swirl: slider(0, 3, 0.05),
        curl: slider(0, 3, 0.05),
        curlScale: slider(0.5, 6, 0.1),
        speed: slider(0, 1, 0.01),
        attract: slider(0, 20, 0.5),
        peel: slider(0, 1, 0.01),
        life: slider(0.5, 12, 0.1),
        pointSize: slider(0.5, 5, 0.1),
        streak: slider(0, 1.5, 0.01),
        fireflyRatio: slider(0, 0.1, 0.001),
        fireflyIntensity: slider(0, 20, 0.5),
        bloom: slider(0, 3, 0.05),
        bloomThreshold: slider(0, 3, 0.05),
        orbit: slider(0, 1.5, 0.01),
        zoom: slider(0.3, 3, 0.05),
    },
} satisfies Meta<Args>;

export const logo: StoryObj<Args> = {};

export const amagi: StoryObj<Args> = {
    args: { shape: "amagi", depth: 0.3 },
};
