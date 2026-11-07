import type { ObjectDirective } from "vue";
import {
    bindElement,
    type ElementController,
    type VFXProps,
} from "./element.js";

const controllers = new WeakMap<HTMLElement, ElementController>();

/** Add a shader effect to an element: `v-vfx="{ shader: 'rgbShift' }"`. */
export const vVfx: ObjectDirective<HTMLElement, VFXProps | null | undefined> = {
    mounted(el, binding) {
        const controller = bindElement(el);
        controllers.set(el, controller);
        controller.update(binding.value);
    },
    updated(el, binding) {
        controllers.get(el)?.update(binding.value);
    },
    beforeUnmount(el) {
        controllers.get(el)?.destroy();
        controllers.delete(el);
    },
    // Directives do not run on the server; this stops the SSR warning.
    getSSRProps: () => ({}),
};
