import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

type VFXElementProps<
    T extends keyof JSX.IntrinsicElements
> = JSX.IntrinsicElements[T] & VFXProps;

function VFXElementFactory<T extends keyof JSX.IntrinsicElements>(
    type: T
): React.FC<VFXElementProps<T>> {
    const VFXElement: React.FC<VFXElementProps<T>> = (
        props: VFXElementProps<T>
    ) => {
        const player = useContext(VFXContext);
        const ref = useRef<HTMLElement>(null);

        // Create scene
        useEffect(() => {
            const element = ref.current;
            if (element === null) {
                return;
            }

            const shader = props.shader;
            player?.addElement(element, { shader });

            return () => {
                player?.removeElement(element);
            };
        }, [ref, player, props.shader]);

        // Rerender if the content is updated
        useEffect(() => {
            if (ref.current === null) {
                return;
            }

            player?.updateElement(ref.current);
        }, [player, props.children]);

        return React.createElement(type, { ...props, ref });
    };

    return VFXElement;
}

export default VFXElementFactory;
