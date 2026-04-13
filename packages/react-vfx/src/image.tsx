import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useEffect, useState } from "react";
import { VFXContext } from "./context.js";
import { splitVFXProps } from "./split-props.js";

export type VFXImgProps = React.JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { vfxProps, domProps } = splitVFXProps(props);

    const vfx = useContext(VFXContext);
    const [element, setElement] = useState<HTMLImageElement | null>(null);

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

    // biome-ignore lint/a11y/useAltText: alt should be in domProps
    return <img ref={setElement} {...domProps} />;
};
