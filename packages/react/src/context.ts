import type { VFX } from "@vfx-js/core";
import { createContext } from "react";

export const VFXContext = createContext<VFX | null>(null);
