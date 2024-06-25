import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import { VFXContext } from "./context";
import type { VFXProps } from "@vfx-js/core";

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
        const vfx = useContext(VFXContext);

        const elementRef = useRef<HTMLElement | undefined>();
        const ref = (e: HTMLElement): void => {
            elementRef.current = e;
            if (parentRef instanceof Function) {
                parentRef(e);
            } else if (parentRef) {
                parentRef.current = e;
            }
        };

        const { shader, release, uniforms, overflow, wrap, ...rawProps } =
            props;

        // Create scene
        useEffect(() => {
            if (!vfx || !elementRef.current) {
                return;
            }
            const element = elementRef.current;

            vfx.add(element, {
                shader,
                release,
                uniforms,
                overflow,
                wrap,
            });

            const mo = new MutationObserver(() => {
                if (elementRef.current) {
                    vfx?.update(elementRef.current);
                }
            });
            mo.observe(element, {
                characterData: true,
                attributes: true,
                subtree: true,
            });

            return () => {
                mo.disconnect();
                vfx.remove(element);
            };
        }, [elementRef, vfx, shader, release, uniforms, overflow, wrap]);

        return React.createElement(type, { ...rawProps, ref });
    });
}

export default VFXElementFactory;
