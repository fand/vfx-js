export { VFXProvider } from "./provider.js";
export { VFXContext } from "./context.js";
export { VFXImg } from "./image.js";
export { VFXVideo } from "./video.js";
export { VFXCanvas } from "./canvas.js";

import { VFXElementFactory } from "./element.js";
export const VFXSpan = VFXElementFactory<"span">("span");
export const VFXDiv = VFXElementFactory<"div">("div");
export const VFXP = VFXElementFactory<"p">("p");

export * from "./hooks.js";
