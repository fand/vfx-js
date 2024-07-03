import * as React from "react";
import { useRef, useContext, useEffect, useState } from "react";
import type { VFXProps } from "@vfx-js/core";
import { VFXContext } from "./context.js";

export type VFXImgProps = JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { shader, release, uniforms, overflow, wrap, ...rawProps } = props;

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
            wrap,
        });

        return () => {
            vfx.remove(element);
        };
    }, [vfx, shader, release, uniforms, overflow, wrap, isLoaded]);

    return <img ref={ref} {...rawProps} onLoad={() => setIsLoaded(true)} />;
};
