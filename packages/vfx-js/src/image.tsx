import * as React from "react";
import { useRef, useContext, useEffect, useState } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXImgProps = JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = (props) => {
    const { shader, release, uniforms, overflow, ...rawProps } = props;

    const player = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Create scene
    useEffect(() => {
        if (!player || !ref.current || !isLoaded) {
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
    }, [player, shader, release, uniforms, overflow, isLoaded]);

    return <img ref={ref} {...rawProps} onLoad={() => setIsLoaded(true)} />;
};
