import * as React from "react";
import { useRef, useContext, useEffect, useState } from "react";
import { VFXContext } from "./context";
import type { VFXProps } from "@vfx-js/core";

export type VFXImgProps = JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { shader, release, uniforms, overflow, ...rawProps } = props;

    const vfx = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);
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

    return <img ref={ref} {...rawProps} onLoad={() => setIsLoaded(true)} />;
};
