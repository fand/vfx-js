import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Effect, EffectContext, VFXCapture } from "@vfx-js/core";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import Jellyfish from "./assets/jellyfish.webp";
import { initVFX } from "./utils";

const qs = <T extends Element>(el: Element, sel: string) =>
    // biome-ignore lint/style/noNonNullAssertion: story helpers query known IDs
    el.querySelector(sel)! as T;

function fullscreenRoot() {
    // biome-ignore lint/style/noNonNullAssertion: storybook root always exists
    const root = document.getElementById("storybook-root")!;
    root.style.height = "auto";
    root.style.display = "block";
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/** `[x, y, w, h]` of a capture's rect, for a `vec4` uniform. */
const rectOf = ({ rect }: VFXCapture): [number, number, number, number] => [
    rect.x,
    rect.y,
    rect.width,
    rect.height,
];

/**
 * The viewport size in CSS px, from `ctx.dims`.
 * The stories use `scrollPadding: false`, so the canvas is the viewport.
 */
const viewportOf = (ctx: EffectContext): [number, number] => [
    ctx.dims.canvasRect[2] / ctx.dims.pixelRatio,
    ctx.dims.canvasRect[3] / ctx.dims.pixelRatio,
];

export default {
    title: "Capture",
    parameters: {
        layout: "fullscreen",
        chromatic: { disableSnapshot: true },
    },
} satisfies Meta;

// ---------------------------------------------------------------------------
// Minimap
// ---------------------------------------------------------------------------

const MINIMAP_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D page;
uniform vec2 size;      // minimap, CSS px
uniform vec4 pageRect;  // captured element in the viewport, CSS px
uniform vec2 viewport;  // CSS px
void main() {
    vec2 p = vec2(uv.x, 1.0 - uv.y) * size;
    float s = min(size.x / pageRect.z, size.y / pageRect.w);
    vec2 off = (size - pageRect.zw * s) * 0.5;
    vec2 a = (p - off) / s;

    vec4 col = vec4(0.0, 0.0, 0.0, 0.6);
    if (all(greaterThanEqual(a, vec2(0.0))) && all(lessThan(a, pageRect.zw))) {
        col = texture(page, vec2(a.x / pageRect.z, 1.0 - a.y / pageRect.w));
    }

    // The visible part of the page, in minimap px.
    vec2 vmin = off - pageRect.xy * s;
    vec2 vmax = vmin + viewport * s;
    bool inView = all(greaterThanEqual(p, vmin)) && all(lessThan(p, vmax));
    bool inInner = all(greaterThanEqual(p, vmin + 2.0)) && all(lessThan(p, vmax - 2.0));
    if (inView && !inInner) {
        col = vec4(1.0, 0.3, 0.2, 1.0);
    } else if (!inView) {
        col.rgb *= 0.5;
    }
    outColor = col;
}
`;

/** Draws a capture scaled down, with a frame for the visible part. */
class MinimapEffect implements Effect {
    constructor(private page: VFXCapture) {}

    render(ctx: EffectContext) {
        ctx.draw({
            frag: MINIMAP_FRAG,
            uniforms: {
                page: this.page.texture,
                size: [ctx.dims.element[0], ctx.dims.element[1]],
                pageRect: rectOf(this.page),
                viewport: viewportOf(ctx),
            },
        });
    }
}

const ARTICLE_TEXT =
    "VFX-JS captures this article into a texture with vfx.capture(). " +
    "The minimap is a separate element, drawn by an effect that reads " +
    "capture.texture and capture.rect. Scroll to move the frame.";

export const Minimap: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:48px 220px 96px 48px; font-family:sans-serif; color:white; background:#111";

        const sections = Array.from(
            { length: 8 },
            (_, i) => `
                <h2 style="margin:48px 0 16px">Section ${i + 1}</h2>
                <p style="font-size:1.1rem; line-height:1.7">${ARTICLE_TEXT}</p>
                <p style="font-size:1.1rem; line-height:1.7">${ARTICLE_TEXT}</p>
            `,
        ).join("");

        const article = document.createElement("article");
        article.id = "capture-article";
        article.style.cssText =
            "max-width:640px; padding:24px; background:#223; border-radius:12px";
        article.innerHTML = `
            <h1 style="margin:0">Minimap</h1>
            <p>Updated <span id="capture-clock">0</span>s ago.
               <button id="capture-toggle">Toggle box</button>
               <a href="#capture-article" style="color:#8cf">A link</a>
               <input placeholder="Type here" style="margin-left:8px" /></p>
            <div id="capture-box" style="height:80px; background:#e63; border-radius:8px"></div>
            <img src="${Jellyfish}" style="display:block; width:100%; margin-top:24px; border-radius:8px" />
            ${sections}
        `;
        container.appendChild(article);

        const minimap = document.createElement("div");
        minimap.id = "capture-minimap";
        minimap.style.cssText =
            "position:fixed; top:16px; right:16px; width:160px; height:60vh";
        container.appendChild(minimap);
        return container;
    },
    play: async ({ canvasElement }) => {
        await nextFrame();
        const article = qs<HTMLElement>(canvasElement, "#capture-article");
        const minimap = qs<HTMLElement>(canvasElement, "#capture-minimap");
        const clock = qs<HTMLElement>(canvasElement, "#capture-clock");
        const box = qs<HTMLElement>(canvasElement, "#capture-box");
        const toggle = qs(canvasElement, "#capture-toggle");

        // The frame needs the viewport size; see viewportOf.
        const vfx = initVFX({ scrollPadding: false });
        const page = await vfx.capture(article);

        // Live updates: a ticking clock, and a box that changes on click.
        // html-in-canvas re-captures on its own; update() covers the fallback.
        const start = Date.now();
        const timer = setInterval(() => {
            if (!clock.isConnected) {
                clearInterval(timer);
                return;
            }
            clock.textContent = String(Math.floor((Date.now() - start) / 1000));
            page.update();
        }, 1000);
        let blue = false;
        toggle.addEventListener("click", () => {
            blue = !blue;
            box.style.background = blue ? "#38e" : "#e63";
            page.update();
        });

        await vfx.add(minimap, { effect: new MinimapEffect(page) });
    },
};

// ---------------------------------------------------------------------------
// Hidden source
// ---------------------------------------------------------------------------

const HIDDEN_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D page;
uniform vec2 viewport;  // CSS px
uniform vec4 pageRect;  // captured element in the viewport, CSS px
uniform float time;
void main() {
    vec4 base = texture(src, uvSrc);
    vec2 p = vec2(uv.x, 1.0 - uv.y) * viewport;
    vec2 l = (p - pageRect.xy) / pageRect.zw;
    l.x += sin(l.y * 24.0 + time * 3.0) * 0.015;
    vec4 c = vec4(0.0);
    if (all(greaterThanEqual(l, vec2(0.0))) && all(lessThan(l, vec2(1.0)))) {
        c = texture(page, vec2(l.x, 1.0 - l.y));
    }
    outColor = c + base * (1.0 - c.a);
}
`;

/**
 * Post effect that draws a capture where its element is, with a wave.
 * Passes the scene through until `page` is set.
 */
class WavyPageEffect implements Effect {
    page: VFXCapture | null = null;

    get enabled() {
        return this.page !== null;
    }

    render(ctx: EffectContext) {
        if (!this.page) {
            return;
        }
        ctx.draw({
            frag: HIDDEN_FRAG,
            uniforms: {
                src: ctx.src,
                page: this.page.texture,
                viewport: viewportOf(ctx),
                pageRect: rectOf(this.page),
                time: ctx.time,
            },
        });
    }
}

export const HiddenSource: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:96px 48px 150vh; font-family:sans-serif; color:white; background:#111";

        const card = document.createElement("div");
        card.id = "capture-hidden";
        card.style.cssText =
            "width:480px; padding:24px; background:#235; border-radius:12px";
        card.innerHTML = `
            <h2 style="margin-top:0">Hidden source</h2>
            <p style="line-height:1.6">This card has <code>hide: true</code>.
               Only a post effect draws it, with a wave. The link and the
               input still work.</p>
            <p><a id="capture-link" href="#capture-hidden" style="color:#8cf; font-size:1.2rem">Click this link</a></p>
            <input id="capture-input" placeholder="Type here" style="font-size:1.1rem; padding:4px; width:300px" />
        `;
        container.appendChild(card);

        const status = document.createElement("p");
        status.id = "capture-status";
        status.textContent = "Clicks: 0. Typed: ";
        container.appendChild(status);
        return container;
    },
    play: async ({ canvasElement }) => {
        await nextFrame();
        const card = qs<HTMLElement>(canvasElement, "#capture-hidden");
        const status = qs<HTMLElement>(canvasElement, "#capture-status");
        const input = qs<HTMLInputElement>(canvasElement, "#capture-input");
        // The capture needs the VFX instance, so the post effect gets it afterwards.
        const effect = new WavyPageEffect();
        let clicks = 0;
        const report = () => {
            status.textContent = `Clicks: ${clicks}. Typed: ${input.value}`;
            // The fallback snapshot only changes on update().
            effect.page?.update();
        };
        qs(canvasElement, "#capture-link").addEventListener("click", (e) => {
            e.preventDefault();
            clicks++;
            report();
        });
        input.addEventListener("input", report);

        const vfx = initVFX({
            scrollPadding: false,
            postEffect: { effect },
        });
        effect.page = await vfx.capture(card, { hide: true });
    },
};

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const SOURCES_FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D image;
uniform sampler2D video;
uniform sampler2D canvas;
void main() {
    float i = floor(uv.x * 3.0);
    vec2 st = vec2(fract(uv.x * 3.0), uv.y);
    outColor = i < 1.0 ? texture(image, st)
        : i < 2.0 ? texture(video, st)
        : texture(canvas, st);
}
`;

/** Draws `image`, `video` and `canvas` uniforms side by side. */
class SideBySideEffect implements Effect {
    render(ctx: EffectContext) {
        ctx.draw({ frag: SOURCES_FRAG, uniforms: ctx.uniforms });
    }
}

export const Sources: StoryObj = {
    render: () => {
        fullscreenRoot();
        const container = document.createElement("div");
        container.style.cssText =
            "padding:48px; min-height:100vh; font-family:sans-serif; color:white; background:#111";
        const cell = "width:240px; height:160px; object-fit:cover";
        container.innerHTML = `
            <p>Sources: an image, a video and a 2D canvas.</p>
            <div style="display:flex; gap:16px">
                <img id="capture-img" src="${Jellyfish}" style="${cell}" />
                <video id="capture-video" src="${JellyfishMp4}" muted loop autoplay playsinline style="${cell}"></video>
                <canvas id="capture-canvas" width="240" height="160" style="${cell}"></canvas>
            </div>
            <p>Captured and drawn by one effect:</p>
            <div id="capture-strip" style="width:752px; height:160px"></div>
        `;
        return container;
    },
    play: async ({ canvasElement }) => {
        await nextFrame();
        const img = qs<HTMLImageElement>(canvasElement, "#capture-img");
        const video = qs<HTMLVideoElement>(canvasElement, "#capture-video");
        const canvas = qs<HTMLCanvasElement>(canvasElement, "#capture-canvas");
        const strip = qs<HTMLElement>(canvasElement, "#capture-strip");

        // biome-ignore lint/style/noNonNullAssertion: 2D context always exists
        const g = canvas.getContext("2d")!;
        const draw = (t: number) => {
            if (!canvas.isConnected) {
                return;
            }
            g.fillStyle = "#123";
            g.fillRect(0, 0, canvas.width, canvas.height);
            g.save();
            g.translate(canvas.width / 2, canvas.height / 2);
            g.rotate(t / 500);
            g.fillStyle = "#e63";
            g.fillRect(-40, -40, 80, 80);
            g.restore();
            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);

        const vfx = initVFX();
        const [image, clip, drawing] = await Promise.all([
            vfx.capture(img),
            vfx.capture(video),
            vfx.capture(canvas),
        ]);
        await vfx.add(strip, {
            effect: new SideBySideEffect(),
            uniforms: {
                image: image.texture,
                video: clip.texture,
                canvas: drawing.texture,
            },
        });
    },
};
