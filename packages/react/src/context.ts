import type { VFX } from "@vfx-js/core";
import { createContext } from "react";

export const VFXContext = createContext<VFX | null>(null);

/** True inside `<VFXProvider>`. Internal; not exported from the package. */
export const VFXProviderMarker = createContext(false);
