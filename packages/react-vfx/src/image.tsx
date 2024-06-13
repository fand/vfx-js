import * as React from "react";
import { useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXImgProps = JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);

    const { shader, release, uniforms, overflow, ...rawProps } = props;

    // Create scene
    const init = useCallback(() => {
        if (!player || !ref.current) {
            return;
        }
        const element = ref.current;

        player.addElement(element, {
            shader,
            release,
            uniforms,
            overflow,
        });

        return () => {
            player.removeElement(element);
        };
    }, [player, shader, release, uniforms, overflow]);

    return <img ref={ref} {...rawProps} onLoad={init} />;
};
