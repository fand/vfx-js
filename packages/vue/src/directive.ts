import type { RunOpts } from "@vfx-js/core";
import type { ObjectDirective } from "vue";
import {
    bindElement,
    type ElementController,
    type VFXProps,
} from "./element.js";
import { isPlainLeftClick, setNextTransition } from "./pending.js";

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

type LinkState = { spec: RunOpts; onClick: (e: MouseEvent) => void };

const links = new WeakMap<HTMLElement, LinkState>();

/**
 * Set the spec for the navigation a click on the element starts:
 * `<NuxtLink to="/about" v-transition="{ transition: Swipe }">`.
 */
export const vTransition: ObjectDirective<HTMLElement, RunOpts> = {
    mounted(el, binding) {
        const state: LinkState = {
            spec: binding.value,
            onClick: (e) => {
                if (isPlainLeftClick(e)) {
                    setNextTransition(state.spec);
                }
            },
        };
        links.set(el, state);
        // Capture, so it runs before a link's own handler calls preventDefault (NuxtLink does).
        el.addEventListener("click", state.onClick, true);
    },
    updated(el, binding) {
        const state = links.get(el);
        if (state) {
            state.spec = binding.value;
        }
    },
    beforeUnmount(el) {
        const state = links.get(el);
        if (state) {
            el.removeEventListener("click", state.onClick, true);
            links.delete(el);
        }
    },
    getSSRProps: () => ({}),
};
