import type { Meta, StoryObj } from "@storybook/html-vite";
import type { VFXPass } from "@vfx-js/core";
import Logo from "./assets/logo-640w-20p.svg";
import { initVFX } from "./utils";
import "./preset.css";

// Each story has GLSL and WGSL, so `backend` switches between the two.
type Args = { backend: "webgpu" | "webgl" };

export default {
    title: "WebGPU",
    parameters: { layout: "fullscreen" },
    args: { backend: "webgpu" },
    argTypes: {
        backend: { control: "inline-radio", options: ["webgpu", "webgl"] },
    },
} satisfies Meta<Args>;

type Story = StoryObj<Args>;

const GLSL_HEADER = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
out vec4 outColor;
`;

const WGSL_HEADER = `
struct Uniforms {
    resolution: vec2f,
    offset: vec2f,
    time: f32,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var srcSampler: sampler;
`;

const gradient: VFXPass = {
    frag: `${GLSL_HEADER}
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 img = texture(src, uv);
    outColor = vec4(uv, sin(time) * .5 + .5, 1) * img.a;
}`,
    wgsl: `${WGSL_HEADER}
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy - u.offset) / u.resolution;
    let img = textureSample(src, srcSampler, uv);
    return vec4f(uv, sin(u.time) * 0.5 + 0.5, 1.0) * img.a;
}`,
};

const rgbShift: VFXPass = {
    frag: `${GLSL_HEADER}
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 d = vec2(0.01 * sin(time * 2.), 0);
    vec4 r = texture(src, uv + d);
    vec4 g = texture(src, uv);
    vec4 b = texture(src, uv - d);
    outColor = vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.);
}`,
    wgsl: `${WGSL_HEADER}
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy - u.offset) / u.resolution;
    let d = vec2f(0.01 * sin(u.time * 2.0), 0.0);
    let r = textureSample(src, srcSampler, uv + d);
    let g = textureSample(src, srcSampler, uv);
    let b = textureSample(src, srcSampler, uv - d);
    return vec4f(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}`,
};

function addImage(): HTMLImageElement {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
}

export const ImageShader: Story = {
    render: ({ backend }) => {
        const img = addImage();
        initVFX({ backend }).add(img, { shader: [gradient] });
        return img;
    },
};

export const TextShader: Story = {
    render: ({ backend }) => {
        const text = document.createElement("h1");
        text.textContent = "WebGPU text";
        text.style.cssText =
            "color: #fff; font: bold 96px sans-serif; margin: 0;";
        const vfx = initVFX({ backend });
        // Capture the text after Storybook puts it on the page.
        setTimeout(() => vfx.add(text, { shader: [rgbShift] }));
        return text;
    },
};

export const Multipass: Story = {
    render: ({ backend }) => {
        const img = addImage();
        const wave: VFXPass = {
            target: "wave",
            frag: `${GLSL_HEADER}
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x += sin(uv.y * 20. + time * 3.) * 0.02;
    outColor = texture(src, uv);
}`,
            wgsl: `${WGSL_HEADER}
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    var uv = (pos.xy - u.offset) / u.resolution;
    uv.x += sin(uv.y * 20.0 + u.time * 3.0) * 0.02;
    return textureSample(src, srcSampler, uv);
}`,
        };
        // `src` is the previous pass's output.
        const glow: VFXPass = {
            frag: `${GLSL_HEADER}
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 blur = vec4(0);
    for (int i = -4; i <= 4; i++) {
        blur += texture(src, uv + vec2(float(i) * 0.006, 0));
    }
    outColor = texture(src, uv) + blur / 9. * vec4(1, .3, .8, 1) * .8;
}`,
            wgsl: `${WGSL_HEADER}
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy - u.offset) / u.resolution;
    var blur = vec4f(0.0);
    for (var i = -4; i <= 4; i++) {
        blur += textureSampleLevel(src, srcSampler, uv + vec2f(f32(i) * 0.006, 0.0), 0.0);
    }
    return textureSample(src, srcSampler, uv) + blur / 9.0 * vec4f(1.0, 0.3, 0.8, 1.0) * 0.8;
}`,
        };
        initVFX({ backend }).add(img, { shader: [wave, glow] });
        return img;
    },
};

export const Backbuffer: Story = {
    render: ({ backend }) => {
        const img = addImage();
        const trail: VFXPass = {
            frag: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D backbuffer;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 p = uv * 2. - 1.;
    p.x *= resolution.x / resolution.y;
    p -= vec2(sin(time), cos(time * 1.3) * .5);
    outColor = vec4(step(length(p), .3));
    outColor += texture(backbuffer, uv) * vec4(.9, .95, 1, .995);
}`,
            wgsl: `
struct Uniforms {
    resolution: vec2f,
    offset: vec2f,
    time: f32,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var backbuffer: texture_2d<f32>;
@group(0) @binding(2) var backbufferSampler: sampler;

@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy - u.offset) / u.resolution;
    let prev = textureSample(backbuffer, backbufferSampler, uv);
    var p = uv * 2.0 - 1.0;
    p.x *= u.resolution.x / u.resolution.y;
    p -= vec2f(sin(u.time), cos(u.time * 1.3) * 0.5);
    return vec4f(step(length(p), 0.3)) + prev * vec4f(0.9, 0.95, 1.0, 0.995);
}`,
        };
        initVFX({ backend }).add(img, { shader: [trail], backbuffer: true });
        return img;
    },
};

