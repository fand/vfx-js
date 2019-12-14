import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";

const VFXImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);

    // Create scene
    useEffect(() => {
        if (ref.current === null) {
            return;
        }

        player?.addElement(ref.current);

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
