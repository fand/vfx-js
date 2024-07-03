import { useContext } from "react";
import { VFXContext } from "./context.js";

export type UseVFX = {
    /**
     * Rerender the element texture used in the shader.
     * VFX elements update the texture automatically when the contents are updated,
     * however in some cases VFX can't detect changes (e.g. input elements update).
     * In such scenarios, you can manually trigger texture update by calling this function.
     */
    rerenderElement: (element: HTMLElement | null) => void;
};

export function useVFX(): UseVFX {
    const vfx = useContext(VFXContext);

    return {
        rerenderElement: (e: HTMLElement | null) => {
            e && vfx?.update(e);
        },
    };
}
