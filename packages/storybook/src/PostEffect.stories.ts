import type { VFXProps, VFXPostEffect } from "@vfx-js/core";
import type { Meta } from "@storybook/html";
import { Timer } from "./Timer";

import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import Jellyfish from "./assets/jellyfish.webp";
import Pigeon from "./assets/pigeon.webp";
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

// Simple invert post effect using preset
export const InvertColors = story({
    src: Pigeon,
    preset: "rgbShift",
    postEffect: {
        shader: "invert",
    },
});

// Grayscale post effect using preset
export const Grayscale = story({
    src: Pigeon,
    preset: "sinewave",
    postEffect: {
        shader: "grayscale",
    },
});

// Sepia post effect using preset with custom uniform
export const Sepia = story({
    src: Pigeon,
    preset: "sinewave",
    defaultTime: 1.0,
    postEffect: {
        shader: "sepia",
        uniforms: {
            intensity: 0.8,
        },
    },
});

// Animated vignette post effect
export const AnimatedVignette = story({
    src: Pigeon,
    preset: "sinewave",
    defaultTime: 1.0,
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float time;
            uniform float vignetteStrength;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 color = texture(src, uv);

                vec2 center = vec2(0.5);
                float dist = distance(uv, center);
                float vignette = 1.0 - smoothstep(0.3, 1.0, dist * vignetteStrength);
                vignette += sin(time * 2.0) * 0.1;

                outColor = vec4(color.rgb * vignette, color.a);
            }
        `,
        uniforms: {
            vignetteStrength: () => Math.sin(Date.now() / 1000) * 0.5 + 1.5,
        },
    },
});

// Chromatic aberration post effect using preset
export const ChromaticAberration = story({
    src: Pigeon,
    preset: "sinewave",
    overflow: 50,
    defaultTime: 2.5,
    postEffect: {
        shader: "chromatic",
        uniforms: {
            aberrationStrength: 0.01,
        },
    },
});

// Vignette post effect using preset
export const VignetteEffect = story({
    src: Pigeon,
    preset: "uvGradient",
    postEffect: {
        shader: "vignette",
        uniforms: {
            intensity: 2.0,
            radius: 0.3,
        },
    },
});

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
                shader: `
                    precision highp float;
                    uniform sampler2D src;
                    uniform vec2 resolution;
                    uniform vec2 offset;
                    uniform float time;
                    out vec4 outColor;

                    void main() {
                        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                        outColor = texture(src, uv);
                        outColor.rgb = 1. - outColor.rgb;
                    }
                `,
                uniforms,
            },
        });

        // Add different shader effects to each element
        vfx.add(img1, { shader: "rgbShift", uniforms });
        vfx.add(img2, { shader: "sinewave", uniforms });
        vfx.add(img3, { shader: "uvGradient", uniforms });

        return container;
    },
};
