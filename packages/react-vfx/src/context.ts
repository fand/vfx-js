import { createContext } from "react";
import type { VFX } from "@vfx-js/core";

export const VFXContext = createContext<VFX | null>(null);
