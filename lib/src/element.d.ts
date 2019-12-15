import * as React from "react";
declare function VFXElementFactory<T extends HTMLElement>(type: keyof React.ReactHTML): React.FC<React.HTMLAttributes<T>>;
export default VFXElementFactory;
