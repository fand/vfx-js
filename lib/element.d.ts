import * as React from "react";
export interface VFXProps {
    shader?: string;
}
declare type VFXElementProps<T> = React.HTMLAttributes<T> & VFXProps;
declare function VFXElementFactory<T extends HTMLElement>(type: keyof React.ReactHTML): React.FC<VFXElementProps<T>>;
export default VFXElementFactory;
