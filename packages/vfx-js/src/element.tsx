import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";
import { VFXProps } from "./types";

type VFXElementProps<T extends keyof JSX.IntrinsicElements> =
    JSX.IntrinsicElements[T] & VFXProps;

function VFXElementFactory<T extends keyof JSX.IntrinsicElements>(
    type: T,
): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<VFXElementProps<T>> & React.RefAttributes<HTMLElement>
> {
    return React.forwardRef(function VFXElement(
        props: VFXElementProps<T>,
        parentRef: React.ForwardedRef<HTMLElement>,
    ) {
        const player = useContext(VFXContext);

        const elementRef = useRef<HTMLElement | undefined>();
        const ref = (e: HTMLElement): void => {
            elementRef.current = e;
            if (parentRef instanceof Function) {
                parentRef(e);
            } else if (parentRef) {
                parentRef.current = e;
            }
        };

        const { shader, release, uniforms, overflow, ...rawProps } = props;

        // Create scene
        useEffect(() => {
            if (!player || !elementRef.current) {
                return;
            }
            const element = elementRef.current;

            player.addElement(element, {
                shader,
                release,
                uniforms,
                overflow,
            });

            const mo = new MutationObserver(() => {
                if (elementRef.current) {
                    player?.updateTextElement(elementRef.current);
                }
            });
            mo.observe(element, {
                characterData: true,
                attributes: true,
                subtree: true,
            });

            return () => {
                mo.disconnect();
                player.removeElement(element);
            };
        }, [elementRef, player, shader, release, uniforms, overflow]);

        return React.createElement(type, { ...rawProps, ref });
    });
}

export default VFXElementFactory;
