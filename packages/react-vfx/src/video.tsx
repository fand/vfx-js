import * as React from "react";
import { useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXVideoProps = JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = (props) => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);

    const { shader, release, uniforms, overflow, ...rawProps } = props;

    // Create scene
    const onLoadedData = useCallback(() => {
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

    return <video ref={ref} {...rawProps} onLoadedData={onLoadedData} />;
};
