import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

type VFXElementProps<T> = React.HTMLAttributes<T> & VFXProps;

function VFXElementFactory<T extends HTMLElement>(
    type: keyof React.ReactHTML
): React.FC<VFXElementProps<T>> {
    const VFXElement: React.FC<VFXElementProps<T>> = (
        props: VFXElementProps<T>
    ) => {
        const player = useContext(VFXContext);
        const ref = useRef<T>(null);

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

        // Rerender if the content is updated
        useEffect(() => {
            if (ref.current === null) {
                return;
            }

            player?.updateElement(ref.current);
        }, [props.children]);

        return React.createElement(type, { ...props, ref });
    };

    return VFXElement;
}

export default VFXElementFactory;
