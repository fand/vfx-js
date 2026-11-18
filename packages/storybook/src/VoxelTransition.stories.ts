import type { Meta, StoryObj } from "@storybook/html-vite";
import type {
    EffectContext,
    EffectDims,
    EffectGeometry,
    EffectRenderTarget,
    Transition,
    TransitionEffectContext,
} from "@vfx-js/core";
import Jellyfish from "./assets/jellyfish.webp";
import Pigeon from "./assets/pigeon.webp";
import { initVFX } from "./utils";

const CAMERA = 2.5;
const NEAR = 0.05;
const FAR = 12;
const MIN_LENGTH = 0.03;
const MAX_LENGTH = 0.5;
const RISE = 0.35;
const SPREAD = 1.6;
const BACKDROP_DEPTH = 1.5;
// Far enough that the slowest voxel passes the camera.
const TRAVEL = (CAMERA + 2 * MAX_LENGTH + RISE + 0.3) / 0.8;

const f = (n: number) => n.toFixed(3);

// Reads the side that turns into voxels, and the side behind them.
const READ = `
uniform sampler2D from;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float reverse;

vec4 readSrc(vec2 p) {
    return textureLod(src, srcRectUv.xy + p * srcRectUv.zw, 0.0);
}
vec4 readVoxel(vec2 p) {
    return reverse > 0.5 ? readSrc(p) : textureLod(from, p, 0.0);
}
vec4 readBackdrop(vec2 p) {
    return reverse > 0.5 ? textureLod(from, p, 0.0) : readSrc(p);
}
`;

const VOXEL_VERT = `#version 300 es
precision highp float;
in vec3 position;
in vec3 normal;
in vec2 cell;
uniform vec4 contentRectUv;
uniform float t;
uniform vec2 grid;
uniform float aspect;
uniform float heightMode;
uniform float tumble;
out vec2 vUv;
out vec3 vNormal;
${READ}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}
mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}
mat3 rotateZ(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
}

void main() {
    vec2 cellUv = (cell + 0.5) / grid;
    vec4 color = readVoxel(cellUv);
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float height = mix(luminance, hash(cell), heightMode);

    // Tall voxels are also long, so neighbors cross when they tumble.
    vec3 halfSize = vec3(vec2(aspect, 1.0) / grid, mix(${f(MIN_LENGTH)}, ${f(MAX_LENGTH)}, height));
    vec2 center = (cellUv * 2.0 - 1.0) * vec2(aspect, 1.0);

    // Voxels leave from the center outwards.
    float delay = length(center) / length(vec2(aspect, 1.0));
    float progress = clamp(t * ${f(1 + SPREAD)} - delay * ${f(SPREAD)}, 0.0, 1.0);
    float fly = progress * progress * progress;
    float rise = height * ${f(RISE)} * smoothstep(0.0, 0.15, t);
    float travel = fly * ${f(TRAVEL)} * (0.8 + 0.5 * height);

    float spin = fly * tumble;
    float a = hash(cell + 7.0) - 0.5;
    float b = hash(cell + 13.0) - 0.5;
    mat3 rotation = rotateZ(spin * a * 3.0) * rotateX(spin * b * 2.0) * rotateY(spin * (a + b) * 1.5);

    // The front face sits on the screen plane until the voxel moves.
    // Voxels also drift away from the center, so the hole stays open.
    vec3 world = vec3(center * (1.0 + fly * 1.5), rise + travel - halfSize.z) + rotation * (position * halfSize);
    vNormal = rotation * normal;

    // The front face shows the picture; the sides take the cell color.
    vUv = normal.z > 0.5 ? cellUv + position.xy * 0.5 / grid : cellUv;

    // Perspective camera on the element's center, mapped into the output buffer.
    float distance = ${f(CAMERA)} - world.z;
    vec2 scale = contentRectUv.zw;
    vec2 offset = 2.0 * contentRectUv.xy + contentRectUv.zw - 1.0;
    vec2 clip = world.xy / vec2(aspect, 1.0) * ${f(CAMERA)};
    gl_Position = vec4(
        clip * scale + offset * distance,
        distance * ${f((FAR + NEAR) / (FAR - NEAR))} - ${f((2 * FAR * NEAR) / (FAR - NEAR))},
        distance
    );
}
`;

const VOXEL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vNormal;
out vec4 outColor;
${READ}

