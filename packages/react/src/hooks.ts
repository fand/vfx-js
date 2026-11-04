import { useMemo } from "react";
import { useVFXInstance } from "./use-vfx-instance.js";

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
    const vfx = useVFXInstance({ acquire: false });

    return useMemo(
        () => ({
            rerenderElement: (e: HTMLElement | null) => {
                if (e) {
                    vfx?.update(e);
                }
            },
        }),
        [vfx],
    );
}

export type { VFXConfig } from "./store.js";
export { useVFXConfig } from "./use-vfx-instance.js";
