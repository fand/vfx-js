import type { VFX } from "@vfx-js/core";
import { createContext } from "react";

/**
 * The `VFX` instance of the nearest `<VFXProvider>`.
 * `null` outside a Provider, or while the Provider creates its instance.
 */
export const VFXContext = createContext<VFX | null>(null);

/** True inside `<VFXProvider>`. Internal; not exported from the package. */
export const VFXProviderMarker = createContext(false);
