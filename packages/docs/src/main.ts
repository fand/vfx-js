import { type Effect, VFX } from "@vfx-js/core";
import {
    AsciiEffect,
    BloomEffect,
    GlitchEffect,
    HalftoneEffect,
    PixelateEffect,
    PixelSortEffect,
    ScanlineEffect,
} from "@vfx-js/effects";

import Prism from "prismjs";
import { SpheresEffect } from "./spheres-bg";
import "prism-themes/themes/prism-nord.min.css";

Prism.manual = true;
Prism.highlightAll();

function $(selector: string, parent?: HTMLElement) {
    return (parent ?? document).querySelector(selector) as HTMLElement;
}

function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}

const shaders: Record<string, string> = {
    logo: `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform float enterTime;
    uniform float leaveTime;
    uniform sampler2D src;

    uniform float delay;
    #define speed 2.0

    out vec4 outColor;

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );
        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;
        return n;
    }

    vec4 readTex(sampler2D tex, vec2 uv) {
        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
        return texture(tex, uv);
    }

    vec4 glitch(vec2 uv) {
        vec2 uvr = uv, uvg = uv, uvb = uv;
        float t = mod(time, 30.);
        float amp = 10. / resolution.x;
        if (abs(nn(uv.y, t)) > 1.) {
            uvr.x += nn(uv.y, t) * amp;
            uvg.x += nn(uv.y, t + 10.) * amp;
            uvb.x += nn(uv.y, t + 20.) * amp;
        }
        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r,
            cg.g,
            cb.b,
            smoothstep(.0, 1., cr.a + cg.a + cb.a)
        );
    }
    vec4 slitscan(vec2 uv) {
        float t = max(enterTime - delay, 0.) * speed;
        if (t <= 0.0) {
            return vec4(0);
        }

        vec2 uvr = uv, uvg = uv, uvb = uv;
        uvr.x = min(uvr.x, t);
        uvg.x = min(uvg.x, max(t - 0.2, 0.));
        uvb.x = min(uvb.x, max(t - 0.4, 0.));

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.
        );
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        if (leaveTime > 0.) {
            float t = clamp(leaveTime - 0.5, 0., 1.);
            outColor = glitch(uv) * (1. - t);
        } else if (enterTime < 1.0) {
            outColor = slitscan(uv);
        } else {
            outColor = glitch(uv);
        }
    }
    `,
    canvas: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
out vec4 outColor;

#define ZOOM(uv, x) ((uv - .5) / x + .5)

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    float r = sin(time) * 0.5 + 0.5;

    float l = pow(length(uv - .5), 2.);
    uv = (uv - .5) *  (1. - l * 0.3 * r) + .5;


    float n = 0.02 + r * 0.03;
    vec4 cr = texture(src, ZOOM(uv, 1.00));
    vec4 cg = texture(src, ZOOM(uv, (1. + n)));
    vec4 cb = texture(src, ZOOM(uv, (1. + n * 2.)));

    outColor = vec4(cr.r, cg.g, cb.b, 1);
}
    `,
    custom: `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform float scroll;
