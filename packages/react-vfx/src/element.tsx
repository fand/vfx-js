import type { VFXProps } from "@vfx-js/core";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { VFXContext } from "./context.js";
import { splitVFXProps } from "./split-props.js";

type VFXElementProps<T extends keyof React.JSX.IntrinsicElements> =
    React.JSX.IntrinsicElements[T] & VFXProps;

export function VFXElementFactory<T extends keyof React.JSX.IntrinsicElements>(
    type: T,
): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<VFXElementProps<T>> & React.RefAttributes<HTMLElement>
> {
    return React.forwardRef(function VFXElement(
        props: VFXElementProps<T>,
        parentRef: React.ForwardedRef<HTMLElement>,
    ) {
        const vfx = useContext(VFXContext);

        const [element, setElement] = useState<HTMLElement | null>(null);
        const ref = (e: HTMLElement): void => {
            setElement(e);
            if (parentRef instanceof Function) {
                parentRef(e);
            } else if (parentRef) {
                parentRef.current = e;
            }
        };

        const { vfxProps, domProps } = splitVFXProps(props);

        // Create scene
        useEffect(() => {
            if (!vfx || !element) {
                return;
            }

            vfx.add(element, vfxProps);

            const mo = new MutationObserver(() => vfx.update(element));
            mo.observe(element, {
                characterData: true,
                attributes: true,
                subtree: true,
            });

            return () => {
                mo.disconnect();
                vfx.remove(element);
            };
        }, [element, vfx, vfxProps]);

        return React.createElement(type, { ...domProps, ref });
    });
}
