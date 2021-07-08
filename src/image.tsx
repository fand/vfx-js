import * as React from "react";
import { useRef, useContext, useCallback } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

export type VFXImgProps = JSX.IntrinsicElements["img"] & VFXProps;

export const VFXImg: React.FC<VFXImgProps> = props => {
    const player = useContext(VFXContext);
    const ref = useRef<HTMLImageElement>(null);

    const { shader, release, uniforms, overflow } = props;

    // Create scene
    const init = useCallback(() => {
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

    return <img ref={ref} {...props} onLoad={init} />;
};
