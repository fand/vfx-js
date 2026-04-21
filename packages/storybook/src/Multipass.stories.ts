import type { Meta } from "@storybook/html-vite";
import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { buildFluidPasses } from "./stable-fluid";
import { initVFX } from "./utils";
import "./preset.css";

interface FluidArgs {
    simResolution: number;
    pressureIterations: number;
    curlStrength: number;
    velocityDissipation: number;
    densityDissipation: number;
    splatForce: number;
    splatRadius: number;
    dyeSplatRadius: number;
    dyeSplatIntensity: number;
    showDye: boolean;
}

const fluidArgTypes = {
    simResolution: { control: { type: "range", min: 32, max: 512, step: 32 } },
    pressureIterations: {
        control: { type: "range", min: 1, max: 40, step: 1 },
    },
    curlStrength: { control: { type: "range", min: 0, max: 100, step: 1 } },
    velocityDissipation: {
        control: { type: "range", min: 0, max: 5, step: 0.05 },
    },
    densityDissipation: {
        control: { type: "range", min: 0, max: 5, step: 0.05 },
    },
    splatForce: {
        control: { type: "range", min: 100, max: 20000, step: 100 },
    },
    splatRadius: {
        control: { type: "range", min: 0.0001, max: 0.01, step: 0.0001 },
    },
    dyeSplatRadius: {
        control: { type: "range", min: 0.0001, max: 0.01, step: 0.0001 },
    },
    dyeSplatIntensity: {
        control: { type: "range", min: 0.001, max: 0.03, step: 0.001 },
    },
    showDye: { control: "boolean" },
} as const;

const defaultFluidArgs: FluidArgs = {
    simResolution: 128,
    pressureIterations: 1,
    curlStrength: 13,
    velocityDissipation: 0.6,
    densityDissipation: 0.65,
    splatForce: 6000,
    splatRadius: 0.002,
    dyeSplatRadius: 0.001,
    dyeSplatIntensity: 0.005,
    showDye: false,
};

export default {
    title: "Multipass",
    parameters: {
        layout: "fullscreen",
    },
} satisfies Meta;

function buildFluidOpts(args: FluidArgs) {
    let time = 0;
    let dX = 0;
    let dY = 0;
    // Deterministic: setDelta is called right before each render, so the
    // shader reads the value that was just set. No wall-clock decay.
    const mouseDelta = (): [number, number] => [dX, dY];

    const SIM = args.simResolution;
    const aspect = window.innerWidth / window.innerHeight;
    const simSize: [number, number] =
        aspect > 1
            ? [Math.round(SIM * aspect), SIM]
            : [SIM, Math.round(SIM / aspect)];

    const passes = buildFluidPasses({
        simSize,
        mouseDelta,
        time: () => time,
        pressureIterations: args.pressureIterations,
        curlStrength: args.curlStrength,
        velocityDissipation: args.velocityDissipation,
        densityDissipation: args.densityDissipation,
        splatForce: args.splatForce,
        splatRadius: args.splatRadius,
        dyeSplatRadius: args.dyeSplatRadius,
        dyeSplatIntensity: args.dyeSplatIntensity,
        showDye: args.showDye,
    });

    return {
        passes,
        getTime: () => time,
        setTime: (t: number) => {
            time = t;
        },
        setDelta: (x: number, y: number) => {
            dX = x;
            dY = y;
        },
    };
}

function playFluidDemo(
    canvasElement: HTMLElement,
    vfx: ReturnType<typeof initVFX>,
    fluid: ReturnType<typeof buildFluidOpts>,
) {
    // Simulate circular mouse motion
    const cx = Math.round(window.innerWidth / 2);
    const cy = Math.round(window.innerHeight / 2);
    const frames = 100;

    for (let i = 0; i < frames; i++) {
        const angle = (i / frames) * Math.PI * 2;
        fluid.setDelta(Math.cos(angle) * 15, Math.sin(angle) * 15);
        window.dispatchEvent(
            new MouseEvent("pointermove", {
                clientX: cx + Math.cos(angle) * 100,
                clientY: cy - Math.sin(angle) * 100,
            }),
        );
        fluid.setTime(i * 0.016);
        vfx.render();
    }

    // Click to start interactive mode
    canvasElement.addEventListener(
        "click",
        () => {
            let prevX = -1;
            let prevY = -1;
            let idleTimer: number | undefined;
            window.addEventListener("pointermove", (e) => {
                const x = e.clientX;
                const y = window.innerHeight - e.clientY;
                if (prevX >= 0) {
                    fluid.setDelta(x - prevX, y - prevY);
                }
                prevX = x;
                prevY = y;
                // Zero the delta after a short idle so the fluid stops
                // being pushed when the mouse holds still.
                clearTimeout(idleTimer);
                idleTimer = window.setTimeout(() => fluid.setDelta(0, 0), 50);
            });
            vfx.play();
        },
        { once: true },
    );
}

// Stable Fluid as post effect
export const StableFluidPostEffect = {
    args: { ...defaultFluidArgs },
    argTypes: fluidArgTypes,
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        return img;
    },
    play: async ({
        canvasElement,
        args,
    }: {
        canvasElement: HTMLElement;
        args: FluidArgs;
    }) => {
        const img = canvasElement.querySelector("img") as HTMLImageElement;
        await new Promise((o) => {
            img.onload = o;
        });

        const fluid = buildFluidOpts(args);

        const vfx = initVFX({
            autoplay: false,
            postEffect: fluid.passes,
        });

        await vfx.add(img, { shader: "uvGradient" });

        playFluidDemo(canvasElement, vfx, fluid);
    },
    parameters: {
        layout: "fullscreen",
    },
};

// Stable Fluid as element shader (multipass element)
export const StableFluidElement = {
    args: { ...defaultFluidArgs },
    argTypes: fluidArgTypes,
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    play: async ({
        canvasElement,
        args,
    }: {
        canvasElement: HTMLElement;
        args: FluidArgs;
    }) => {
        const img = canvasElement.querySelector("img") as HTMLImageElement;
        await new Promise((o) => {
            img.onload = o;
        });

        const fluid = buildFluidOpts(args);

        const vfx = initVFX({ autoplay: false });

        await vfx.add(img, { shader: fluid.passes });

        playFluidDemo(canvasElement, vfx, fluid);
    },
    parameters: {
        layout: "fullscreen",
    },
};
