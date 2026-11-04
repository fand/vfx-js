import { VFX } from "@vfx-js/core";
import type * as React from "react";
import { useEffect, useState } from "react";
import { VFXContext, VFXProviderMarker } from "./context.js";
import type { VFXConfig } from "./store.js";

export interface VFXProviderProps extends VFXConfig {
    children?: React.ReactNode;
    /**
     * Wrapper element that the WebGL canvas will be appended to.
     * The wrapper element should have `position: relative` and `overflow: hidden`.
     * @see {@link @vfx-js/core!VFXOpts.wrapper} for details.
     */
    wrapper?: React.RefObject<HTMLElement | null>;
}

/**
 * Creates a separate VFX instance and canvas for its children.
 * Components outside any Provider share one instance instead.
 */
export const VFXProvider: React.FC<VFXProviderProps> = (props) => {
    const [vfx, setVFX] = useState<VFX | null>(null);
    const autoplay = props.autoplay ?? true;

    useEffect(() => {
        let vfx: VFX;
        try {
            vfx = new VFX({
                pixelRatio: props.pixelRatio,
                zIndex: props.zIndex,
                postEffect: props.postEffect,
                wrapper: props.wrapper?.current ?? undefined,
                autoplay,
            });
        } catch {
            // WebGL unavailable — render children without effects
            return;
        }

        setVFX(vfx);

        return () => {
            vfx.stop();
            vfx.destroy();
        };
    }, [
        props.pixelRatio,
        props.zIndex,
        props.postEffect,
        props.wrapper,
        autoplay,
    ]);

    return (
        <VFXProviderMarker.Provider value={true}>
            <VFXContext.Provider value={vfx}>
                {props.children}
            </VFXContext.Provider>
        </VFXProviderMarker.Provider>
    );
};
