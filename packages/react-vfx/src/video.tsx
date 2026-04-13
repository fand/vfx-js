import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useEffect, useState } from "react";
import { VFXContext } from "./context.js";
import { splitVFXProps } from "./split-props.js";

export type VFXVideoProps = React.JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { vfxProps, domProps } = splitVFXProps(props);

    const vfx = useContext(VFXContext);
    const [element, setElement] = useState<HTMLVideoElement | null>(null);

    // Create scene
    useEffect(() => {
        if (!vfx || !element) {
            return;
        }

        vfx.add(element, vfxProps);

        return () => {
            vfx.remove(element);
        };
    }, [element, vfx, vfxProps]);

    return <video ref={setElement} {...domProps} />;
};
