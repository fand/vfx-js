import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useState } from "react";
import { VFXContext } from "./context.js";
import { useVFXLifecycle } from "./lifecycle.js";
import { splitVFXProps } from "./split-props.js";

export type VFXImgProps = React.JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { vfxProps, domProps } = splitVFXProps(props);

    const vfx = useContext(VFXContext);
    const [element, setElement] = useState<HTMLImageElement | null>(null);

    useVFXLifecycle(element, vfx, vfxProps);

    // biome-ignore lint/a11y/useAltText: alt should be in domProps
    return <img ref={setElement} {...domProps} />;
};
