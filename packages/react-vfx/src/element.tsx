import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";
import type { VFXProps } from "./types";
import type VFXPlayer from "./vfx-player";

type VFXElementProps<T extends keyof JSX.IntrinsicElements> =
    JSX.IntrinsicElements[T] & VFXProps;

type VFXElementInnerProps<T extends keyof JSX.IntrinsicElements> =
    VFXElementProps<T> & {
        player: VFXPlayer;
        refCallback: (e: HTMLElement) => void;
    };

function VFXElementFactory<T extends keyof JSX.IntrinsicElements>(
    type: T,
): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<VFXElementProps<T>> & React.RefAttributes<HTMLElement>
> {
    const VFXElementInner: React.FC<VFXElementInnerProps<T>> = ({
        player,
        refCallback,
        shader,
        release,
        uniforms,
        overflow,
        ...rawProps
    }) => {
        const elementRef = useRef<HTMLElement | undefined>();
        const ref = (e: HTMLElement): void => {
            elementRef.current = e;
            refCallback(e);
        };

        // Create scene
        useEffect(() => {
            const element = elementRef.current;
            if (element === undefined) {
                return;
            }

            player.addElement(element, {
                shader,
                release,
                uniforms,
                overflow,
            });

            const mo = new MutationObserver(() => {
                if (elementRef.current) {
                    player.updateTextElement(elementRef.current);
                }
            });
            mo.observe(element, {
                characterData: true,
                attributes: true,
                subtree: true,
            });

            return () => {
                player.removeElement(element);
                mo.disconnect();
            };
        }, [elementRef, player, shader, release, uniforms, overflow]);

        return React.createElement(type, { ...rawProps, ref });
    };

    return React.forwardRef(function VFXElement(
        props: VFXElementProps<T>,
        parentRef: React.ForwardedRef<HTMLElement>,
    ) {
        const player = useContext(VFXContext);
        if (!player) {
            return null;
        }

        const ref = (e: HTMLElement): void => {
            if (parentRef instanceof Function) {
                parentRef(e);
            } else if (parentRef) {
                parentRef.current = e;
            }
        };

        return <VFXElementInner refCallback={ref} player={player} {...props} />;
    });
}

export default VFXElementFactory;
