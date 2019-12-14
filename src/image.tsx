import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";

export interface VFXProps {
    shader?: string;
}

export type VFXImgProps = React.ImgHTMLAttributes<HTMLImageElement> & VFXProps;

const VFXImg: React.FC<VFXImgProps> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);

    // Create scene
    useEffect(() => {
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

    return <img ref={ref} {...props} />;
};

export default VFXImg;
