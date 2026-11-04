import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useState } from "react";
import { useVFXLifecycle } from "./lifecycle.js";
import { splitVFXProps } from "./split-props.js";
import { useVFXInstance } from "./use-vfx-instance.js";

export type VFXVideoProps = React.JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { vfxProps, domProps } = splitVFXProps(props);

    const vfx = useVFXInstance();
    const [element, setElement] = useState<HTMLVideoElement | null>(null);

    useVFXLifecycle(element, vfx, vfxProps);

    return <video ref={setElement} {...domProps} />;
};
