import * as React from "react";
import { VFXProps } from "./types";
declare type VFXElementProps<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T] & VFXProps;
declare function VFXElementFactory<T extends keyof JSX.IntrinsicElements>(type: T): React.FC<VFXElementProps<T>>;
export default VFXElementFactory;
