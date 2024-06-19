import * as React from "react";
import { useRef, useContext, useState, useEffect } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXVideoProps = JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { shader, release, uniforms, overflow, ...rawProps } = props;

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
        });

        return () => {
            vfx.remove(element);
        };
    }, [vfx, shader, release, uniforms, overflow, isLoaded]);

    return (
        <video ref={ref} {...rawProps} onLoadedData={() => setIsLoaded(true)} />
    );
};
