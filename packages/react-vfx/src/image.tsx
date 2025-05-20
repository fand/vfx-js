import type { VFXProps } from "@vfx-js/core";
import type * as React from "react";
import { useContext, useEffect, useState } from "react";
import { VFXContext } from "./context.js";

export type VFXImgProps = React.JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { shader, release, uniforms, overflow, wrap, ...rawProps } = props;

    const vfx = useContext(VFXContext);
    const [element, setElement] = useState<HTMLImageElement | null>(null);

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

    // biome-ignore lint/a11y/useAltText: alt should be in rawProps
    return <img ref={setElement} {...rawProps} />;
};
