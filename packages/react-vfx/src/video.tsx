import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useEffect, useState } from "react";
import { VFXContext } from "./context.js";

export type VFXVideoProps = React.JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { shader, release, uniforms, overflow, wrap, ...rawProps } = props;

    const vfx = useContext(VFXContext);
    const [element, setElement] = useState<HTMLVideoElement | null>(null);

    // Create scene
    useEffect(() => {
        if (!vfx || !element) {
            return;
        }

        vfx.add(element, {
            shader,
            release,
            uniforms,
            overflow,
            wrap,
        });

        return () => {
            vfx.remove(element);
        };
    }, [element, vfx, shader, release, uniforms, overflow, wrap]);

    return <video ref={setElement} {...rawProps} />;
};
