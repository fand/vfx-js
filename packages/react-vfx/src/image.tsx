import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useEffect, useRef } from "react";
import { VFXContext } from "./context.js";

export type VFXImgProps = React.JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { shader, release, uniforms, overflow, wrap, ...rawProps } = props;

    const vfx = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);

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

    // biome-ignore lint/a11y/useAltText: alt should be in rawProps
    return <img ref={ref} {...rawProps} />;
};
