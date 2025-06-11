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

// Simple invert post effect
export const InvertColors = story({
    src: Pigeon,
    preset: "rgbShift",
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 color = texture(src, uv);
                outColor = vec4(1.0 - color.rgb, color.a);
            }
        `,
    },
});

// Grayscale post effect
export const Grayscale = story({
    src: Pigeon,
    preset: "sinewave",
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 color = texture(src, uv);
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                outColor = vec4(vec3(gray), color.a);
            }
        `,
    },
});

// Sepia post effect with custom uniform
export const Sepia = story({
    src: Pigeon,
    preset: "sinewave",
    defaultTime: 1.0,
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float intensity;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 color = texture(src, uv);

                vec3 sepia = vec3(
                    dot(color.rgb, vec3(0.393, 0.769, 0.189)),
                    dot(color.rgb, vec3(0.349, 0.686, 0.168)),
                    dot(color.rgb, vec3(0.272, 0.534, 0.131))
                );

                outColor = vec4(mix(color.rgb, sepia, intensity), color.a);
            }
        `,
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

// Chromatic aberration post effect
export const ChromaticAberration = story({
    src: Pigeon,
    preset: "sinewave",
    overflow: 50,
    defaultTime: 2.5,
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float aberrationStrength;
            out vec4 outColor;

            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec2 center = vec2(0.5);
                vec2 direction = normalize(uv - center);
                float distance = length(uv - center);

                vec2 offsetR = direction * distance * aberrationStrength;
                vec2 offsetB = direction * distance * aberrationStrength * -1.0;

                float r = texture(src, uv + offsetR).r;
                float g = texture(src, uv).g;
                float b = texture(src, uv + offsetB).b;
                float a = texture(src, uv).a;

                outColor = vec4(r, g, b, a);
            }
        `,
        uniforms: {
            aberrationStrength: 0.01,
        },
        backbuffer: true,
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
