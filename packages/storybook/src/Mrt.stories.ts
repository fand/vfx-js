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
const SIZE = 64;
const DT = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;
const CHROMATIC_STEPS = 180;

// Shared by the simulation and the points draw.
const COMMON = `
const float SIZE = ${SIZE.toFixed(1)};

// A fixed lattice on a sphere, one point per texel.
vec3 startPosition(vec2 uv) {
    float theta = uv.x * 6.2831853;
    float phi = uv.y * 3.1415927;
    return 0.8 * vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
}

// Lifetimes from 180 to 324 steps, staggered by particle index.
// Age counts whole steps, which stay exact in half-float targets too.
float lifetime(vec2 uv) {
    vec2 cell = floor(uv * SIZE);
    return 180.0 + mod(cell.y * SIZE + cell.x, 7.0) * 24.0;
}
`;

// pos = xyz + age in steps, vel = xyz.
const SIMULATE_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D pos;
uniform sampler2D vel;
uniform float frame;
layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;
${COMMON}
const float DT = ${DT.toFixed(8)};

vec3 force(vec3 p, float t) {
    vec3 swirl = vec3(sin(p.y * 3.0 + t * 0.5), sin(p.z * 3.0 + t * 0.7), sin(p.x * 3.0 + t * 0.3));
    vec3 spin = cross(vec3(0.0, 1.0, 0.0), p);
    return swirl * 0.8 + spin * 0.6 - p * 0.3;
}

void main() {
    vec4 state = texture(pos, uv);
    float age = state.w + 1.0;
    if (frame == 0.0 || age > lifetime(uv)) {
        outPos = vec4(startPosition(uv), 0.0);
        outVel = vec4(0.0);
        return;
    }
    // One force evaluation updates both outputs; MRT writes them in one pass.
    vec3 v = (texture(vel, uv).xyz + force(state.xyz, frame * DT) * DT) * 0.99;
    outPos = vec4(state.xyz + v * DT, age);
    outVel = vec4(v, 0.0);
}
`;

const POINTS_VERT = `#version 300 es
in vec2 particle;
uniform sampler2D pos;
uniform float aspect;
uniform float pixelRatio;
out float vFade;
${COMMON}

void main() {
    vec4 state = texture(pos, particle);
    // Fixed camera at z = 3, looking at the origin.
    vec3 view = state.xyz - vec3(0.0, 0.0, 3.0);
    float focal = 2.0;
    gl_Position = vec4(view.x * focal / aspect, view.y * focal, 0.0, -view.z);
    gl_PointSize = 4.0 * pixelRatio / -view.z;
    vFade = sin(3.1415927 * clamp(state.w / lifetime(particle), 0.0, 1.0));
}
`;

const POINTS_FRAG = `#version 300 es
precision highp float;
in float vFade;
out vec4 outColor;

void main() {
    outColor = vec4(0.3, 0.6, 1.0, 1.0) * 0.5 * vFade;
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
    #frame = 0;
    #pendingTime = 0;

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

    // Whole fixed steps, so the motion is the same at any frame rate.
    #stepCount(deltaTime: number): number {
        if (isChromatic()) {
            return this.#frame === 0 ? CHROMATIC_STEPS : 0;
        }
        this.#pendingTime += deltaTime;
        const steps = Math.floor(this.#pendingTime / DT);
        this.#pendingTime -= steps * DT;
        const capped = Math.min(steps, MAX_STEPS_PER_FRAME);
        // The first frame steps once to place the particles.
        return this.#frame === 0 ? Math.max(capped, 1) : capped;
    }

    render(ctx: EffectContext): void {
        const pos = this.#pos;
        const vel = this.#vel;
        if (!pos || !vel) {
            return;
        }
        const steps = this.#stepCount(ctx.deltaTime);
        for (let i = 0; i < steps; i++) {
            ctx.draw({
                frag: SIMULATE_FRAG,
                uniforms: { pos, vel, frame: this.#frame },
                target: [pos, vel],
            });
            this.#frame++;
        }

        const [width, height] = ctx.dims.elementPixel;
        ctx.blit(ctx.src);
        ctx.draw({
            vert: POINTS_VERT,
            frag: POINTS_FRAG,
            geometry: this.#points,
            uniforms: {
                pos,
                aspect: width / height,
                pixelRatio: ctx.pixelRatio,
            },
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
