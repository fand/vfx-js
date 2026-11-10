import type { VFX } from "@vfx-js/core";

import { bgSpheres, bgVFX, initBackground } from "./background";
import { lazyDemo } from "./demos/lazy";
import { runDemos } from "./demos/top-demos";
import { DropShadowEffect, SHADOW_GLSL } from "./drop-shadow-effect";
import {
    type Control,
    createChain,
    MENU_EFFECTS,
    type ParamValue,
    snippet,
    type Values,
} from "./effect-menu";
import { onPage, scrollRoot } from "./lifecycle";
import { getPageVFX } from "./page-vfx";

function $(selector: string, parent?: HTMLElement) {
    return (parent ?? document).querySelector(selector) as HTMLElement;
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

    // Shadow offset and blur in physical px. Opacity 0 turns it off.
    uniform vec2 shadowOffset;
    uniform float shadowBlur;
    uniform float shadowOpacity;

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

    vec4 read(vec2 uv) {
        return readTex(src, uv);
    }
    ${SHADOW_GLSL}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        // How much of the shadow shows, so it follows the intro and the fade out.
        float shown = 1.;
        if (leaveTime > 0.) {
            float t = clamp(leaveTime - 0.5, 0., 1.);
            outColor = glitch(uv) * (1. - t);
            shown = 1. - t;
        } else if (enterTime < 1.0) {
            outColor = slitscan(uv);
            shown = step(uv.x, max(enterTime - delay, 0.) * speed);
        } else {
            outColor = glitch(uv);
        }
        if (shadowOpacity > 0.) {
            float a = shadowAlpha(uv - shadowOffset / resolution, vec2(shadowBlur) / resolution);
            outColor += vec4(0., 0., 0., a * shadowOpacity * shown) * (1. - outColor.a);
        }
    }
`;

// Logo shadow, in CSS px.
const LOGO_SHADOW = {
    offset: [0, -2] as [number, number],
    blur: 4,
    opacity: 0.5,
};

/** Build the param controls for one menu item. */
function paramsPanel(
    controls: Control[],
    values: Record<string, ParamValue>,
    onChange: (control: Control, value: ParamValue) => void,
): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "EffectParams";
    for (const control of controls) {
        const row = document.createElement("label");
        row.className = "EffectParam";
        const name = document.createElement("span");
        name.textContent = control.label ?? control.key;
        const output = document.createElement("span");
        output.className = "EffectParamValue";
        const show = (v: ParamValue) => {
            output.textContent = control.type === "range" ? String(v) : "";
        };
        let input: HTMLInputElement | HTMLSelectElement;
        if (control.type === "select") {
            input = document.createElement("select");
            for (const option of control.options) {
                input.add(new Option(option, option));
            }
        } else {
            input = document.createElement("input");
            input.type = control.type;
            if (control.type === "range") {
                input.min = String(control.min);
                input.max = String(control.max);
                input.step = String(control.step);
            }
        }
        if (input instanceof HTMLInputElement && control.type === "checkbox") {
            input.checked = values[control.key] as boolean;
        } else {
            input.value = String(values[control.key]);
        }
        show(values[control.key]);
        input.addEventListener("input", () => {
            const v =
                control.type === "range"
                    ? Number(input.value)
                    : input instanceof HTMLInputElement &&
                        control.type === "checkbox"
                      ? input.checked
                      : input.value;
            show(v);
            onChange(control, v);
        });
        if (control.type === "checkbox") {
            row.classList.add("EffectParamToggle");
            row.append(name, input);
        } else {
            row.append(name, output, input);
        }
        panel.appendChild(row);
    }
    return panel;
}

class App {
    vfx = getPageVFX();
    /** False once the page is swapped out. Late async work checks it. */
    alive = true;
    added: HTMLElement[] = [];

    // Click an item to apply its effect to the logo, the tagline and the background.
    // Its params show under the item.
    initEffectMenu() {
        const bg = $("#BG");
        const list = $(".EffectList");
        const copy = $(".EffectCopy");

        // Current control values, per menu item.
        const values: Values[] = MENU_EFFECTS.map((item) =>
            Object.fromEntries(
                (item.controls ?? []).map((c) => [c.key, c.value]),
            ),
        );

        // One effect instance can't be shared between elements, so each target gets its own.
        // The logo and tagline start on their intro shader. They move to the effect path on first use.
        const createAll = (isBG: boolean) =>
            MENU_EFFECTS.map((item, i) => createChain(item, values[i], isBG));
        const texts = [$("#Logo"), $("#LogoTagline"), $("#HeroLead")].map(
            (element, i) => ({
                element,
                chains: createAll(false),
                // The logo keeps its shadow under every effect. One instance per menu item.
                shadows: MENU_EFFECTS.map(() =>
                    i === 0 ? new DropShadowEffect(LOGO_SHADOW) : undefined,
                ),
                onEffectPath: false,
            }),
        );
        const bgChains = createAll(true);
        let selected = 0;
        let queue = Promise.resolve();

        const setParam = (
            index: number,
            control: Control,
            value: ParamValue,
        ) => {
            values[index][control.key] = value;
            for (const chains of [...texts.map((t) => t.chains), bgChains]) {
                chains[index].set(control, value);
            }
        };

        // Past the hero, the BG drops its effect and dims, so text stays readable.
        let inHero = true;
        const syncBG = () => {
            const bgEffects = inHero ? bgChains[selected].effects : [];
            const bgChain = [bgSpheres, ...bgEffects];
            return bgVFX.updateEffects(bg, bgChain);
        };

        const select = (index: number) => {
            selected = index;
            // Run swaps in order so fast clicks can't interleave them.
            queue = queue.then(async () => {
                if (selected !== index || !this.alive) {
                    return;
                }
                const updateText = async (text: (typeof texts)[number]) => {
                    const shadow = text.shadows[index];
                    const chain = shadow
                        ? [...text.chains[index].effects, shadow]
                        : text.chains[index].effects;
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
            const button = document.createElement("button");
            button.type = "button";
            button.className = "EffectItem";
            button.innerHTML = `<span class="num">${String(i + 1).padStart(2, "0")}</span>${item.label}`;
            button.addEventListener("click", () => {
                for (const [j, other] of items.entries()) {
                    other.classList.toggle("active", j === i);
                }
                select(i);
            });
            li.appendChild(button);
            if (item.controls) {
                li.appendChild(
                    paramsPanel(item.controls, values[i], (c, v) =>
                        setParam(i, c, v),
                    ),
                );
            }
            list.appendChild(li);
            return li;
        });
        items[selected].classList.add("active");

        copy.addEventListener("click", async () => {
            await navigator.clipboard.writeText(
                snippet(MENU_EFFECTS[selected], values[selected]),
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
        const lead = $("#HeroLead");
        return Promise.all([
            this.add(logo, {
                shader: logoShader,
                // Top and bottom room for the shadow.
                overflow: [24, 3000, 40, 100],
                uniforms: {
                    delay: 0,
                    shadowOffset: LOGO_SHADOW.offset.map(
                        (v) => v * window.devicePixelRatio,
                    ),
                    shadowBlur: LOGO_SHADOW.blur * window.devicePixelRatio,
                    shadowOpacity: LOGO_SHADOW.opacity,
                },
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
            this.add(lead, {
                shader: logoShader,
                overflow: [0, 3000, 0, 1000],
                uniforms: { delay: 0.6 },
                intersection: {
                    threshold: 1,
                },
            }),
        ]);
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
