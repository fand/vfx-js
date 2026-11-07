import type { Meta, StoryObj } from "@storybook/html-vite";
import { BloomEffect, PixelateEffect, ScanlineEffect } from "@vfx-js/effects";
import { useVFXConfig, VFXCanvas, vVfx } from "@vfx-js/vue";
import {
    type App,
    type Component,
    computed,
    createApp,
    defineComponent,
    h,
    ref,
    withDirectives,
} from "vue";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import Jellyfish from "./assets/jellyfish.webp";
import {
    bloomParams,
    CRT_CANVAS_STYLE,
    CRT_CARD_STYLE,
    CRT_EFFECT_IDS,
    CRT_INPUT_STYLE,
    CRT_PANEL_STYLE,
    CRT_TEXT_STYLE,
    CRT_TITLE_STYLE,
    ROOT_STYLE,
    SECTION_HEADER_STYLE,
    SHADERS,
    storyContainer,
} from "./stories/styles";
import "./preset.css";

let app: App | null = null;

export default {
    title: "Effect/Vue",
    parameters: { layout: "fullscreen" },
    // Unmount on story change, so the shared VFX goes with it.
    beforeEach: () => () => {
        app?.unmount();
        app = null;
    },
} satisfies Meta<undefined>;

async function mountStory(container: HTMLElement, component: Component) {
    await new Promise((r) => requestAnimationFrame(r));
    app = createApp(component);
    app.mount(container);
}

function section(title: string, child: ReturnType<typeof h>) {
    return h("section", [
        h("div", { style: SECTION_HEADER_STYLE }, title),
        child,
    ]);
}

const Elements = defineComponent({
    setup() {
        // One Effect instance per element; core rejects reuse.
        const pixelate = { effect: [new PixelateEffect({ size: 8 })] };
        const spanBloom = { effect: [new BloomEffect(bloomParams())] };
        const divBloom = { effect: [new BloomEffect(bloomParams())] };
        const scanline = { effect: [new ScanlineEffect({ spacing: 4 })] };
        return () =>
            h("div", { style: ROOT_STYLE }, [
                section(
                    "video + pixelate",
                    withDirectives(
                        h("video", {
                            src: JellyfishMp4,
                            autoplay: true,
                            loop: true,
                            muted: true,
                            playsinline: true,
                            style: "width:320px",
                        }),
                        [[vVfx, pixelate]],
                    ),
                ),
                section(
                    "img + rgbShift",
                    withDirectives(
                        h("img", { src: Jellyfish, style: "width:320px" }),
                        [[vVfx, { shader: "rgbShift" }]],
                    ),
                ),
                section(
                    "span + bloom",
                    withDirectives(
                        h(
                            "span",
                            {
                                style: "display:inline-block; font-size:64px; font-weight:800; color:#ff4fa3",
                            },
                            "Hello, v-vfx",
                        ),
                        [[vVfx, spanBloom]],
                    ),
                ),
                section(
                    "div + bloom",
                    withDirectives(
                        h(
                            "div",
                            {
                                style: "display:inline-block; padding:24px 32px; background:linear-gradient(135deg, #2d0040, #002040); border-radius:8px; font-size:24px; font-weight:700; color:#ffe066",
                            },
                            "div container",
                        ),
                        [[vVfx, divBloom]],
                    ),
                ),
                section(
                    "p + scanline",
                    withDirectives(
                        h(
                            "p",
                            {
                                style: "max-width:560px; font-size:18px; line-height:1.6; color:#a0e4ff; margin:0",
                            },
                            "The same directive works on text, images, videos and canvases.",
                        ),
                        [[vVfx, scanline]],
                    ),
                ),
            ]);
    },
});

export const elements: StoryObj<undefined> = {
    name: "Elements",
    render: storyContainer,
    args: undefined,
};
elements.play = ({ canvasElement }) =>
    mountStory(canvasElement.firstElementChild as HTMLElement, Elements);

const Live = defineComponent({
    setup() {
        const shaderIndex = ref(0);
        const enabled = ref(true);
        const pixelateOn = ref(false);
        const count = ref(0);
        // Keep the arrays, so other re-renders don't touch the chain.
        const scanline = new ScanlineEffect({ spacing: 4 });
        const scanlineOnly = [scanline];
        const scanlinePixelate = [scanline, new PixelateEffect({ size: 8 })];
        const counterBloom = [new BloomEffect(bloomParams())];

        const button = (label: string, onClick: () => void) =>
            h("button", { onClick, style: "margin-right:8px" }, label);

        return () =>
            h("div", { style: ROOT_STYLE }, [
                section(
                    "shader change: remove + add",
                    h("div", [
                        button(`Shader: ${SHADERS[shaderIndex.value]}`, () => {
                            shaderIndex.value =
                                (shaderIndex.value + 1) % SHADERS.length;
                        }),
                        button(enabled.value ? "Turn off" : "Turn on", () => {
                            enabled.value = !enabled.value;
                        }),
                        withDirectives(
                            h(
                                "h1",
                                { style: "font-size:64px; margin:12px 0 0" },
                                "Live props",
                            ),
                            [
                                [
                                    vVfx,
                                    enabled.value
                                        ? { shader: SHADERS[shaderIndex.value] }
                                        : null,
                                ],
                            ],
                        ),
                    ]),
                ),
                section(
                    "effect change: updateEffects",
                    h("div", [
                        button(
                            pixelateOn.value
                                ? "Remove pixelate"
                                : "Add pixelate",
                            () => {
                                pixelateOn.value = !pixelateOn.value;
                            },
                        ),
                        h("br"),
                        withDirectives(
                            h("img", {
                                src: Jellyfish,
                                style: "width:320px; margin-top:12px",
                            }),
                            [
                                [
                                    vVfx,
                                    {
                                        effect: pixelateOn.value
                                            ? scanlinePixelate
                                            : scanlineOnly,
                                    },
                                ],
                            ],
                        ),
                    ]),
                ),
                section(
                    "text change: update",
                    h("div", [
                        button("+1", () => {
                            count.value++;
                        }),
                        withDirectives(
                            h(
                                "p",
                                {
                                    style: "display:inline-block; font-size:32px; font-weight:700; color:#ffe066; margin:0 0 0 16px",
                                },
                                `Count: ${count.value}`,
                            ),
                            [[vVfx, { effect: counterBloom }]],
                        ),
                    ]),
                ),
            ]);
    },
});

