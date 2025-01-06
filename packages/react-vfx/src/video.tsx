import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useEffect, useRef } from "react";
import { VFXContext } from "./context.js";

export type VFXVideoProps = React.JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { shader, release, uniforms, overflow, wrap, ...rawProps } = props;

    const vfx = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);

    // Create scene
    useEffect(() => {
        if (!vfx || !ref.current) {
            return;
        }
        const element = ref.current;

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
    }, [vfx, shader, release, uniforms, overflow, wrap]);

    return <video ref={ref} {...rawProps} />;
};
