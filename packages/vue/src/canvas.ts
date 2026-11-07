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

// No runtime type, so Vue never casts an absent prop to `false`.
// Boolean props below use `default: undefined` for the same reason.
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
    overlay: {
        type: [Boolean, Number] as PropType<true | number>,
        default: undefined,
    },
    intersection: vfxProp<"intersection">(),
    overflow: vfxProp<"overflow">(),
    wrap: vfxProp<"wrap">(),
    zIndex: vfxProp<"zIndex">(),
    backbuffer: { type: Boolean, default: undefined },
    autoCrop: { type: Boolean, default: undefined },
    glslVersion: vfxProp<"glslVersion">(),
    effect: vfxProp<"effect">(),
} as const;

const VFX_PROP_KEYS = Object.keys(vfxProps) as (keyof VFXProps)[];

/**
 * Render children into a shader.
 * Uses html-in-canvas when the browser has it, and dom-to-canvas otherwise.
 * `v-model:element` gives the element the effect is on, or null when there is none.
 */
export const VFXCanvas = defineComponent({
    name: "VFXCanvas",
    inheritAttrs: false,
    props: {
        ...vfxProps,
        /** Use `v-model:element`. Read only; the component sets it. */
        element: {
            type: null as unknown as PropType<HTMLElement | null>,
            default: undefined,
        },
    },
    emits: {
        "update:element": (_element: HTMLElement | null) => true,
    },
    setup(props, { attrs, slots, emit }) {
        // The server and the first client render use the div.
        // After mount, a supporting browser switches to the canvas once.
        const supported = ref(false);
        const el = shallowRef<HTMLElement | null>(null);

        let controller: ElementController | null = null;
        let bound: HTMLElement | null = null;
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

        // Bind the root once it is the element we want; never bind twice.
        const sync = () => {
            const node = el.value;
            const wanted =
                mounted &&
                node !== null &&
                supported.value === node instanceof HTMLCanvasElement
                    ? node
                    : null;
            if (wanted === bound) {
                return;
            }
            controller?.destroy();
            controller = null;
            bound = wanted;
            if (wanted) {
                controller = bindElement(wanted, { capture: supported.value });
                controller.update(currentProps());
            }
            emit("update:element", wanted);
        };

        watch(
            () => VFX_PROP_KEYS.map((key) => props[key]),
            () => controller?.update(currentProps()),
        );
        watch(el, sync, { flush: "post" });

        onMounted(() => {
            mounted = true;
            supported.value = supportsHtmlInCanvas();
            sync();
        });
        onBeforeUnmount(() => {
            mounted = false;
            sync();
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