out vec4 outColor;

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.2);
    outColor = texture(src, uv);
}
    `,
};

// Each menu item builds one effect. The slider value t (0-1) drives its main param.
type MenuEffect = {
    label: string;
    className?: string;
    create?: () => Effect;
    setIntensity?: (effect: Effect, t: number) => void;
    options?: (t: number) => string;
};

const round = (x: number) => Math.round(x * 100) / 100;

const MENU_EFFECTS: MenuEffect[] = [
    { label: "Original" },
    {
        label: "ASCII",
        className: "AsciiEffect",
        create: () => new AsciiEffect(),
        setIntensity: (e, t) => {
            (e as AsciiEffect).params.grid = Math.round(lerp(24, 6, t));
        },
        options: (t) => `{ grid: ${Math.round(lerp(24, 6, t))} }`,
    },
    {
        label: "Bloom",
        className: "BloomEffect",
        create: () => new BloomEffect({ threshold: 0.2 }),
        setIntensity: (e, t) => {
            (e as BloomEffect).params.intensity = lerp(0.5, 4, t);
        },
        options: (t) =>
            `{ threshold: 0.2, intensity: ${round(lerp(0.5, 4, t))} }`,
    },
    {
        label: "Halftone",
        className: "HalftoneEffect",
        create: () => new HalftoneEffect(),
        setIntensity: (e, t) => {
            (e as HalftoneEffect).params.gridSize = lerp(4, 18, t);
        },
        options: (t) => `{ gridSize: ${round(lerp(4, 18, t))} }`,
    },
    {
        label: "Pixel Sort",
        className: "PixelSortEffect",
        create: () => new PixelSortEffect(),
        setIntensity: (e, t) => {
            (e as PixelSortEffect).params.range = [lerp(0.9, 0.1, t), 1];
        },
        options: (t) => `{ range: [${round(lerp(0.9, 0.1, t))}, 1] }`,
    },
    {
        label: "Glitch",
        className: "GlitchEffect",
        create: () => new GlitchEffect(),
        setIntensity: (e, t) => {
            (e as GlitchEffect).params.intensity = lerp(0.2, 3, t);
        },
        options: (t) => `{ intensity: ${round(lerp(0.2, 3, t))} }`,
    },
];

function snippet(item: MenuEffect, t: number): string {
    if (!item.className || !item.options) {
        return `import { VFX } from "@vfx-js/core";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), { shader: "none" });
`;
    }
    return `import { VFX } from "@vfx-js/core";
import { ${item.className} } from "@vfx-js/effects";