void main() {
    vec4 color = readVoxel(vUv);
    if (color.a < 0.01) {
        discard;
    }
    // A face that looks at the camera keeps its color, so the first frame matches the page.
    vec3 light = normalize(vec3(0.35, 0.5, 1.0));
    float facing = clamp(dot(normalize(vNormal), light) / light.z, 0.0, 1.0);
    outColor = vec4(color.rgb * (0.35 + 0.65 * facing), color.a);
}
`;

const BACKDROP_FRAG = `#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform float scale;
uniform float brightness;
${READ}

void main() {
    vec2 p = (uvContent - 0.5) / scale + 0.5;
    if (any(lessThan(p, vec2(0.0))) || any(greaterThan(p, vec2(1.0)))) {
        outColor = vec4(0.0);
        return;
    }
    vec4 color = readBackdrop(p);
    outColor = vec4(color.rgb * brightness, color.a);
}
`;

const COPY_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D scene;

void main() {
    outColor = texture(scene, uv);
}
`;

const DEPTH_VIEW_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D depthTexture;

void main() {
    float depth = texture(depthTexture, uv).r;
    if (depth >= 1.0) {
        outColor = vec4(0.0);
        return;
    }
    // Distance from the camera; near is white.
    float distance = ${f(2 * NEAR * FAR)} / (${f(FAR + NEAR)} - (2.0 * depth - 1.0) * ${f(FAR - NEAR)});
    outColor = vec4(vec3(1.0 - sqrt(clamp(distance / ${f(CAMERA + 1)}, 0.0, 1.0))), 1.0);
}
`;

function makeCube(): { position: Float32Array; normal: Float32Array } {
    // Each face is [normal, u, v] with u x v = normal, so triangles wind CCW from outside.
    const faces = [
        [1, 0, 0, 0, 1, 0, 0, 0, 1],
        [-1, 0, 0, 0, 0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, -1, 0, 1, 0, 0, 0, 0, 1],
        [0, 0, 1, 1, 0, 0, 0, 1, 0],
        [0, 0, -1, 0, 1, 0, 1, 0, 0],
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
    for (const face of faces) {
        for (const [a, b] of corners) {
            for (let i = 0; i < 3; i++) {
                position.push(face[i] + a * face[3 + i] + b * face[6 + i]);
                normal.push(face[i]);
            }
        }
    }
    return {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
    };
}

function makeVoxels(columns: number, rows: number): EffectGeometry {
    const cube = makeCube();
    const cell = new Float32Array(columns * rows * 2);
    for (let i = 0; i < columns * rows; i++) {
        cell[i * 2] = i % columns;
        cell[i * 2 + 1] = Math.floor(i / columns);
    }
    return {
        attributes: {
            position: { data: cube.position, itemSize: 3 },
            normal: { data: cube.normal, itemSize: 3 },
            cell: { data: cell, itemSize: 2, perInstance: true },
        },
        instanceCount: columns * rows,
    };
}

type VoxelParams = {
    columns: number;
    height: "color" | "noise";
    tumble: number;
    depth: boolean;
    samples: 1 | 4;
    view: "color" | "depth";
};

/**
 * The old content turns into voxels that fly past the camera, center first.
 * The new content waits behind them.
 */
class VoxelFlyThrough implements Transition {
    readonly name = "voxel_fly_through";
    ease = "linear" as const;
    #params: VoxelParams;
    #scene: EffectRenderTarget | null = null;
    #voxels: EffectGeometry | null = null;
    #rows = 0;

    constructor(params?: VoxelParams) {
        this.#params = params ?? {
            columns: 48,
            height: "color",
            tumble: 0.6,
            depth: true,
            samples: 4,
            view: "color",
        };
    }

    init(ctx: EffectContext): void {
        this.#scene = ctx.createRenderTarget({
            depth: this.#params.depth,
            samples: this.#params.samples,
        });
    }

    // Voxels fly out of the element, so draw on the whole canvas.
    outputRect(dims: EffectDims) {
        return dims.canvasRect;
    }

    render(ctx: TransitionEffectContext): void {
        const scene = this.#scene;
        if (ctx.holding || !scene) {
            ctx.blit(ctx.src);
            return;
        }
        const { columns, height, tumble, depth, view } = this.#params;
        const [width, heightPixel] = ctx.dims.elementPixel;
        const aspect = width / heightPixel;
        const rows = Math.max(1, Math.round(columns / aspect));
        if (!this.#voxels || rows !== this.#rows) {
            this.#voxels = makeVoxels(columns, rows);
            this.#rows = rows;
        }

        const t = ctx.reverse ? 1 - ctx.progress.t : ctx.progress.t;
        const sides = {
            from: ctx.from,
            src: ctx.src,
            reverse: ctx.reverse ? 1 : 0,
        };

        // The backdrop comes forward from behind the screen plane.
        const arrival = smoothstep(0, 0.8, t);
        ctx.clear(scene);
        ctx.draw({
            frag: BACKDROP_FRAG,
            uniforms: {
                ...sides,
                scale: CAMERA / (CAMERA + BACKDROP_DEPTH * (1 - arrival)),
                brightness: 0.3 + 0.7 * arrival,
            },
            target: scene,
        });
        ctx.draw({
            vert: VOXEL_VERT,
            frag: VOXEL_FRAG,
            geometry: this.#voxels,
            uniforms: {
                ...sides,
                t,
                grid: [columns, rows],
                aspect,
                heightMode: height === "noise" ? 1 : 0,
                tumble,
            },
            target: scene,
            depthTest: depth,
            cull: "back",
        });

        if (view === "depth" && scene.depthTexture) {
            ctx.draw({
                frag: DEPTH_VIEW_FRAG,
                uniforms: { depthTexture: scene.depthTexture },
            });
            return;
        }
        ctx.draw({ frag: COPY_FRAG, uniforms: { scene } });
    }

    dispose(): void {
        this.#scene?.dispose();
        this.#scene = null;
    }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const k = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return k * k * (3 - 2 * k);
}

const PAGE_STYLE =
    "position:absolute; inset:0; margin:0; display:flex; flex-direction:column; justify-content:flex-end; padding:32px; box-sizing:border-box; color:white; font-family:sans-serif";

const PAGES = [
    `<section style="${PAGE_STYLE}; background:url(${Jellyfish}) center/cover">
        <h2 style="margin:0; font-size:48px">Jellyfish</h2>
    </section>`,
    `<section style="${PAGE_STYLE}; background:linear-gradient(135deg, #ff4f6d, #ffb347 50%, #3fb6ff)">
        <h2 style="margin:0 0 16px; font-size:48px; color:#111">Gradient</h2>
        <ul style="display:flex; gap:16px; margin:0; padding:0; list-style:none">
            <li style="flex:1; height:80px; border-radius:12px; background:#111"></li>
            <li style="flex:1; height:80px; border-radius:12px; background:#fff"></li>
            <li style="flex:1; height:80px; border-radius:12px; background:#7bdc6b"></li>
        </ul>
    </section>`,
    `<section style="${PAGE_STYLE}; background:url(${Pigeon}) center/cover">
        <h2 style="margin:0; font-size:48px">Pigeon</h2>
    </section>`,
];

type Args = VoxelParams & { duration: number; reverse: boolean };

export default {
    title: "Transition/Voxel",
    parameters: { layout: "fullscreen", chromatic: { disableSnapshot: true } },
} satisfies Meta<Args>;

export const FlyThrough: StoryObj<Args> = {
    args: {
        columns: 48,
        height: "color",
        tumble: 0.6,
        depth: true,
        samples: 4,
        view: "color",
        duration: 3,
        reverse: false,
    },
    argTypes: {
        columns: { control: { type: "range", min: 8, max: 120, step: 4 } },
        height: { control: "inline-radio", options: ["color", "noise"] },
        tumble: { control: { type: "range", min: 0, max: 2, step: 0.1 } },
        depth: { control: "boolean" },
        samples: { control: "inline-radio", options: [1, 4] },
        view: { control: "inline-radio", options: ["color", "depth"] },
        duration: { control: { type: "range", min: 0.5, max: 8, step: 0.5 } },
    },
    render: ({ duration, reverse, ...params }) => {
        const root = document.createElement("div");
        root.style.cssText =
            "min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; background:#111";

        const next = document.createElement("button");
        next.textContent = "Next";
        next.style.cssText = "font-size:1rem";

        const container = document.createElement("div");
        container.style.cssText =
            "position:relative; width:720px; height:405px; overflow:hidden; border-radius:16px; background:#222";
        // The pages set `display`, which would beat the `hidden` attribute.
        container.innerHTML = `<style>section[hidden] { display: none !important; }</style>${PAGES.join("")}`;
        const pages = [...container.querySelectorAll("section")];
        for (const [i, page] of pages.entries()) {
            page.hidden = i > 0;
        }
        root.append(next, container);

        const vfx = initVFX();
        const transition = vfx.addTransition(container, {
            transition: VoxelFlyThrough,
            params,
            duration,
            reverse,
        });
        let index = 0;
        next.addEventListener("click", () => {
            index = (index + 1) % PAGES.length;
            void transition.show(pages[index]);
        });
        return root;
    },
};
