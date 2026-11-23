import type { Meta, StoryObj } from "@storybook/html-vite";
import { SwirlParticleEffect, type SwirlParticleParams } from "@vfx-js/effects";
import Amagi from "../../docs/public/amagi.png";
import BbbWebm from "./assets/bbb.webm";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import Jellyfish from "./assets/jellyfish.webp";
import Live from "./assets/live.webp";
import Logo from "./assets/logo-640w-20p.svg";
import Pigeon from "./assets/pigeon.webp";
import Robot from "./assets/robot.webp";
import "./preset.css";
import { attachSwirlParticlePane, initVFX, isChromatic } from "./utils";

type Source = {
    src: string;
    video?: boolean;
    style: string;
};

const PHOTO_STYLE = "max-width: min(70vw, 900px); max-height: 70vh";

const SOURCES = {
    "VFX-JS logo": { src: Logo, style: "width: min(80vw, 960px)" },
    amagi: { src: Amagi, style: "height: min(70vh, 640px)" },
    jellyfish: { src: Jellyfish, style: PHOTO_STYLE },
    pigeon: { src: Pigeon, style: PHOTO_STYLE },
    robot: { src: Robot, style: PHOTO_STYLE },
    live: { src: Live, style: PHOTO_STYLE },
    "jellyfish (video)": { src: JellyfishMp4, video: true, style: PHOTO_STYLE },
    "bbb (video)": { src: BbbWebm, video: true, style: PHOTO_STYLE },
} satisfies Record<string, Source>;

type SourceKey = keyof typeof SOURCES;

type Args = {
    source: SourceKey;
    /** Overrides of the effect defaults for this story. */
    params?: Partial<SwirlParticleParams>;
};

// The soft grey-blue backdrop the demo used to paint in the shader
// (#5f6b80 → #a9b2bf, lighter towards the bottom right, with a vignette).
// The effect itself draws over transparency.
const BACKDROP = [
    "radial-gradient(circle farthest-corner at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.047) 50%, rgba(0,0,0,0.105) 75%, rgba(0,0,0,0.187) 100%)",
    "radial-gradient(circle 200vh at 70% 95%, rgba(169,178,191,0.9) 0%, rgba(169,178,191,0.85) 12.5%, rgba(169,178,191,0.72) 25%, rgba(169,178,191,0.55) 37.5%, rgba(169,178,191,0.37) 50%, rgba(169,178,191,0.22) 62.5%, rgba(169,178,191,0.12) 75%, rgba(169,178,191,0) 100%)",
    "linear-gradient(to bottom, #5f6b80, #707d90)",
].join(", ");

// Base setup of the stories: front-on (the default `orbitAnimation` still
// turns it a little), drag to orbit, the pointer repels the particles, and
// a drop shadow on the backdrop. The demo draws more particles than the
// default, over the whole canvas.
const STORY_VIEW: Partial<SwirlParticleParams> = {
    count: 262144,
    pad: "fullscreen",
    yaw: 0,
    pitch: 0,
    drag: true,
    pointer: "repel",
    shadow: true,
};

function createElement(source: Source): HTMLImageElement | HTMLVideoElement {
    if (source.video) {
        const video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.crossOrigin = "anonymous";
        video.style.cssText = source.style;
        video.src = source.src;
        return video;
    }
    const img = document.createElement("img");
    img.style.cssText = source.style;
    img.src = source.src;
    return img;
}

function whenLoaded(el: HTMLImageElement | HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
        if (el instanceof HTMLVideoElement) {
            if (el.readyState >= 2) {
                resolve();
                return;
            }
            el.addEventListener("loadeddata", () => resolve(), { once: true });
        } else {
            if (el.complete && el.naturalWidth > 0) {
                resolve();
                return;
            }
            el.addEventListener("load", () => resolve(), { once: true });
        }
        el.addEventListener("error", () => reject(new Error("load failed")), {
            once: true,
        });
    });
}

