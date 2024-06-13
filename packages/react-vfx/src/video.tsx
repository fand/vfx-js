import * as React from "react";
import { useRef, useContext, useState, useEffect } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXVideoProps = JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const { shader, release, uniforms, overflow, ...rawProps } = props;

    const player = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);
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

    return (
        <video ref={ref} {...rawProps} onLoadedData={() => setIsLoaded(true)} />
    );
};
