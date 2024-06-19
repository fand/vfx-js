import { createContext } from "react";
import { VFX } from "vfx-js";

// eslint-disable-next-line
export const VFXContext = createContext<VFX | null>(null);
