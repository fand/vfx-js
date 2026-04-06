import type { VFXProps, VFXPostEffect } from "@vfx-js/core";
import type { Meta } from "@storybook/html";
import { Timer } from "./Timer";
import { buildFluidPasses } from "./stable-fluid";

import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

interface PostEffectProps {
  src?: string;
  overflow?: number;
  uniforms?: VFXProps["uniforms"];
  preset: string;
  postEffect: VFXPostEffect;
  defaultTime?: number;
}

export default {
  title: "Post Effects",
  render: (opts: PostEffectProps) => {
    const timer = new Timer(opts.defaultTime ?? 0, [0, 10]);
    document.body.append(timer.element);

    const img = document.createElement("img");
    img.src = opts.src ?? Logo;

    const vfx = initVFX({
      postEffect: opts.postEffect,
    });

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
} satisfies Meta<PostEffectProps>;

const story = (props: PostEffectProps) => ({ args: props });

// Feedback effect using backbuffer
export const FeedbackEffect = story({
  src: Logo,
  preset: "uvGradient",
  defaultTime: 1.0,
  postEffect: {
    shader: `
            precision highp float;
            uniform sampler2D src;
            uniform sampler2D backbuffer;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float time;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 current = texture(src, uv);

                vec2 feedbackOffset = vec2(
                    sin(uv.y * 31. + time * 1.0) + sin(uv.y * 17. + time * 0.7),
                    cos(uv.x * 23. + time * 1.5) + cos(uv.x * 19. + time * 0.9)
                ) * 0.001;
                vec4 previous = texture(backbuffer, uv + feedbackOffset);

                outColor = mix(current, previous * 0.99, 1. - current.a);
            }
        `,
    backbuffer: true,
  },
});

// Stable Fluid (Navier-Stokes multipass pipeline)

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

export const StableFluid = {
  args: {
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
  } satisfies FluidArgs,
  argTypes: {
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
    splatForce: { control: { type: "range", min: 100, max: 20000, step: 100 } },
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
  },
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

    let time = 0;
    let dX = 0;
    let dY = 0;
    let lastMoveTime = 0;
    const mouseDelta = (): [number, number] => {
      const elapsed = performance.now() - lastMoveTime;
      const decay = Math.exp(-elapsed * 0.01);
      return [dX * decay, dY * decay];
    };

    const SIM = args.simResolution;
    const aspect = window.innerWidth / window.innerHeight;
    const simSize: [number, number] =
      aspect > 1
        ? [Math.round(SIM * aspect), SIM]
        : [SIM, Math.round(SIM / aspect)];

    const vfx = initVFX({
      autoplay: false,
      postEffect: buildFluidPasses({
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
      }),
    });

    await vfx.add(img, { shader: "uvGradient" });

    // Simulate circular mouse motion
    const cx = Math.round(window.innerWidth / 2);
    const cy = Math.round(window.innerHeight / 2);
    const frames = 100;

    for (let i = 0; i < frames; i++) {
      if (i < frames) {
        const angle = (i / frames) * Math.PI * 2;
        dX = Math.cos(angle) * 15;
        dY = Math.sin(angle) * 15;
        lastMoveTime = performance.now();
        window.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: cx + Math.cos(angle) * 100,
            clientY: cy - Math.sin(angle) * 100,
          })
        );
      } else {
        dX = 0;
        dY = 0;
      }
      time = i * 0.016;
      vfx.render();
    }

    // Click to start interactive mode with mouse tracking
    canvasElement.addEventListener(
      "click",
      () => {
        let prevX = -1;
        let prevY = -1;
        window.addEventListener("mousemove", (e) => {
          const x = e.clientX;
          const y = window.innerHeight - e.clientY;
          if (prevX >= 0) {
            dX = x - prevX;
            dY = y - prevY;
            lastMoveTime = performance.now();
          }
          prevX = x;
          prevY = y;
        });
        vfx.play();
      },
      { once: true },
    );
  },
  parameters: {
    layout: "fullscreen",
  },
};

// Multiple VFXElements with post effect (test for render target clearing fix)
export const MultipleElements = {
  render: () => {
    const timer = new Timer(0, [0, 10]);
    document.body.append(timer.element);

    const uniforms = {
      time: () => timer.time,
    };

    const container = document.createElement("div");

    // Create three images with different effects
    const img1 = document.createElement("img");
    img1.src = Logo;
    img1.width = 300;

    const img2 = img1.cloneNode() as HTMLImageElement;
    const img3 = img1.cloneNode() as HTMLImageElement;

    container.appendChild(img1);
    container.appendChild(img2);
    container.appendChild(img3);

    const vfx = initVFX({
      postEffect: {
        shader: "invert",
      },
    });

    // Add different shader effects to each element
    vfx.add(img1, { shader: "rgbShift", uniforms });
    vfx.add(img2, { shader: "sinewave", uniforms });
    vfx.add(img3, { shader: "uvGradient", uniforms });

    return container;
  },
};
