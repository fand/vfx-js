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

// The state textures are SIZE x SIZE, one texel per particle.
const SIZE = 128;

// Writes position to location 0 and velocity to location 1.
const SIMULATE_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D pos;
uniform sampler2D vel;
uniform float time;
uniform bool reset;
layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;

vec2 hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.xx + q.yz) * q.zy);
}

void main() {
    if (reset) {
        outPos = vec4(hash(uv * 512.0) * 2.0 - 1.0, 0.0, 1.0);
        outVel = vec4(0.0);
        return;
    }
    vec2 p = texture(pos, uv).xy;
    vec2 v = texture(vel, uv).xy;

    // Pull toward a moving point, and swirl around it.
    vec2 center = 0.5 * vec2(cos(time * 0.7), sin(time * 1.1));
    vec2 d = center - p;
    vec2 force = d * 2.0 + vec2(-d.y, d.x) * 1.5;
    v = (v + force * 0.016) * 0.985;
    p += v * 0.016;

    outPos = vec4(p, 0.0, 1.0);
    outVel = vec4(v, 0.0, 1.0);
}
`;

const POINTS_VERT = `#version 300 es
in vec2 particle;
uniform sampler2D pos;
uniform sampler2D vel;
out float vSpeed;

void main() {
    vec2 p = texture(pos, particle).xy;
    vSpeed = length(texture(vel, particle).xy);
    gl_Position = vec4(p, 0.0, 1.0);
    gl_PointSize = 2.0;
}
`;

const POINTS_FRAG = `#version 300 es
precision highp float;
in float vSpeed;
out vec4 outColor;

void main() {
    vec3 color = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.6, 0.3), clamp(vSpeed, 0.0, 1.0));
    outColor = vec4(color * 0.6, 0.6);
}
`;

function makePoints(): EffectGeometry {
    const particle = new Float32Array(SIZE * SIZE * 2);
    for (let i = 0; i < SIZE * SIZE; i++) {
        particle[i * 2] = ((i % SIZE) + 0.5) / SIZE;
        particle[i * 2 + 1] = (Math.floor(i / SIZE) + 0.5) / SIZE;
    }
    return {
        mode: "points",
        attributes: { particle: { data: particle, itemSize: 2 } },
        drawRange: { count: SIZE * SIZE },
    };
}

class ParticlesEffect implements Effect {
    #points = makePoints();
    #pos: EffectRenderTarget | null = null;
    #vel: EffectRenderTarget | null = null;
    #reset = true;

    init(ctx: EffectContext): void {
        const opts = {
            size: [SIZE, SIZE] as const,
            float: true,
            persistent: true,
            filter: "nearest" as const,
        };
        this.#pos = ctx.createRenderTarget(opts);
        this.#vel = ctx.createRenderTarget(opts);
    }

    render(ctx: EffectContext): void {
        const pos = this.#pos;
        const vel = this.#vel;
        if (!pos || !vel) {
            return;
        }
        ctx.draw({
            frag: SIMULATE_FRAG,
            uniforms: {
                pos,
                vel,
                time: isChromatic() ? 2 : ctx.time,
                reset: this.#reset,
            },
            target: [pos, vel],
        });
        this.#reset = false;

        ctx.blit(ctx.src);
        ctx.draw({
            vert: POINTS_VERT,
            frag: POINTS_FRAG,
            geometry: this.#points,
            uniforms: { pos, vel },
            target: ctx.target,
            blend: "additive",
        });
    }

    dispose(): void {
        this.#pos = null;
        this.#vel = null;
    }
}

export default {
    title: "MRT",
    parameters: { layout: "fullscreen" },
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        img.style.display = "block";
        img.style.margin = "40px auto";

        const vfx = initVFX();
        img.onload = () => {
            vfx.add(img, { effect: new ParticlesEffect() });
        };
        return img;
    },
} satisfies Meta;

export const particles: StoryObj = {};
