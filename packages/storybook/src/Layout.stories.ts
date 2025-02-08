import { VFX, type VFXProps, type shaders } from "@vfx-js/core";
import type { Meta, StoryObj } from "@storybook/html";

import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

const shader = `
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);

    // Show the UV coordinate
    outColor += vec4(fract(uv), 0, 0.25);

    // Show the center
    vec2 p = uv * 2. - 1.;
    p.x *= resolution.x / resolution.y;
    outColor += (fract(length(p)) * .5 + .5) * 0.25;
}
`;

interface LayoutProps {
    src?: string;
    overflow?: number;
    uniforms?: VFXProps["uniforms"];

    preset: keyof typeof shaders;
    defaultTime?: number;
}

export default {
    title: "Layout",
    parameters: {
        layout: "fullscreen",
    },
} satisfies Meta<LayoutProps>;

export const fullscreen: StoryObj<{ padding: number }> = {
    render: ({ padding }) => {
        const img = document.createElement("img");
        img.src = Logo;

        const wrapper = document.createElement("div");
        wrapper.style.padding = `${padding}px`;
        wrapper.appendChild(img);

        const vfx = new VFX();
        vfx.add(img, {
            shader,
            overflow: true,
        });

        return wrapper;
    },
    args: {
        padding: 100,
    },
};

export const overflowSingle: StoryObj<{ overflow: number }> = {
    render: ({ overflow }) => {
        const img = document.createElement("img");
        img.src = Logo;

        const wrapper = document.createElement("div");
        wrapper.style.padding = `${overflow * 2}px`;
        wrapper.appendChild(img);

        const vfx = new VFX();
        vfx.add(img, {
            shader,
            overflow,
        });

        return wrapper;
    },
    args: {
        overflow: 100,
    },
};

export const overflowArray: StoryObj<{
    overflow: [number, number, number, number];
}> = {
    render: ({ overflow }) => {
        const img = document.createElement("img");
        img.src = Logo;

        const [o1, o2, o3, o4] = overflow;
        const wrapper = document.createElement("div");
        wrapper.style.padding = `${o1}px ${o2}px ${o3}px ${o4}px`;
        wrapper.appendChild(img);

        const vfx = new VFX();
        vfx.add(img, {
            shader,
            overflow,
        });

        return wrapper;
    },
    args: {
        overflow: [50, 100, 150, 200],
    },
};

export const pixelRatio: StoryObj<{ pixelRatio: number }> = {
    render: ({ pixelRatio }) => {
        const img = document.createElement("img");
        img.src = Logo;

        const vfx = new VFX({ pixelRatio });
        vfx.add(img, { shader });

        return img;
    },
    args: {
        pixelRatio: 0.1,
    },
};

type ZIndexProps = {
    zIndex: number;
    fgZIndex: number;
};

const zIndexBase = ({ zIndex, fgZIndex }: ZIndexProps) => {
    const img = document.createElement("img");
    img.src = Logo;

    const wrapper = document.createElement("div");
    wrapper.className = "wrapper";
    wrapper.appendChild(img);

    const z0 = document.createElement("div");
    z0.className = "fg";
    z0.innerText = "Hello";
    z0.style.zIndex = fgZIndex.toString();
    wrapper.appendChild(z0);

    const vfx = new VFX({ zIndex });
    vfx.add(img, { shader });

    return wrapper;
};

export const zIndex: StoryObj<ZIndexProps> = {
    render: zIndexBase,
    args: {
        zIndex: 0,
        fgZIndex: 1,
    },
};

export const zIndexNegative: StoryObj<{ zIndex: number; fgZIndex: number }> = {
    render: zIndexBase,
    args: {
        zIndex: -1,
        fgZIndex: 0,
    },
};

type ElementZIndexProps = {
    zIndex: [number, number, number];
};

const elementZIndexBase = ({ zIndex }: ElementZIndexProps) => {
    const shader = `
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
uniform vec3 bg;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);
    outColor += vec4(bg, 0.5);
}
    `;

    const bg = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ] as [number, number, number][];

    const wrapper = document.createElement("div");
    wrapper.className = "elementZIndexWrapper";

    const vfx = new VFX();

    for (let i = 0; i < 3; i++) {
        const img = document.createElement("img");
        img.src = Logo;
        wrapper.appendChild(img);

        vfx.add(img, { shader, zIndex: zIndex[i], uniforms: { bg: bg[i] } });
    }

    return wrapper;
};

export const elementZIndexDefault: StoryObj<ElementZIndexProps> = {
    render: elementZIndexBase,
    args: {
        zIndex: [0, 0, 0] as const,
    },
};

export const elementZIndexDefault132: StoryObj<ElementZIndexProps> = {
    render: elementZIndexBase,
    args: {
        zIndex: [1, 3, 2] as const,
    },
};

export const elementZIndexDefault321: StoryObj<ElementZIndexProps> = {
    render: elementZIndexBase,
    args: {
        zIndex: [3, 2, 1] as const,
    },
};

// TODO: overlay

// TODO: wrap
