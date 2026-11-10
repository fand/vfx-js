import type { VFXProps } from "@vfx-js/core";
import { BloomEffect, PixelateEffect } from "@vfx-js/effects";
import { url } from "../site";

// The "Write a line. See it run." demos on the top page.
// Each code string shows exactly what its props run.

export const waveShader = `
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x += sin(uv.y * 24.0 + time * 3.0) * 0.01;
    vec4 color = texture(src, uv);

    // Map brightness to two colors.
    float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 duo = mix(vec3(0.15, 0.0, 0.35), vec3(1.0, 0.55, 0.95), l);
    outColor = vec4(duo, color.a);
}
`;

export type RunDemo = {
    id: string;
    step: string;
    title: string;
    caption: string;
    media: { src: string; width: number; height: number };
    code: string;
    props: () => VFXProps;
};

export const runDemos: RunDemo[] = [
    {
        id: "RunPreset",
        step: "01 — One line",
        title: "Pick a preset",
        caption: "glitch",
        media: {
            src: url("vfx-js-logo-no-padding.svg"),
            width: 960,
            height: 361,
        },
        code: `vfx.add(logo, { shader: "glitch", overflow: 60 });`,
        props: () => ({ shader: "glitch", overflow: 60 }),
    },
    {
        id: "RunEffects",
        step: "02 — Effects",
        title: "Chain prebuilt effects",
        caption: "Pixelate → Bloom",
        media: { src: url("images/jellyfish.webp"), width: 640, height: 360 },
        code: `
import { BloomEffect, PixelateEffect } from "@vfx-js/effects";

vfx.add(img, {
    effect: [
        new PixelateEffect({ size: 6 }),
        new BloomEffect({ threshold: 0.2, intensity: 4 }),
    ],
});`,
        props: () => ({
            effect: [
                new PixelateEffect({ size: 6 }),
                new BloomEffect({ threshold: 0.2, intensity: 4 }),
            ],
        }),
    },
    {
        id: "RunShader",
        step: "03 — Your shader",
        title: "Write GLSL",
        caption: "custom shader",
        media: { src: url("images/pigeon.webp"), width: 1200, height: 800 },
        code: `const shader = \`${waveShader}\`;

vfx.add(img, { shader });`,
        props: () => ({ shader: waveShader }),
    },
];
