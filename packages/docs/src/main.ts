import type { Effect, VFX } from "@vfx-js/core";
import {
    AsciiEffect,
    BloomEffect,
    GlitchEffect,
    HalftoneEffect,
    PixelSortEffect,
} from "@vfx-js/effects";

import { bgSpheres, bgVFX, initBackground } from "./background";
import { lazyDemo } from "./demos/lazy";
import { runDemos } from "./demos/top-demos";
import { onPage, scrollRoot } from "./lifecycle";
import { getPageVFX } from "./page-vfx";

function $(selector: string, parent?: HTMLElement) {
    return (parent ?? document).querySelector(selector) as HTMLElement;
}

function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}

const logoShader = `
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

        // Colors are premultiplied, so alpha must follow the strongest channel, not the sum.
        return vec4(cr.r, cg.g, cb.b, max(cr.a, max(cg.a, cb.a)));
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

        return vec4(cr.r, cg.g, cb.b, max(cr.a, max(cg.a, cb.a)));
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
`;

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
    vfx = getPageVFX();
    /** False once the page is swapped out. Late async work checks it. */
    alive = true;
    added: HTMLElement[] = [];

    // Click an item to apply its effect to the logo, the tagline and the background.
    initEffectMenu() {
        const bg = $("#BG");
        const list = $(".EffectList");
        const slider = $(".EffectSlider") as HTMLInputElement;
        const copy = $(".EffectCopy");

        // One effect instance can't be shared between elements, so each target gets its own.
        // The logo and tagline start on their intro shader. They move to the effect path on first use.
        const texts = [$("#Logo"), $("#LogoTagline")].map((element) => ({
            element,
            effects: MENU_EFFECTS.map((item) => item.create?.()),
            onEffectPath: false,
        }));
        const bgEffects = MENU_EFFECTS.map((item) => item.create?.());
        let selected = 0;
        let queue = Promise.resolve();

        const intensity = () => Number.parseFloat(slider.value);

        const applyIntensity = () => {
            const item = MENU_EFFECTS[selected];
            const effects = [
                ...texts.map((t) => t.effects[selected]),
                bgEffects[selected],
            ];
            for (const effect of effects) {
                if (effect) {
                    item.setIntensity?.(effect, intensity());
                }
            }
        };

        // Past the hero, the BG drops its effect and dims, so text stays readable.
        let inHero = true;
        const syncBG = () => {
            const bgEffect = inHero ? bgEffects[selected] : undefined;
            const bgChain = bgEffect ? [bgSpheres, bgEffect] : [bgSpheres];
            return bgVFX.updateEffects(bg, bgChain);
        };

        const select = (index: number) => {
            selected = index;
            applyIntensity();
            slider.disabled = !bgEffects[index];
            // Run swaps in order so fast clicks can't interleave them.
            queue = queue.then(async () => {
                if (selected !== index || !this.alive) {
                    return;
                }
                const updateText = async (text: (typeof texts)[number]) => {
                    const effect = text.effects[index];
                    const chain = effect ? [effect] : [];
                    if (text.onEffectPath) {
                        await this.vfx.updateEffects(text.element, chain);
                    } else {
                        text.onEffectPath = true;
                        this.vfx.remove(text.element);
                        await this.add(text.element, { effect: chain });
                    }
                };
                await Promise.all([...texts.map(updateText), syncBG()]);
            });
        };

        const hero = $(".Hero");
        const heroObserver = new IntersectionObserver(
            ([entry]) => {
                inHero = entry.isIntersecting;
                document.body.classList.toggle("BGDim", !inHero);
                queue = queue.then(() => {
                    if (this.alive) {
                        return syncBG();
                    }
                });
            },
            { root: scrollRoot(), threshold: 0.25 },
        );
        heroObserver.observe(hero);

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

        // Other pages show the plain spheres.
        return () => {
            heroObserver.disconnect();
            document.body.classList.remove("BGDim");
            queue = queue.then(() => bgVFX.updateEffects(bg, [bgSpheres]));
        };
    }

    hideMask() {
        document.getElementById("MaskTop")?.style.setProperty("height", "0");
        document
            .getElementById("MaskBottom")
            ?.style.setProperty("opacity", "0");
    }

    /** Add to the page VFX, unless the page is already gone. */
    async add(element: HTMLElement, props: Parameters<VFX["add"]>[1]) {
        await this.vfx.add(element, props);
        if (this.alive) {
            this.added.push(element);
        } else {
            this.vfx.remove(element);
        }
    }

    async showLogo() {
        const logo = $("#Logo");
        const tagline = $("#LogoTagline");
        return Promise.all([
            this.add(logo, {
                shader: logoShader,
                overflow: [0, 3000, 0, 100],
                uniforms: { delay: 0 },
                intersection: {
                    threshold: 1,
                },
            }),
            this.add(tagline, {
                shader: logoShader,
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
        await this.add(profile, {
            shader: logoShader,
            overflow: [0, 3000, 0, 2000],
            uniforms: { delay: 0.5 },
            intersection: {
                rootMargin: [-100, 0, -100, 0],
                threshold: 1,
            },
        });
    }

    dispose() {
        this.alive = false;
        for (const element of this.added) {
            this.vfx.remove(element);
        }
        this.added = [];
    }
}

/**
 * Start the code demos on the first scroll, or after a while.
 * This keeps their WebGL work out of the first load.
 */
function startRunDemos(): () => void {
    const root = scrollRoot();
    let started = false;
    const stop = () => {
        started = true;
        clearTimeout(timer);
        root?.removeEventListener("scroll", start);
    };
    const start = () => {
        if (started) {
            return;
        }
        stop();
        for (const demo of runDemos) {
            const element = document.getElementById(demo.id);
            if (element) {
                lazyDemo(element, demo.props);
            }
        }
    };
    const timer = setTimeout(start, 5000);
    root?.addEventListener("scroll", start, { passive: true });
    return stop;
}

onPage(() => {
    if (!document.getElementById("Logo")) {
        return;
    }
    const app = new App();
    // A full load plays the intro behind the masks. Page swaps drop the masks.
    const intro = document.getElementById("MaskTop") !== null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopMenu: (() => void) | undefined;
    const stopRunDemos = startRunDemos();

    initBackground().then(() => {
        if (!app.alive) {
            return;
        }
        stopMenu = app.initEffectMenu();
        app.hideMask();
        timer = setTimeout(
            () => {
                app.showLogo();
                app.showProfile();
            },
            intro ? 2000 : 0,
        );
    });

    return () => {
        clearTimeout(timer);
        stopRunDemos();
        stopMenu?.();
        app.dispose();
    };
});