const vfx = new VFX();
await vfx.add(document.querySelector("img"), {
    effect: new ${item.className}(${item.options(t)}),
});
`;
}

class App {
    vfx = new VFX({
        pixelRatio: window.devicePixelRatio,
        zIndex: -1,
    });
    vfx2 = new VFX({
        pixelRatio: 1,
        zIndex: -2,
        scrollPadding: false,
    });

    // #BG covers the viewport. The spheres sit at 65% x.
    bgSpheres = new SpheresEffect({ center: [0.65, 0.5], zoom: 1.4 });

    async initBG() {
        const bg = $("#BG");

        let scroll = 0;
        function lerp(a: number, b: number, t: number): number {
            return a * (1 - t) + b * t;
        }

        // Parallax moves the spheres in the shader. Moving #BG itself would crop them at its bottom edge.
        const loop = () => {
            scroll = lerp(scroll, window.scrollY, 0.03);
            this.bgSpheres.center = [
                0.65,
                0.5 + (scroll * 0.1) / window.innerHeight,
            ];

            requestAnimationFrame(loop);
        };
        loop();

        await this.vfx2.add(bg, { effect: [this.bgSpheres] });
    }

    async initVFX() {
        await Promise.all(
            Array.from(document.querySelectorAll("*[data-shader]")).map((e) => {
                const shader = e.getAttribute("data-shader") as string;

                const uniformsJSON = e.getAttribute("data-uniforms");
                const uniforms = uniformsJSON
                    ? JSON.parse(uniformsJSON)
                    : undefined;

                return this.vfx.add(e as HTMLImageElement, {
                    shader,
                    overflow: Number.parseFloat(
                        e.getAttribute("data-overflow") ?? "0",
                    ),
                    uniforms,
                    intersection: {
                        threshold: Number.parseFloat(
                            e.getAttribute("data-threshold") ?? "0",
                        ),
                    },
                });
            }),
        );
    }

    async initDiv() {
        const div = $("#div");
        await this.vfx.add(div, { shader: "rgbShift", overflow: 100 });

        for (const input of div.querySelectorAll("input,textarea")) {
            input.addEventListener("input", () => this.vfx.update(div));
        }

        const textarea = $("textarea", div);
        const mo = new MutationObserver(() => this.vfx.update(div));
        mo.observe(textarea, {
            attributes: true,
        });
    }

    async initCanvas() {
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw "Failed to get the canvas context";
        }

        const { width, height } = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio ?? 1;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.scale(ratio, ratio);

        let target = [width / 2, height / 2];
        let p = target;
        const ps = [p];
        let isMouseOn = false;
        const startTime = Date.now();

        canvas.addEventListener("mousemove", (e) => {
            isMouseOn = true;
            target = [e.offsetX, e.offsetY];
        });
        canvas.addEventListener("mouseleave", (e) => {
            isMouseOn = false;
        });

        let isInside = false;
        const io = new IntersectionObserver(
            (changes) => {
                for (const c of changes) {
                    isInside = c.intersectionRatio > 0.1;
                }
            },
            { threshold: [0, 1, 0.2, 0.8] },
        );
        io.observe(canvas);

        const drawMouseStalker = () => {
            requestAnimationFrame(drawMouseStalker);

            if (!isInside) {
                return;
            }

            if (!isMouseOn) {
                const t = Date.now() / 1000 - startTime;
                target = [
                    width * 0.5 + Math.sin(t * 1.3) * width * 0.3,
                    height * 0.5 + Math.sin(t * 1.7) * height * 0.3,
                ];
            }
            p = [lerp(p[0], target[0], 0.1), lerp(p[1], target[1], 0.1)];

            ps.push(p);
            ps.splice(0, ps.length - 30);

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = "white";
            ctx.font = `bold ${width * 0.14}px sans-serif`;
            ctx.fillText("HOVER ME", width / 2, height / 2);
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            for (let i = 0; i < ps.length; i++) {
                const [x, y] = ps[i];
                const t = (i / ps.length) * 255;
                ctx.fillStyle = `rgba(${255 - t}, 255, ${t}, ${(i / ps.length) * 0.5 + 0.5})`;
                ctx.beginPath();
                ctx.arc(x, y, i + 20, 0, 2 * Math.PI);
                ctx.fill();
            }

            this.vfx.update(canvas);
        };
        drawMouseStalker();

        await this.vfx.add(canvas, { shader: shaders.canvas });
    }

    async initCustomShader() {
        const e = $("#custom");
        await this.vfx.add(e, {
            shader: shaders.custom,
            uniforms: { scroll: () => window.scrollY / window.innerHeight },
        });
    }

    async initEffects() {
        const bloom = $("#effect-bloom") as HTMLImageElement;
        await this.vfx.add(bloom, {
            effect: new BloomEffect({ threshold: 0.2, intensity: 5 }),
        });

        const crt = $("#effect-crt") as unknown as HTMLVideoElement;
        await this.vfx.add(crt, {
            effect: [
                new PixelateEffect({ size: 10 }),
                new ScanlineEffect({ spacing: 5 }),
                new BloomEffect({
                    threshold: 0.01,
                    softness: 0.2,
                    intensity: 10,
                    scatter: 1,
                    pad: 200,
                }),
            ],
        });
    }

    async initMultipass() {
        const e = $("#multipass");
        await this.vfx.add(e, {
            shader: [
                {
                    frag: `
                        precision highp float;
                        uniform sampler2D src;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        out vec4 outColor;
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                            vec2 t = 4.0 / resolution;
                            vec4 c = texture(src, uv) * 0.4;
                            c += texture(src, uv + vec2(t.x, 0)) * 0.15;
                            c += texture(src, uv - vec2(t.x, 0)) * 0.15;
                            c += texture(src, uv + vec2(0, t.y)) * 0.15;
                            c += texture(src, uv - vec2(0, t.y)) * 0.15;
                            outColor = c;
                        }
                    `,
                    target: "blur",
                },
                {
                    frag: `
                        precision highp float;
                        uniform sampler2D src;
                        uniform sampler2D blur;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        out vec4 outColor;
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                            vec4 c = texture(src, uv);
                            vec4 b = texture(blur, uv);
                            outColor = c + b * 0.6;
                        }
                    `,
                },
            ],
        });
    }

    // Click an item to apply its effect to the logo and the background.
    initEffectMenu() {
        const logo = $("#Logo");
        const bg = $("#BG");
        const list = $(".EffectList");
        const slider = $(".EffectSlider") as HTMLInputElement;
        const copy = $(".EffectCopy");

        // One effect instance can't be shared between elements, so each target gets its own.
        const logoEffects = MENU_EFFECTS.map((item) => item.create?.());
        const bgEffects = MENU_EFFECTS.map((item) => item.create?.());
        let selected = 0;
        // The logo starts on its intro shader. Move it to the effect path on first use.
        let logoOnEffectPath = false;
        let queue = Promise.resolve();

        const intensity = () => Number.parseFloat(slider.value);

        const applyIntensity = () => {
            const item = MENU_EFFECTS[selected];
            for (const effect of [logoEffects[selected], bgEffects[selected]]) {
                if (effect) {
                    item.setIntensity?.(effect, intensity());
                }
            }
        };

        const select = (index: number) => {
            selected = index;
            applyIntensity();
            const logoEffect = logoEffects[index];
            const bgEffect = bgEffects[index];
            slider.disabled = !logoEffect;
            // Run swaps in order so fast clicks can't interleave them.
            queue = queue.then(async () => {
                if (selected !== index) {
                    return;
                }
                const logoChain = logoEffect ? [logoEffect] : [];
                const bgChain = bgEffect
                    ? [this.bgSpheres, bgEffect]
                    : [this.bgSpheres];
                const updateLogo = async () => {
                    if (logoOnEffectPath) {
                        await this.vfx.updateEffects(logo, logoChain);
                    } else {
                        logoOnEffectPath = true;
                        this.vfx.remove(logo);
                        await this.vfx.add(logo, { effect: logoChain });
                    }
                };
                await Promise.all([
                    updateLogo(),
                    this.vfx2.updateEffects(bg, bgChain),
                ]);
            });
        };

        const items = MENU_EFFECTS.map((item, i) => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="num">${String(i + 1).padStart(2, "0")}</span>${item.label}`;
            li.addEventListener("click", () => {
                for (const [j, other] of items.entries()) {
                    other.classList.toggle("active", j === i);
                }
                select(i);
            });
            list.appendChild(li);
            return li;
        });
        items[selected].classList.add("active");
        slider.disabled = true;

        slider.addEventListener("input", applyIntensity);

        copy.addEventListener("click", async () => {
            await navigator.clipboard.writeText(
                snippet(MENU_EFFECTS[selected], intensity()),
            );
            const label = copy.innerHTML;
            copy.textContent = "Copied ✓";
            setTimeout(() => {
                copy.innerHTML = label;
            }, 1500);
        });
    }

    hideMask() {
        const maskTop = $("#MaskTop");
        maskTop.style.setProperty("height", "0");

        const maskBottom = $("#MaskBottom");
        maskBottom.style.setProperty("opacity", "0");
    }

    async showLogo() {
        const logo = $("#Logo");
        const tagline = $("#LogoTagline");
        return Promise.all([
            this.vfx.add(logo, {
                shader: shaders.logo,
                overflow: [0, 3000, 0, 100],
                uniforms: { delay: 0 },
                intersection: {
                    threshold: 1,
                },
            }),
            this.vfx.add(tagline, {
                shader: shaders.logo,
                overflow: [0, 3000, 0, 1000],
                uniforms: { delay: 0.3 },
                intersection: {
                    threshold: 1,
                },
            }),
        ]);
    }

    async showProfile() {
        const profile = $("#profile");
        await this.vfx.add(profile, {
            shader: shaders.logo,
            overflow: [0, 3000, 0, 2000],
            uniforms: { delay: 0.5 },
            intersection: {
                rootMargin: [-100, 0, -100, 0],
                threshold: 1,
            },
        });
    }
}

window.addEventListener("load", async () => {
    const app = new App();
    await app.initBG();

    await Promise.all([
        await app.initVFX(),
        app.initDiv(),
        app.initCanvas(),
        app.initCustomShader(),
        app.initMultipass(),
        app.initEffects(),
    ]);

    app.initEffectMenu();
    app.hideMask();
    setTimeout(() => {
        app.showLogo();
        app.showProfile();
    }, 2000);
});
