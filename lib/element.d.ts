import * as React from "react";
export interface VFXProps {
    shader?: string;
}
declare function VFXElementFactory<T extends HTMLElement>(type: keyof React.ReactHTML): React.FC<React.HTMLAttributes<T> & VFXProps>;
export default VFXElementFactory;
