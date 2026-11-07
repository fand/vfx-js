import { supportsHtmlInCanvas, type VFXProps } from "@vfx-js/core";
import {
    defineComponent,
    h,
    mergeProps,
    onBeforeUnmount,
    onMounted,
    type PropType,
    ref,
    shallowRef,
    watch,
} from "vue";
import { bindElement, type ElementController } from "./element.js";

// No runtime type, so Vue never casts an absent boolean to `false`.
function vfxProp<K extends keyof VFXProps>() {
    return {
        type: null as unknown as PropType<VFXProps[K]>,
        default: undefined,
    };
}

const vfxProps = {
    shader: vfxProp<"shader">(),
    release: vfxProp<"release">(),
    uniforms: vfxProp<"uniforms">(),
    overlay: vfxProp<"overlay">(),
    intersection: vfxProp<"intersection">(),
    overflow: vfxProp<"overflow">(),
    wrap: vfxProp<"wrap">(),
    zIndex: vfxProp<"zIndex">(),
    backbuffer: vfxProp<"backbuffer">(),
    autoCrop: vfxProp<"autoCrop">(),
    glslVersion: vfxProp<"glslVersion">(),
    effect: vfxProp<"effect">(),
} as const;

const VFX_PROP_KEYS = Object.keys(vfxProps) as (keyof VFXProps)[];

/**
 * Render children into a shader.
 * Uses html-in-canvas when the browser has it, and dom-to-canvas otherwise.
 * `expose`s `el`, the root element.
 */
export const VFXCanvas = defineComponent({
    name: "VFXCanvas",
    inheritAttrs: false,
    props: vfxProps,
    setup(props, { attrs, slots, expose }) {
        // The server and the first client render use the div.
        // After mount, a supporting browser switches to the canvas once.
        const supported = ref(false);
        const el = shallowRef<HTMLElement | null>(null);
        expose({ el });

        let controller: ElementController | null = null;
        let mounted = false;

        const currentProps = (): VFXProps => {
            const out: Record<string, unknown> = {};
            for (const key of VFX_PROP_KEYS) {
                if (props[key] !== undefined) {
                    out[key] = props[key];
                }
            }
            return out as VFXProps;
        };

        const bind = (node: HTMLElement | null) => {
            controller?.destroy();
            controller = null;
            if (node) {
                controller = bindElement(node, {
                    capture: node instanceof HTMLCanvasElement,
                });
                controller.update(currentProps());
            }
        };

        watch(
            () => VFX_PROP_KEYS.map((key) => props[key]),
            () => controller?.update(currentProps()),
        );
        watch(
            el,
            (node) => {
                if (mounted) {
                    bind(node);
                }
            },
            { flush: "post" },
        );

        onMounted(() => {
            mounted = true;
            supported.value = supportsHtmlInCanvas();
            // A supporting browser binds the canvas once it renders.
            if (!supported.value) {
                bind(el.value);
            }
        });
        onBeforeUnmount(() => {
            mounted = false;
            controller?.destroy();
            controller = null;
        });

        return () => {
            if (supported.value) {
                // Older Chrome reads `layoutsubtree`; 159+ reads
                // `content="drawable"` plus `drawable` on the child.
                return h(
                    "canvas",
                    mergeProps(attrs, {
                        ref: el,
                        layoutsubtree: "",
                        content: "drawable",
                    }),
                    [h("div", { drawable: "" }, slots.default?.())],
                );
            }
            return h("div", mergeProps(attrs, { ref: el }), slots.default?.());
        };
    },
});