export default {
    title: "Effect/Swirl Particles",
    parameters: { layout: "fullscreen", controls: { disable: true } },
    render: (args) => {
        const root = document.createElement("div");
        root.style.cssText = `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: ${BACKDROP}`;

        const vfx = initVFX();
        const still = isChromatic();
        // Tweakpane edits this object; it is copied into the effect.
        const params: SwirlParticleParams = {
            ...new SwirlParticleEffect({ ...STORY_VIEW, ...args.params })
                .params,
        };

        let sourceKey: SourceKey = args.source;
        let el: HTMLImageElement | HTMLVideoElement | null = null;
        let effect: SwirlParticleEffect | null = null;
        // Bumped on every swap, so a slow load can't attach a stale element.
        let token = 0;
        // `remove` must wait for a pending `add` on the same element.
        let adding: Promise<void> = Promise.resolve();

        const mount = async (): Promise<void> => {
            const my = ++token;
            const prev = el;
            const next = createElement(SOURCES[sourceKey]);
            el = next;
            if (prev) {
                prev.replaceWith(next);
                await adding.catch(() => {});
                vfx.remove(prev);
            } else {
                root.appendChild(next);
            }
            try {
                await whenLoaded(next);
                // Let Storybook attach the root before VFX measures it.
                await new Promise((r) => requestAnimationFrame(r));
            } catch (e) {
                console.error(e);
                return;
            }
            if (my !== token) {
                return;
            }
            effect = new SwirlParticleEffect(params, { still });
            adding = vfx.add(next, { effect });
            await adding;
        };

        void mount().then(() => {
            if (still) {
                return;
            }
            attachSwirlParticlePane(
                "Swirl Particles",
                params,
                () => {
                    if (effect) {
                        Object.assign(effect.params, params);
                    }
                },
                {
                    keys: Object.keys(SOURCES),
                    value: sourceKey,
                    onChange: (key) => {
                        sourceKey = key as SourceKey;
                        void mount();
                    },
                },
                // A new element and effect: the particles are born again.
                () => void mount(),
            );
        });
        return root;
    },
} satisfies Meta<Args>;

export const logo: StoryObj<Args> = {
    args: { source: "VFX-JS logo" },
};

export const amagi: StoryObj<Args> = {
    args: { source: "amagi", params: { depth: 0.3 } },
};

export const photo: StoryObj<Args> = {
    args: { source: "jellyfish", params: { sourceColor: 1 } },
};

const ARTICLE_TEXT = [
    "Every particle in this heading is born on the surface of the extruded letters and carried along a flow that curls around them. Most stay close and comb the surface into fibres; a few peel off and drift away as wisps before they fade and respawn.",
    "The heading is a plain <h1> in the page. VFX-JS hides it and draws the effect on a canvas over the page, at the heading's position, so the layout, the text selection and the scroll all stay with the document.",
    "The drop shadow falls on the page behind, a plane parallel to the screen. It is drawn on the same canvas, so it darkens this text too, as a shadow cast on a sheet of paper would.",
    "With the default pad of 200 CSS px, the effect only renders around the heading. Scroll down and the effect scrolls with it; the paragraphs below keep their normal rendering.",
];

/**
 * A heading in an article page: the `<h1>` becomes the swirl, with the
 * library defaults (numeric `pad`, 65k particles) plus a drop shadow on
 * the page and the cursor repelling the particles.
 */
export const heading: StoryObj<Args> = {
    args: { source: "VFX-JS logo" },
    render: () => {
        const page = document.createElement("div");
        page.style.cssText =
            // The preset centres #storybook-root's content; start at the top.
            "align-self: flex-start; width: 100%; min-height: 100vh; background: #f4f1ea; color: #2b2b2b; font: 18px/1.7 Georgia, 'Times New Roman', serif";
        const article = document.createElement("article");
        article.style.cssText =
            "max-width: 760px; margin: 0 auto; padding: 160px 24px 240px";

        const kicker = document.createElement("p");
        kicker.textContent = "VFX-JS / Effects";
        kicker.style.cssText =
            "margin: 0 0 8px; font: 600 13px/1 system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8270";

        const h1 = document.createElement("h1");
        h1.textContent = "Swirl";
        // `fit-content`: the box hugs the text, left in the column, so its
        // centre is off the viewport's and `cameraOrigin` "element" and
        // "viewport" differ. A block-wide box would centre it.
        h1.style.cssText =
            "width: fit-content; margin: 0 0 48px; font: 900 clamp(72px, 14vw, 180px)/1 system-ui, 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.02em; color: #222";

        article.append(kicker, h1);
        for (let i = 0; i < 3; i++) {
            for (const text of ARTICLE_TEXT) {
                const p = document.createElement("p");
                p.textContent = text;
                p.style.cssText = "margin: 0 0 1.2em";
                article.appendChild(p);
            }
        }
        page.appendChild(article);

        const vfx = initVFX();
        const still = isChromatic();
        const params: SwirlParticleParams = {
            ...new SwirlParticleEffect({
                depth: 0.3,
                shadow: true,
                pointer: "repel",
            }).params,
        };
        let effect: SwirlParticleEffect | null = null;

        const mount = async (): Promise<void> => {
            if (effect) {
                vfx.remove(h1);
            }
            // Wait for the web font fallback and for Storybook to attach
            // the page before VFX measures the heading.
            await document.fonts?.ready;
            await new Promise((r) => requestAnimationFrame(r));
            effect = new SwirlParticleEffect(params, { still });
            await vfx.add(h1, { effect });
        };

        void mount().then(() => {
            if (still) {
                return;
            }
            attachSwirlParticlePane(
                "Swirl Particles",
                params,
                () => {
                    if (effect) {
                        Object.assign(effect.params, params);
                    }
                },
                undefined,
                () => void mount(),
            );
        });
        return page;
    },
};
