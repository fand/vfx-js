import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useState } from "react";
import { useVFXLifecycle } from "./lifecycle.js";
import { splitVFXProps } from "./split-props.js";
import { useVFXInstance } from "./use-vfx-instance.js";

export type VFXImgProps = React.JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { vfxProps, domProps } = splitVFXProps(props);

    const vfx = useVFXInstance();
    const [element, setElement] = useState<HTMLImageElement | null>(null);

    useVFXLifecycle(element, vfx, vfxProps);

    // biome-ignore lint/a11y/useAltText: alt should be in domProps
    return <img ref={setElement} {...domProps} />;
};
