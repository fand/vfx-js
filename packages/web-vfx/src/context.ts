import { createContext } from "react";
import VFXPlayer from "./vfx-player";

// eslint-disable-next-line
export const VFXContext = createContext<VFXPlayer | null>(null);
