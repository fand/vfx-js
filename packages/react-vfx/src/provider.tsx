import * as React from "react";
import { useState, useEffect } from "react";
import { VFX } from "@vfx-js/core";
import { VFXContext } from "./context.js";

export interface VFXProviderProps {
    children?: React.ReactNode;
    pixelRatio?: number;
    zIndex?: number;
}

export const VFXProvider: React.FC<VFXProviderProps> = (props) => {
    const [vfx, setVFX] = useState<VFX | null>(null);

    useEffect(() => {
        // Setup player
        const vfx = new VFX({ pixelRatio: props.pixelRatio });
        setVFX(vfx);
        vfx.play();

        return () => {
            vfx.stop();
            vfx.destroy();
        };
    }, [props.pixelRatio, props.zIndex]);

    return (
        <>
            <VFXContext.Provider value={vfx}>
                {props.children}
            </VFXContext.Provider>
        </>
    );
};
