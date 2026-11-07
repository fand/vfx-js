import type { Attachment } from "svelte/attachments";
import { bindElement, type VFXProps } from "./element.js";

type Value = VFXProps | null | undefined;

/**
 * Add a shader effect to an element: `{@attach vfx({ shader: "rgbShift" })}`.
 * Pass a getter to apply changes without re-running the attachment.
 */
export function vfx(props: Value | (() => Value)): Attachment<HTMLElement> {
    return (el) => {
        const controller = bindElement(el);
        if (typeof props === "function") {
            $effect(() => {
                controller.update(props());
            });
        } else {
            controller.update(props);
        }
        return () => controller.destroy();
    };
}