export const live: StoryObj<undefined> = {
    name: "Live Props",
    render: storyContainer,
    args: undefined,
};
live.play = ({ canvasElement }) =>
    mountStory(canvasElement.firstElementChild as HTMLElement, Live);

const Canvas = defineComponent({
    setup() {
        const instances = {
            pixelate: new PixelateEffect({ size: 6 }),
            scanline: new ScanlineEffect({ spacing: 4 }),
            bloom: new BloomEffect({
                ...bloomParams(),
                intensity: 4.0,
                pad: 200,
            }),
        };
        const enabled = ref({ pixelate: true, scanline: true, bloom: true });
        const effect = computed(() =>
            CRT_EFFECT_IDS.filter((id) => enabled.value[id]).map(
                (id) => instances[id],
            ),
        );
        const text = ref("Type here");

        return () => [
            h("div", { style: CRT_PANEL_STYLE }, [
                h(
                    "div",
                    { style: "margin-bottom:8px; font-weight:600" },
                    "VFXCanvas: effect chain",
                ),
                ...CRT_EFFECT_IDS.map((id) =>
                    h("label", { style: "display:block" }, [
                        h("input", {
                            type: "checkbox",
                            checked: enabled.value[id],
                            onChange: () => {
                                enabled.value = {
                                    ...enabled.value,
                                    [id]: !enabled.value[id],
                                };
                            },
                        }),
                        ` ${id}`,
                    ]),
                ),
            ]),
            h(
                VFXCanvas,
                { effect: effect.value, style: CRT_CANVAS_STYLE },
                {
                    default: () =>
                        h("div", { style: CRT_CARD_STYLE }, [
                            h("h1", { style: CRT_TITLE_STYLE }, "VFX-JS"),
                            h(
                                "p",
                                { style: CRT_TEXT_STYLE },
                                "Live HTML captured into a WebGL texture, then run through an effect chain.",
                            ),
                            h("input", {
                                value: text.value,
                                onInput: (e: Event) => {
                                    text.value = (
                                        e.target as HTMLInputElement
                                    ).value;
                                },
                                style: CRT_INPUT_STYLE,
                            }),
                            h("p", { style: CRT_TEXT_STYLE }, text.value),
                        ]),
                },
            ),
        ];
    },
});

export const canvas: StoryObj<undefined> = {
    name: "Canvas",
    render: () => document.createElement("div"),
    args: undefined,
};
canvas.play = ({ canvasElement }) =>
    mountStory(canvasElement.firstElementChild as HTMLElement, Canvas);

const Config = defineComponent({
    setup() {
        const pixelRatio = ref(1);
        const zIndex = ref<number | undefined>(undefined);
        useVFXConfig(() => ({
            pixelRatio: pixelRatio.value,
            zIndex: zIndex.value,
        }));

        return () =>
            h("div", { style: ROOT_STYLE }, [
                h("div", [
                    h(
                        "button",
                        {
                            style: "margin-right:8px",
                            onClick: () => {
                                pixelRatio.value =
                                    pixelRatio.value === 1 ? 2 : 1;
                            },
                        },
                        `pixelRatio: ${pixelRatio.value}`,
                    ),
                    h(
                        "button",
                        {
                            onClick: () => {
                                zIndex.value =
                                    zIndex.value === undefined ? -1 : undefined;
                            },
                        },
                        `zIndex: ${zIndex.value ?? "default"}`,
                    ),
                ]),
                section(
                    "img + rgbShift",
                    withDirectives(
                        h("img", { src: Jellyfish, style: "width:320px" }),
                        [[vVfx, { shader: "rgbShift" }]],
                    ),
                ),
                section(
                    "h1 + glitch",
                    withDirectives(
                        h(
                            "h1",
                            { style: "font-size:64px; margin:0" },
                            "Config",
                        ),
                        [[vVfx, { shader: "glitch" }]],
                    ),
                ),
            ]);
    },
});

export const config: StoryObj<undefined> = {
    name: "Config",
    render: storyContainer,
    args: undefined,
};
config.play = ({ canvasElement }) =>
    mountStory(canvasElement.firstElementChild as HTMLElement, Config);
