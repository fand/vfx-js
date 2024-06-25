import * as React from "react";
import { useRef, useContext, useState, useEffect } from "react";
import { VFXContext } from "./context";
import type { VFXProps } from "@vfx-js/core";

export type VFXVideoProps = JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { shader, release, uniforms, overflow, wrap, ...rawProps } = props;

    const vfx = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Create scene
    useEffect(() => {
        if (!vfx || !ref.current || !isLoaded) {
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
    }, [vfx, shader, release, uniforms, overflow, wrap, isLoaded]);

    return (
        <video ref={ref} {...rawProps} onLoadedData={() => setIsLoaded(true)} />
    );
};
