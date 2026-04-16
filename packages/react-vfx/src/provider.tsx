import type { VFXPass, VFXPostEffect } from "@vfx-js/core";
import { VFX } from "@vfx-js/core";
import type * as React from "react";
import { useEffect, useState } from "react";
import { VFXContext } from "./context.js";

export interface VFXProviderProps {
    children?: React.ReactNode;
    pixelRatio?: number;
    zIndex?: number;
    postEffect?: VFXPostEffect | VFXPass[];
    /**
     * Wrapper element that the WebGL canvas will be appended to.
     * The wrapper element should have `position: relative` and `overflow: hidden`.
     * @see {@link @vfx-js/core!VFXOpts.wrapper} for details.
     */
    wrapper?: React.RefObject<HTMLElement | null>;
}

export const VFXProvider: React.FC<VFXProviderProps> = (props) => {
    const [vfx, setVFX] = useState<VFX | null>(null);

    useEffect(() => {
        let vfx: VFX;
        try {
            vfx = new VFX({
                pixelRatio: props.pixelRatio,
                postEffect: props.postEffect,
                wrapper: props.wrapper?.current ?? undefined,
            });
        } catch {
            // WebGL unavailable — render children without effects
            return;
        }

        setVFX(vfx);
        vfx.play();

        return () => {
            vfx.stop();
            vfx.destroy();
        };
    }, [props.pixelRatio, props.postEffect, props.wrapper]); // TODO: add zIndex

    return (
        <>
            <VFXContext.Provider value={vfx}>
                {props.children}
            </VFXContext.Provider>
        </>
    );
};
