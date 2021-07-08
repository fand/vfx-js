import * as React from "react";
import { useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXVideoProps = JSX.IntrinsicElements["video"] & VFXProps;

export const VFXVideo: React.FC<VFXVideoProps> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);

    const { shader, release, uniforms, overflow } = props;

    // Create scene
    const onLoadedData = useCallback(() => {
        if (ref.current === null) {
            return;
        }

        player?.addElement(ref.current, {
            shader,
            release,
            uniforms,
            overflow
        });

        return () => {
            if (ref.current === null) {
                return;
            }

            player?.removeElement(ref.current);
        };
    }, [player, shader, release, uniforms, overflow]);

    return <video ref={ref} {...props} onLoadedData={onLoadedData} />;
};
