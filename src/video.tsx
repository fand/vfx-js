import * as React from "react";
import { useEffect, useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";

export interface VFXProps {
    shader?: string;
}

export type VFXVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> &
    VFXProps;

const VFXVideo: React.FC<VFXVideoProps> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);

    // Create scene
    // useEffect(() => {
    //     if (ref.current === null) {
    //         return;
    //     }

    //     const shader = props.shader;
    //     player?.addElement(ref.current, { shader });

    //     return () => {
    //         if (ref.current === null) {
    //             return;
    //         }

    //         player?.removeElement(ref.current);
    //     };
    // }, [ref, player]);

    const onLoadedData = useCallback(() => {
        if (ref.current === null) {
            return;
        }

        const shader = props.shader;
        player?.addElement(ref.current, { shader });

        return () => {
            if (ref.current === null) {
                return;
            }

            player?.removeElement(ref.current);
        };
    }, [ref, player]);

    return <video ref={ref} {...props} onLoadedData={onLoadedData} />;
};

export default VFXVideo;
