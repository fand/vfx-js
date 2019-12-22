import * as React from "react";
import { useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> &
    VFXProps;

const VFXVideo: React.FC<VFXVideoProps> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLVideoElement>(null);

    // Create scene
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
