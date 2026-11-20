import type { Meta, StoryObj } from "@storybook/html-vite";
import Amagi from "../../docs/public/amagi.png";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";
import {
    SWIRL_PARTICLES_DEFAULTS,
    SwirlParticlesEffect,
    type SwirlParticlesParams,
} from "./swirl-particles";
import { attachSwirlParticlesPane, initVFX, isChromatic } from "./utils";

type Args = {
    shape: "logo" | "amagi";
    /** Overrides of the defaults for this story. */
    params?: Partial<SwirlParticlesParams>;
};

const SOURCES = {
    logo: { src: Logo, style: "width: min(80vw, 960px)" },
    amagi: { src: Amagi, style: "height: min(70vh, 640px)" },
};

export default {
    title: "Swirl Particles",
    parameters: { layout: "fullscreen", controls: { disable: true } },
    render: (args) => {
        const source = SOURCES[args.shape];
        const img = document.createElement("img");
        img.style.cssText = source.style;

        const vfx = initVFX();
        const still = isChromatic();
        // Tweakpane edits this object; it is copied into the effect.
        const params: SwirlParticlesParams = {
            ...SWIRL_PARTICLES_DEFAULTS,
            ...args.params,
        };
        let effect = new SwirlParticlesEffect(params, { still });

        img.addEventListener(
            "load",
            () => {
                vfx.add(img, { effect });
                if (still) {
                    return;
                }
                attachSwirlParticlesPane("Swirl Particles", params, {
                    apply: () => {
                        Object.assign(effect.params, params);
                    },
                    rebuild: () => {
                        vfx.remove(img);
                        effect = new SwirlParticlesEffect(params);
                        vfx.add(img, { effect });
                    },
                });
            },
            { once: true },
        );
        img.src = source.src;
        return img;
    },
} satisfies Meta<Args>;

export const logo: StoryObj<Args> = {
    args: { shape: "logo" },
};

export const amagi: StoryObj<Args> = {
    args: { shape: "amagi", params: { depth: 0.3 } },
};
