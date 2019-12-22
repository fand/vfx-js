import * as React from "react";
import { useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXImgProps = React.ImgHTMLAttributes<HTMLImageElement> & VFXProps;

const VFXImg: React.FC<VFXImgProps> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);

    // Create scene
    const init = useCallback(() => {
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

    return <img ref={ref} {...props} onLoad={init} />;
};

export default VFXImg;
