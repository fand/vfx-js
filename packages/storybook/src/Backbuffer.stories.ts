import type { VFXProps, shaders } from "@vfx-js/core";
import type { Meta, StoryObj } from "@storybook/html";

import { initVFX } from "./utils";
import Logo from "./assets/logo-640w-20p.svg";
import "./preset.css";

interface LayoutProps {
    src?: string;
    overflow?: number;
    uniforms?: VFXProps["uniforms"];

    preset: keyof typeof shaders;
    defaultTime?: number;
}

export default {
    title: "Backbuffer",
    parameters: {
        layout: "fullscreen",
    },
} satisfies Meta<LayoutProps>;

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

const backbufferShader = `
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform sampler2D backbuffer;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 p = uv * 2. - 1.;
    p.x *= resolution.x / resolution.y;

    p.x -= (time / 30. * 2.) - 1.;

    outColor = vec4(step(length(p), .3));
    outColor += texture(backbuffer, uv) * vec4(.9, .95, 1, .995);
}
`;

const shaderFullscreen = `
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
uniform vec4 viewport;
uniform int id;
out vec4 outColor;

void main() {
    if (int(gl_FragCoord.x / 100.) % 2 == id)  {
        discard;
    }

    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    outColor = texture(src, uv);

    // Show the UV coordinate
    outColor += vec4(gl_FragCoord.xy / viewport.zw, 1, 0.5);

    vec2 p = gl_FragCoord.xy / viewport.zw * 2. - 1.;
    p.x *= viewport.z / viewport.w;
    outColor += smoothstep(.1, .0, abs(sin(length(p) * 30.))) * 0.1;
}
`;

export const backbuffer: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        return img;
    },
    args: undefined,
};
backbuffer.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    let time = 0;

    const vfx = initVFX({ autoplay: false });
    await vfx.add(img, {
        shader: backbufferShader,
        backbuffer: true,
        uniforms: { time: () => time },
    });

    while (time < 30) {
        time++;
        vfx.render();
    }
};

export const backbufferCompatibility: StoryObj<undefined> = {
    render: () => {
        const wrapper = document.createElement("div");
        wrapper.className = "backbufferWrapper";

        const img1 = document.createElement("img");
        img1.id = "img1";
        img1.src = Logo;
        wrapper.appendChild(img1);

        const img2 = document.createElement("img");
        img2.id = "img2";
        img2.src = Logo;
        wrapper.appendChild(img2);

        return wrapper;
    },
    args: undefined,
};
backbufferCompatibility.play = async ({ canvasElement }) => {
    const img1 = canvasElement.querySelector("#img1") as HTMLImageElement;
    const img2 = canvasElement.querySelector("#img2") as HTMLImageElement;
    await Promise.all([
        new Promise((o) => {
            img1.onload = o;
        }),
        new Promise((o) => {
            img2.onload = o;
        }),
    ]);

    const vfx = initVFX({ autoplay: false });
    await vfx.add(img1, { shader, backbuffer: false });
    await vfx.add(img2, { shader, backbuffer: true });

    vfx.render();
};

export const backbufferCompatibilityOverflow: StoryObj<undefined> = {
    render: () => {
        const wrapper = document.createElement("div");
        wrapper.className = "backbufferWrapper";

        const img1 = document.createElement("img");
        img1.id = "img1";
        img1.src = Logo;
        wrapper.appendChild(img1);

        const img2 = document.createElement("img");
        img2.id = "img2";
        img2.src = Logo;
        wrapper.appendChild(img2);

        return wrapper;
    },
    args: undefined,
};
backbufferCompatibilityOverflow.play = async ({ canvasElement }) => {
    const img1 = canvasElement.querySelector("#img1") as HTMLImageElement;
    const img2 = canvasElement.querySelector("#img2") as HTMLImageElement;
    await Promise.all([
        new Promise((o) => {
            img1.onload = o;
        }),
        new Promise((o) => {
            img2.onload = o;
        }),
    ]);

    const vfx = initVFX({ autoplay: false });
    await vfx.add(img1, { shader, backbuffer: false, overflow: 30 });
    await vfx.add(img2, { shader, backbuffer: true, overflow: 30 });

    vfx.render();
};

export const backbufferCompatibilityFullscreen: StoryObj<undefined> = {
    render: () => {
        const wrapper = document.createElement("div");
        wrapper.className = "backbufferWrapper";

        const img1 = document.createElement("img");
        img1.id = "img1";
        img1.src = Logo;
        wrapper.appendChild(img1);

        const img2 = document.createElement("img");
        img2.id = "img2";
        img2.src = Logo;
        wrapper.appendChild(img2);

        return wrapper;
    },
    args: undefined,
};
backbufferCompatibilityFullscreen.play = async ({ canvasElement }) => {
    const img1 = canvasElement.querySelector("#img1") as HTMLImageElement;
    const img2 = canvasElement.querySelector("#img2") as HTMLImageElement;
    await Promise.all([
        new Promise((o) => {
            img1.onload = o;
        }),
        new Promise((o) => {
            img2.onload = o;
        }),
    ]);

    const vfx = initVFX({ autoplay: false });
    await vfx.add(img1, {
        shader: shaderFullscreen,
        backbuffer: false,
        overflow: true,
        uniforms: { id: 0 },
    });
    await vfx.add(img2, {
        shader: shaderFullscreen,
        backbuffer: true,
        overflow: true,
        uniforms: { id: 1 },
    });

    vfx.render();
};
