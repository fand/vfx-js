import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useState } from "react";
import { VFXContext } from "./context.js";
import { useVFXLifecycle } from "./lifecycle.js";
import { splitVFXProps } from "./split-props.js";

export type VFXVideoProps = React.JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { vfxProps, domProps } = splitVFXProps(props);

    const vfx = useContext(VFXContext);
    const [element, setElement] = useState<HTMLVideoElement | null>(null);

    useVFXLifecycle(element, vfx, vfxProps);

    return <video ref={setElement} {...domProps} />;
};
