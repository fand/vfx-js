import type { Meta, StoryObj } from "@storybook/html-vite";
import type {
    Effect,
    EffectContext,
    EffectGeometry,
    EffectRenderTarget,
} from "@vfx-js/core";
import Jellyfish from "./assets/jellyfish.webp";
import "./preset.css";
import { initVFX, isChromatic } from "./utils";

const NEAR = 1;
const FAR = 7;
const BAR_COUNT = 12;

const BARS_VERT = `#version 300 es
in vec3 position;
in vec3 normal;
in vec4 instance;
uniform float time;
uniform float aspect;
out vec3 vNormal;
out float vHue;

mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}
mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

void main() {
    // Each bar spins around the center, so the bars cross each other.
    mat3 local = rotateY(instance.x) * rotateX(0.6 * sin(time + instance.x));
    mat3 world = rotateX(1.0) * rotateY(time * 0.4);
    vec3 p = world * (local * (position * vec3(0.12, 0.12, 1.5)) + vec3(0.0, instance.y, 0.0));
    vNormal = world * local * normal;
    vHue = instance.z;

    // Perspective camera at z = 4.
    float near = ${NEAR.toFixed(1)};
    float far = ${FAR.toFixed(1)};
    float z = p.z - 4.0;
    float focal = 2.0;
    gl_Position = vec4(
        p.x * focal / aspect,
        p.y * focal,
        z * (far + near) / (near - far) + 2.0 * far * near / (near - far),
        -z
    );
}
`;

const BARS_FRAG = `#version 300 es
precision highp float;
in vec3 vNormal;
in float vHue;
out vec4 outColor;

void main() {
    vec3 base = 0.5 + 0.5 * cos(6.2832 * (vHue + vec3(0.0, 0.33, 0.67)));
    float light = 0.3 + 0.7 * max(dot(normalize(vNormal), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
    outColor = vec4(base * light, 1.0);
}
`;

const DEPTH_VIEW_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D depthTexture;

void main() {
    float d = texture(depthTexture, uv).r;
    float near = ${NEAR.toFixed(1)};
    float far = ${FAR.toFixed(1)};
    // Linear distance from the camera, near is white.
    float linear = 2.0 * near * far / (far + near - (2.0 * d - 1.0) * (far - near));
    float gray = 1.0 - (linear - near) / (far - near);
    outColor = vec4(vec3(gray), 1.0);
}
`;

const FADE_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D previous;

void main() {
    outColor = texture(previous, uv) * 0.92;
}
`;

function makeCube(): { position: Float32Array; normal: Float32Array } {
    // Each face is [normal, u, v] with u x v = normal, so triangles wind CCW from outside.
    const faces: [number[], number[], number[]][] = [
        [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ],
        [
            [-1, 0, 0],
            [0, 0, 1],
            [0, 1, 0],
        ],
        [
            [0, 1, 0],
            [0, 0, 1],
            [1, 0, 0],
        ],
        [
            [0, -1, 0],
            [1, 0, 0],
            [0, 0, 1],
        ],
        [
            [0, 0, 1],
            [1, 0, 0],
            [0, 1, 0],
        ],
        [
            [0, 0, -1],
            [0, 1, 0],
            [1, 0, 0],
        ],
    ];
    const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, -1],
        [1, 1],
        [-1, 1],
    ];
    const position: number[] = [];
    const normal: number[] = [];
    for (const [n, u, v] of faces) {
        for (const [a, b] of corners) {
            for (let i = 0; i < 3; i++) {
                position.push(n[i] + a * u[i] + b * v[i]);
                normal.push(n[i]);
            }
        }
    }
    return {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
    };
}

function makeBars(): EffectGeometry {
    const cube = makeCube();
    const instance = new Float32Array(BAR_COUNT * 4);
    for (let i = 0; i < BAR_COUNT; i++) {
        instance[i * 4] = (i / BAR_COUNT) * Math.PI;
        instance[i * 4 + 1] = ((i % 3) - 1) * 0.35;
        instance[i * 4 + 2] = i / BAR_COUNT;
    }
    return {
        attributes: {
            position: { data: cube.position, itemSize: 3 },
            normal: { data: cube.normal, itemSize: 3 },
            instance: { data: instance, itemSize: 4, perInstance: true },
        },
        instanceCount: BAR_COUNT,
    };
}

type Args = {
    depth: boolean;
    samples: 1 | 4;
    float: boolean;
    trail: boolean;
    view: "color" | "depth";
};

class DepthBarsEffect implements Effect {
    #args: Args;
    #bars = makeBars();
    #rt: EffectRenderTarget | null = null;

    constructor(args: Args) {
        this.#args = args;
    }

    init(ctx: EffectContext): void {
        this.#rt = ctx.createRenderTarget({
            depth: this.#args.depth,
            samples: this.#args.samples,
            float: this.#args.float,
            persistent: this.#args.trail,
        });
    }

    render(ctx: EffectContext): void {
        const rt = this.#rt;
        if (!rt) {
            return;
        }
        const { depth, trail, view } = this.#args;
        if (trail) {
            ctx.clear(rt, { color: false });
            ctx.draw({
                frag: FADE_FRAG,
                uniforms: { previous: rt },
                target: rt,
                swap: false,
            });
        } else {
            ctx.clear(rt);
        }
        ctx.draw({
            vert: BARS_VERT,
            frag: BARS_FRAG,
            geometry: this.#bars,
            uniforms: {
                time: isChromatic() ? 2 : ctx.time,
                aspect: rt.width / rt.height,
            },
            target: rt,
            depthTest: depth,
            cull: "back",
        });

        if (view === "depth" && rt.depthTexture) {
            ctx.draw({
                frag: DEPTH_VIEW_FRAG,
                uniforms: { depthTexture: rt.depthTexture },
                target: ctx.target,
            });
            return;
        }
        ctx.blit(ctx.src);
        ctx.blit(rt, null, { blend: "premultiplied" });
    }

    dispose(): void {
        this.#rt = null;
    }
}

export default {
    title: "Depth",
    parameters: { layout: "fullscreen" },
    render: (args) => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        img.style.display = "block";
        img.style.margin = "40px auto";

        const vfx = initVFX();
        img.onload = () => {
            vfx.add(img, { effect: new DepthBarsEffect(args) });
        };
        return img;
    },
    args: {
        depth: true,
        samples: 4,
        float: false,
        trail: false,
        view: "color",
    },
    argTypes: {
        depth: { control: "boolean" },
        samples: { control: "inline-radio", options: [1, 4] },
        float: { control: "boolean" },
        trail: { control: "boolean" },
        view: { control: "inline-radio", options: ["color", "depth"] },
    },
} satisfies Meta<Args>;

export const depthAndMsaa: StoryObj<Args> = {};

export const samples1: StoryObj<Args> = { args: { samples: 1 } };

export const depthView: StoryObj<Args> = { args: { view: "depth" } };
