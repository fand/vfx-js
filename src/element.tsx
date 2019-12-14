import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";

function VFXElementFactory<T extends HTMLElement>(
    type: keyof React.ReactHTML
): React.FC<React.HTMLAttributes<T>> {
    const VFXElement: React.FC<React.HTMLAttributes<T>> = (
        props: React.HTMLAttributes<T>
    ) => {
        const player = useContext(VFXContext);
        const ref = useRef<T>(null);

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

        return React.createElement(type, { ...props, ref });
    };

    return VFXElement;
}

export default VFXElementFactory;