export const PostEffect: Story = {
    render: ({ backend }) => {
        const img = addImage();
        const chromatic: VFXPass = {
            frag: `${GLSL_HEADER}
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 d = (uv - .5) * .02;
    vec4 c = texture(src, uv);
    c.r = texture(src, uv + d).r;
    c.b = texture(src, uv - d).b;
    c.rgb *= 1. - length(uv - .5) * .8;
    outColor = c;
}`,
            wgsl: `${WGSL_HEADER}
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy - u.offset) / u.resolution;
    let d = (uv - 0.5) * 0.02;
    var c = textureSample(src, srcSampler, uv);
    c.r = textureSample(src, srcSampler, uv + d).r;
    c.b = textureSample(src, srcSampler, uv - d).b;
    c = vec4f(c.rgb * (1.0 - length(uv - 0.5) * 0.8), c.a);
    return c;
}`,
        };
        initVFX({ backend, postEffect: [chromatic] }).add(img, {
            shader: [gradient],
        });
        return img;
    },
};

/** A long shader that takes a while to compile. */
function heavyPass(iterations: number): VFXPass {
    // A new constant per load, so the browser's shader cache can't skip the build.
    const salt = Math.random().toFixed(6);
    const glsl: string[] = [`c += vec3(${salt}) * 0.;`];
    const wgsl: string[] = [`c += vec3f(${salt}) * 0.0;`];
    for (let i = 0; i < iterations; i++) {
        const a = (i * 0.731 + 1).toFixed(3);
        const b = (i * 0.417 + 2).toFixed(3);
        glsl.push(
            `c += vec3(sin(p.x * ${a} + time), cos(p.y * ${b} - time), sin((p.x + p.y) * ${a})) * ${(1 / iterations).toFixed(6)};`,
        );
        wgsl.push(
            `c += vec3f(sin(p.x * ${a} + u.time), cos(p.y * ${b} - u.time), sin((p.x + p.y) * ${a})) * ${(1 / iterations).toFixed(6)};`,
        );
    }
    return {
        frag: `${GLSL_HEADER}
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 p = uv * 4.;
    vec3 c = vec3(0);
    ${glsl.join("\n    ")}
    vec4 img = texture(src, uv);
    outColor = vec4(c * .5 + .5, 1) * img.a;
}`,
        wgsl: `${WGSL_HEADER}
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = (pos.xy - u.offset) / u.resolution;
    let p = uv * 4.0;
    var c = vec3f(0.0);
    ${wgsl.join("\n    ")}
    let img = textureSample(src, srcSampler, uv);
    return vec4f(c * 0.5 + 0.5, 1.0) * img.a;
}`,
    };
}

export const HeavyShader: StoryObj<Args & { iterations: number }> = {
    args: { iterations: 1000 },
    render: ({ backend, iterations }) => {
        const img = addImage();
        // A spinner on the main thread shows any frame drop.
        const spinner = document.createElement("div");
        spinner.style.cssText =
            "position: fixed; top: 20px; left: 20px; width: 40px; height: 40px; background: #0f0; z-index: 10000;";
        document.body.append(spinner);
        const gaps: number[] = [];
        let last = performance.now();
        const tick = (now: number) => {
            gaps.push(now - last);
            last = now;
            spinner.style.transform = `rotate(${now / 5}deg)`;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        // Read by the Playwright check.
        (window as unknown as { rafGaps: number[] }).rafGaps = gaps;

        initVFX({ backend }).add(img, { shader: [heavyPass(iterations)] });
        return img;
    },
};
